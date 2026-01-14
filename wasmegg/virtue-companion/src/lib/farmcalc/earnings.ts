import {
  ei,
  Modifiers,
  maxModifierFromColleggtibles,
  allModifiersFromColleggtibles,
  getNumTruthEggs,
  recommendArtifactSet,
  Strategy,
  Contender,
} from 'lib';
import { awayEarningsMultiplier, eggValueMultiplier, researchPriceMultiplierFromArtifacts } from '../effects';
import { Artifact, Stone } from '../types';
import { farmEarningBonus } from './earning_bonus';
import { farmEggValue, farmEggValueResearches } from './egg_value';
import { farmEggLayingRate } from './laying_rate';
import { farmMaxRCB, farmMaxRCBResearches } from './max_rcb';
import { farmShippingCapacity } from './shipping_capacity';
import { researchPriceMultiplierFromResearches } from './research_price';
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
export function calculateClothedTE(backup: ei.IBackup, artifactsOverride?: Artifact[]): number {
  const farm = backup.farms![0];
  const progress = backup.game!;
  const artifacts = artifactsOverride ?? homeFarmArtifacts(backup, true);
  const truthEggs = getNumTruthEggs(backup);

  // Get current modifiers from colleggtibles
  const currentModifiers = allModifiersFromColleggtibles(backup);

  // Get max possible modifiers from colleggtibles
  const maxEarningsModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.EARNINGS);
  const maxAwayEarningsModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.AWAY_EARNINGS);
  const maxResearchCostModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.RESEARCH_COST);

  // Calculate multipliers from artifacts
  const eggValueMult = eggValueMultiplier(artifacts);
  const awayEarningsMult = awayEarningsMultiplier(artifacts);
  const artifactResearchPriceMult = researchPriceMultiplierFromArtifacts(artifacts);

  // Calculate epic research multiplier (Lab Upgrade) - actual level from backup
  const epicResearchMult = researchPriceMultiplierFromResearches(farm, progress);
  const maxEpicResearchMult = 1 + 10 * -0.05; // Max level 10, -5% per level = 0.5 (50% discount)

  // Standard permit penalty (50% offline earnings)
  const permitMult = progress.permitLevel === 1 ? 1 : 0.5;

  // Calculate effective multipliers
  // For earnings sources (egg value, offline earnings), higher is better
  const earningsEffect = eggValueMult * awayEarningsMult;

  // For cost modifiers, we want to know what fraction of max discount we have
  // Research discount is multiplicative, so we convert to "effective earnings boost"
  // A 50% research discount (0.5x) is equivalent to 2x effective earnings (1/0.5 = 2)
  const currentResearchPriceMult = artifactResearchPriceMult * epicResearchMult * currentModifiers.researchCost;
  const researchDiscountEffect = 1 / currentResearchPriceMult;
  const maxResearchDiscountEffect = 1 / (maxEpicResearchMult * maxResearchCostModifier);

  // Calculate colleggtible penalties
  // These represent what fraction of max power we have
  const earningsPenalty = currentModifiers.earnings / maxEarningsModifier;
  const awayEarningsPenalty = currentModifiers.awayEarnings / maxAwayEarningsModifier;
  const researchCostPenalty = researchDiscountEffect / maxResearchDiscountEffect;

  // Combine all multipliers
  // This represents the total earnings multiplier from all sources
  const totalMultiplier = earningsEffect * permitMult * earningsPenalty * awayEarningsPenalty * researchCostPenalty;

  // Convert multiplier to TE equivalent
  // Since TE affects earnings by 1.1^TE, we use logarithms to convert back:
  // If earnings = 1.1^TE_base * multiplier, then
  // equivalent TE = TE_base + log(multiplier) / log(1.1)
  const multiplierAsTE = Math.log(totalMultiplier) / Math.log(1.1);
  const clothedTE = truthEggs + multiplierAsTE;

  return clothedTE;
}

/**
 * Calculate the maximum possible Clothed TE from available artifacts.
 * Uses the shared recommendation algorithm from /lib with virtue strategy.
 *
 * @param backup - The backup data
 * @returns Object with max clothed TE and the optimal artifact set
 */
export function calculateMaxClothedTE(backup: ei.IBackup) {
  const inventory = backup.artifactsDb?.virtueAfxDb?.inventoryItems;
  if (!inventory) {
    return { clothedTE: calculateClothedTE(backup), artifacts: [] };
  }

  // Determine strategy based on permit
  const progress = backup.game!;
  const strategy = progress.permitLevel === 1 ? Strategy.PRO_PERMIT_VIRTUE_CTE : Strategy.STANDARD_PERMIT_VIRTUE_CTE;

  // Get recommendation from shared algorithm
  const winner = recommendArtifactSet(backup, strategy, { debug: false });

  // Convert Contender to Artifact[] format expected by virtue companion
  const artifacts = contenderToArtifacts(winner, backup);

  const clothedTE = calculateClothedTE(backup, artifacts);
  return { clothedTE, artifacts };
}

/**
 * Convert a Contender (from recommendation algorithm) to Artifact[] format.
 * Matches stones to artifacts by filling slots greedily.
 */
function contenderToArtifacts(contender: Contender, _backup: ei.IBackup): Artifact[] {
  const result: Artifact[] = [];
  const stones = [...contender.stones];

  for (const artifactItem of contender.artifacts) {
    const artifact: Artifact = {
      ...artifactItem,
      stones: [],
    };

    // Fill this artifact's slots with stones
    for (let i = 0; i < artifactItem.slots && stones.length > 0; i++) {
      artifact.stones.push(stones.shift()! as Stone);
    }

    result.push(artifact);
  }

  return result;
}
