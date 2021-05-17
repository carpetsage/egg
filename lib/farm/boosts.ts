import { Farm } from './farm';

export interface BoostType {
  id: string;
  multiplier: number;
  durationSeconds: number;
}

export interface BoostInstance extends BoostType {
  secondsRemaining: number;
}

const tachyonPrismTypes: BoostType[] = [
  {
    id: 'tachyon_prism_blue',
    multiplier: 10,
    durationSeconds: 1800, // 30min
  },
  {
    id: 'tachyon_prism_blue_big',
    multiplier: 10,
    durationSeconds: 14400, // 4hr
  },

  {
    id: 'tachyon_prism_purple',
    multiplier: 100,
    durationSeconds: 1200, // 20min
  },
  {
    id: 'tachyon_prism_purple_big',
    multiplier: 100,
    durationSeconds: 7200, // 2hr
  },

  {
    id: 'tachyon_prism_orange',
    multiplier: 1000,
    durationSeconds: 600, // 10min
  },
  {
    id: 'tachyon_prism_orange_big',
    multiplier: 1000,
    durationSeconds: 3600, // 1hr
  },
];

const boostBeaconTypes: BoostType[] = [
  {
    id: 'boost_beacon_blue',
    multiplier: 2,
    durationSeconds: 1800, // 30min
  },
  {
    id: 'boost_beacon_purple',
    multiplier: 10,
    durationSeconds: 600, // 10min
  },
  {
    id: 'boost_beacon_blue_big',
    multiplier: 5,
    durationSeconds: 3600, // 1hr
  },
  {
    id: 'boost_beacon_orange',
    multiplier: 50,
    durationSeconds: 600, // 10min
  },
];

function activeBoosts(farm: Farm, relevantTypes: BoostType[]): BoostInstance[] {
  const boosts = <BoostInstance[]>[];
  for (const activeBoost of farm.farm.activeBoosts || []) {
    const boostId = activeBoost.boostId || '';
    const secondsRemaining = activeBoost.timeRemaining || 0;
    if (boostId == '' || secondsRemaining <= 0) {
      continue;
    }
    for (const boostType of relevantTypes) {
      if (boostId == boostType.id) {
        boosts.push({
          ...boostType,
          secondsRemaining,
        });
      }
    }
  }
  return boosts;
}

export function activeTachyonPrisms(farm: Farm): BoostInstance[] {
  return activeBoosts(farm, tachyonPrismTypes);
}

export function activeBoostBeacons(farm: Farm): BoostInstance[] {
  return activeBoosts(farm, boostBeaconTypes);
}

export function internalHatcheryRateBoostMultiplier(
  farm: Farm,
  activeTachyonPrisms: BoostInstance[],
  activeBoostBeacons: BoostInstance[]
): number {
  const tachyonPrismMultiplier = activeTachyonPrisms.reduce(
    (total, boost) => total + boost.multiplier,
    0
  );

  let multiplier = 1;
  if (tachyonPrismMultiplier > 0) {
    const boostBeaconMultiplier = activeBoostBeacons.reduce(
      (total, boost) => total + boost.multiplier,
      0
    );
    multiplier =
      tachyonPrismMultiplier *
      (boostBeaconMultiplier > 0 ? boostBeaconMultiplier : 1) *
      farm.artifactSet.boostEffectMultiplier;
  }
  return multiplier;
}
