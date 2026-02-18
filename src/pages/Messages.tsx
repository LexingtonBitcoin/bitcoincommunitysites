import { useSeoMeta } from '@unhead/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { DMMessagingInterface } from '@/components/dm/DMMessagingInterface';

export function Messages() {
  useSeoMeta({ title: 'Messages' });

  const { user } = useCurrentUser();

  if (!user) {
    return (
      <div className="container mx-auto px-4 pt-20 pb-8">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <p className="text-muted-foreground">Log in to view your messages</p>
          <LoginArea className="max-w-60" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-20 pb-8 flex flex-col" style={{ height: 'calc(100vh - 1rem)' }}>
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <div className="flex-1 min-h-0">
        <DMMessagingInterface />
      </div>
    </div>
  );
}

export default Messages;
