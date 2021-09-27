import {
  getLocalStorage,
  getLocalStorageNoPrefix,
  setLocalStorage,
  setLocalStorageNoPrefix,
} from './utils';

const SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY = 'siteWideSavedPlayerId';
const TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY = 'playerId';

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
