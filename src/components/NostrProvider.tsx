import React, { useEffect, useRef } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import type { RelayMetadata } from '@/contexts/AppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayMetadata = useRef<RelayMetadata>(config.relayMetadata);

  // Update refs when config changes
  useEffect(() => {
    relayMetadata.current = config.relayMetadata;
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [config.relayMetadata, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      eoseTimeout: 200,
      reqRouter(filters: NostrFilter[]) {
        const readRelays = relayMetadata.current.relays
          .filter((r) => r.read)
          .map((r) => r.url);

        // Fall back to all relays if none are marked as read
        const targets = readRelays.length > 0
          ? readRelays
          : relayMetadata.current.relays.map((r) => r.url);

        return new Map(targets.map((url) => [url, filters]));
      },
      eventRouter(_event: NostrEvent) {
        const writeRelays = relayMetadata.current.relays
          .filter((r) => r.write)
          .map((r) => r.url);

        // Fall back to all relays if none are marked as write
        return writeRelays.length > 0
          ? writeRelays
          : relayMetadata.current.relays.map((r) => r.url);
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;
