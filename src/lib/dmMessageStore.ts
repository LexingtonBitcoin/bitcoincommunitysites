import { openDB, type IDBPDatabase } from 'idb';
import type { NostrEvent } from '@nostrify/nostrify';

const DB_NAME = `nostr-dm-store-${globalThis.location?.hostname ?? 'default'}`;
const STORE_NAME = 'messages';
const DB_VERSION = 1;

interface DMStore {
  [STORE_NAME]: {
    key: string;
    value: NostrEvent[];
  };
}

async function getDB(): Promise<IDBPDatabase<DMStore>> {
  return openDB<DMStore>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

/** Persist encrypted messages for a user to IndexedDB. */
export async function writeMessagesToDB(userId: string, messages: NostrEvent[]): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, messages, userId);
}

/** Retrieve stored messages for a user from IndexedDB. */
export async function readMessagesFromDB(userId: string): Promise<NostrEvent[]> {
  const db = await getDB();
  return (await db.get(STORE_NAME, userId)) ?? [];
}

/** Remove single user data from IndexedDB. */
export async function deleteMessagesFromDB(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, userId);
}

/** Wipe entire DM message store. */
export async function clearAllMessages(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
