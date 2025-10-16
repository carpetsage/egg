<template>
  <main>
    <p>{{ nickname }}</p>
    <p class="text-sm">
      Last synced to server:
      <span v-tippy="{ content: lastRefreshed.format('LLL') }" class="whitespace-nowrap">
        {{ lastRefreshedRelative }}
      </span>
    </p>
    <p class="text-sm">
      Total Shifts:
      {{ totalShifts }}
    </p>
    <p class="text-sm">Total Resets: {{ totalResets }}</p>
    <p class="text-sm">
      Next Shift Cost:
      {{ nextShiftSE }} <img :src="iconURL('egginc/egg_soul.png', 64)" class="inline h-4 w-4 mb-1" />
    </p>
    <p>
      <span
        v-tippy="{
          content: `
          <p>The game, while active, saves to Egg, Inc.&rsquo;s server every couple of minutes if network condition allows.
          Other than soon after a fresh launch of the game, such server syncs are unpredictable from the user&rsquo;s point of view.
          <span class='text-blue-300'>You can force close then reopen the app to reasonably reliably trigger a sync</span>
          (search for &ldquo;iOS force close app&rdquo; or &ldquo;Android force close app&rdquo; if you need help).</p>

          <p>However, even after an app-initiated sync, it may take an unpredicatible amount of time
          (usually within a minute or so) for the game&rsquo;s server to serve the updated save through its API,
          which is then picked up by this tool. There is no solution other than clicking &ldquo;Load Player Data&rdquo;
          periodically until the fresh save shows up. Please do not refresh too fast, which is not helpful.</p>`,
          allowHTML: true,
        }"
        class="inline-flex items-center space-x-1"
      >
        <base-info />
        <span class="text-xs text-gray-500">Why is my save out of date?</span>
      </span>
    </p>

    <div class="flex my-2">
      <label class="flex items-center">
        <input v-model="showThresholdSpoilers" type="checkbox" class="mr-2" />
        <span class="text-sm"
          >Show All Truth Egg <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" /> Thresholds
          (SPOILERS)</span
        >
      </label>
    </div>
    <hr class="mt-2" />
    <collapsible-section
      section-title="Truth Egg Progress"
      :visible="isVisibleSection('truth_eggs')"
      class="my-2 text-sm"
      @toggle="toggleSectionVisibility('truth_eggs')"
    >
      <template v-if="virtueEggs.includes(egg)">
        <!-- Current Virtue Egg -->
        <div class="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg mb-2">
          <img :src="iconURL(eggIconPath(egg), 64)" class="h-6 w-6" />
          <div class="flex-1">
            <div class="font-medium">{{ eggName(egg) }} ({{ virtuePurpose(egg) }})</div>
            <div class="text-sm text-gray-600">
              <div>
                {{ truthEggs[egg - 50] }}
                <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" />
                earned
              </div>
              <div>
                <template v-if="truthEggsPendingAdjusted.offline > truthEggsPendingAdjusted.online">
                  {{ truthEggsPendingAdjusted.online }} -
                </template>
                {{ truthEggsPendingAdjusted.offline }}
                <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" /> pending
              </div>
              <div class="mr-5">
                <truth-egg-progress-bar
                  :eggs-laid="activeEOVDelivered"
                  :eggs-laid-offline-adjusted="activeEOVDeliveredAdjusted.offline"
                  :eggs-laid-online-adjusted="activeEOVDeliveredAdjusted.online"
                  :egg-laying-rate="currentELR"
                  :egg="egg"
                  :backup="backup"
                  :show-spoilers="shouldShowThreshold(eovDelivered[egg - 50])"
                />
              </div>
              <div>
                {{ fmtApprox(activeEOVDeliveredAdjusted.online) }}
                <template v-if="activeEOVDeliveredAdjusted.offline > 1.01 * activeEOVDeliveredAdjusted.online">
                  - {{ fmtApprox(activeEOVDeliveredAdjusted.offline) }}
                </template>
                <template v-if="shouldShowThreshold(activeEOVDeliveredAdjusted.offline)">
                  /
                  {{ fmtApprox(nextTruthEggThreshold(activeEOVDeliveredAdjusted.offline)) }}
                </template>
                <template v-else> delivered</template>
              </div>
            </div>
          </div>
        </div>
      </template>
      <!-- Other Virtue Eggs -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
        <div
          v-for="vegg in virtueEggs.filter((_, i) => i + 50 !== egg)"
          :key="vegg"
          class="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg"
        >
          <img :src="iconURL(eggIconPath(vegg), 64)" class="h-6 w-6" />
          <div class="flex-1">
            <div class="font-medium">{{ eggName(vegg) }} ({{ virtuePurpose(vegg) }})</div>
            <div class="text-sm text-gray-600">
              <div>
                {{ truthEggs[vegg - 50] }}
                <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" />
                earned
              </div>
              <div>
                {{ truthEggsPending[vegg - 50] }}
                <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" /> pending
              </div>
              <div class="mr-5">
                <truth-egg-progress-bar
                  :eggs-laid="eovDelivered[vegg - 50]"
                  :eggs-laid-offline-adjusted="eovDelivered[vegg - 50]"
                  :egg-laying-rate="0"
                  :egg="vegg"
                  :show-spoilers="shouldShowThreshold(eovDelivered[vegg - 50])"
                />
              </div>
              <div v-if="shouldShowThreshold(eovDelivered[vegg - 50])">
                {{ fmtApprox(eovDelivered[vegg - 50]) }} /
                {{ fmtApprox(nextTruthEggThreshold(eovDelivered[vegg - 50])) }}
              </div>
              <div v-else>{{ fmtApprox(eovDelivered[vegg - 50]) }} delivered</div>
            </div>
          </div>
        </div>
      </div>
      <!-- Total Truth Eggs -->
      <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
        <img :src="iconURL('egginc/egg_truth.png', 64)" class="h-6 w-6" />
        <div class="flex-1">
          <div class="font-medium">Total Truth Eggs</div>
          <div class="text-sm text-gray-600">
            <div>
              {{ totalTruthEggs }}
              <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" />
              earned
            </div>
            <div>
              {{ totalTruthEggsPending }}
              <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4 mb-1" /> pending
            </div>
            <div>{{ fmtApprox(totaleovDelivered) }} Virtue Eggs delivered</div>
          </div>
        </div>
      </div>
    </collapsible-section>
    <hr class="mt-2" />
    <template v-if="virtueEggs.includes(egg)">
      <hr />

      <collapsible-section
        section-title="Habs"
        :visible="isVisibleSection('habs')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('habs')"
      >
        <div class="flex my-2 space-x-2">
          <img
            v-for="(hab, index) in habs"
            :key="index"
            v-tippy="{
              content: `${hab.name}, space: ${formatWithThousandSeparators(habSpaces[index])}`,
            }"
            :src="iconURL(hab.iconPath, 128)"
            class="h-16 w-16 bg-gray-50 rounded-lg shadow"
          />
        </div>
        <p>
          Hab space:
          <span class="text-green-500">{{ formatWithThousandSeparators(totalHabSpace) }}</span>
        </p>
        <p class="text-sm">
          Last save population:
          <span class="text-green-500 tabular-nums">
            {{ formatWithThousandSeparators(lastRefreshedPopulation) }}
          </span>
        </p>
        <p class="text-sm">
          Current population:
          <span class="text-green-500 tabular-nums mr-0.5">
            {{ formatWithThousandSeparators(currentPopulation) }}
          </span>
          <base-info
            v-tippy="{
              content:
                'The current population is calculated based on the population and offline IHR from the last save. Assuming your IHR did not change since the last save, this number should be slightly ahead of your actual population at the moment, depending on how long you remained active since the last save.',
            }"
            class="inline relative -top-px"
          />
        </p>
        <p v-if="totalHabSpace > currentPopulation" class="text-sm">
          Estimated time to hab capacity:
          <span
            v-tippy="{
              content: `${dayjs(currentTimestamp).add(calculateTimeToHabLock(offlineIHR), 'seconds').format('LLL')} to ${dayjs(currentTimestamp).add(calculateTimeToHabLock(onlineIHR), 'seconds').format('LLL')}`,
            }"
            class="text-green-500 tabular-nums"
          >
            {{ formatDurationAuto(calculateTimeToHabLock(offlineIHR)) }} (offline) to
            {{ formatDurationAuto(calculateTimeToHabLock(onlineIHR)) }} (online)
          </span>
        </p>
      </collapsible-section>

      <hr />

      <collapsible-section
        section-title="Vehicles"
        :visible="isVisibleSection('vehicles')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('vehicles')"
      >
        <div class="flex flex-wrap gap-5 mb-2 max-w-full">
          <img
            v-for="(vehicle, index) in vehicles"
            :key="index"
            v-tippy="{
              content: `${vehicle.name}, space: ${formatWithThousandSeparators(vehicleSpaces[index])}`,
            }"
            :src="iconURL(vehicle.iconPath, 128)"
            class="h-6"
          />
        </div>
        <div class="space-y-1">
          <div>
            <div class="text-sm">Shipping Capacity</div>
            <div>
              <span v-tippy="{ content: `${fmtApprox(totalVehicleSpace * 60 * 60)} eggs/hr` }" class="text-green-500">
                {{ fmtApprox(totalVehicleSpace * 60) }}
              </span>
              <img :src="eggIconURL" class="inline h-6 w-6 mb-1" />/ min
            </div>
          </div>
          <div>
            <div class="text-sm">Egg Laying Rate</div>
            <div>
              <span v-tippy="{ content: `${fmtApprox(eggLayingRate * 60 * 60)} eggs/hr` }" class="text-green-500">
                {{ fmtApprox(eggLayingRate * 60) }}
              </span>
              <img :src="eggIconURL" class="inline h-6 w-6 mb-1" />/ min
            </div>
          </div>
          <div>
            <div class="text-sm">Egg Delivery Rate</div>
            <div>
              <span v-tippy="{ content: `${fmtApprox(effectiveELR * 60 * 60)} eggs/hr` }" class="text-green-500">
                {{ fmtApprox(effectiveELR * 60) }}
              </span>
              <img :src="eggIconURL" class="inline h-6 w-6 mb-1" />/ min
            </div>
          </div>
        </div>
      </collapsible-section>

      <hr />

      <collapsible-section
        section-title="Internal hatchery"
        :visible="isVisibleSection('internal_hatchery')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('internal_hatchery')"
      >
        <p class="mt-1">
          Active IHR:
          <span class="whitespace-nowrap">
            <span class="text-green-500">{{ formatWithThousandSeparators(onlineIHR, -1) }}</span>
            chickens/min
          </span>
          <!-- Force a space between the two nowrap spans to prevent the two being treated as a whole. -->
          {{ ' ' }}
          <span class="whitespace-nowrap">
            (<span class="text-green-500">{{ formatWithThousandSeparators(onlineIHRPerHab, -1) }}</span>
            chickens/min/hab)
          </span>
        </p>
        <p>
          Offline IHR:
          <span class="text-green-500">{{ formatWithThousandSeparators(offlineIHR, -1) }}</span>
          chickens/min
        </p>
        <unfinished-researches :researches="internalHatcheryResearches" class="my-1" />
      </collapsible-section>

      <hr />

      <collapsible-section
        section-title="Artifacts"
        :visible="isVisibleSection('artifacts')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('artifacts')"
      >
        <artifacts-gallery :artifacts="artifacts" />
      </collapsible-section>
    </template>
  </main>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, ref, watch } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import {
  ei,
  allModifiersFromColleggtibles,
  iconURL,
  UserBackupEmptyError,
  getLocalStorage,
  setLocalStorage,
  virtueEggs,
  eggName,
  eggIconPath,
  fmtApprox,
  virtuePurpose,
  nextShiftCost,
} from 'lib';
import {
  calculateDroneValues,
  calculateFarmValue,
  earningBonusToFarmerRole,
  artifactsFromInventory,
  farmEarningBonus,
  farmEarningRate,
  farmEggValue,
  farmEggValueResearches,
  farmHabs,
  farmHabSpaceResearches,
  farmHabSpaces,
  farmVehicles,
  farmShippingCapacityResearches,
  farmVehicleShippingCapacities,
  farmShippingCapacity,
  farmInternalHatcheryRates,
  farmInternalHatcheryResearches,
  farmMaxRCB,
  farmMaxRCBResearches,
  homeFarmArtifacts,
  requestFirstContact,
  researchPriceMultiplierFromArtifacts,
  farmEggLayingRate,
  pendingTruthEggs,
  nextTruthEggThreshold,
  projectEggsLaidOverTime,
} from '@/lib';
import { TE_BREAKPOINTS } from '@/lib/virtue';
import { useSectionVisibility } from 'ui/composables/section_visibility';
import { formatPercentage, formatWithThousandSeparators, formatDurationAuto } from '@/utils';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import ArtifactsGallery from '@/components/ArtifactsGallery.vue';
import UnfinishedResearches from '@/components/UnfinishedResearches.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';
import TruthEggProgressBar from '@/components/TruthEggProgressBar.vue';

// Note that timezone abbreviation may not work due to
// https://github.com/iamkun/dayjs/issues/1154, in which case the GMT offset is
// shown.
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);

export default defineComponent({
  components: {
    CollapsibleSection,
    ArtifactsGallery,
    UnfinishedResearches,
    BaseInfo,
    TruthEggProgressBar,
  },
  props: {
    playerId: {
      type: String,
      required: true,
    },
  },
  // This async component does not respond to playerId changes.

  async setup({ playerId }) {
    // Validate and sanitize player ID.
    if (!playerId.match(/^EI\d+$/i)) {
      throw new Error(`ID ${playerId} is not in the form EI1234567890123456; please consult "Where do I find my ID?"`);
    }
    playerId = playerId.toUpperCase();

    // Interval id used for refreshing lastRefreshedRelative.
    let refreshIntervalId: number | undefined;
    onBeforeUnmount(() => {
      clearInterval(refreshIntervalId);
    });

    const data = await requestFirstContact(playerId);
    if (!data.backup || !data.backup.game) {
      throw new UserBackupEmptyError(playerId);
    }
    const backup = data.backup;
    const nickname = backup.userName;
    const progress = backup.game;
    if (!progress) {
      throw new Error(`${playerId}: no game progress in backup`);
    }
    if (!backup.farms || backup.farms.length === 0) {
      throw new Error(`${playerId}: no farm info in backup`);
    }
    const modifiers = allModifiersFromColleggtibles(backup);
    const farm = backup.farms[0]; // Home farm
    const egg = farm.eggType!;
    const eggIconURL = iconURL(eggIconPath(egg), 128);
    const lastRefreshedTimestamp = farm.lastStepTime! * 1000;
    const lastRefreshed = dayjs(Math.min(lastRefreshedTimestamp, Date.now()));
    const currentTimestamp = ref(Date.now());
    const lastRefreshedRelative = ref(lastRefreshed.fromNow());
    const lastRefreshedPopulation = farm.numChickens! as number;
    // Cap projected population at hab capacity
    const currentPopulation = computed(() =>
      Math.min(
        lastRefreshedPopulation + (offlineIHR / 60_000) * (currentTimestamp.value - lastRefreshedTimestamp),
        Math.max(lastRefreshedPopulation, totalHabSpace)
      )
    );
    const calculateTimeToHabLock = (ihr: number) => {
      return Math.max(0, (60 * (totalHabSpace - currentPopulation.value)) / ihr);
    };

    const artifacts = homeFarmArtifacts(backup, true);
    // Cap existing trophy level at platinum for people doing a legit diamond
    // run after cheating it first.
    const existingTrophyLevel = Math.min(backup.game!.eggMedalLevel![18], 4);
    const existingTrophyLevelUncapped = backup.game!.eggMedalLevel![18];

    refreshIntervalId = setInterval(() => {
      currentTimestamp.value = Date.now();
      lastRefreshedRelative.value = lastRefreshed.fromNow();
    }, 200);

    const totalShifts = computed(() => backup.virtue?.shiftCount || 0);
    const totalResets = computed(() => backup.virtue?.resets || 0);
    const nextShiftSE = computed(() => fmtApprox(nextShiftCost(backup)));
    const totalTruthEggs = computed(() => backup.virtue?.eovEarned?.reduce((a, b) => a + b, 0) || 0);
    const truthEggs = backup.virtue?.eovEarned || [0, 0, 0, 0, 0];
    const eovDelivered = backup.virtue?.eggsDelivered || [0, 0, 0, 0, 0];
    const totaleovDelivered = computed(() => eovDelivered.reduce((a, b) => a + b, 0));
    const truthEggsPending = computed(() => {
      return truthEggs.map((earned, index) => pendingTruthEggs(eovDelivered[index], earned) || 0);
    });
    const totalTruthEggsPending = computed(() => truthEggsPending.value.reduce((a, b) => a + b, 0));
    const nextTruthEggTarget = computed(() => nextTruthEggThreshold(eovDelivered[egg - 50]));
    const activeEOVDelivered = eovDelivered[egg - 50];

    // Determine which truth egg thresholds have been discovered (reached by any virtue egg)
    const discoveredThresholds = computed(() => {
      const maxDelivered = Math.max(...eovDelivered);
      return TE_BREAKPOINTS.filter(threshold => maxDelivered >= threshold);
    });

    // Smart spoiler logic: show threshold if spoilers are on OR if threshold has been discovered
    const shouldShowThreshold = (currentDelivered: number) => {
      const threshold = nextTruthEggThreshold(currentDelivered);
      return showThresholdSpoilers.value || discoveredThresholds.value.includes(threshold);
    };

    const habs = farmHabs(farm);
    const habSpaceResearches = farmHabSpaceResearches(farm);
    const habSpaces = farmHabSpaces(habs, habSpaceResearches, artifacts, modifiers.habCap);
    const totalHabSpace = Math.round(habSpaces.reduce((total, s) => total + s));

    const vehicles = farmVehicles(farm);
    const vehicleSpaceResearches = farmShippingCapacityResearches(farm, backup.game!);
    const vehicleSpaces = farmVehicleShippingCapacities(vehicles, vehicleSpaceResearches, [], modifiers.shippingCap);
    const totalVehicleSpace = farmShippingCapacity(farm, backup.game!, [], modifiers.shippingCap);

    const eggLayingRate = farmEggLayingRate(farm, progress, artifacts) * modifiers.elr;
    const effectiveELR = Math.min(eggLayingRate, totalVehicleSpace);
    // Adjust egg laying rate for current population
    const currentELR = computed(() =>
      Math.min((currentPopulation.value / lastRefreshedPopulation) * effectiveELR, totalVehicleSpace)
    );

    const earningBonus = farmEarningBonus(backup, farm, progress, artifacts);
    const farmerRole = earningBonusToFarmerRole(earningBonus);
    const farmValue = calculateFarmValue(backup, farm, progress, artifacts);
    const cashOnHand = farm.cashEarned! - farm.cashSpent!;
    const eggValue = farmEggValue(farmEggValueResearches(farm), artifacts);
    const maxRCB = farmMaxRCB(farmMaxRCBResearches(farm, progress), artifacts);
    const {
      onlineBaseline: earningRateOnlineBaseline,
      onlineMaxRCB: earningRateOnlineMaxRCB,
      offline: earningRateOffline,
    } = farmEarningRate(backup, farm, progress, artifacts, modifiers);
    const droneValuesAtMaxRCB = calculateDroneValues(farm, progress, artifacts, {
      population: farm.numChickens! as number,
      farmValue,
      rcb: maxRCB,
    });

    const currentPriceMultiplier = researchPriceMultiplierFromArtifacts(artifacts);
    const bestPossibleCube = artifactsFromInventory(backup, ei.ArtifactSpec.Name.PUZZLE_CUBE)[0];
    const bestPossibleCubeSet = bestPossibleCube ? [bestPossibleCube] : [];
    const bestPriceMultiplier = researchPriceMultiplierFromArtifacts(bestPossibleCubeSet);
    const cashTargets = [
      { multiplier: 1, description: 'No research sale\nno artifacts' },
      { multiplier: 0.3, description: '70% research sale\n no artifacts' },
    ];
    if (currentPriceMultiplier < 1) {
      cashTargets.push(
        { multiplier: currentPriceMultiplier, description: 'No research sale\ncurrent artifacts' },
        {
          multiplier: currentPriceMultiplier * 0.3,
          description: '70% research sale\ncurrent artifacts',
        }
      );
    }
    const betterCubePossible = bestPriceMultiplier < currentPriceMultiplier;
    if (betterCubePossible) {
      cashTargets.push(
        { multiplier: bestPriceMultiplier, description: 'No research sale\nbest cube possible' },
        {
          multiplier: bestPriceMultiplier * 0.3,
          description: '70% research sale\nbest cube possible',
        }
      );
    }
    const calculateAndFormatDuration = (target: number, rate: number): string => {
      if (target <= 0) {
        return '-';
      }
      return formatDurationAuto(target / rate);
    };
    const calculateAndFormatNumDrones = (target: number, rate: number): string => {
      let count: number | string;
      if (target <= 0) {
        count = 0;
      } else if (rate === 0) {
        count = '\u221E';
      } else {
        count = Math.ceil(target / rate);
      }
      return `\u00D7${count}`;
    };
    const cashMeans = [
      {
        rate: earningRateOnlineMaxRCB * 2,
        description: 'Active earnings w/ max RCB, video 2x',
        calc: calculateAndFormatDuration,
      },
      {
        rate: earningRateOffline,
        description: 'Offline earnings',
        calc: calculateAndFormatDuration,
      },
      {
        rate: droneValuesAtMaxRCB.elite,
        description: 'Elite drone at max RCB',
        calc: calculateAndFormatNumDrones,
      },
    ];

    const internalHatcheryResearches = farmInternalHatcheryResearches(farm, progress);
    const {
      onlineRatePerHab: onlineIHRPerHab,
      onlineRate: onlineIHR,
      offlineRate: offlineIHR,
    } = farmInternalHatcheryRates(internalHatcheryResearches, artifacts, modifiers.ihr, totalTruthEggs.value);

    // Calculate eggs delivered using integration - handles hab capacity and shipping capacity scenarios

    const activeEOVDeliveredAdjusted = computed(() => ({
      offline:
        eovDelivered[egg - 50] +
        projectEggsLaidOverTime(backup, (currentTimestamp.value - lastRefreshedTimestamp) / 1000),
      online:
        eovDelivered[egg - 50] +
        projectEggsLaidOverTime(backup, (currentTimestamp.value - lastRefreshedTimestamp) / 1000, onlineIHR),
    }));
    const truthEggsPendingAdjusted = computed(() => ({
      offline: pendingTruthEggs(activeEOVDeliveredAdjusted.value.offline, truthEggs[egg - 50]) || 0,
      online: pendingTruthEggs(activeEOVDeliveredAdjusted.value.online, truthEggs[egg - 50]) || 0,
    }));

    const { isVisibleSection, toggleSectionVisibility } = useSectionVisibility();

    const TARGET_TS_LOCALSTORAGE_KEY = 'targetTs';
    const THRESHOLD_SPOILERS_LOCALSTORAGE_KEY = 'showThresholdSpoilers';

    const target_ts = ref(getLocalStorage(TARGET_TS_LOCALSTORAGE_KEY) === 'true');
    const showThresholdSpoilers = ref(getLocalStorage(THRESHOLD_SPOILERS_LOCALSTORAGE_KEY) === 'true'); // Default to false

    watch(target_ts, () => {
      setLocalStorage(TARGET_TS_LOCALSTORAGE_KEY, target_ts.value);
    });

    watch(showThresholdSpoilers, () => {
      setLocalStorage(THRESHOLD_SPOILERS_LOCALSTORAGE_KEY, showThresholdSpoilers.value);
    });

    return {
      nickname,
      lastRefreshed,
      lastRefreshedTimestamp,
      lastRefreshedRelative,
      egg,
      eggIconURL,
      artifacts,
      lastRefreshedPopulation,
      existingTrophyLevel,
      existingTrophyLevelUncapped,
      currentPopulation,
      habs,
      habSpaceResearches,
      totalHabSpace,
      habSpaces,
      vehicles,
      vehicleSpaceResearches,
      vehicleSpaces,
      totalVehicleSpace,
      earningBonus,
      farmerRole,
      farmValue,
      cashOnHand,
      eggValue,
      maxRCB,
      earningRateOnlineBaseline,
      earningRateOnlineMaxRCB,
      earningRateOffline,
      droneValuesAtMaxRCB,
      cashTargets,
      cashMeans,
      betterCubePossible,
      bestPossibleCubeSet,
      internalHatcheryResearches,
      onlineIHR,
      onlineIHRPerHab,
      offlineIHR,
      isVisibleSection,
      toggleSectionVisibility,
      formatWithThousandSeparators,
      formatPercentage,
      iconURL,
      target_ts,
      virtueEggs,
      ei,
      effectiveELR,
      eggLayingRate,
      fmtApprox,
      eggName,
      eggIconPath,
      truthEggs,
      totalTruthEggs,
      truthEggsPending,
      eovDelivered,
      totaleovDelivered,
      totalTruthEggsPending,
      currentELR,
      nextTruthEggTarget,
      activeEOVDeliveredAdjusted,
      activeEOVDelivered,
      truthEggsPendingAdjusted,
      nextTruthEggThreshold,
      formatDurationAuto,
      currentTimestamp,
      dayjs,
      showThresholdSpoilers,
      shouldShowThreshold,
      discoveredThresholds,
      virtuePurpose,
      calculateTimeToHabLock,
      totalShifts,
      totalResets,
      nextShiftSE,
      backup,
    };
  },
});
</script>
