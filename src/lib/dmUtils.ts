import type { NostrEvent } from '@nostrify/nostrify';

/** Validate a NIP-04 DM event has required fields. */
export function validateDMEvent(event: NostrEvent): boolean {
  if (event.kind !== 4) return false;
  const pTag = event.tags.find(([name]) => name === 'p');
  if (!pTag?.[1]) return false;
  if (!event.content) return false;
  return true;
}

/** Extract the recipient pubkey from a DM event's 'p' tag. */
export function getRecipientPubkey(event: NostrEvent): string | undefined {
  return event.tags.find(([name]) => name === 'p')?.[1];
}

/** Determine the other participant in a DM conversation. */
export function getConversationPartner(event: NostrEvent, currentUserPubkey: string): string | undefined {
  const recipient = getRecipientPubkey(event);
  if (!recipient) return undefined;
  // If the event author is the current user, the partner is the recipient.
  // Otherwise the partner is the event author.
  return event.pubkey === currentUserPubkey ? recipient : event.pubkey;
}

/** Smart time formatting for conversation list timestamps. */
export function formatConversationTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Detailed date/time display. */
export function formatFullDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
