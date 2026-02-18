import { createContext } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import type { LoadingPhase, MessageProtocol } from '@/lib/dmConstants';

/** A decrypted DM message with additional metadata. */
export interface DecryptedMessage extends NostrEvent {
  decryptedContent: string;
  error?: string;
  isSending?: boolean;
  clientFirstSeen?: number;
}

/** Messages and metadata for a single conversation partner. */
export interface ParticipantData {
  messages: DecryptedMessage[];
  lastActivity: number;
  hasNip04: boolean;
  hasNip17: boolean;
}

/** Summary of a conversation for the conversation list. */
export interface ConversationSummary {
  pubkey: string;
  lastMessage: DecryptedMessage | undefined;
  lastActivity: number;
  hasNip04: boolean;
  hasNip17: boolean;
  isKnown: boolean;
  isRequest: boolean;
  unreadCount: number;
}

/** NIP-92 compatible file attachment. */
export interface FileAttachment {
  url: string;
  mimeType: string;
  size?: number;
  name?: string;
  tags: string[][];
}

/** Map of pubkeys to their participant data. */
export type MessagesState = Map<string, ParticipantData>;

/** Shape of the DM context. */
export interface DMContextType {
  messages: MessagesState;
  loadingPhase: LoadingPhase;
  conversations: ConversationSummary[];
  sendMessage: (recipientPubkey: string, content: string, protocol: MessageProtocol, attachments?: FileAttachment[]) => Promise<void>;
  markConversationRead: (pubkey: string) => void;
  clearCache: () => Promise<void>;
}

export const DMContext = createContext<DMContextType | undefined>(undefined);
