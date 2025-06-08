import {
  deleteLocalStorage,
  deleteLocalStorageNoPrefix,
  getLocalStorage,
  getLocalStorageNoPrefix,
  setLocalStorage,
  setLocalStorageNoPrefix,
} from './utils';
import useEidsStore from './stores/eids';
import { EidStoreFromDiskSchema, PlayerIdSchema } from './schema';

const SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY = 'siteWideSavedPlayerId';
const TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY = 'playerId';
const SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY = 'siteWideSavedPlayerNames';

export function getSavedPlayerID() {
  const playerId =
    getLocalStorage(TOOL_SPECIFIC_PLAYER_ID_LOCALSTORAGE_KEY) ||
    getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_ID_LOCALSTORAGE_KEY);
  const result = PlayerIdSchema.safeParse(playerId);
  if (!result.success) {
    console.warn('Invalid player ID in localStorage:', result.error);
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
  const storedNames = getLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY);
  const parsedNames = JSON.parse(storedNames || '{}');

  const result = EidStoreFromDiskSchema.safeParse(parsedNames);
  if (!result.success) {
    console.warn('Invalid player names data in localStorage: ', storedNames, result.error.message);
    deleteLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY);
    return new Map<string, string | undefined>();
  }

  // Convert the validated object to a Map
  return new Map(Object.entries(result.data));
}

export function savePlayerIDs(playerIDs: Map<string, string | undefined>): void {
  const obj = Object.fromEntries(playerIDs);
  const output = JSON.stringify(obj);
  setLocalStorageNoPrefix(SITE_WIDE_SAVED_PLAYER_NAMES_LOCALSTORAGE_KEY, output);
}
