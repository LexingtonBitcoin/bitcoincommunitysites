import { useDMContext } from '@/hooks/useDMContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import type { LoadingPhase } from '@/lib/dmConstants';

const PHASES: { key: LoadingPhase; label: string }[] = [
  { key: 'idle', label: 'Idle' },
  { key: 'cache', label: 'Loading cache' },
  { key: 'relays', label: 'Scanning relays' },
  { key: 'subscriptions', label: 'Setting up subscriptions' },
  { key: 'ready', label: 'Ready' },
];

function phaseIndex(phase: LoadingPhase): number {
  return PHASES.findIndex((p) => p.key === phase);
}

export function DMStatusInfo() {
  const { loadingPhase, conversations, clearCache } = useDMContext();
  const { toast } = useToast();

  const currentIndex = phaseIndex(loadingPhase);

  const handleClearCache = async () => {
    try {
      await clearCache();
      toast({ title: 'Cache cleared', description: 'DM cache has been cleared. Messages will be re-fetched from relays.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to clear cache', variant: 'destructive' });
    }
  };

  const totalMessages = conversations.reduce((acc, c) => {
    const data = c.lastMessage ? 1 : 0;
    return acc + data;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Loading Status</h4>
        {PHASES.map((phase, i) => {
          const isActive = i === currentIndex;
          const isComplete = i < currentIndex;

          return (
            <div key={phase.key} className="flex items-center gap-2 text-sm">
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={isActive ? 'font-medium' : 'text-muted-foreground'}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Statistics</h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{conversations.length} conversations</Badge>
          <Badge variant="outline">{totalMessages} with messages</Badge>
        </div>
      </div>

      <div className="pt-2">
        <Button variant="outline" size="sm" onClick={handleClearCache}>
          Clear Cache
        </Button>
      </div>
    </div>
  );
}
