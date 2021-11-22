import { ref } from 'vue';

import {
  ei,
  getLocalStorage,
  isShipsConfig,
  perfectShipsConfig,
  setLocalStorage,
  ShipsConfig,
} from 'lib';

export const CONFIG_LOCALSTORAGE_KEY = 'config';

// config is persisted through a watch in App.vue.
export const config = ref(loadConfig());
export const configModalOpen = ref(false);

export function setEpicResearchFTLLevel(level: number): void {
  config.value.epicResearchFTLLevel = level;
}

export function setEpicResearchZerogLevel(level: number): void {
  config.value.epicResearchZerogLevel = level;
}

export function setShipLevel(ship: ei.MissionInfo.Spaceship, level: number): void {
  config.value.shipLevels[ship] = level;
}

export function loadConfig(): ShipsConfig {
  const str = getLocalStorage(CONFIG_LOCALSTORAGE_KEY);
  if (!str) {
    return perfectShipsConfig;
  }
  let storedConfig: unknown;
  try {
    storedConfig = JSON.parse(str);
  } catch (err) {
    console.warn(`error parsing config: ${err}`);
    return perfectShipsConfig;
  }
  if (isShipsConfig(storedConfig)) {
    return storedConfig;
  } else {
    return perfectShipsConfig;
  }
}

export function persistConfig() {
  setLocalStorage(CONFIG_LOCALSTORAGE_KEY, JSON.stringify(config.value));
}

export function openConfigModal(): void {
  configModalOpen.value = true;
}

export function closeConfigModal(): void {
  configModalOpen.value = false;
}
