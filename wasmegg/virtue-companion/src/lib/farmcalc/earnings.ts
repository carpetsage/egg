import {
  ei,
  Artifact,
  Stone,
  Modifiers,
  allModifiersFromColleggtibles,
  getNumTruthEggs,
  recommendArtifactSet,
  Strategy,
  Contender,
  contenderToArtifactSet,
  ArtifactSet,
  Inventory,
  cteFromArtifacts,
  cteFromColleggtibles,
  cteFromLabUpgrade,
  multiplierToTE,
} from 'lib';
import { awayEarningsMultiplier } from '../effects';
import { farmEarningBonus } from './earning_bonus';
import { farmEggValue, farmEggValueResearches } from './egg_value';
import { farmEggLayingRate } from './laying_rate';
import { farmMaxRCB, farmMaxRCBResearches } from './max_rcb';
import { farmShippingCapacity } from './shipping_capacity';
import { labUpgradeLevel } from './research_price';
import { homeFarmArtifacts } from './artifacts';

export function farmEarningRate(
  backup: ei.IBackup,
  farm: ei.Backup.ISimulation,
  progress: ei.Backup.IGame,
  artifacts: Artifact[],
  modifiers: Modifiers
): {
  onlineBaseline: number;
  onlineMaxRCB: number;
  offline: number;
} {
  const eggValue = farmEggValue(farmEggValueResearches(farm), artifacts);
  const eggLayingRate = farmEggLayingRate(farm, progress, artifacts) * modifiers.elr;
  const shippingCapacity = farmShippingCapacity(farm, progress, artifacts) * modifiers.shippingCap;
  const earningBonus = farmEarningBonus(backup);
  const onlineBaseline = eggValue * Math.min(eggLayingRate, shippingCapacity) * earningBonus * modifiers.earnings;
  const maxRCB = farmMaxRCB(farmMaxRCBResearches(farm, progress), artifacts);
  const onlineMaxRCB = onlineBaseline * maxRCB;
  // Standard permit earnings halved while offline.
  const offline =
    onlineBaseline *
    (progress.permitLevel === 1 ? 1 : 0.5) *
    awayEarningsMultiplier(artifacts) *
    modifiers.awayEarnings;
  return {
    onlineBaseline,
    onlineMaxRCB,
    offline,
  };
}

/**
 * Calculate "Clothed TE" - effective Truth Egg count adjusted for artifacts and missing bonuses.
 *
 * Clothed TE represents your effective Truth Egg count, adjusted for:
 * - Artifacts (necklace, ankh, shell stones for egg value; totem, lunar stones for offline earnings; cube for research discount)
 * - Missing Colleggtibles (earnings, offline earnings, research discount)
 * - Missing Epic Research (Lab Upgrade research discount)
 *
 * Only considers offline earnings, not RCB. Standard permit players have 50% offline penalty applied.
 *
 * @param backup - The backup data
 * @param artifacts - Optional artifact setup. If not provided, uses currently equipped artifacts
 * @returns Clothed TE value
 */
export function calculateClothedTE(
  backup: ei.IBackup,
  artifactsOverride?: Artifact[],
  currentModifiersOverride?: Modifiers
): number {
  const farm = backup.farms![0];
  const progress = backup.game!;
  const artifacts = artifactsOverride ?? homeFarmArtifacts(backup, true);
  const truthEggs = getNumTruthEggs(backup);
  const currentModifiers = currentModifiersOverride ?? allModifiersFromColleggtibles(backup);

  // Standard permit halves offline earnings.
  const permitPenalty = progress.permitLevel === 1 ? 0 : multiplierToTE(0.5);

  // Composed from the shared lib CTE primitives so the Artifact Sandbox and
  // Virtue Companion compute Clothed TE identically. Each term is the TE
  // equivalent of one contribution: artifact multipliers (bonus), missing
  // colleggtibles (penalty vs max), missing Lab Upgrade (penalty vs max), and
  // the standard-permit penalty.
  return (
    truthEggs +
    cteFromArtifacts(artifacts) +
    cteFromColleggtibles(currentModifiers) +
    cteFromLabUpgrade(labUpgradeLevel(farm, progress)) +
    permitPenalty
  );
}

/**
 * Calculate the maximum possible Clothed TE from available artifacts.
 * Uses the shared recommendation algorithm from /lib with virtue strategy.
 *
 * @param backup - The backup data
 * @returns Object with max clothed TE and the winning contender
 */
export function calculateMaxClothedTE(
  backup: ei.IBackup,
  inventory: Inventory,
  equipped: ArtifactSet,
  currentModifiersOverride?: Modifiers
) {
  // Determine strategy based on permit
  const progress = backup.game!;
  const strategy = progress.permitLevel === 1 ? Strategy.PRO_PERMIT_VIRTUE_CTE : Strategy.STANDARD_PERMIT_VIRTUE_CTE;

  // Get recommendation from smartass algorithm
  const contender = recommendArtifactSet(backup, strategy);

  // Convert Contender to ArtifactSet format
  const recommendedArtifacts = contenderToArtifactSet(contender, equipped, inventory);

  const clothedTE = calculateClothedTE(backup, recommendedArtifacts.artifactSet.artifacts, currentModifiersOverride);
  return { clothedTE, recommendedArtifacts };
}
