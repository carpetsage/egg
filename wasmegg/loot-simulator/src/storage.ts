import { v4 as uuidv4 } from 'uuid';

import { getLocalStorage, setLocalStorage } from 'lib';
import { itemIds, missionIds } from './data';
import { ItemSelectSpec, MissionSelectSpec } from './types';

export { getLocalStorage, setLocalStorage } from 'lib';

const MISSIONS_KEY = 'missions';
const TARGETS_KEY = 'targets';
const TOTAL_TRIALS_KEY = 'totalTrials';
const SEED_KEY = 'seed';

function isMissionSelectSpecArray(x: unknown): x is MissionSelectSpec[] {
  if (!Array.isArray(x)) {
    return false;
  }
  for (const entry of x) {
    const id = (entry as MissionSelectSpec).id;
    if (!(id === null || missionIds.includes(id))) {
      return false;
    }
    const count = (entry as MissionSelectSpec).count;
    if (!(typeof count === 'number' && isFinite(count))) {
      return false;
    }
  }
  return true;
}

const defaultMissions: MissionSelectSpec[] = [{ id: null, count: 1, rowid: uuidv4() }];

export function getMissions(): MissionSelectSpec[] {
  const raw = getLocalStorage(MISSIONS_KEY) || '[]';
  let parsed: unknown = undefined;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`failed to parse ${MISSIONS_KEY}: ${raw}`);
    parsed = defaultMissions;
  }
  if (isMissionSelectSpecArray(parsed)) {
    return parsed.length > 0 ? parsed : defaultMissions;
  }
  console.error(`invalid ${MISSIONS_KEY}: ${raw}`);
  return defaultMissions;
}

export function setMissions(m: MissionSelectSpec[]): void {
  setLocalStorage(MISSIONS_KEY, JSON.stringify(m));
}

function isItemSelectSpecArray(x: unknown): x is ItemSelectSpec[] {
  if (!Array.isArray(x)) {
    return false;
  }
  for (const entry of x) {
    const id = (entry as ItemSelectSpec).id;
    if (!(id === null || itemIds.includes(id))) {
      return false;
    }
    const count = (entry as ItemSelectSpec).count;
    if (!(typeof count === 'number' && isFinite(count))) {
      return false;
    }
  }
  return true;
}

const defaultItems: ItemSelectSpec[] = [{ id: null, count: 1, rowid: uuidv4() }];

export function getTargets(): ItemSelectSpec[] {
  const raw = getLocalStorage(TARGETS_KEY) || '[]';
  let parsed: unknown = undefined;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`failed to parse ${TARGETS_KEY}: ${raw}`);
    parsed = defaultItems;
  }
  if (isItemSelectSpecArray(parsed)) {
    return parsed.length > 0 ? parsed : defaultItems;
  }
  console.error(`invalid ${TARGETS_KEY}: ${raw}`);
  return defaultItems;
}

export function setTargets(t: ItemSelectSpec[]): void {
  setLocalStorage(TARGETS_KEY, JSON.stringify(t));
}

export function getTotalTrials(): number {
  return parseInt(getLocalStorage(TOTAL_TRIALS_KEY) || '') || 100_000;
}

export function setTotalTrials(n: number): void {
  setLocalStorage(TOTAL_TRIALS_KEY, n);
}

export function getSeed(): string {
  return getLocalStorage(SEED_KEY) || '';
}

export function setSeed(s: string): void {
  setLocalStorage(SEED_KEY, s);
}
