<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
    <div class="bg-gray-50 rounded-lg p-2 border border-gray-200">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Vehicles</div>
      <div class="text-sm text-gray-900">{{ formatEIValue(effectiveELR * 3600) }} / hr</div>
      <div class="text-xs text-gray-600">Egg delivery</div>
    </div>
    <div class="bg-gray-50 rounded-lg p-2 border border-gray-200">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Clothed TE</div>
      <div class="text-sm text-gray-900">{{ Math.round(clothedTE).toLocaleString() }}</div>
      <div class="text-xs text-gray-600">Max: {{ Math.round(maxClothedTE).toLocaleString() }}</div>
    </div>

    <div class="bg-gray-50 rounded-lg p-2 border border-gray-200">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Habs</div>
      <div class="text-sm text-gray-900">
        {{ formatEIValue(currentPopulation) }} / {{ formatEIValue(totalHabSpace) }}
      </div>
      <div class="text-xs text-gray-600">{{ populationPercent }}% full</div>
    </div>

    <div v-if="showIHR" class="bg-gray-50 rounded-lg p-2 border border-gray-200">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Internal Hatchery</div>
      <div class="text-sm text-gray-900">{{ formatEIValue(offlineIHR) }}/min</div>
      <div class="text-xs text-gray-600">Offline rate</div>
    </div>

    <div class="bg-gray-50 rounded-lg p-2 border border-gray-200">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Silos</div>
      <div class="text-sm text-gray-900">{{ silosOwned }}</div>
      <div class="text-xs text-gray-600">{{ formatDuration(totalAwayTimeMinutes) }} away</div>
    </div>

    <div class="bg-gray-50 rounded-lg p-2 border border-gray-200">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Earnings</div>
      <div class="text-sm text-gray-900">{{ formatEIValue(relevantEarningRate) }} / s</div>
      <div class="text-xs text-gray-600">
        {{ earningRateLabel }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs, type PropType } from 'vue';
import {
  ei,
  formatEIValue,
  allModifiersFromColleggtibles,
  homeFarmArtifacts,
  farmHabs,
  farmHabSpaceResearches,
  farmHabSpaces,
  farmEggLayingRate,
  farmShippingCapacity,
  farmInternalHatcheryResearches,
  farmInternalHatcheryRates,
  farmEarningRate,
  farmMaxRCB,
  farmMaxRCBResearches,
  calculateDroneValues,
  calculateFarmValue,
  getNumTruthEggs,
  totalAwayTime,
  formatSiloDuration,
} from '@/lib';

export default defineComponent({
  props: {
    backup: { type: Object as PropType<ei.IBackup>, required: true },
    currentPopulation: { type: Number, required: true },
    clothedTE: { type: Number, required: true },
    maxClothedTE: { type: Number, required: true },
    alwaysCountVideoDoubler: { type: Boolean, required: true },
  },
  setup(props) {
    const { backup, currentPopulation, alwaysCountVideoDoubler } = toRefs(props);
    const farm = backup.value.farms![0];
    const progress = backup.value.game!;
    const artifacts = homeFarmArtifacts(backup.value, true);
    const modifiers = allModifiersFromColleggtibles(backup.value);

    const totalTruthEggs = computed(() => getNumTruthEggs(backup.value));

    // Silos
    const silosOwned = computed(() => backup.value.farms?.[0]?.silosOwned || 0);
    const siloCapacityLevel = computed(
      () => backup.value.game?.epicResearch?.find(r => r.id === 'silo_capacity')?.level || 0
    );
    const totalAwayTimeMinutes = computed(() => totalAwayTime(silosOwned.value, siloCapacityLevel.value));

    // Habs
    const habs = farmHabs(farm);
    const habSpaceResearches = farmHabSpaceResearches(farm);
    const habSpaces = farmHabSpaces(habs, habSpaceResearches, artifacts, modifiers.habCap);
    const totalHabSpace = Math.round(habSpaces.reduce((total, s) => total + s));

    // Vehicles
    const eggLayingRate = farmEggLayingRate(farm, progress, artifacts) * modifiers.elr;
    const totalVehicleSpace = farmShippingCapacity(farm, progress, artifacts, modifiers.shippingCap);
    const effectiveELR = Math.min(eggLayingRate, totalVehicleSpace);

    // IHR
    const internalHatcheryResearches = farmInternalHatcheryResearches(farm, progress);
    const { offlineRate: offlineIHR } = farmInternalHatcheryRates(
      internalHatcheryResearches,
      artifacts,
      modifiers.ihr,
      totalTruthEggs.value
    );

    // Earnings
    const {
      onlineBaseline: earningRateOnlineBaseline,
      onlineMaxRCB: earningRateOnlineMaxRCB,
      offline: earningRateOffline,
    } = farmEarningRate(backup.value, farm, progress, artifacts, modifiers);

    // Drone value
    const farmValue = calculateFarmValue(backup.value, farm, progress, artifacts);
    const maxRCB = farmMaxRCB(farmMaxRCBResearches(farm, progress), artifacts);
    const droneValuesAtMaxRCB = calculateDroneValues(farm, progress, artifacts, {
      population: farm.numChickens! as number,
      farmValue,
      rcb: maxRCB,
    });
    const eliteDroneValue = droneValuesAtMaxRCB.elite;

    // Computed values
    const showIHR = computed(() => currentPopulation.value < totalHabSpace);
    const showEliteDrone = computed(() => earningRateOffline < earningRateOnlineMaxRCB);
    const populationPercent = computed(() => Math.round((currentPopulation.value / totalHabSpace) * 100));

    const relevantEarningRate = computed(() => {
      const habsNotFull = currentPopulation.value < totalHabSpace;
      const offlineRate = alwaysCountVideoDoubler.value ? earningRateOffline * 2 : earningRateOffline;

      if (habsNotFull) {
        // When habs not full, relevant online is active/rcb/video doubler
        const relevantOnline = earningRateOnlineMaxRCB * 2;
        return offlineRate > relevantOnline ? offlineRate : relevantOnline;
      } else {
        // When habs full, relevant online is active no running chicken
        const relevantOnline = earningRateOnlineBaseline * 2;
        return offlineRate > relevantOnline ? offlineRate : relevantOnline;
      }
    });

    const earningRateLabel = computed(() => {
      const habsNotFull = currentPopulation.value < totalHabSpace;
      const offlineRate = alwaysCountVideoDoubler.value ? earningRateOffline * 2 : earningRateOffline;
      const showingOffline = relevantEarningRate.value === offlineRate;

      if (showingOffline) {
        return alwaysCountVideoDoubler.value ? 'Offline + Video' : 'Offline';
      } else if (habsNotFull) {
        if (relevantEarningRate.value === earningRateOnlineMaxRCB * 2) {
          return 'Max RCB + Video';
        } else if (relevantEarningRate.value === earningRateOnlineMaxRCB) {
          return 'Max RCB';
        } else {
          return 'Active';
        }
      } else {
        return 'Active (no RC)';
      }
    });

    return {
      totalHabSpace,
      effectiveELR,
      offlineIHR,
      earningRateOnlineBaseline,
      earningRateOnlineMaxRCB,
      earningRateOffline,
      eliteDroneValue,
      showIHR,
      showEliteDrone,
      populationPercent,
      relevantEarningRate,
      earningRateLabel,
      silosOwned,
      totalAwayTimeMinutes,
      formatDuration: formatSiloDuration,
      formatEIValue,
    };
  },
});
</script>
