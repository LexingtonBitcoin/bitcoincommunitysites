import { useState } from 'react';
import { useDMContext } from '@/hooks/useDMContext';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { formatConversationTime } from '@/lib/dmUtils';
import type { ConversationSummary } from '@/contexts/DMContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface DMConversationListProps {
  onSelectConversation: (pubkey: string) => void;
  selectedPubkey?: string;
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: ConversationSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  const author = useAuthor(conversation.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(conversation.pubkey);
  const lastMessagePreview = conversation.lastMessage?.decryptedContent ?? '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent',
      )}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={metadata?.picture} />
        <AvatarFallback>{displayName[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{displayName}</span>
          {conversation.lastActivity > 0 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatConversationTime(conversation.lastActivity)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground truncate">
            {lastMessagePreview || 'No messages'}
          </p>
          {conversation.unreadCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 min-w-5 text-[10px] flex-shrink-0">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DMConversationList({ onSelectConversation, selectedPubkey }: DMConversationListProps) {
  const { conversations, loadingPhase } = useDMContext();
  const [tab, setTab] = useState<'active' | 'requests'>('active');

  const activeConversations = conversations.filter((c) => !c.isRequest);
  const requestConversations = conversations.filter((c) => c.isRequest);

  const isLoading = loadingPhase === 'cache' || loadingPhase === 'relays';

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'requests')} className="flex flex-col flex-1 min-h-0">
      <TabsList className="mx-2 mt-2">
        <TabsTrigger value="active" className="flex-1">
          Active
          {activeConversations.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">({activeConversations.length})</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="requests" className="flex-1">
          Requests
          {requestConversations.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">({requestConversations.length})</span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="flex-1 m-0 min-h-0">
        <ScrollArea className="h-full">
          {isLoading && conversations.length === 0 ? (
            <LoadingSkeleton />
          ) : activeConversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <div className="divide-y">
              {activeConversations.map((conv) => (
                <ConversationItem
                  key={conv.pubkey}
                  conversation={conv}
                  isSelected={conv.pubkey === selectedPubkey}
                  onClick={() => onSelectConversation(conv.pubkey)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="requests" className="flex-1 m-0 min-h-0">
        <ScrollArea className="h-full">
          {requestConversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No message requests
            </div>
          ) : (
            <div className="divide-y">
              {requestConversations.map((conv) => (
                <ConversationItem
                  key={conv.pubkey}
                  conversation={conv}
                  isSelected={conv.pubkey === selectedPubkey}
                  onClick={() => onSelectConversation(conv.pubkey)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
