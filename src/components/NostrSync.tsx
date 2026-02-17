import { useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * Syncs NIP-65 relay list (kind 10002) from the network into app config.
 * Renders null — place inside NostrProvider.
 */
export function NostrSync() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, updateConfig } = useAppContext();

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    (async () => {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(3000)]);
        const events = await nostr.query(
          [{ kinds: [10002], authors: [user.pubkey], limit: 1 }],
          { signal },
        );

        if (events.length === 0) return;

        const event = events[0];

        // Only update if the event is newer than what we have
        if (event.created_at <= config.relayMetadata.updatedAt) return;

        const relays = event.tags
          .filter(([name]) => name === 'r')
          .map(([, url, marker]) => ({
            url,
            read: !marker || marker === 'read',
            write: !marker || marker === 'write',
          }));

        if (relays.length === 0) return;

        updateConfig((current) => ({
          ...current,
          relayMetadata: {
            relays,
            updatedAt: event.created_at,
          },
        }));
      } catch {
        // Silently fail — network issues shouldn't break the app
      }
    })();

    return () => controller.abort();
  }, [user, nostr, config.relayMetadata.updatedAt, updateConfig]);

  return null;
}
