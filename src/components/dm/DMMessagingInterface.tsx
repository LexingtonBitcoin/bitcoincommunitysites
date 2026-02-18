import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DMConversationList } from '@/components/dm/DMConversationList';
import { DMChatArea } from '@/components/dm/DMChatArea';
import { DMStatusInfo } from '@/components/dm/DMStatusInfo';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info } from 'lucide-react';

export function DMMessagingInterface() {
  const [selectedPubkey, setSelectedPubkey] = useState<string | undefined>();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelectConversation = (pubkey: string) => {
    setSelectedPubkey(pubkey);
  };

  const handleBack = () => {
    setSelectedPubkey(undefined);
  };

  // Mobile: show either list or chat
  if (isMobile) {
    if (selectedPubkey) {
      return (
        <div className="flex flex-col h-full">
          <DMChatArea
            conversationId={selectedPubkey}
            onBack={handleBack}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm text-muted-foreground">Conversations</span>
          <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>DM Status</DialogTitle>
              </DialogHeader>
              <DMStatusInfo />
            </DialogContent>
          </Dialog>
        </div>
        <DMConversationList onSelectConversation={handleSelectConversation} selectedPubkey={selectedPubkey} />
      </div>
    );
  }

  // Desktop: side-by-side
  return (
    <div className="flex h-full border rounded-lg overflow-hidden">
      <div className="w-80 border-r flex flex-col">
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm font-medium">Conversations</span>
          <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>DM Status</DialogTitle>
              </DialogHeader>
              <DMStatusInfo />
            </DialogContent>
          </Dialog>
        </div>
        <DMConversationList onSelectConversation={handleSelectConversation} selectedPubkey={selectedPubkey} />
      </div>
      <div className="flex-1 flex flex-col">
        {selectedPubkey ? (
          <DMChatArea conversationId={selectedPubkey} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
