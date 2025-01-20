import { ei } from 'lib';

export function earningsFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.EARNINGS);
}

export function awayEarningsFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.AWAY_EARNINGS);
}  

export function internalHatcheryRateFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE);
}

export function eggLayingRateFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.EGG_LAYING_RATE);
}

export function shippingCapacityFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.SHIPPING_CAPACITY);
}

export function habCapacityFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.HAB_CAPACITY);
}

export function vehicleCostFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.VEHICLE_COST);
}

export function habCostFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.HAB_COST);
}

export function researchCostFromColleggtibles(backup: ei.IBackup) {
    return getColleggtibleBonuses(backup, ei.GameModifier.GameDimension.RESEARCH_COST);
}

function getColleggtibleBonuses(backup: ei.IBackup, dimension: ei.GameModifier.GameDimension): number {
    const contracts = (backup?.contracts?.contracts || []).concat(backup?.contracts?.archive || []);
    if (contracts.length === 0) {
        return 0;
    }
    const colleggs = (backup?.contracts?.customEggInfo);
    if (!colleggs) {
        return 0;
    }

    const dimensionMap: { [key: number]: number } = {};
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

    return dimensionMap[dimension] || 1;
}
