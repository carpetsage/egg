import { getLocalStorage, getLocalStorageNoPrefix, setLocalStorage, setLocalStorageNoPrefix } from './utils';

const SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY = 'siteWideSavedPlayerId';
const TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY = 'playerId';
const SITE_WIDE_SAVED_PLAYER_IDS_LOCALSTORAGE_KEY = 'siteWideSavedPlayerIds';

export function getSavedPlayerID(): string | undefined {
  return (
    getLocalStorage(TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY) ||
    getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY)
  );
}

export function savePlayerID(playerId: string): void {
  setLocalStorage(TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY, playerId);
  setLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY, playerId);
}

export function getSavedPlayerIDs(): string[] | undefined {
  try {
    const stored = getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_IDS_LOCALSTORAGE_KEY);
    const parsed = JSON.parse(stored || '[]');
    if (!Array.isArray(parsed)) {
      throw new Error(`${SITE_WIDE_SAVED_PLAYER_IDS_LOCALSTORAGE_KEY}: not an array: ${stored}`);
    }
    return parsed;
  } catch (e) {
    console.warn(e);
    return [];
  }
}

export function savePlayerIDs(playerIds: Set<string>) {
  setLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_IDS_LOCALSTORAGE_KEY, JSON.stringify([...playerIds]));
}
