<template>
  <div>
    <h2 class="font-bold text-gray-900 mb-2 text-sm">Habs</h2>

    <!-- Inventory -->
    <table class="text-sm w-auto">
      <tbody class="divide-y divide-gray-200">
        <tr
          v-for="group in groupedHabs"
          :key="group.name"
          v-tippy="{
            content:
              `${showIcons ? group.name + '<br>' : ''}${formatWithThousandSeparators(group.spacePerUnit)} chickens per hab`.concat(
                group.count > 1
                  ? `<br>${formatWithThousandSeparators(group.spacePerUnit * group.count)} chickens total`
                  : ``
              ),
            allowHTML: true,
          }"
        >
          <td class="py-1 pr-4 text-gray-700 font-medium">
            <img v-if="showIcons" :src="iconURL(group.iconPath, 128)" class="h-14" />
            <span v-else>{{ group.name }}</span>
          </td>
          <td class="py-1 text-right font-semibold text-gray-900 tabular-nums">x{{ group.count }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Unfinished Research -->
    <div v-if="unfinishedResearches.length > 0" class="mt-2 pt-2 border-t border-gray-300">
      <p class="text-xs text-gray-600 mb-1">Unfinished hab research:</p>
      <table class="tabular-nums text-xs w-auto">
        <tbody>
          <tr v-for="research in unfinishedResearches" :key="research.id">
            <td class="text-blue-500 pr-2">{{ research.level }}/{{ research.maxLevel }}</td>
            <td class="text-gray-700">{{ research.name }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="mt-2 pt-2 border-t border-gray-300">
      <p class="text-xs text-green-600">All hab research complete</p>
    </div>

    <!-- Stats -->
    <div class="mt-2 pt-2 border-t border-gray-200">
      <table class="text-sm w-auto">
        <tbody class="divide-y divide-gray-100">
          <tr>
            <td class="py-1.5 pr-4 text-gray-600">Hab space</td>
            <td class="py-1.5 text-right font-medium text-green-600 tabular-nums">
              {{ formatWithThousandSeparators(totalHabSpace) }}
            </td>
          </tr>
          <tr>
            <td class="py-1.5 pr-4 text-gray-600">
              Max effective population
              <base-info
                v-tippy="{
                  content:
                    'The population at which egg laying rate equals shipping capacity. Beyond this population, extra chickens do not contribute to earnings or egg delivery rate.',
                }"
                class="inline relative -top-px ml-1 text-gray-400"
              />
            </td>
            <td class="py-1.5 text-right font-medium text-green-600 tabular-nums">
              {{ formatWithThousandSeparators(Math.round(maxEffectivePopulation)) }}
            </td>
          </tr>
          <tr v-if="maxEffectivePopulation > currentPopulation && maxEffectivePopulation < totalHabSpace">
            <td class="py-1.5 pr-4 text-gray-600 align-top pt-2">Time to max effective pop</td>
            <td class="py-1.5 text-right text-green-600 tabular-nums">
              <div
                v-tippy="{
                  content: `${dayjs(currentTimestamp)
                    .add(calculateTimeToMaxEffective(offlineIHR), 'seconds')
                    .format('LLL')} (offline)`,
                }"
              >
                {{ formatDurationAuto(calculateTimeToMaxEffective(offlineIHR)) }}
                <span class="text-xs text-gray-500">(offline)</span>
              </div>
              <div
                v-tippy="{
                  content: `${dayjs(currentTimestamp)
                    .add(calculateTimeToMaxEffective(onlineIHR), 'seconds')
                    .format('LLL')} (online)`,
                }"
                class="mt-0.5"
              >
                {{ formatDurationAuto(calculateTimeToMaxEffective(onlineIHR)) }}
                <span class="text-xs text-gray-500">(online)</span>
              </div>
            </td>
          </tr>
          <tr>
            <td class="py-1.5 pr-4 text-gray-600">Last save population</td>
            <td class="py-1.5 text-right font-medium text-green-600 tabular-nums">
              {{ formatWithThousandSeparators(lastRefreshedPopulation) }}
            </td>
          </tr>
          <tr>
            <td class="py-1.5 pr-4 text-gray-600">
              Current population
              <base-info
                v-tippy="{
                  content:
                    'The current population is calculated based on the population and offline IHR from the last save. Assuming your IHR did not change since the last save, this number should be slightly ahead of your actual population at the moment, depending on how long you remained active since the last save.',
                }"
                class="inline relative -top-px ml-1 text-gray-400"
              />
            </td>
            <td class="py-1.5 text-right font-medium text-green-600 tabular-nums">
              {{ formatWithThousandSeparators(currentPopulation) }}
            </td>
          </tr>
          <tr v-if="totalHabSpace > currentPopulation">
            <td class="py-1.5 pr-4 text-gray-600 align-top pt-2">Time to full</td>
            <td class="py-1.5 text-right text-green-600 tabular-nums">
              <div
                v-tippy="{
                  content: `${dayjs(currentTimestamp).add(calculateTimeToHabLock(offlineIHR), 'seconds').format('LLL')} (offline)`,
                }"
              >
                {{ formatDurationAuto(calculateTimeToHabLock(offlineIHR)) }}
                <span class="text-xs text-gray-500">(offline)</span>
              </div>
              <div
                v-tippy="{
                  content: `${dayjs(currentTimestamp).add(calculateTimeToHabLock(onlineIHR), 'seconds').format('LLL')} (online)`,
                }"
                class="mt-0.5"
              >
                {{ formatDurationAuto(calculateTimeToHabLock(onlineIHR)) }}
                <span class="text-xs text-gray-500">(online)</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs, PropType, computed } from 'vue';
import dayjs from 'dayjs';
import {
  ei,
  allModifiersFromColleggtibles,
  homeFarmArtifacts,
  farmHabs,
  farmHabSpaceResearches,
  farmHabSpaces,
  farmEggLayingRate,
  farmShippingCapacity,
  farmInternalHatcheryResearches,
  farmInternalHatcheryRates,
  calculateCurrentPopulation,
  calculateTimeToHabLock,
  formatDurationAuto,
  iconURL,
  getNumTruthEggs,
} from '@/lib';
import { formatWithThousandSeparators } from '@/utils';
import BaseInfo from 'ui/components/BaseInfo.vue';

export default defineComponent({
  name: 'HabsSection',
  components: { BaseInfo },
  props: {
    backup: { type: Object as PropType<ei.IBackup>, required: true },
    currentTimestamp: { type: Number, required: true },
    showIcons: { type: Boolean, default: true },
  },
  setup(props) {
    const { backup, currentTimestamp } = toRefs(props);

    const farm = backup.value.farms![0];
    const progress = backup.value.game!;
    const artifacts = homeFarmArtifacts(backup.value, true);
    const modifiers = allModifiersFromColleggtibles(backup.value);

    const habs = farmHabs(farm);
    const researches = farmHabSpaceResearches(farm);
    const habSpaces = farmHabSpaces(habs, researches, artifacts, modifiers.habCap);
    const totalHabSpace = Math.round(habSpaces.reduce((total, s) => total + s));

    const lastRefreshedTimestamp = farm.lastStepTime! * 1000;
    const lastRefreshedPopulation = farm.numChickens! as number;

    const totalTruthEggs = getNumTruthEggs(backup.value);
    const internalHatcheryResearches = farmInternalHatcheryResearches(farm, progress);
    const { onlineRate: onlineIHR, offlineRate: offlineIHR } = farmInternalHatcheryRates(
      internalHatcheryResearches,
      artifacts,
      modifiers.ihr,
      totalTruthEggs
    );

    const currentPopulation = computed(() =>
      calculateCurrentPopulation(
        lastRefreshedPopulation,
        offlineIHR,
        currentTimestamp.value,
        lastRefreshedTimestamp,
        totalHabSpace
      )
    );

    const eggLayingRate = farmEggLayingRate(farm, progress, artifacts) * modifiers.elr;
    const totalVehicleSpace = farmShippingCapacity(farm, progress, artifacts, modifiers.shippingCap);
    const maxEffectivePopulation = (totalVehicleSpace / eggLayingRate) * lastRefreshedPopulation;

    const groupedHabs = computed(() => {
      const groups = new Map<string, { name: string; iconPath: string; count: number; spacePerUnit: number }>();
      for (let i = 0; i < habs.length; i++) {
        const hab = habs[i];
        const space = habSpaces[i];
        if (!groups.has(hab.name)) {
          groups.set(hab.name, { name: hab.name, iconPath: hab.iconPath, count: 0, spacePerUnit: space });
        }
        groups.get(hab.name)!.count++;
      }
      return Array.from(groups.values());
    });

    const unfinishedResearches = researches.filter(r => r.level < r.maxLevel);

    const timeToHabLock = (ihr: number) => calculateTimeToHabLock(totalHabSpace, currentPopulation.value, ihr);
    const timeToMaxEffectivePop = (ihr: number) =>
      calculateTimeToHabLock(maxEffectivePopulation, currentPopulation.value, ihr);

    return {
      groupedHabs,
      unfinishedResearches,
      habSpaces,
      totalHabSpace,
      lastRefreshedPopulation,
      currentPopulation,
      offlineIHR,
      onlineIHR,
      maxEffectivePopulation,
      calculateTimeToHabLock: timeToHabLock,
      calculateTimeToMaxEffective: timeToMaxEffectivePop,
      formatWithThousandSeparators,
      formatDurationAuto,
      dayjs,
      iconURL,
    };
  },
});
</script>
