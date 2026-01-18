import { ei } from './proto';
import { allModifiersFromColleggtibles, maxModifierFromColleggtibles } from './collegtibles';
import { Artifact } from './artifacts/effects';
import {
  eggValueMultiplier,
  awayEarningsMultiplier,
  researchPriceMultiplierFromArtifacts,
} from './artifacts/virtue_effects';

/**
 * Convert a multiplier to Truth Egg equivalent.
 * Since TE affects earnings by 1.1^TE, we use logarithms to convert:
 * If earnings = 1.1^TE_base * multiplier, then
 * equivalent TE = log(multiplier) / log(1.1)
 *
 * @param multiplier - The multiplier to convert (e.g., 2 for 2x, 0.5 for 50% discount)
 * @returns The TE equivalent value
 */
export function multiplierToTE(multiplier: number): number {
  return Math.log(multiplier) / Math.log(1.1);
}

/**
 * Calculate the Clothed Truth Egg value of artifacts only.
 * This returns the TE bonus from artifacts without considering colleggtibles or epic research.
 *
 * @param artifacts - Array of artifacts with their specifications
 * @returns The TE equivalent value of the artifacts
 */
export function cteFromArtifacts(artifacts: Artifact[]): number {
  const eggValueMult = eggValueMultiplier(artifacts);
  const awayEarningsMult = awayEarningsMultiplier(artifacts);
  const researchPriceMult = researchPriceMultiplierFromArtifacts(artifacts);
  const researchDiscountEffect = 1 / researchPriceMult;

  // Combine all artifact multipliers
  const totalMultiplier = eggValueMult * awayEarningsMult * researchDiscountEffect;

  return multiplierToTE(totalMultiplier);
}

export function cteFromColleggtibles(backup: ei.IBackup): number {
  // Get current modifiers from colleggtibles
  const currentModifiers = allModifiersFromColleggtibles(backup);

  // Get max possible modifiers from colleggtibles
  const maxEarningsModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.EARNINGS);
  const maxAwayEarningsModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.AWAY_EARNINGS);
  const maxResearchCostModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.RESEARCH_COST);

  // Calculate colleggtible penalties
  // These represent what fraction of max power we have
  const earningsPenalty = currentModifiers.earnings / maxEarningsModifier;
  const awayEarningsPenalty = currentModifiers.awayEarnings / maxAwayEarningsModifier;
  const researchCostPenalty = maxResearchCostModifier / currentModifiers.researchCost;

  // Combine all colleggtible penalties
  const totalPenalty = earningsPenalty * awayEarningsPenalty * researchCostPenalty;

  return multiplierToTE(totalPenalty);
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
 * @param truthEggs - Number of Truth Eggs
 * @param artifacts - Artifact setup
 * @param researchPriceMultiplierFromResearches - Function to calculate research price multiplier from researches
 * @returns Clothed TE value
 */
export function calculateClothedTE(
  backup: ei.IBackup,
  truthEggs: number,
  artifacts: Artifact[],
  researchPriceMultiplierFromResearches: (farm: ei.Backup.ISimulation, progress: ei.Backup.IGame) => number
): number {
  const farm = backup.farms![0];
  const progress = backup.game!;

  // Calculate epic research multiplier (Lab Upgrade) - actual level from backup
  const erResearchMult = researchPriceMultiplierFromResearches(farm, progress);
  const maxErResearchMult = 1 + 10 * -0.05; // Max level 10, -5% per level = 0.5 (50% discount)
  const erMult = maxErResearchMult / erResearchMult;

  // Standard permit penalty (50% offline earnings)
  const permitMult = progress.permitLevel === 1 ? 1 : 0.5;
  // This represents the total earnings multiplier from all sources

  const totalMultiplier = erMult * permitMult;

  // Convert multiplier to TE equivalent
  const multiplierAsTE = multiplierToTE(totalMultiplier);
  const clothedTE = truthEggs + multiplierAsTE + cteFromArtifacts(artifacts) + cteFromColleggtibles(backup);

  return clothedTE;
}
