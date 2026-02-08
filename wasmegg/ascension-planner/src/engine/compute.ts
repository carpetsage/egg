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

    // 4. Lay Rate
    // Note: uses total capacity as population (assuming full habs)
    const layRateInput: LayRateInput = {
        researchLevels: state.researchLevels,
        epicComfyNestsLevel: epicResearchLevels['epic_egg_laying'] || 0,
        siliconMultiplier: colleggtibleModifiers.elr,
        population: habCapacityOutput.totalFinalCapacity,
        artifactMultiplier: artifactMods.eggLayingRate.totalMultiplier,
        artifactEffects: artifactMods.eggLayingRate.effects,
    };
    const layRateOutput = calculateLayRate(layRateInput);

    // 5. Shipping Capacity
    const shippingInput: ShippingCapacityInput = {
        vehicles: state.vehicles,
        researchLevels: state.researchLevels,
        transportationLobbyistLevel: epicResearchLevels['transportation_lobbyist'] || 0,
        colleggtibleMultiplier: colleggtibleModifiers.shippingCap,
        artifactMultiplier: artifactMods.shippingRate.totalMultiplier,
        artifactEffects: artifactMods.shippingRate.effects,
    };
    const shippingOutput = calculateShippingCapacity(shippingInput);

    // 6. Effective Lay Rate (ELR)
    const elrOutput = calculateEffectiveLayRate(
        layRateOutput.totalRatePerSecond,
        shippingOutput.totalFinalCapacity
    );

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

    // 8. Earnings
    const earningsInput: EarningsInput = {
        eggValue: eggValueOutput.finalValue,
        effectiveLayRate: elrOutput.effectiveLayRate,
        te: state.te,
        fireworkMultiplier: colleggtibleModifiers.earnings,
        awayEarningsMultiplier: colleggtibleModifiers.awayEarnings,
        artifactAwayMultiplier: artifactMods.awayEarnings.totalMultiplier,
        artifactEffects: artifactMods.awayEarnings.effects,
    };
    const earningsOutput = calculateEarnings(earningsInput);

    // 9. Silo Time
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

        // State (Pass through inputs for UI reconstruction)
        currentEgg: state.currentEgg,
        shiftCount: state.shiftCount,
        te: state.te,
        siloCount: state.siloCount,
        siloTimeMinutes,
        fuelTankAmounts: state.fuelTankAmounts,
        eggsDelivered: state.eggsDelivered,
        teEarned: state.teEarned,
        vehicles: state.vehicles,
        habIds: state.habIds,
        researchLevels: state.researchLevels,
        artifactLoadout: state.artifactLoadout,
    };
}
