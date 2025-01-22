import { ei } from 'lib';
import { Colleggtible } from '../types';


export function earningsFromColleggtibles(dimensionMap: Colleggtible ) {
    return dimensionMap[ei.GameModifier.GameDimension.EARNINGS] || 1;
}
export function awayEarningsFromColleggtibles(dimensionMap: Colleggtible) {
    return dimensionMap[ei.GameModifier.GameDimension.AWAY_EARNINGS] || 1;
}

export function internalHatcheryRateFromColleggtibles(dimensionMap: Colleggtible) {
    return dimensionMap[ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE] || 1;
}

export function eggLayingRateFromColleggtibles(dimensionMap: Colleggtible) {
    return dimensionMap[ei.GameModifier.GameDimension.EGG_LAYING_RATE] || 1;
}

export function shippingCapacityFromColleggtibles(dimensionMap: Colleggtible) {
    return dimensionMap[ei.GameModifier.GameDimension.SHIPPING_CAPACITY] || 1;
}

export function habCapacityFromColleggtibles(dimensionMap: Colleggtible) {
    return dimensionMap[ei.GameModifier.GameDimension.HAB_CAPACITY] || 1;
}

export function vehicleCostFromColleggtibles(dimensionMap: Colleggtible) {
    return dimensionMap[ei.GameModifier.GameDimension.VEHICLE_COST] || 1;
}

export function habCostFromColleggtibles(dimensionMap: Colleggtible) {
    return dimensionMap[ei.GameModifier.GameDimension.HAB_COST] || 1;
}

export function researchPriceFromColleggtibles(dimensionMap: Colleggtible) {
    return dimensionMap[ei.GameModifier.GameDimension.RESEARCH_COST] || 1;
}

export function getColleggtibleBonuses(backup: ei.IBackup): Colleggtible  {
    const dimensionMap: Colleggtible = {
        [ei.GameModifier.GameDimension.INVALID]: 1,
        [ei.GameModifier.GameDimension.EARNINGS]: 1,
        [ei.GameModifier.GameDimension.AWAY_EARNINGS]: 1,
        [ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE]: 1,
        [ei.GameModifier.GameDimension.EGG_LAYING_RATE]: 1,
        [ei.GameModifier.GameDimension.SHIPPING_CAPACITY]: 1,
        [ei.GameModifier.GameDimension.HAB_CAPACITY]: 1,
        [ei.GameModifier.GameDimension.VEHICLE_COST]: 1,
        [ei.GameModifier.GameDimension.HAB_COST]: 1,
        [ei.GameModifier.GameDimension.RESEARCH_COST]: 1
    };

    const contracts = (backup?.contracts?.contracts || []).concat(backup?.contracts?.archive || []);
    if (contracts.length === 0) {
        return dimensionMap;
    }
    const colleggs = (backup?.contracts?.customEggInfo);
    if (!colleggs) {
        return dimensionMap;
    }

    const eggBonuses: { [key: string]: number } = {};

    for (const contract of contracts) {
        const props = contract.contract!;
        const egg = props.egg;
        const maxFarmSizeReached = contract?.maxFarmSizeReached || 0;
        if (egg === ei.Egg.CUSTOM_EGG) {
            const customEggId = props?.customEggId || "unknown";

            if (!eggBonuses[customEggId]) {
                eggBonuses[customEggId] = maxFarmSizeReached;
            } else {
                eggBonuses[customEggId] = Math.max(eggBonuses[customEggId], maxFarmSizeReached);
            }
        }
    }

    for (const customegg of colleggs) {
        const identifier = customegg?.identifier || "unknown";
        if (identifier !== "unknown" && eggBonuses[identifier]) {
            const maxFarmSize = eggBonuses[identifier];
            const thresholds = [1e7, 1e8, 1e9, 1e10];
            let index = -1;
            if (maxFarmSize >= thresholds[0]) {
                index++;
            }
            if (maxFarmSize >= thresholds[1]) {
                index++;
            }
            if (maxFarmSize >= thresholds[2]) {
                index++;
            }
            if (maxFarmSize >= thresholds[3]) {
                index++;
            }
            if (index == -1) {
                continue;
            }
            let buffValue = 1;
            let eggDimension = ei.GameModifier.GameDimension.INVALID;

            if (customegg.buffs && customegg.buffs[index]) {
                buffValue = customegg.buffs[index]?.value || 0;
                eggDimension = customegg.buffs[index]?.dimension || ei.GameModifier.GameDimension.INVALID;
            }

            if (dimensionMap[eggDimension]?.valueOf() === undefined) {
                dimensionMap[eggDimension] = buffValue;
            } else {
                dimensionMap[eggDimension] *= buffValue;
            }
        }
    }

    //return dimensionMap[dimension] || 1;
    return dimensionMap;
}
