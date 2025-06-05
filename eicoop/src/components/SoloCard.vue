<template>
  <div class="my-4 bg-white dark:bg-gray-800 shadow overflow-hidden ultrawide:rounded-lg">
    <div class="px-4 py-4 sm:px-6" :class="completionStatusBgColorClass(leagueStatus.completionStatus)">
      <div class="relative -ml-4 -mt-2 sm:flex items-start justify-between">
        <div class="grow ml-4 mt-2">
          <h2 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
            <base-icon
              v-tippy="{ content: eggTooltip(egg) }"
              :icon-rel-path="eggIconPath(egg)"
              :size="64"
              class="inline-block align-middle relative -top-px -left-1 h-6 w-6"
            />
            <base-click-to-copy :text="status.contractId" class="text-gray-900 dark:text-gray-100 mr-0.5">
              {{ contract.name }}
              <template #tooltip> Copy contract ID &lsquo;{{ status.contractId }}&rsquo; to clipboard </template>
            </base-click-to-copy>
            <template v-if="grade">
              <contract-grade-label :grade="grade" class="relative -top-px" />
            </template>
            <template v-else-if="league !== null">
              <contract-league-label :league="league" class="relative -top-px" />
            </template>
          </h2>
          <div class="flex items-center">
            <span class="flex items-center justify-center relative h-6 w-6 -left-1">
              <svg viewBox="0 0 448 512" class="h-3.5 text-gray-400 dark:text-gray-300">
                <path
                  fill="currentColor"
                  d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"
                />
              </svg>
            </span>
            <span
              class="pl-px text-sm text-gray-700 dark:text-gray-300 truncate"
              :style="{ maxWidth: 'min(20rem, 50vw)' }"
            >
              {{ status.userName }}
            </span>
            <template v-if="contract.minutesPerToken">
              <base-icon icon-rel-path="egginc/b_icon_token.png" :size="64" class="block h-5 w-5 ml-1.5" />
              <span class="pl-px text-sm text-gray-700 dark:text-gray-300 truncate">
                {{ contract.minutesPerToken }}m
              </span>
            </template>
          </div>
        </div>
        <contract-status-label :status="leagueStatus.completionStatus" />
        <div class="absolute right-0 bottom-0 sm:bottom-1" :style="{ maxWidth: '50vw' }">
          <span
            v-tippy="{
              content: `
                <p>Farm last synced at <span class='text-blue-300'>${refreshTimeFormatted}</span>.</p>

                <p class='mt-2 text-blue-300'>This is the time when this contract farm was last seen actively played on according to your latest cloud save.</p>

                <p class='mt-2'>The game, while active, saves to Egg, Inc.&rsquo;s server every couple of minutes if network condition allows.
                Other than soon after a fresh launch of the game, such server syncs are unpredictable from the user&rsquo;s point of view.
                <span class='text-blue-300'>You can force close then reopen the app to reasonably reliably trigger a sync</span>
                (search for &ldquo;iOS force close app&rdquo; or &ldquo;Android force close app&rdquo; if you need help).</p>`,
              allowHTML: true,
            }"
            class="flex items-center space-x-0.5 cursor-help"
          >
            <span class="text-xs text-gray-500 dark:text-gray-400 truncate"> Synced {{ relativeRefreshTime }} </span>
            <base-info />
          </span>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
      <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        Confirmed progress
        <span class="whitespace-nowrap text-gray-900 dark:text-gray-100">({{ relativeRefreshTime }})</span>
      </div>

      <dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Eggs shipped</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <span class="text-green-500">{{ formatEIValue(leagueStatus.eggsLaid) }}</span> /
            {{ formatEIValue(leagueStatus.finalTarget, { trim: true }) }}
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Hourly production rate</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">{{
              formatEIValue(leagueStatus.eggsPerHour)
            }}</span>
            <template v-if="leagueStatus.requiredEggsPerHour !== null">
              current / {{ formatEIValue(leagueStatus.requiredEggsPerHour) }} required
            </template>
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Time to complete</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <tippy class="text-gray-900 dark:text-gray-100">
              <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">{{
                formatDuration(leagueStatus.expectedTimeToComplete)
              }}</span>
              expected
              <template v-if="leagueStatus.expectedTimeToComplete > 0" #content>
                Expected to complete at {{ leagueStatus.expectedFinalCompletionDate.format('YYYY-MM-DD HH:mm') }}.<br />
                This is an estimate based on the current laying rate (see FAQ below)
              </template>
            </tippy>
            /
            <tippy class="text-gray-900 dark:text-gray-100">
              {{ formatDuration(Math.max(leagueStatus.secondsRemaining, 0)) }} remaining
              <template #content>
                {{ leagueStatus.secondsRemaining > 0 ? 'Expires' : 'Expired' }} at
                {{ status.expirationTime.format('YYYY-MM-DD HH:mm') }}
              </template>
            </tippy>
          </dd>
        </div>
      </dl>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
      <div class="flex items-center text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        Estimated current progress
        <base-info
          v-tippy="{
            content: `
              <p>Current progress is estimated by <span class='text-blue-300'>assuming sustained production at the last confirmed production rate</span> since the farm was last synced to server. <span class='text-red-300'>Population growth is not taken into account</span>, as the amount of time spent on active play which hinders population growth through internal hatchery calm is unknown.</p>

              <p class='mt-2'><span class='text-blue-300'>The estimates are refreshed a few times every minute</span>, so you don't need to refresh the page to update the estimates (unless you have synced new developments to the server).</p>`,
            allowHTML: true,
          }"
          class="ml-0.5"
        />
        <svg
          v-tippy="{ content: 'Refresh' }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          class="ml-0.5 h-3.5 w-3.5 text-gray-500 dark:text-gray-400 animate-spin select-none transition-opacity"
          :class="estimatesBeingRefreshed ? 'opacity-100' : 'opacity-0'"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>

      <div v-if="effectiveMinutesSinceRefresh > status.farm.siloMinutes" class="text-xs text-yellow-500 mb-2">
        <base-icon
          icon-rel-path="egginc-extras/icon_warning.png"
          :size="64"
          class="inline-block align-middle h-4 w-4 relative -top-px -ml-px"
        />
        Your silos ({{ formatDuration(status.farm.siloMinutes * 60, true) }} max) may have run out! The following
        estimates assume you were able to refresh silos in time.
      </div>

      <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Eggs shipped</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <span class="text-green-500">{{ formatEIValue(estimatedLeagueStatus.eggsLaid) }}</span>
            /
            {{ formatEIValue(estimatedLeagueStatus.finalTarget, { trim: true }) }}
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Hourly production rate</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <span :class="completionStatusFgColorClass(estimatedLeagueStatus.completionStatus)">{{
              formatEIValue(estimatedLeagueStatus.eggsPerHour)
            }}</span>
            <template v-if="estimatedLeagueStatus.requiredEggsPerHour !== null">
              current / {{ formatEIValue(estimatedLeagueStatus.requiredEggsPerHour) }} required
            </template>
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Time to complete</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <span :class="completionStatusFgColorClass(estimatedLeagueStatus.completionStatus)">{{
              formatDuration(estimatedLeagueStatus.expectedTimeToComplete)
            }}</span>
            expected /
            <tippy class="text-gray-900 dark:text-gray-100">
              {{ formatDuration(Math.max(estimatedLeagueStatus.secondsRemaining, 0)) }} remaining
              <template #content>
                {{ estimatedLeagueStatus.secondsRemaining > 0 ? 'Expires' : 'Expired' }} at
                {{ status.expirationTime.format('YYYY-MM-DD HH:mm') }}
              </template>
            </tippy>
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tokens in stock</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100 flex items-center">
            <base-icon icon-rel-path="egginc/b_icon_token.png" :size="64" class="block h-4 w-4 mr-0.5" />
            {{ formatWithThousandSeparators(tokensInStockByNow) }}
            <template v-if="minutesFromNowUntilNextToken !== null">
              (next in {{ formatWithThousandSeparators(minutesFromNowUntilNextToken) }}m)
            </template>
          </dd>
        </div>
      </dl>

      <contract-progress-bar
        class="mt-4"
        :eggs-laid="status.eggsLaid"
        :currently-estimated-eggs-laid="estimatedLeagueStatus.eggsLaid"
        :projected-eggs-laid="status.projectedEggsLaid"
        :league-status="leagueStatus"
      />
    </div>

    <div class="flex flex-col">
      <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div class="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <template v-for="column in columns" :key="column.id">
                    <th
                      v-tippy="{ content: column.tooltip }"
                      scope="col"
                      class="px-4 py-2 text-xs font-medium whitespace-nowrap cursor-pointer select-none"
                      :class="column.id === 'name' ? 'text-left' : 'text-center'"
                    >
                      <template v-if="column.iconPath">
                        <span class="flex shrink-0 flex-row items-center justify-center space-x-px">
                          <base-icon
                            :icon-rel-path="column.iconPath"
                            :size="64"
                            class="block h-4 w-4"
                            :style="{ minWidth: '1rem' }"
                          />
                          <span v-if="column.suffix" class="text-gray-500 dark:text-gray-200">{{ column.suffix }}</span>
                        </span>
                      </template>
                      <template v-else>
                        <span class="text-gray-500 dark:text-gray-200">{{ column.name }}</span>
                      </template>
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr class="bg-white dark:bg-gray-800">
                  <td
                    class="px-4 py-1 flex flex-row items-center space-x-0.5 max-w-xxs sm:max-w-xs md:max-w-sm text-sm"
                  >
                    <template v-if="devmode">
                      <base-click-to-copy :text="status.userId" class="text-gray-500 dark:text-gray-200 truncate">
                        {{ renderNonempty(status.userName) }}
                        <template #tooltip>Click to copy ID: {{ status.userId }}</template>
                      </base-click-to-copy>
                    </template>
                    <template v-else>
                      <span class="text-gray-500 dark:text-gray-200 truncate">{{ status.userName }}</span>
                    </template>
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    <coop-card-contribution-table-artifact-gallery
                      v-if="status.artifacts.artifacts.length > 0"
                      :artifact-set="status.artifacts"
                      class="mx-auto"
                    />
                    <span v-else v-tippy="{ content: 'No artifact is equipped.' }" class="hover:cursor-help"
                      >&ndash;</span
                    >
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatEIValue(status.eggsLaid) }}
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatEIValue(status.eggsPerHour) }}
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatEIValue(status.earningBonusPercentage) }}
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm tabular-nums"
                    :style="{ color: status.farmerRole.color }"
                  >
                    {{ status.farmerRole.name.replace('farmer', '') }}
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatWithThousandSeparators(status.tokens) }}
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatWithThousandSeparators(status.tokensSpent) }}
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    <div v-if="status.boosts.length > 0" class="flex items-center justify-center">
                      <base-icon
                        v-for="(boost, i) of status.boosts"
                        :key="i"
                        v-tippy="{ content: `${boost.boostId ? boostName(boost.boostId) : '?'}` }"
                        :icon-rel-path="boost.boostId ? boostIconPath(boost.boostId) : 'egginc/icon_help.png'"
                        class="flex-0 h-4 w-4"
                      />
                    </div>
                    <span
                      v-else
                      v-tippy="{
                        content: 'No active boost.',
                      }"
                      class="hover:cursor-help"
                      >&ndash;</span
                    >
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    <span
                      v-tippy="{
                        content:
                          status.farmPopulation !== status.farmCapacity
                            ? `Without further upgrades, when currently available hab space is filled,
                              laying rate will reach <span class='text-blue-300'>${formatEIValue(
                                status.projectedHourlyLayingRateUncappedAtFullHabs
                              )}/hr</span>.`
                            : 'Habs full, laying rate cannot be improved through population growth at the moment.',
                        allowHTML: true,
                      }"
                    >
                      {{ formatEIValue(status.hourlyLayingRateUncapped) }}</span
                    >
                    <base-icon
                      v-if="
                        status.hourlyShippingCapacity !== null &&
                        status.hourlyLayingRateUncapped > status.hourlyShippingCapacity
                      "
                      v-tippy="{
                        content: 'This player is shipping-limited (vehicles cannot ship all eggs being laid).',
                      }"
                      icon-rel-path="egginc-extras/icon_warning.png"
                      :size="64"
                      class="inline-block align-middle h-4 w-4 relative -top-px cursor-help ml-0.5"
                    />
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatEIValue(status.hourlyShippingCapacity) }}
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatWithThousandSeparators(status.farmPopulation, -1) }}
                  </td>
                  <td
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatWithThousandSeparators(status.farmCapacity, -1) }}
                  </td>
                  <tippy
                    tag="td"
                    class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
                  >
                    {{ formatWithThousandSeparators(status.internalHatcheryRatePerMinPerHab, -1) }}
                    <template v-if="status.internalHatcheryRateBoostMultiplier > 1">
                      &times;
                      {{ formatWithThousandSeparators(status.internalHatcheryRateBoostMultiplier) }}
                    </template>
                    <template #content>
                      {{ formatWithThousandSeparators(status.awayInternalHatcheryRatePerMinPerHab, -1)
                      }}<template v-if="status.internalHatcheryRateBoostMultiplier > 1">
                        &times;
                        {{ formatWithThousandSeparators(status.internalHatcheryRateBoostMultiplier) }}
                      </template>
                      / min / hab while away
                    </template>
                  </tippy>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';

import { boostName, boostIconPath, eggIconPath, formatEIValue, formatDuration, SoloStatus } from '@/lib';
import { completionStatusFgColorClass, completionStatusBgColorClass } from '@/styles';
import { devmodeKey } from '@/symbols';
import { eggTooltip, formatWithThousandSeparators, renderNonempty } from '@/utils';
import { useAutoRefreshedRelativeTime } from '@/composables/relative_time';
import BaseClickToCopy from '@/components/BaseClickToCopy.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';
import BaseIcon from 'ui/components/BaseIcon.vue';
import ContractLeagueLabel from '@/components/ContractLeagueLabel.vue';
import ContractGradeLabel from '@/components/ContractGradeLabel.vue';
import ContractStatusLabel from '@/components/ContractStatusLabel.vue';
import ContractProgressBar from '@/components/ContractProgressBar.vue';
import CoopCardContributionTableArtifactGallery from '@/components/CoopCardContributionTableArtifactGallery.vue';

const props = defineProps<{ status: SoloStatus }>();
const { status } = toRefs(props);
const devmode = inject(devmodeKey);

const contract = computed(() => status.value.contract);
const egg = computed(() => contract.value.egg!);
const league = computed(() => status.value.league!);
const grade = computed(() => status.value.grade);

const refreshTime = computed(() => status.value.refreshTime);
const estimatesBeingRefreshed = ref(false);
const {
  now,
  relativeTime: relativeRefreshTime,
  referenceTimeFormatted: refreshTimeFormatted,
} = useAutoRefreshedRelativeTime(refreshTime, {
  refreshIntervalMs: 15000,
  refreshHook: now => {
    if (now.isBefore(status.value.expirationTime)) {
      estimatesBeingRefreshed.value = true;
      setTimeout(() => (estimatesBeingRefreshed.value = false), 1000);
    }
  },
});
const effectiveMinutesSinceRefresh = computed(() => {
  const until = now.value.isBefore(status.value.expirationTime) ? now.value : status.value.expirationTime;
  return until.diff(refreshTime.value, 'minutes', true);
});

const leagueStatus = computed(() => now.value && status.value.confirmedLeagueStatusNow);
const estimatedLeagueStatus = computed(() => now.value && status.value.estimatedLeagueStatusNow);
const tokensInStockByNow = computed(() => now.value && status.value.farm.tokensInStockByNow);
const minutesFromNowUntilNextToken = computed(() => now.value && status.value.farm.minutesFromNowUntilNextToken);

const columns = [
  {
    id: 'name',
    name: 'Player',
  },
  {
    id: 'artifacts',
    name: 'Artifacts',
  },
  {
    id: 'eggsLaid',
    name: 'Shipped',
  },
  {
    id: 'eggsPerHour',
    name: 'Rate/hr',
    iconPath: eggIconPath(egg.value),
    suffix: '/ hr',
  },
  {
    id: 'earningBonusPercentage',
    name: 'EB%',
  },
  {
    id: 'role',
    name: 'Role',
  },
  {
    id: 'tokens',
    name: 'Tokens',
    iconPath: 'egginc/b_icon_token.png',
    tooltip: 'Tokens left',
  },
  {
    id: 'tokensSpent',
    name: 'Tokens spent',
    iconPath: 'egginc/b_icon_token.png',
    suffix: ' \u{00a0}spent',
    tooltip: 'Tokens spent',
  },
  {
    id: 'boosts',
    name: 'Boosts',
  },
  {
    id: 'hourlyLayingRateUncapped',
    name: 'Laying / hr',
    tooltip: 'Egg laying rate from all chickens, not capped by shipping capacity',
  },
  {
    id: 'hourlyShippingCapacity',
    name: 'Max shipping / hr',
  },
  {
    id: 'farmPopulation',
    name: 'Population',
  },
  {
    id: 'farmCapacity',
    name: 'Hab space',
  },
  {
    id: 'internalHatcheryRatePerMinPerHab',
    name: 'IHR / min / hab',
    tooltip: 'Internal hatchery rate, including boost effect if any',
  },
];
</script>
