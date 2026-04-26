import { computed, ref, shallowRef } from 'vue';

import {
  ei,
  fixOldShipsConfig,
  fuelTankSizes,
  getArtifactTierPropsFromId,
  getCraftingLevelFromXp,
  getLocalStorage,
  getXPFromCraftingLevel,
  Inventory,
  isOldShipsConfig,
  isShipsConfig,
  newShipsConfig,
  perfectShipsConfig,
  setLocalStorage,
  shipLevelLaunchPointThresholds,
  ShipsConfig,
  spaceshipList,
} from 'lib';

import Spaceship = ei.MissionInfo.Spaceship;
import DurationType = ei.MissionInfo.DurationType;

export const CONFIG_LOCALSTORAGE_KEY = 'config';
export const OVERRIDES_LOCALSTORAGE_KEY = 'overrides';
export const EXTRAS_LOCALSTORAGE_KEY = 'extras';

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

export function setShipVisibility(ship: ei.MissionInfo.Spaceship, visible: boolean): void {
  config.value.shipVisibility[ship] = visible;
}

// Per-field override flags. true = use the manual `config` value instead of player data.
export interface OverrideFlags {
  craftingLevel: boolean;
  previousCrafts: boolean;
  epicResearchFTLLevel: boolean;
  epicResearchZerogLevel: boolean;
  shipLevels: Partial<Record<Spaceship, boolean>>;
  shipVisibility: Partial<Record<Spaceship, boolean>>;
  tankLevel: boolean;
}

export const overrides = ref<OverrideFlags>(loadOverrides());
export const playerOverridesModalOpen = ref(false);

export function setOverrideCraftingLevel(b: boolean): void {
  overrides.value.craftingLevel = b;
}

export function setOverridePreviousCrafts(b: boolean): void {
  overrides.value.previousCrafts = b;
}

export function setOverrideFTL(b: boolean): void {
  overrides.value.epicResearchFTLLevel = b;
}

export function setOverrideZerog(b: boolean): void {
  overrides.value.epicResearchZerogLevel = b;
}

export function setOverrideShipLevel(ship: Spaceship, b: boolean): void {
  overrides.value.shipLevels[ship] = b;
}

export function setOverrideShipVisibility(ship: Spaceship, b: boolean): void {
  overrides.value.shipVisibility[ship] = b;
}

export function resetAllOverrides(): void {
  overrides.value = newOverrides();
}

export function takeControlOfAllShips(): void {
  for (const s of spaceshipList) {
    overrides.value.shipLevels[s] = true;
    overrides.value.shipVisibility[s] = true;
  }
}

export function setOverrideTankLevel(b: boolean): void {
  overrides.value.tankLevel = b;
}

// Manual values that aren't part of ShipsConfig (crafting level, prior crafts on the
// targeted artifact). Persisted alongside `config` and `overrides`.
export interface ExtrasConfig {
  craftingLevel: number;
  previousCrafts: number;
  tankLevel: number;
}

export const extras = ref<ExtrasConfig>(loadExtras());

export function setCraftingLevel(level: number): void {
  extras.value.craftingLevel = level;
}

export function setPreviousCraftCount(count: number): void {
  extras.value.previousCrafts = count;
}

export function setTankLevel(level: number): void {
  extras.value.tankLevel = level;
}

// Ephemeral player data — not persisted to localStorage.
export const playerShipsConfig = ref<ShipsConfig | null>(null);
export const playerInventory = shallowRef<Inventory | null>(null);
export const playerTotalCraftingXp = ref<number | null>(null);
export const playerTankLevel = ref<number | null>(null);

// Set by ArtifactMissionOptimizer so the override modal can show the player's prior
// craft count for the artifact currently being targeted.
export const currentOptimizerArtifactId = ref<string | null>(null);

export const playerCraftingLevel = computed<number | null>(() => {
  const xp = playerTotalCraftingXp.value;
  if (xp == null) return null;
  return getCraftingLevelFromXp(xp).level;
});

export const playerPreviousCrafts = computed<number | null>(() => {
  const inv = playerInventory.value;
  const id = currentOptimizerArtifactId.value;
  if (!inv || !id) return null;
  const props = getArtifactTierPropsFromId(id);
  return inv.getItem({ name: props.afx_id, level: props.afx_level }).crafted;
});

// Effective values consumed by the optimizer.
export const effectiveCraftingLevel = computed<number>(() => {
  const player = playerCraftingLevel.value;
  if (player == null) return extras.value.craftingLevel;
  return overrides.value.craftingLevel ? extras.value.craftingLevel : player;
});

export const effectivePreviousCrafts = computed<number>(() => {
  const player = playerPreviousCrafts.value;
  if (player == null) return extras.value.previousCrafts;
  return overrides.value.previousCrafts ? extras.value.previousCrafts : player;
});

export const effectiveTankLevel = computed<number>(() => {
  const player = playerTankLevel.value;
  if (player == null) return fuelTankSizes.length - 1; // largest
  return overrides.value.tankLevel ? extras.value.tankLevel : player;
});

export const effectiveFuelTankCapacity = computed<number>(() => fuelTankSizes[effectiveTankLevel.value]);

// XP value corresponding to `effectiveCraftingLevel` — fed back into the optimizer
// which derives the crafting level via `getCraftingLevelFromXp`.
export const effectiveTotalCraftingXp = computed<number>(() => getXPFromCraftingLevel(effectiveCraftingLevel.value));

// Optimizer always reads this. Without player data: pure manual config.
// With player data: per-field merge governed by `overrides`.
export const effectiveConfig = computed<ShipsConfig>(() => {
  const player = playerShipsConfig.value;
  if (!player) return config.value;
  const o = overrides.value;
  const shipLevels = { ...player.shipLevels };
  const shipVisibility = { ...player.shipVisibility };
  for (const s of spaceshipList) {
    if (o.shipLevels[s]) shipLevels[s] = config.value.shipLevels[s];
    if (o.shipVisibility[s]) shipVisibility[s] = config.value.shipVisibility[s];
  }
  return {
    ...player,
    epicResearchFTLLevel: o.epicResearchFTLLevel ? config.value.epicResearchFTLLevel : player.epicResearchFTLLevel,
    epicResearchZerogLevel: o.epicResearchZerogLevel
      ? config.value.epicResearchZerogLevel
      : player.epicResearchZerogLevel,
    shipLevels,
    shipVisibility,
    showNodata: config.value.showNodata,
    targets: config.value.targets,
  };
});

function computeShipLevelFromPoints(shipType: Spaceship, points: number): number {
  const thresholds = shipLevelLaunchPointThresholds(shipType);
  let level = 0;
  for (; level < thresholds.length; level++) {
    if (points < thresholds[level]) return Math.max(0, level - 1);
  }
  return thresholds.length - 1;
}

export function setPlayerData(backup: ei.IBackup): void {
  if (!backup.game || !backup.artifactsDb) return;

  const base = newShipsConfig(backup.game);

  // Accumulate launch points per ship from completed missions.
  const launchPoints: Partial<Record<Spaceship, number>> = {};
  const hasLaunched: Partial<Record<Spaceship, boolean>> = {};

  const missions = (backup.artifactsDb.missionArchive ?? [])
    .concat(backup.artifactsDb.missionInfos ?? [])
    .filter(m => (m.status ?? 0) >= ei.MissionInfo.Status.EXPLORING);

  for (const mission of missions) {
    const ship = mission.ship!;
    let pts = 1.0;
    if (mission.durationType === DurationType.LONG) pts = 1.4;
    else if (mission.durationType === DurationType.EPIC) pts = 1.8;
    launchPoints[ship] = (launchPoints[ship] ?? 0) + pts;
    hasLaunched[ship] = true;
  }

  for (const shipType of spaceshipList) {
    base.shipLevels[shipType] = computeShipLevelFromPoints(shipType, launchPoints[shipType] ?? 0);
    // Chicken One is always available; other ships require completed missions.
    base.shipVisibility[shipType] = shipType === Spaceship.CHICKEN_ONE ? true : (hasLaunched[shipType] ?? false);
  }

  // Preserve user-configured targets and showNodata — neither comes from the backup.
  base.targets = config.value.targets;
  base.showNodata = config.value.showNodata;

  playerShipsConfig.value = base;

  const inv = new Inventory(backup.artifactsDb, {virtue: true});
  playerInventory.value = inv;
  playerTotalCraftingXp.value = inv.items.reduce((sum, item) => sum + item.totalCraftingXp, 0);
  playerTankLevel.value = backup.artifacts?.tankLevel ?? null;
}

export function clearPlayerData(): void {
  playerShipsConfig.value = null;
  playerInventory.value = null;
  playerTotalCraftingXp.value = null;
  playerTankLevel.value = null;
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
  } else if (isOldShipsConfig(storedConfig)) {
    return fixOldShipsConfig(storedConfig);
  } else {
    return perfectShipsConfig;
  }
}

export function persistConfig() {
  setLocalStorage(CONFIG_LOCALSTORAGE_KEY, JSON.stringify(config.value));
}

export function configWithCustomShipLevel(ship: ei.MissionInfo.Spaceship, level: number): ShipsConfig {
  const shipLevels = { ...config.value.shipLevels };
  shipLevels[ship] = level;
  return {
    ...config.value,
    shipLevels,
  };
}

export function openConfigModal(): void {
  configModalOpen.value = true;
}

export function closeConfigModal(): void {
  configModalOpen.value = false;
}

export function openPlayerOverridesModal(): void {
  playerOverridesModalOpen.value = true;
}

export function closePlayerOverridesModal(): void {
  playerOverridesModalOpen.value = false;
}

function newOverrides(): OverrideFlags {
  return {
    craftingLevel: false,
    previousCrafts: false,
    epicResearchFTLLevel: false,
    epicResearchZerogLevel: false,
    shipLevels: {},
    shipVisibility: {},
    tankLevel: false,
  };
}

function isOverrideFlags(x: unknown): x is OverrideFlags {
  if (!x || typeof x !== 'object') return false;
  const o = x as OverrideFlags;
  return (
    typeof o.previousCrafts === 'boolean' &&
    typeof o.craftingLevel === 'boolean' &&
    typeof o.epicResearchFTLLevel === 'boolean' &&
    typeof o.epicResearchZerogLevel === 'boolean' &&
    typeof o.shipLevels === 'object' &&
    o.shipLevels !== null &&
    typeof o.shipVisibility === 'object' &&
    o.shipVisibility !== null &&
    (o.tankLevel === undefined || typeof o.tankLevel === 'boolean')
  );
}

export function loadOverrides(): OverrideFlags {
  const str = getLocalStorage(OVERRIDES_LOCALSTORAGE_KEY);
  if (!str) return newOverrides();
  try {
    const parsed: unknown = JSON.parse(str);
    if (isOverrideFlags(parsed)) {
      return {
        ...parsed,
        tankLevel: parsed.tankLevel ?? false,
      };
    }
  } catch (err) {
    console.warn(`error parsing overrides: ${err}`);
  }
  return newOverrides();
}

export function persistOverrides(): void {
  setLocalStorage(OVERRIDES_LOCALSTORAGE_KEY, JSON.stringify(overrides.value));
}

function newExtras(): ExtrasConfig {
  return { craftingLevel: 30, previousCrafts: 0, tankLevel: fuelTankSizes.length - 1 };
}

function isExtrasConfig(x: unknown): x is ExtrasConfig {
  if (!x || typeof x !== 'object') return false;
  const e = x as ExtrasConfig;
  return (
    typeof e.craftingLevel === 'number' &&
    typeof e.previousCrafts === 'number' &&
    (e.tankLevel === undefined || typeof e.tankLevel === 'number')
  );
}

export function loadExtras(): ExtrasConfig {
  const str = getLocalStorage(EXTRAS_LOCALSTORAGE_KEY);
  if (!str) return newExtras();
  try {
    const parsed: unknown = JSON.parse(str);
    if (isExtrasConfig(parsed)) {
      return {
        ...parsed,
        tankLevel: parsed.tankLevel ?? fuelTankSizes.length - 1,
      };
    }
  } catch (err) {
    console.warn(`error parsing extras: ${err}`);
  }
  return newExtras();
}

export function persistExtras(): void {
  setLocalStorage(EXTRAS_LOCALSTORAGE_KEY, JSON.stringify(extras.value));
}
