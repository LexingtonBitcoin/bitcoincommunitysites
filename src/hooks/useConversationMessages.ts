import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDMContext } from '@/hooks/useDMContext';
import type { DecryptedMessage } from '@/contexts/DMContext';

const PAGE_SIZE = 50;

interface UseConversationMessagesResult {
  messages: DecryptedMessage[];
  hasMoreMessages: boolean;
  totalCount: number;
  lastMessage: DecryptedMessage | undefined;
  lastActivity: number;
  loadEarlierMessages: () => void;
}

export function useConversationMessages(conversationId: string | undefined): UseConversationMessagesResult {
  const { messages: allMessages } = useDMContext();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when conversation changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [conversationId]);

  const participantData = conversationId ? allMessages.get(conversationId) : undefined;

  const allConversationMessages = useMemo(() => {
    return participantData?.messages ?? [];
  }, [participantData?.messages]);

  const messages = useMemo(() => {
    if (allConversationMessages.length <= visibleCount) return allConversationMessages;
    return allConversationMessages.slice(-visibleCount);
  }, [allConversationMessages, visibleCount]);

  const loadEarlierMessages = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  return {
    messages,
    hasMoreMessages: allConversationMessages.length > visibleCount,
    totalCount: allConversationMessages.length,
    lastMessage: allConversationMessages[allConversationMessages.length - 1],
    lastActivity: participantData?.lastActivity ?? 0,
    loadEarlierMessages,
  };
}
