import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from '.';

const SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY = 'siteWideSavedPlayerId';

export function getSiteWideSavedPlayerID(): string | undefined {
  return getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY);
}

export function setSiteWideSavedPlayerID(playerId: string): void {
  setLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY, playerId);
}
