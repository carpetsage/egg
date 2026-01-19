import { ei } from './proto';
import { allModifiersFromColleggtibles, maxModifierFromColleggtibles, Modifiers } from './collegtibles';
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
  console.log(researchPriceMult);
  const researchDiscountEffect = 1 / researchPriceMult;

  // Combine all artifact multipliers
  const totalMultiplier = eggValueMult * awayEarningsMult * researchDiscountEffect;

  return multiplierToTE(totalMultiplier);
}

export function cteFromColleggtiblesFromBackup(backup: ei.IBackup): number {
  const currentModifiers = allModifiersFromColleggtibles(backup);
  return cteFromColleggtibles(currentModifiers);
}

export function cteFromColleggtibles(modifiers: Modifiers): number {
  // Get max possible modifiers from colleggtibles
  const maxEarningsModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.EARNINGS);
  const maxAwayEarningsModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.AWAY_EARNINGS);
  const maxResearchCostModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.RESEARCH_COST);

  // Calculate colleggtible penalties
  // These represent what fraction of max power we have
  const earningsPenalty = modifiers.earnings / maxEarningsModifier;
  const awayEarningsPenalty = modifiers.awayEarnings / maxAwayEarningsModifier;
  const researchCostPenalty = maxResearchCostModifier / modifiers.researchCost;

  // Combine all colleggtible penalties
  const totalPenalty = earningsPenalty * awayEarningsPenalty * researchCostPenalty;

  return multiplierToTE(totalPenalty);
}
