import type { NostrEvent } from '@nostrify/nostrify';

/** Protocol used for a DM message. */
export type MessageProtocol = 'nip04' | 'nip17' | 'unknown';

/** Sending mode for DM conversations. */
export type ProtocolMode = 'nip04_only' | 'nip17_only' | 'nip04_or_nip17';

/** Loading phases for the DM system. */
export type LoadingPhase = 'idle' | 'cache' | 'relays' | 'subscriptions' | 'ready';

/** Determine the message protocol from an event's kind. */
export function getMessageProtocol(event: NostrEvent): MessageProtocol {
  if (event.kind === 4) return 'nip04';
  if (event.kind === 1059) return 'nip17';
  return 'unknown';
}

/** Check whether the protocol supports sending messages. */
export function isValidSendProtocol(protocol: MessageProtocol): protocol is 'nip04' | 'nip17' {
  return protocol === 'nip04' || protocol === 'nip17';
}
