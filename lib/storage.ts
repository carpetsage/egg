import {
  getLocalStorage,
  getLocalStorageNoPrefix,
  setLocalStorage,
  setLocalStorageNoPrefix,
} from './utils';
import useEidsStore from './stores/eids';

const SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY = 'siteWideSavedPlayerId';
const TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY = 'playerId';
const SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY = 'siteWideSavedPlayerNames';

export interface EidEntry {
  id: string;
  name?: string;
}

export function getSavedPlayerID(): string | undefined {
  return (
    getLocalStorage(TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY) ||
    getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY)
  );
}

export function savePlayerID(playerId: string): void {
  setLocalStorage(TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY, playerId);
  setLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY, playerId);
  useEidsStore().addEid(playerId);
}

export function getSavedPlayerIDs(): EidEntry[] | undefined {
  try {
    const storedNames = getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY);
    const parsedNames = JSON.parse(storedNames || '{}');

    if (typeof parsedNames !== 'object' || parsedNames === null) {
      throw new Error(
        `${SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY}: not an object: ${storedNames}`
      );
    }

    return Object.entries(parsedNames).map(([id, name]) => ({
      id,
      name: name as string,
    }));
  } catch (e) {
    console.warn(e);
    return [];
  }
}

export function savePlayerIDs(entries: Set<EidEntry>) {
  const names = Object.fromEntries(
    Array.from(entries).map((entry) => [entry.id, entry.name || ''])
  );
  setLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY, JSON.stringify(names));
}
