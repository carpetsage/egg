import {
  deleteLocalStorage,
  deleteLocalStorageNoPrefix,
  getLocalStorage,
  getLocalStorageNoPrefix,
  setLocalStorage,
  setLocalStorageNoPrefix,
} from './utils';
import useEidsStore from './stores/eids';
import { EidStoreFromDiskSchema, EidStoreLegacyFromDiskSchema, PlayerIdSchema } from './schema';
import type { EidEntry } from './schema';

// Re-exported for existing importers (e.g. lib/stores/eids); the canonical
// definition is inferred from EidEntrySchema in schema.ts.
export type { EidEntry };

const SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY = 'siteWideSavedPlayerId';
const TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY = 'playerId';
// Legacy key holding EID -> string (manual nickname). Older deployed bundles
// still read and write it, so we read it once for migration but never write or
// delete it — that lets a stale cached bundle keep working without either side
// wiping the other.
const SITE_WIDE_SAVED_PLAYER_NAMES_LEGACY_LOCALSTORAGE_KEY = 'siteWideSavedPlayerNames';
// Current key holding EID -> entry object. Versioned so old bundles (which
// validate values as strings) never parse it and delete it on failure.
const SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY = 'siteWideSavedPlayerNamesV2';

function parseJSON(raw: string | null | undefined): unknown {
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function getSavedPlayerID() {
  const playerId =
    getLocalStorage(TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY) ||
    getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY);
  const result = PlayerIdSchema.safeParse(playerId);
  if (!result.success) {
    console.warn('Invalid player ID in localStorage:', playerId, result.error);
    deletePlayerID();
    return undefined;
  }
  return result.data;
}

export function savePlayerID(playerId: string): void {
  setLocalStorage(TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY, playerId);
  setLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY, playerId);
  useEidsStore().addEid(playerId);
}

export function deletePlayerID() {
  deleteLocalStorage(TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY);
  deleteLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY);
}

export function getSavedPlayerIDs() {
  // Prefer the current (versioned) object store.
  const current = getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY);
  if (current) {
    const result = EidStoreFromDiskSchema.safeParse(parseJSON(current));
    if (result.success) {
      // Values are already validated EidEntry objects.
      return new Map<string, EidEntry>(Object.entries(result.data));
    }
    console.warn('Invalid player names data in localStorage: ', current, result.error.message);
    deleteLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY);
    return new Map<string, EidEntry>();
  }

  // No current data yet: migrate from the legacy key (EID -> string nickname,
  // or an object from an early build). Leave the legacy key in place so a stale
  // cached old bundle keeps working; the first save writes the versioned key.
  const legacy = getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LEGACY_LOCALSTORAGE_KEY);
  const result = EidStoreLegacyFromDiskSchema.safeParse(parseJSON(legacy) ?? {});
  if (!result.success) {
    return new Map<string, EidEntry>();
  }
  const entries = new Map<string, EidEntry>();
  for (const [eid, value] of Object.entries(result.data)) {
    // Legacy values were a bare string (a manual nickname); migrate into the
    // nickname slot. Object values are already EidEntry.
    entries.set(eid, typeof value === 'string' ? (value ? { nickname: value } : {}) : value);
  }
  return entries;
}

export function savePlayerIDs(playerIDs: Map<string, EidEntry>): void {
  const obj = Object.fromEntries(playerIDs);
  const output = JSON.stringify(obj);
  setLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY, output);
}
