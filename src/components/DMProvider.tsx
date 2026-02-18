import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { DMContext, type ConversationSummary, type DecryptedMessage, type FileAttachment, type MessagesState, type ParticipantData } from '@/contexts/DMContext';
import type { LoadingPhase, MessageProtocol } from '@/lib/dmConstants';
import { getConversationPartner } from '@/lib/dmUtils';
import { clearAllMessages, readMessagesFromDB, writeMessagesToDB } from '@/lib/dmMessageStore';
import type { NostrEvent } from '@nostrify/nostrify';

const CACHE_WRITE_DEBOUNCE = 15_000;

interface DMProviderProps {
  children: ReactNode;
}

export function DMProvider({ children }: DMProviderProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  const [messages, setMessages] = useState<MessagesState>(new Map());
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('idle');
  const [readTimestamps, setReadTimestamps] = useState<Map<string, number>>(new Map());

  // Track gift wrap IDs for NIP-17 deduplication
  const giftWrapIds = useRef<Set<string>>(new Set());
  const cacheWriteTimer = useRef<ReturnType<typeof setTimeout>>();
  const prevRelayConfig = useRef(config.relayMetadata);

  const pubkey = user?.pubkey;

  // Clear cache when relay config changes significantly
  useEffect(() => {
    if (!pubkey) return;
    const prev = prevRelayConfig.current;
    const curr = config.relayMetadata;

    if (prev !== curr && prev.updatedAt !== curr.updatedAt) {
      prevRelayConfig.current = curr;
    }
  }, [config.relayMetadata, pubkey]);

  // Add message to a participant's data
  const addMessage = useCallback((partnerPubkey: string, msg: DecryptedMessage) => {
    setMessages((prev) => {
      const next = new Map(prev);
      const existing = next.get(partnerPubkey) ?? { messages: [], lastActivity: 0, hasNip04: false, hasNip17: false };

      // Deduplication check
      if (existing.messages.some((m) => m.id === msg.id)) return prev;

      const updatedMessages = [...existing.messages, msg].sort((a, b) => a.created_at - b.created_at);
      const updated: ParticipantData = {
        messages: updatedMessages,
        lastActivity: Math.max(existing.lastActivity, msg.created_at),
        hasNip04: existing.hasNip04 || msg.kind === 4,
        hasNip17: existing.hasNip17 || msg.kind === 1059,
      };
      next.set(partnerPubkey, updated);
      return next;
    });
  }, []);

  // Decrypt NIP-04 messages
  const decryptNip04 = useCallback(async (event: NostrEvent): Promise<DecryptedMessage> => {
    if (!user?.signer.nip04) {
      return { ...event, decryptedContent: '', error: 'NIP-04 not supported by signer' };
    }

    const partner = getConversationPartner(event, user.pubkey);
    if (!partner) {
      return { ...event, decryptedContent: '', error: 'No conversation partner found' };
    }

    try {
      const decrypted = await user.signer.nip04.decrypt(partner, event.content);
      return { ...event, decryptedContent: decrypted };
    } catch {
      return { ...event, decryptedContent: '', error: 'Decryption failed' };
    }
  }, [user]);

  // Decrypt NIP-17 gift-wrapped messages
  const decryptNip17 = useCallback(async (event: NostrEvent): Promise<DecryptedMessage | null> => {
    if (!user?.signer.nip44) {
      return null;
    }

    try {
      // Unwrap the gift wrap (kind 1059) → seal (kind 13) → rumor (kind 14)
      const sealJson = await user.signer.nip44.decrypt(event.pubkey, event.content);
      const seal: NostrEvent = JSON.parse(sealJson);

      if (seal.kind !== 13) return null;

      const rumorJson = await user.signer.nip44.decrypt(seal.pubkey, seal.content);
      const rumor: NostrEvent = JSON.parse(rumorJson);

      if (rumor.kind !== 14) return null;

      const partner = getConversationPartner(rumor, user.pubkey);
      if (!partner) return null;

      // Use the gift wrap ID for deduplication
      if (giftWrapIds.current.has(event.id)) return null;
      giftWrapIds.current.add(event.id);

      return {
        ...rumor,
        decryptedContent: rumor.content,
        clientFirstSeen: event.created_at,
      };
    } catch {
      return null;
    }
  }, [user]);

  // Load cached messages from IndexedDB
  useEffect(() => {
    if (!pubkey) {
      setMessages(new Map());
      setLoadingPhase('idle');
      return;
    }

    setLoadingPhase('cache');

    (async () => {
      try {
        const cached = await readMessagesFromDB(pubkey);
        if (cached.length > 0) {
          // Process cached events
          const map = new Map<string, ParticipantData>();
          for (const event of cached) {
            const partner = getConversationPartner(event, pubkey);
            if (!partner) continue;

            const existing = map.get(partner) ?? { messages: [], lastActivity: 0, hasNip04: false, hasNip17: false };

            // Re-decrypt cached messages
            let decrypted: DecryptedMessage;
            if (event.kind === 4) {
              decrypted = await decryptNip04(event);
            } else if (event.kind === 1059) {
              const result = await decryptNip17(event);
              if (!result) continue;
              decrypted = result;
            } else {
              continue;
            }

            existing.messages.push(decrypted);
            existing.lastActivity = Math.max(existing.lastActivity, event.created_at);
            existing.hasNip04 = existing.hasNip04 || event.kind === 4;
            existing.hasNip17 = existing.hasNip17 || event.kind === 1059;
            map.set(partner, existing);
          }

          // Sort messages within each conversation
          for (const [, data] of map) {
            data.messages.sort((a, b) => a.created_at - b.created_at);
          }

          setMessages(map);
        }
      } catch {
        // Cache read failures are non-fatal
      }

      setLoadingPhase('relays');
    })();
  }, [pubkey, decryptNip04, decryptNip17]);

  // Query relays for new DM events
  useEffect(() => {
    if (!pubkey || loadingPhase !== 'relays') return;

    const controller = new AbortController();

    (async () => {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);

        // Query NIP-04 DMs (kind 4) — received and sent
        const nip04Events = await nostr.query(
          [
            { kinds: [4], '#p': [pubkey], limit: 200 },
            { kinds: [4], authors: [pubkey], limit: 200 },
          ],
          { signal },
        );

        for (const event of nip04Events) {
          const partner = getConversationPartner(event, pubkey);
          if (!partner) continue;

          const decrypted = await decryptNip04(event);
          addMessage(partner, decrypted);
        }

        // Query NIP-17 gift wraps (kind 1059) — addressed to the user
        const nip17Events = await nostr.query(
          [{ kinds: [1059], '#p': [pubkey], limit: 200 }],
          { signal },
        );

        for (const event of nip17Events) {
          const decrypted = await decryptNip17(event);
          if (!decrypted) continue;
          const partner = getConversationPartner(decrypted, pubkey);
          if (partner) {
            addMessage(partner, decrypted);
          }
        }
      } catch {
        // Network failures are non-fatal
      }

      setLoadingPhase('subscriptions');
    })();

    return () => controller.abort();
  }, [pubkey, loadingPhase, nostr, decryptNip04, decryptNip17, addMessage]);

  // Establish live subscriptions
  useEffect(() => {
    if (!pubkey || loadingPhase !== 'subscriptions') return;

    const controller = new AbortController();

    (async () => {
      try {
        // Subscribe to incoming NIP-04 DMs
        for await (const msg of nostr.req(
          [{ kinds: [4], '#p': [pubkey], since: Math.floor(Date.now() / 1000) }],
          { signal: controller.signal },
        )) {
          if (msg[0] === 'EVENT') {
            const event = msg[2] as NostrEvent;
            const partner = getConversationPartner(event, pubkey);
            if (!partner) continue;
            const decrypted = await decryptNip04(event);
            addMessage(partner, decrypted);
          }
        }
      } catch {
        // Subscription ended
      }
    })();

    (async () => {
      try {
        // Subscribe to incoming NIP-17 gift wraps
        for await (const msg of nostr.req(
          [{ kinds: [1059], '#p': [pubkey], since: Math.floor(Date.now() / 1000) }],
          { signal: controller.signal },
        )) {
          if (msg[0] === 'EVENT') {
            const event = msg[2] as NostrEvent;
            const decrypted = await decryptNip17(event);
            if (!decrypted) continue;
            const partner = getConversationPartner(decrypted, pubkey);
            if (partner) {
              addMessage(partner, decrypted);
            }
          }
        }
      } catch {
        // Subscription ended
      }
    })();

    setLoadingPhase('ready');

    return () => controller.abort();
  }, [pubkey, loadingPhase, nostr, decryptNip04, decryptNip17, addMessage]);

  // Debounced cache writes
  useEffect(() => {
    if (!pubkey || messages.size === 0) return;

    if (cacheWriteTimer.current) {
      clearTimeout(cacheWriteTimer.current);
    }

    cacheWriteTimer.current = setTimeout(() => {
      const allEvents: NostrEvent[] = [];
      for (const [, data] of messages) {
        allEvents.push(...data.messages);
      }
      writeMessagesToDB(pubkey, allEvents).catch(() => {
        // Cache write failures are non-fatal
      });
    }, CACHE_WRITE_DEBOUNCE);

    return () => {
      if (cacheWriteTimer.current) {
        clearTimeout(cacheWriteTimer.current);
      }
    };
  }, [pubkey, messages]);

  // Send a DM message
  const sendMessage = useCallback(async (
    recipientPubkey: string,
    content: string,
    protocol: MessageProtocol,
    _attachments?: FileAttachment[],
  ) => {
    if (!user) throw new Error('Not logged in');

    if (protocol === 'nip04') {
      if (!user.signer.nip04) throw new Error('NIP-04 not supported');
      const encrypted = await user.signer.nip04.encrypt(recipientPubkey, content);
      await nostr.event({
        kind: 4,
        content: encrypted,
        tags: [['p', recipientPubkey]],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: user.pubkey,
        id: '',
        sig: '',
      });
    } else if (protocol === 'nip17') {
      if (!user.signer.nip44) throw new Error('NIP-44 not supported');

      // Build the rumor (kind 14, unsigned)
      const rumor: NostrEvent = {
        kind: 14,
        content,
        tags: [['p', recipientPubkey]],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: user.pubkey,
        id: '',
        sig: '',
      };

      // Seal the rumor (kind 13)
      const sealContent = await user.signer.nip44.encrypt(recipientPubkey, JSON.stringify(rumor));
      await nostr.event({
        kind: 1059,
        content: sealContent,
        tags: [['p', recipientPubkey]],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: user.pubkey,
        id: '',
        sig: '',
      });
    }

    // Add optimistic message
    const optimistic: DecryptedMessage = {
      kind: protocol === 'nip04' ? 4 : 14,
      content: '',
      tags: [['p', recipientPubkey]],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: user.pubkey,
      id: crypto.randomUUID(),
      sig: '',
      decryptedContent: content,
      isSending: true,
    };
    addMessage(recipientPubkey, optimistic);
  }, [user, nostr, addMessage]);

  // Mark a conversation as read
  const markConversationRead = useCallback((partnerPubkey: string) => {
    setReadTimestamps((prev) => {
      const next = new Map(prev);
      next.set(partnerPubkey, Math.floor(Date.now() / 1000));
      return next;
    });
  }, []);

  // Clear all DM cache
  const clearCacheFn = useCallback(async () => {
    await clearAllMessages();
    setMessages(new Map());
    giftWrapIds.current.clear();
    setLoadingPhase('idle');
  }, []);

  // Build conversation summaries
  const conversations = useMemo<ConversationSummary[]>(() => {
    const summaries: ConversationSummary[] = [];

    for (const [partnerPubkey, data] of messages) {
      const lastMessage = data.messages[data.messages.length - 1];
      const readTs = readTimestamps.get(partnerPubkey) ?? 0;
      const unread = data.messages.filter((m) => m.pubkey !== pubkey && m.created_at > readTs).length;

      summaries.push({
        pubkey: partnerPubkey,
        lastMessage,
        lastActivity: data.lastActivity,
        hasNip04: data.hasNip04,
        hasNip17: data.hasNip17,
        isKnown: true,
        isRequest: false,
        unreadCount: unread,
      });
    }

    return summaries.sort((a, b) => b.lastActivity - a.lastActivity);
  }, [messages, readTimestamps, pubkey]);

  const contextValue = useMemo(() => ({
    messages,
    loadingPhase,
    conversations,
    sendMessage,
    markConversationRead,
    clearCache: clearCacheFn,
  }), [messages, loadingPhase, conversations, sendMessage, markConversationRead, clearCacheFn]);

  return (
    <DMContext.Provider value={contextValue}>
      {children}
    </DMContext.Provider>
  );
}
