import type {
    EngineState,
    SimulationContext,
    SimulationResult,
} from './types';
import type {
    EggValueInput,
    HabCapacityInput,
    LayRateInput,
    ShippingCapacityInput,
    EarningsInput,
    IHRInput,
} from '@/types';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { totalAwayTime } from '@/stores/silos';

import { calculateEggValue } from '@/calculations/eggValue';
import { calculateHabCapacity_Full as calculateHabCapacity } from '@/calculations/habCapacity';
import { calculateLayRate } from '@/calculations/layRate';
import { calculateShippingCapacity } from '@/calculations/shippingCapacity';
import { calculateEffectiveLayRate } from '@/calculations/effectiveLayRate';
import { calculateEarnings } from '@/calculations/earnings';
import { calculateIHR } from '@/calculations/internalHatcheryRate';

// Base egg value is always 1 for virtue eggs
const BASE_EGG_VALUE = 1;

/**
 * Purely compute the full snapshot from engine state and context.
 * Bypasses Pinia stores and composables completely.
 */
export function computeSnapshot(
    state: EngineState,
    context: SimulationContext
): SimulationResult {
    const { epicResearchLevels, colleggtibleModifiers } = context;

    // 1. Artifacts - Calculate first as they affect almost everything
    const artifactMods = calculateArtifactModifiers(state.artifactLoadout);

    // 2. Egg Value
    const eggValueInput: EggValueInput = {
        baseValue: BASE_EGG_VALUE,
        researchLevels: state.researchLevels,
        artifactMultiplier: artifactMods.eggValue.totalMultiplier,
        artifactEffects: artifactMods.eggValue.effects,
    };
    const eggValueOutput = calculateEggValue(eggValueInput);

    // 3. Hab Capacity
    const habCapacityInput: HabCapacityInput = {
        habIds: state.habIds,
        researchLevels: state.researchLevels,
        peggMultiplier: colleggtibleModifiers.habCap,
        artifactMultiplier: artifactMods.habCapacity.totalMultiplier,
        artifactEffects: artifactMods.habCapacity.effects,
    };
    const habCapacityOutput = calculateHabCapacity(habCapacityInput);



    // 7. Internal Hatchery Rate (IHR)
    const ihrInput: IHRInput = {
        te: state.te,
        researchLevels: state.researchLevels,
        epicResearchLevels: {
            epicInternalIncubators: epicResearchLevels['epic_internal_incubators'] || 0,
            internalHatcheryCalm: epicResearchLevels['int_hatch_calm'] || 0,
        },
        easterEggMultiplier: colleggtibleModifiers.ihr,
        artifactMultiplier: artifactMods.internalHatcheryRate.totalMultiplier,
        artifactEffects: artifactMods.internalHatcheryRate.effects,
    };
    const ihrOutput = calculateIHR(ihrInput);

    // 8. Population growth (catch-up if starting from a backup)
    let population = state.population || 0;
    let lastStepTime = state.lastStepTime;

    // If time is not initialized (e.g. fresh ascension), base it on the planned start time
    if (lastStepTime < 1e9 && context.ascensionStartTime > 1e9) {
        lastStepTime = context.ascensionStartTime;
    }

    if (lastStepTime > 1e9 && context.ascensionStartTime > lastStepTime) {
        const elapsedSeconds = context.ascensionStartTime - lastStepTime;
        const growthRatePerSecond = ihrOutput.offlineRate / 60;
        const growth = Math.floor(growthRatePerSecond * elapsedSeconds);
        population = Math.min(habCapacityOutput.totalFinalCapacity, population + growth);
        // Once growth is applied, we are at the start of the ascension
        lastStepTime = context.ascensionStartTime;
    }

    // Capture bank value before potential catch-up/passive additions
    let bankValue = state.bankValue || 0;

    // 9. Lay Rate
    // Use the farm's total final capacity for metric calculations.
    // This ensures that metrics like ELR and Earnings reflect the farm's potential 
    // at that stage, and avoids negative deltas when real population is low.
    const layRateInput: LayRateInput = {
        researchLevels: state.researchLevels,
        epicComfyNestsLevel: epicResearchLevels['epic_egg_laying'] || 0,
        siliconMultiplier: colleggtibleModifiers.elr,
        population: population,
        artifactMultiplier: artifactMods.eggLayingRate.totalMultiplier,
        artifactEffects: artifactMods.eggLayingRate.effects,
    };
    const layRateOutput = calculateLayRate(layRateInput);

    // 10. Shipping Capacity
    const shippingInput: ShippingCapacityInput = {
        vehicles: state.vehicles,
        researchLevels: state.researchLevels,
        transportationLobbyistLevel: epicResearchLevels['transportation_lobbyist'] || 0,
        colleggtibleMultiplier: colleggtibleModifiers.shippingCap,
        artifactMultiplier: artifactMods.shippingRate.totalMultiplier,
        artifactEffects: artifactMods.shippingRate.effects,
    };
    const shippingOutput = calculateShippingCapacity(shippingInput);

    // 11. Effective Lay Rate (ELR)
    const elrOutput = calculateEffectiveLayRate(
        layRateOutput.totalRatePerSecond,
        shippingOutput.totalFinalCapacity
    );

    // 12. Earnings
    const earningsInput: EarningsInput = {
        eggValue: eggValueOutput.finalValue,
        effectiveLayRate: elrOutput.effectiveLayRate,
        te: state.te,
        fireworkMultiplier: colleggtibleModifiers.earnings,
        awayEarningsMultiplier: colleggtibleModifiers.awayEarnings,
        artifactAwayMultiplier: artifactMods.awayEarnings.totalMultiplier,
        videoDoublerMultiplier: context.assumeDoubleEarnings ? 2 : 1,
        eventMultiplier: state.earningsBoost.active ? state.earningsBoost.multiplier : 1,
        artifactEffects: artifactMods.awayEarnings.effects,
    };
    const earningsOutput = calculateEarnings(earningsInput);

    // Apply catch-up earnings to bank if this is the start of the ascension 
    // and we were offline. 
    // We use 1e9 as a threshold to distinguish between 0-based simulation time
    // and absolute Unix timestamps from a backup.
    if (state.lastStepTime > 1e9 && context.ascensionStartTime > state.lastStepTime) {
        const elapsedSeconds = context.ascensionStartTime - state.lastStepTime;
        const catchUpGems = earningsOutput.offlineEarnings * elapsedSeconds;
        bankValue += catchUpGems;
    }

    // Normalize rounding errors
    if (earningsOutput.offlineEarnings > 0) {
        if (Math.abs(bankValue) < earningsOutput.offlineEarnings * 1e-6) {
            bankValue = 0;
        }
    }

    // 13. Silo Time
    const siloTimeMinutes = totalAwayTime(
        state.siloCount,
        epicResearchLevels['silo_capacity'] || 0
    );

    // Assemble Snapshot with all inputs and computed outputs
    return {
        // Metrics
        eggValue: eggValueOutput.finalValue,
        habCapacity: habCapacityOutput.totalFinalCapacity,
        elr: elrOutput.effectiveLayRate,
        shippingCapacity: shippingOutput.totalFinalCapacity,
        layRate: layRateOutput.totalRatePerSecond,
        onlineEarnings: earningsOutput.onlineEarnings,
        offlineEarnings: earningsOutput.offlineEarnings,
        onlineIHR: ihrOutput.onlineRate,
        offlineIHR: ihrOutput.offlineRate,
        ratePerChickenPerSecond: layRateOutput.ratePerChickenPerSecond,
        bankValue,

        // State (Pass through inputs for UI reconstruction)
        currentEgg: state.currentEgg,
        shiftCount: state.shiftCount,
        te: state.te,
        soulEggs: state.soulEggs,
        siloCount: state.siloCount,
        siloTimeMinutes,
        fuelTankAmounts: state.fuelTankAmounts,
        eggsDelivered: state.eggsDelivered,
        teEarned: state.teEarned,
        vehicles: state.vehicles,
        habIds: state.habIds,
        researchLevels: state.researchLevels,
        artifactLoadout: state.artifactLoadout,
        activeArtifactSet: state.activeArtifactSet,
        artifactSets: state.artifactSets,
        population,
        lastStepTime,
        activeSales: state.activeSales,
        earningsBoost: state.earningsBoost,
    };
}
