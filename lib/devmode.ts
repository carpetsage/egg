import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from './utils';

const DEVMODE_KEY = 'devmode';

export function getDevModeOn(): boolean {
  return getLocalStorageNoPrefix(DEVMODE_KEY) === 'true';
}

export function turnOnDevMode(): void {
  setLocalStorageNoPrefix(DEVMODE_KEY, true);
}
