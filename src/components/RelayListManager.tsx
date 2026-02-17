import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { cn } from '@/lib/utils';

interface RelayListManagerProps {
  className?: string;
}

export function RelayListManager({ className }: RelayListManagerProps) {
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const [newRelayUrl, setNewRelayUrl] = useState('');

  const relays = config.relayMetadata.relays;

  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (trimmed.includes('://')) return trimmed;
    return `wss://${trimmed}`;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(normalizeUrl(url));
      return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
    } catch {
      return false;
    }
  };

  const updateRelays = (newRelays: typeof relays) => {
    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        relays: newRelays,
        updatedAt: Math.floor(Date.now() / 1000),
      },
    }));

    // Publish NIP-65 relay list if logged in
    if (user) {
      const tags = newRelays.map(({ url, read, write }) => {
        if (read && write) return ['r', url];
        if (read) return ['r', url, 'read'];
        return ['r', url, 'write'];
      });
      publishEvent({ kind: 10002, content: '', tags });
    }
  };

  const addRelay = () => {
    const url = normalizeUrl(newRelayUrl);
    if (!isValidUrl(newRelayUrl)) return;
    if (relays.some((r) => r.url === url)) return;

    updateRelays([...relays, { url, read: true, write: true }]);
    setNewRelayUrl('');
  };

  const removeRelay = (url: string) => {
    updateRelays(relays.filter((r) => r.url !== url));
  };

  const toggleRead = (url: string) => {
    updateRelays(
      relays.map((r) => (r.url === url ? { ...r, read: !r.read } : r)),
    );
  };

  const toggleWrite = (url: string) => {
    updateRelays(
      relays.map((r) => (r.url === url ? { ...r, write: !r.write } : r)),
    );
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Relays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {relays.map((relay) => (
          <div key={relay.url} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate text-muted-foreground">
              {relay.url.replace(/^wss?:\/\//, '')}
            </span>
            <div className="flex items-center gap-1">
              <Label htmlFor={`read-${relay.url}`} className="text-xs text-muted-foreground">R</Label>
              <Switch
                id={`read-${relay.url}`}
                checked={relay.read}
                onCheckedChange={() => toggleRead(relay.url)}
                className="scale-75"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label htmlFor={`write-${relay.url}`} className="text-xs text-muted-foreground">W</Label>
              <Switch
                id={`write-${relay.url}`}
                checked={relay.write}
                onCheckedChange={() => toggleWrite(relay.url)}
                className="scale-75"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => removeRelay(relay.url)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addRelay();
          }}
        >
          <Input
            placeholder="wss://relay.example.com"
            value={newRelayUrl}
            onChange={(e) => setNewRelayUrl(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={!newRelayUrl.trim() || !isValidUrl(newRelayUrl)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
