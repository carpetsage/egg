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
      <truth-egg-progress
        v-model:target-t-e="targetTE"
        :show-threshold-spoilers="showThresholdSpoilers"
        :egg="egg"
        :backup="backup"
        :truth-eggs="truthEggs"
        :truth-eggs-pending-adjusted="truthEggsPendingAdjusted"
        :active-e-o-v-delivered="activeEOVDelivered"
        :active-e-o-v-delivered-adjusted="activeEOVDeliveredAdjusted"
        :current-e-l-r="currentELR"
        :eov-delivered="eovDelivered"
        :truth-eggs-pending="truthEggsPending"
        :total-truth-eggs="totalTruthEggs"
        :total-truth-eggs-pending="totalTruthEggsPending"
        :totaleov-delivered="totaleovDelivered"
        :discovered-thresholds="discoveredThresholds"
      />
    </collapsible-section>
    <template v-if="virtueEggs.includes(egg)">
      <hr class="mt-2" />
      <collapsible-section
        section-title="Summary"
        :visible="isVisibleSection('summary')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('summary')"
      >
        <farm-summary
          :backup="backup"
          :current-population="currentPopulation"
          :clothed-t-e="clothedTE"
          :max-clothed-t-e="maxClothedTEResult.clothedTE"
          :always-count-video-doubler="earningsSectionRef?.alwaysCountVideoDoubler || false"
        />
      </collapsible-section>
      <hr class="mt-2" />

      <collapsible-section
        section-title="Habs & Vehicles"
        :visible="isVisibleSection('habs_vehicles')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('habs_vehicles')"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <vehicles-section :backup="backup" />
          <habs-section :backup="backup" :current-timestamp="currentTimestamp" />
        </div>
      </collapsible-section>

      <hr class="mt-2" />

      <collapsible-section
        section-title="Silos & Internal Hatchery"
        :visible="isVisibleSection('silos_ihr')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('silos_ihr')"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <internal-hatchery-info
            :online-i-h-r="onlineIHR"
            :online-i-h-r-per-hab="onlineIHRPerHab"
            :offline-i-h-r="offlineIHR"
            :internal-hatchery-researches="internalHatcheryResearches"
          />
          <silos-section :backup="backup" :set-cash-target="setCashTarget" :add-cash-target="addCashTarget" />
        </div>
      </collapsible-section>

      <hr class="mt-2" />

      <collapsible-section
        section-title="Earnings"
        :visible="isVisibleSection('earnings')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('earnings')"
      >
        <earnings-section
          ref="earningsSectionRef"
          :backup="backup"
          :optimal-artifacts="maxClothedTEResult.artifacts"
          :target-t-e="targetTE"
          :current-population="currentPopulation"
          :total-truth-eggs-pending="totalTruthEggsPending"
        />
      </collapsible-section>

      <hr class="mt-2" />
      <collapsible-section
        section-title="Research"
        :visible="isVisibleSection('research')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('research')"
      >
        <research-progress
          :backup="backup"
          :set-cash-target="setCashTarget"
          :add-cash-target="addCashTarget"
          :earnings-set="maxClothedTEResult.artifacts"
        />
      </collapsible-section>

      <hr />

      <collapsible-section
        section-title="Currently Equipped Artifacts"
        :visible="isVisibleSection('artifacts')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('artifacts')"
      >
        <artifacts-gallery :artifacts="artifacts" />
      </collapsible-section>
      <collapsible-section
        :section-title="`Optimal Artifacts for Earnings (Clothed TE: ${formatWithThousandSeparators(Math.round(maxClothedTEResult.clothedTE))})`"
        :visible="isVisibleSection('artifacts')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('artifacts')"
      >
        <artifacts-gallery :artifacts="maxClothedTEResult.artifacts" />
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
  iconURL,
  UserBackupEmptyError,
  getLocalStorage,
  setLocalStorage,
  virtueEggs,
  fmtApprox,
  nextShiftCost,
  getNumTruthEggs,
} from 'lib';
import {
  allModifiersFromColleggtibles,
  calculateClothedTE,
  calculateMaxClothedTE,
  farmHabs,
  farmHabSpaceResearches,
  farmHabSpaces,
  farmShippingCapacity,
  farmInternalHatcheryRates,
  farmInternalHatcheryResearches,
  homeFarmArtifacts,
  requestFirstContact,
  farmEggLayingRate,
  pendingTruthEggs,
} from '@/lib';
import { TE_BREAKPOINTS } from '@/lib/virtue';
import { useSectionVisibility } from 'ui/composables/section_visibility';
import { formatWithThousandSeparators } from '@/utils';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import ArtifactsGallery from '@/components/ArtifactsGallery.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';
import ResearchProgress from '@/components/ResearchProgress.vue';
import TruthEggProgress from '@/components/TruthEggProgress.vue';
import FarmSummary from '@/components/FarmSummary.vue';
import HabsSection from '@/components/HabsSection.vue';
import VehiclesSection from '@/components/VehiclesSection.vue';
import SilosSection from '@/components/SilosSection.vue';
import InternalHatcheryInfo from '@/components/InternalHatcheryInfo.vue';
import EarningsSection from '@/components/EarningsSection.vue';

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
    BaseInfo,
    ResearchProgress,
    TruthEggProgress,
    FarmSummary,
    HabsSection,
    VehiclesSection,
    SilosSection,
    InternalHatcheryInfo,
    EarningsSection,
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

    const artifacts = homeFarmArtifacts(backup, true);

    // Calculate max clothed TE with optimal artifacts
    const maxClothedTEResult = calculateMaxClothedTE(backup);

    refreshIntervalId = setInterval(() => {
      currentTimestamp.value = Date.now();
      lastRefreshedRelative.value = lastRefreshed.fromNow();
    }, 200);

    const totalShifts = computed(() => backup.virtue?.shiftCount || 0);
    const totalResets = computed(() => backup.virtue?.resets || 0);
    const nextShiftSE = computed(() => fmtApprox(nextShiftCost(backup)));
    const totalTruthEggs = computed(() => getNumTruthEggs(backup));
    const truthEggs = computed(() => backup.virtue?.eovEarned || [0, 0, 0, 0, 0]);
    const eovDelivered = computed(() => backup.virtue?.eggsDelivered || [0, 0, 0, 0, 0]);
    const totaleovDelivered = computed(() => eovDelivered.value.reduce((a, b) => a + b, 0));
    const truthEggsPending = computed(() => {
      return truthEggs.value.map((earned, index) => pendingTruthEggs(eovDelivered.value[index], earned) || 0);
    });
    const totalTruthEggsPending = computed(() => truthEggsPending.value.reduce((a, b) => a + b, 0));
    const activeEOVDelivered = eovDelivered.value[egg - 50];

    // Determine which truth egg thresholds have been discovered (reached by any virtue egg)
    const discoveredThresholds = computed(() => {
      const maxDelivered = Math.max(...eovDelivered.value);
      return TE_BREAKPOINTS.filter(threshold => maxDelivered >= threshold);
    });

    const habs = farmHabs(farm);
    const habSpaceResearches = farmHabSpaceResearches(farm);
    const habSpaces = farmHabSpaces(habs, habSpaceResearches, artifacts, modifiers.habCap);
    const totalHabSpace = Math.round(habSpaces.reduce((total, s) => total + s));

    const totalVehicleSpace = farmShippingCapacity(farm, backup.game!, artifacts, modifiers.shippingCap);

    const eggLayingRate = farmEggLayingRate(farm, progress, artifacts) * modifiers.elr;
    const effectiveELR = Math.min(eggLayingRate, totalVehicleSpace);
    // Adjust egg laying rate for current population
    const currentELR = computed(() =>
      Math.min((currentPopulation.value / lastRefreshedPopulation) * effectiveELR, totalVehicleSpace)
    );

    const clothedTE = calculateClothedTE(backup, artifacts);

    const internalHatcheryResearches = farmInternalHatcheryResearches(farm, progress);
    const {
      onlineRatePerHab: onlineIHRPerHab,
      onlineRate: onlineIHR,
      offlineRate: offlineIHR,
    } = farmInternalHatcheryRates(internalHatcheryResearches, artifacts, modifiers.ihr, totalTruthEggs.value);

    // Calculate eggs delivered using integration - handles hab capacity and shipping capacity scenarios
    const calculateEOVDelivered = (ihr: number) => {
      const timeElapsed = (currentTimestamp.value - lastRefreshedTimestamp) / 1000; // Convert to seconds
      const ihrPerSecond = ihr / 60; // Convert from per minute to per second

      // Calculate population at which shipping capacity is maxed out
      const maxEffectivePopulation = (totalVehicleSpace / eggLayingRate) * lastRefreshedPopulation;

      // Effective capacity is the minimum of hab capacity and shipping-limited population
      const effectiveCapacity = Math.min(totalHabSpace, maxEffectivePopulation);

      // If we're already at or above effective capacity, ELR is static
      if (lastRefreshedPopulation >= effectiveCapacity) {
        const staticELR = Math.min(eggLayingRate, totalVehicleSpace);
        const eggsDeliveredWhileOffline = staticELR * timeElapsed;
        return eovDelivered.value[egg - 50] + eggsDeliveredWhileOffline;
      }

      // If we reach effective capacity during this period
      if (currentPopulation.value >= effectiveCapacity) {
        // Calculate time to reach effective capacity
        const timeToCapacity = (effectiveCapacity - lastRefreshedPopulation) / ihrPerSecond;

        // Phase 1: Growing population until effective capacity is reached (use growth formula)
        const initialELR = eggLayingRate;
        const linearTerm1 = initialELR * timeToCapacity;
        const quadraticTerm1 =
          (initialELR * ihrPerSecond * timeToCapacity * timeToCapacity) / (2 * lastRefreshedPopulation);
        const eggsPhase1 = linearTerm1 + quadraticTerm1;

        // Phase 2: Static ELR after effective capacity is reached
        const timeAfterCapacity = timeElapsed - timeToCapacity;
        const staticELR = Math.min(eggLayingRate * (effectiveCapacity / lastRefreshedPopulation), totalVehicleSpace);
        const eggsPhase2 = staticELR * timeAfterCapacity;

        return eovDelivered.value[egg - 50] + eggsPhase1 + eggsPhase2;
      }

      // Population stays below effective capacity - use standard growth formula
      const linearTerm = eggLayingRate * timeElapsed;
      const quadraticTerm = (eggLayingRate * ihrPerSecond * timeElapsed * timeElapsed) / (2 * lastRefreshedPopulation);
      const eggsDeliveredWhileOffline = linearTerm + quadraticTerm;

      return eovDelivered.value[egg - 50] + eggsDeliveredWhileOffline;
    };
    const activeEOVDeliveredAdjusted = computed(() => ({
      offline: calculateEOVDelivered(offlineIHR),
      online: calculateEOVDelivered(onlineIHR),
    }));
    const truthEggsPendingAdjusted = computed(() => ({
      offline: pendingTruthEggs(activeEOVDeliveredAdjusted.value.offline, truthEggs.value[egg - 50]) || 0,
      online: pendingTruthEggs(activeEOVDeliveredAdjusted.value.online, truthEggs.value[egg - 50]) || 0,
    }));

    const { isVisibleSection, toggleSectionVisibility } = useSectionVisibility();

    const TARGET_TE_LOCALSTORAGE_KEY = 'targetTE';
    const THRESHOLD_SPOILERS_LOCALSTORAGE_KEY = 'showThresholdSpoilers';

    const truthEggsWithPending = computed(() =>
      truthEggs.value.map((earned, index) => earned + truthEggsPending.value[index])
    );
    const defaultTargetTE = computed(() =>
      Math.max(Math.min(...truthEggsWithPending.value) + 5, Math.max(...truthEggsWithPending.value))
    );

    const savedTargetTE = ref(parseInt(getLocalStorage(TARGET_TE_LOCALSTORAGE_KEY) || '') || defaultTargetTE.value);
    const targetTE = ref(
      Math.min(98, savedTargetTE.value < defaultTargetTE.value ? defaultTargetTE.value : savedTargetTE.value)
    );
    const showThresholdSpoilers = ref(getLocalStorage(THRESHOLD_SPOILERS_LOCALSTORAGE_KEY) === 'true'); // Default to false

    // eslint-disable-next-line vue/no-watch-after-await
    watch(targetTE, () => {
      // Clamp to max of 98
      if (targetTE.value > 98) {
        targetTE.value = 98;
      }
      setLocalStorage(TARGET_TE_LOCALSTORAGE_KEY, targetTE.value.toString());
    });

    // eslint-disable-next-line vue/no-watch-after-await
    watch(showThresholdSpoilers, () => {
      setLocalStorage(THRESHOLD_SPOILERS_LOCALSTORAGE_KEY, showThresholdSpoilers.value);
    });

    const earningsSectionRef = ref<InstanceType<typeof EarningsSection>>();

    const setCashTarget = (amount: number) => {
      earningsSectionRef.value?.setCashTarget(amount);
    };

    const addCashTarget = (amount: number) => {
      earningsSectionRef.value?.addCashTarget(amount);
    };

    return {
      // Basic farm info
      nickname,
      lastRefreshed,
      lastRefreshedRelative,
      egg,
      virtueEggs,
      artifacts,
      backup,

      // Population & timing
      currentPopulation,
      currentTimestamp,

      // Earnings data
      clothedTE,
      maxClothedTEResult,

      // Internal hatchery
      internalHatcheryResearches,
      onlineIHR,
      onlineIHRPerHab,
      offlineIHR,

      // Truth eggs
      truthEggs,
      totalTruthEggs,
      truthEggsPending,
      totalTruthEggsPending,
      eovDelivered,
      totaleovDelivered,
      currentELR,
      activeEOVDelivered,
      activeEOVDeliveredAdjusted,
      truthEggsPendingAdjusted,
      discoveredThresholds,

      // Virtue tracking
      totalShifts,
      totalResets,
      nextShiftSE,
      targetTE,
      showThresholdSpoilers,

      // UI helpers
      isVisibleSection,
      toggleSectionVisibility,
      formatWithThousandSeparators,
      iconURL,
      earningsSectionRef,
      setCashTarget,
      addCashTarget,
    };
  },
});
</script>
