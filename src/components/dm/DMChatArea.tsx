import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lock, Shield } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useConversationMessages } from '@/hooks/useConversationMessages';
import { useDMContext } from '@/hooks/useDMContext';
import { genUserName } from '@/lib/genUserName';
import { formatFullDateTime } from '@/lib/dmUtils';
import type { MessageProtocol } from '@/lib/dmConstants';
import type { DecryptedMessage } from '@/contexts/DMContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DMChatAreaProps {
  conversationId: string;
  onBack?: () => void;
}

function MessageBubble({ message, isOwn }: { message: DecryptedMessage; isOwn: boolean }) {
  const protocolIcon = message.kind === 4 ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Lock className="h-3 w-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>NIP-04 encrypted</TooltipContent>
    </Tooltip>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <Shield className="h-3 w-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>NIP-17 sealed</TooltipContent>
    </Tooltip>
  );

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        } ${message.isSending ? 'opacity-60' : ''}`}
      >
        {message.error ? (
          <p className="text-destructive italic">{message.error}</p>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.decryptedContent}</p>
        )}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {protocolIcon}
          <span className="text-[10px] text-muted-foreground">
            {formatFullDateTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DMChatArea({ conversationId, onBack }: DMChatAreaProps) {
  const { user } = useCurrentUser();
  const { sendMessage, markConversationRead } = useDMContext();
  const { messages, hasMoreMessages, loadEarlierMessages } = useConversationMessages(conversationId);
  const author = useAuthor(conversationId);
  const metadata = author.data?.metadata;

  const [input, setInput] = useState('');
  const [protocol, setProtocol] = useState<MessageProtocol>('nip04');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayName = metadata?.name ?? genUserName(conversationId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Mark as read when viewing
  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId, markConversationRead]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !user || isSending) return;

    const text = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await sendMessage(conversationId, text, protocol);
    } catch {
      // Restore input on failure
      setInput(text);
    } finally {
      setIsSending(false);
    }
  }, [input, user, isSending, sendMessage, conversationId, protocol]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-3 border-b">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar className="h-8 w-8">
          <AvatarImage src={metadata?.picture} />
          <AvatarFallback>{displayName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          {metadata?.nip05 && (
            <p className="text-xs text-muted-foreground truncate">{metadata.nip05}</p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {hasMoreMessages && (
          <div className="text-center mb-4">
            <Button variant="ghost" size="sm" onClick={loadEarlierMessages}>
              Load Earlier Messages
            </Button>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.pubkey === user?.pubkey}
          />
        ))}
      </ScrollArea>

      {/* Input area */}
      {user && (
        <div className="p-3 border-t space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <div className="flex flex-col gap-1">
              <Select value={protocol} onValueChange={(v) => setProtocol(v as MessageProtocol)}>
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nip04">NIP-04</SelectItem>
                  <SelectItem value="nip17">NIP-17</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleSend} disabled={!input.trim() || isSending}>
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
