// Instance generation for the arena.
//
// An instance here is whatever a player could actually configure in the UI:
// target set, ship levels and visibility, epic research, tank, effort level,
// horizon, crafting level, previous crafts. The sampling is uniform over that
// space on purpose — no structure is designed in, because hand-shaped instances
// only ever catch bugs someone already thought of.
//
// The consequence, measured on the default 40-seed sweep, is that a third of
// instances come back at or near zero probability (chiefly four-target ones on
// a weak fleet). Those are real configurations a player can enter, so they stay
// in the sample; the log-space comparisons in `invariants.ts` are what keep them
// informative instead of silently inert.

import { ei, fuelTankSizes, newShipsConfig, shipMaxLevel, spaceshipList, type ShipsConfig } from 'lib';
import { EFFORT_LEVELS, type EffortLevel } from '@/store/schema';
import { candidateTargets, mulberry32, pick, randInt } from '../generate';

export interface ArenaInstance {
  label: string;
  seed: number;
  targets: string[];
  config: ShipsConfig;
  craftingLevel: number;
  previousCrafts: number;
  fuelCapacity: number;
  timeCapacity: number;
  effort: EffortLevel;
}

export function generateInstance(seed: number): ArenaInstance {
  const rng = mulberry32(seed * 7919 + 13);

  const pool = candidateTargets();
  const targetCount = randInt(rng, 1, 4);
  const targets: string[] = [];
  while (targets.length < targetCount) {
    const t = pick(rng, pool);
    if (!targets.includes(t)) targets.push(t);
  }

  const config = newShipsConfig();
  config.epicResearchFTLLevel = randInt(rng, 0, 60);
  config.epicResearchZerogLevel = randInt(rng, 0, 10);
  config.showNodata = false;
  // At least one FTL ship stays visible, or there is nothing to target with.
  let anyFtl = false;
  for (const s of spaceshipList) {
    config.shipLevels[s] = randInt(rng, 0, shipMaxLevel(s));
    config.shipVisibility[s] = rng() < 0.75;
    if (config.shipVisibility[s] && s >= ei.MissionInfo.Spaceship.MILLENIUM_CHICKEN) anyFtl = true;
  }
  if (!anyFtl) {
    config.shipVisibility[ei.MissionInfo.Spaceship.HENERPRISE] = true;
    config.shipLevels[ei.MissionInfo.Spaceship.HENERPRISE] = shipMaxLevel(ei.MissionInfo.Spaceship.HENERPRISE);
  }

  return {
    label: `arena:${seed}`,
    seed,
    targets,
    config,
    craftingLevel: randInt(rng, 1, 30),
    previousCrafts: pick(rng, [0, 10, 50, 100, 300]),
    fuelCapacity: fuelTankSizes[randInt(rng, 2, fuelTankSizes.length - 1)],
    timeCapacity: randInt(rng, 1, 30) * 86400,
    effort: pick(rng, [...EFFORT_LEVELS]),
  };
}

export function describeInstance(inst: ArenaInstance): string {
  return (
    `${inst.label}: ${inst.targets.length} target(s) [${inst.targets.join(', ')}], ` +
    `effort=${inst.effort}, ${(inst.timeCapacity / 86400).toFixed(0)}d, ` +
    `fuel=${inst.fuelCapacity.toExponential(1)}, craft=${inst.craftingLevel}, prev=${inst.previousCrafts}`
  );
}
