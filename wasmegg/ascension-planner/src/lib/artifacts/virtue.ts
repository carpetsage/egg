import { ei } from 'lib/proto';
import {
    Artifact,
    ArtifactSet,
    Inventory,
    recommendArtifactSet,
    Strategy,
    contenderToArtifactSet,
    newItem,
} from 'lib/artifacts';
import { allModifiersFromColleggtibles, maxModifierFromColleggtibles } from 'lib/collegtibles';
import { getNumTruthEggs } from 'lib/earning_bonus';
import {
    eggValueMultiplier,
    awayEarningsMultiplier,
    researchPriceMultiplierFromArtifacts,
} from 'lib/artifacts/virtue_effects';
import { EquippedArtifact } from './types';
import { libArtifactToEquippedArtifact } from './utils';
import { createEmptyLoadout } from './calculator';

/**
 * Calculate Clothed TE (theoretical earnings metric).
 */
export function calculateClothedTE(
    truthEggs: number,
    artifacts: Artifact[],
    currentColleggtibleModifiers: { earnings: number; awayEarnings: number; researchCost: number },
    maxColleggtibleModifiers: { earnings: number; awayEarnings: number; researchCost: number },
    labUpgradeLevel: number,
    permitLevel: number = 1
): number {
    const eggValueMult = eggValueMultiplier(artifacts);
    const awayEarningsMult = awayEarningsMultiplier(artifacts);
    const artifactResearchPriceMult = researchPriceMultiplierFromArtifacts(artifacts);

    const epicResearchMult = 1 + labUpgradeLevel * -0.05;
    const maxEpicResearchMult = 0.5;

    const permitMult = permitLevel === 1 ? 1 : 0.5;

    const earningsEffect = eggValueMult * awayEarningsMult;
    const currentResearchPriceMult = artifactResearchPriceMult * epicResearchMult * currentColleggtibleModifiers.researchCost;
    const researchDiscountEffect = 1 / currentResearchPriceMult;
    const maxResearchDiscountEffect = 1 / (maxEpicResearchMult * maxColleggtibleModifiers.researchCost);

    const earningsPenalty = currentColleggtibleModifiers.earnings / maxColleggtibleModifiers.earnings;
    const awayEarningsPenalty = currentColleggtibleModifiers.awayEarnings / maxColleggtibleModifiers.awayEarnings;
    const researchCostPenalty = researchDiscountEffect / maxResearchDiscountEffect;

    const totalMultiplier = earningsEffect * permitMult * earningsPenalty * awayEarningsPenalty * researchCostPenalty;
    const multiplierAsTE = Math.log(totalMultiplier) / Math.log(1.1);
    return truthEggs + multiplierAsTE;
}

/**
 * Wrapper for calculateClothedTE that extracts necessary data from backup.
 */
export function calculateClothedTEFromBackup(backup: ei.IBackup, artifacts: Artifact[]): number {
    const truthEggs = getNumTruthEggs(backup);
    const currentModifiers = allModifiersFromColleggtibles(backup);
    const maxEarningsModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.EARNINGS);
    const maxAwayEarningsModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.AWAY_EARNINGS);
    const maxResearchCostModifier = maxModifierFromColleggtibles(ei.GameModifier.GameDimension.RESEARCH_COST);

    const commonResearch = backup.farms?.[0]?.commonResearch || [];
    const labUpgrade = commonResearch.find(r => r.id === 'cheaper_research');
    const labUpgradeLevel = labUpgrade?.level || 0;

    return calculateClothedTE(
        truthEggs,
        artifacts,
        {
            earnings: currentModifiers.earnings,
            awayEarnings: currentModifiers.awayEarnings,
            researchCost: currentModifiers.researchCost,
        },
        {
            earnings: maxEarningsModifier,
            awayEarnings: maxAwayEarningsModifier,
            researchCost: maxResearchCostModifier,
        },
        labUpgradeLevel,
        backup.game?.permitLevel ?? 1
    );
}

/**
 * Get the optimal artifact set for earnings (Clothed TE).
 */
export function getOptimalEarningsSet(backup: ei.IBackup): EquippedArtifact[] {
    if (!backup.artifactsDb) {
        return createEmptyLoadout();
    }

    const inventory = new Inventory(backup.artifactsDb, { virtue: true });

    const libArtifacts: Artifact[] = [];
    const db = backup.artifactsDb?.virtueAfxDb;
    if (db && db.inventoryItems && db.activeArtifacts?.slots) {
        const itemIdToArtifact = new Map(
            db.inventoryItems.map((item: any) => [item.itemId!, item.artifact!])
        );
        for (const slot of db.activeArtifacts.slots) {
            if (slot.occupied && slot.itemId !== undefined && slot.itemId !== null) {
                const artifact = itemIdToArtifact.get(slot.itemId);
                if (artifact && artifact.spec) {
                    libArtifacts.push(
                        new Artifact(
                            newItem(artifact.spec),
                            (artifact.stones || []).map((s: any) => newItem(s))
                        )
                    );
                }
            }
        }
    }
    const equipped = new ArtifactSet(libArtifacts, false);

    const strategy =
        backup.game?.permitLevel === 1 ? Strategy.PRO_PERMIT_VIRTUE_CTE : Strategy.STANDARD_PERMIT_VIRTUE_CTE;

    const contender = recommendArtifactSet(backup, strategy);
    const { artifactSet } = contenderToArtifactSet(contender, equipped, inventory);

    return artifactSet.artifacts.map(libArtifactToEquippedArtifact);
}
