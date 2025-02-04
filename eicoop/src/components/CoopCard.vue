<!-- eslint-disable vue/first-attribute-linebreak -->
<template>
  <div class="my-4 bg-white dark:bg-gray-800 shadow overflow-hidden ultrawide:rounded-lg">
    <div class="px-4 py-4 sm:px-6" :class="completionStatusBgColorClass(leagueStatus.completionStatus)">
      <div class="relative -ml-4 -mt-2 sm:flex items-start justify-between">
        <div class="flex-grow ml-4 mt-2">
          <h2 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
            <base-icon v-tippy="{ content: eggTooltip(egg, contract.customEggId) }" :icon-rel-path="eggIconPath(egg, contract.customEggId)" :size="64"
              class="inline-block align-middle relative -top-px -left-1 h-6 w-6" />
            <base-click-to-copy :text="status.contractId" class="text-gray-900 dark:text-gray-100 mr-0.5">
              {{ contract.name }}
              <template #tooltip>
                Copy contract ID &lsquo;{{ status.contractId }}&rsquo; to clipboard
              </template>
            </base-click-to-copy>
            <template v-if="grade">
              <contract-grade-label :grade="grade" class="inline-block relative h-8 mr-1" />
            </template>
            <template v-else-if="league !== null">
              <contract-league-label :league="league" class="relative -top-px mr-1" />
            </template>
            <span v-if="contract.maxCoopSize && !leagueStatus.hasEnded"
              class="px-2.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap relative -top-px"
              :class="openings > 0 ? 'bg-green-600' : 'bg-gray-400 dark:bg-gray-500'">
              <template v-if="openings > 0">{{ openings }} open</template>
              <template v-else>Full</template>
            </span>
          </h2>
          <div class="flex items-center">
            <span class="flex items-center justify-center relative h-6 w-6 -left-1">
              <svg viewBox="0 0 640 512" class="h-3.5 text-gray-400 dark:text-gray-300">
                <path fill="currentColor"
                  d="M96 224c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm448 0c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm32 32h-64c-17.6 0-33.5 7.1-45.1 18.6 40.3 22.1 68.9 62 75.1 109.4h66c17.7 0 32-14.3 32-32v-32c0-35.3-28.7-64-64-64zm-256 0c61.9 0 112-50.1 112-112S381.9 32 320 32 208 82.1 208 144s50.1 112 112 112zm76.8 32h-8.3c-20.8 10-43.9 16-68.5 16s-47.6-6-68.5-16h-8.3C179.6 288 128 339.6 128 403.2V432c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48v-28.8c0-63.6-51.6-115.2-115.2-115.2zm-223.7-13.4C161.5 263.1 145.6 256 128 256H64c-35.3 0-64 28.7-64 64v32c0 17.7 14.3 32 32 32h65.9c6.3-47.4 34.9-87.3 75.2-109.4z" />
              </svg>
            </span>
            <base-click-to-copy :text="status.coopCode" class="pl-px text-sm text-gray-700 dark:text-gray-300 truncate"
              :style="{ maxWidth: 'min(20rem, 50vw)' }" />
            <template v-if="contract.minutesPerToken">
              <base-icon icon-rel-path="egginc/b_icon_token.png" :size="64" class="block h-5 w-5 ml-1.5" />
              <span class="pl-px text-sm text-gray-700 dark:text-gray-300 truncate">
                {{ contract.minutesPerToken }}m
              </span>
            </template>
            <!-- public/private -->
            <svg v-tippy="{ content: status.isPublic ? 'Public coop' : 'Private coop' }"
              class="h-4 w-4 text-gray-400 dark:text-gray-300 ml-1.5" viewBox="0 0 20 20" fill="currentColor">
              <template v-if="status.isPublic">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fill-rule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clip-rule="evenodd" />
              </template>
              <template v-else>
                <path fill-rule="evenodd"
                  d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                  clip-rule="evenodd" />
                <path
                  d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </template>
            </svg>
            <!-- share button -->
            <coop-card-share-sheet class="ml-1.5" :contract-id="status.contractId" :coop-code="status.coopCode" :endTime="leagueStatus.expectedFinalCompletionDateOfflineAdjusted.unix()" />
          </div>
        </div>

        <contract-status-label :status="leagueStatus.completionStatus" />

        <div class="absolute right-0 bottom-0 sm:bottom-1">
          <auto-refreshed-relative-time :reference-time="status.refreshTime">
            <template #default="{ relativeTime, referenceTimeFormatted, triggerRefresh }">
              <span class="flex items-center space-x-0.5" :style="{ maxWidth: '50vw' }">
                <span v-tippy="{
                  content: `Last refreshed ${referenceTimeFormatted}`,
                }" class="text-xs text-gray-500 dark:text-gray-400 cursor-help truncate">
                  Refreshed {{ relativeTime }}
                </span>
                <svg v-tippy="{ content: 'Refresh' }" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  class="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 focus:outline-none cursor-pointer select-none"
                  @click="triggerRefresh">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </span>
            </template>
          </auto-refreshed-relative-time>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 space-y-4">
      <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div v-if="!contract.gradeSpecs" class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Created by</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <template v-if="status.creator">
              <template v-if="devmode">
                <base-click-to-copy :text="status.creator.id" class="block text-gray-900 dark:text-gray-100 truncate">
                  {{ status.creator.name }}
                  <template #tooltip>Click to copy ID: {{ status.creator.id }}</template>
                </base-click-to-copy>
              </template>
              <template v-else>
                {{ status.creator.name }}
              </template>
            </template>
            <template v-else-if="status.creatorName">
              <template v-if="devmode">
                <base-click-to-copy :text="status.creatorId" class="block text-gray-900 dark:text-gray-100 truncate">
                  {{ status.creatorName }}
                  <template #tooltip>Click to copy ID: {{ status.creatorId }}</template>
                </base-click-to-copy>
              </template>
              <template v-else>
                {{ status.creatorName }}
              </template>
            </template>
            <template v-else>
              <span v-tippy="{
                content: status.cannotDetermineCreator
                  ? 'Due to changes to the Egg, Inc. API, it is no longer possible to determine the creator.'
                  : 'The creator has left.',
              }" class="cursor-help">&ndash;</span>
            </template>
          </dd>
        </div>
        <div v-else class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modifiers</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            {{ modifiers.join(", ") }}
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Players</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            {{ status.contributors.length }} / {{ contract.maxCoopSize }}
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Eggs shipped</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <span class="text-green-500">{{ formatEIValue(status.eggsLaid) }}</span> /
            {{ formatEIValue(leagueStatus.finalTarget, { trim: true }) }}
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Hourly production rate
          </dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">{{
              formatEIValue(status.eggsPerHour)
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
                <p>Expected to complete at
                <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">
                  {{ leagueStatus.expectedFinalCompletionDate.format('YYYY-MM-DD HH:mm') }}
                </span>.</p>
                  <template v-if="grade">
                    <p>Predicted total time taken for contract completion:
                    <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">
                      {{ formatDuration(onlineDuration) }}
                    </span>
                    </p>
                  </template>
                <br />
                <p>This is an estimate based on the current laying rate (see FAQ below)</p>
              </template>
            </tippy>
            /
            <tippy class="text-gray-900 dark:text-gray-100">
              {{ formatDuration(max(status.secondsRemaining, 0)) }} remaining
              <template #content>
                {{ status.secondsRemaining > 0 ? 'Expires' : 'Expired' }} at
                {{ status.expirationTime.format('YYYY-MM-DD HH:mm') }}
              </template>
            </tippy>
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 flex flex-row dark:text-gray-400">
            Time to complete, offline adjusted
            <base-warning
              v-if="anyPlayerPrivate && leagueStatus.expectedTimeToCompleteOfflineAdjusted > 0"
              v-tippy="'This is a conservative estimate due to some players having private farms'"
              class="mx-0.5 translate-y-0.5"
            />
          </dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            <tippy class="text-gray-900 dark:text-gray-100">
              <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">{{
                formatDuration(leagueStatus.expectedTimeToCompleteOfflineAdjusted)
              }}</span>
              expected
              <template v-if="leagueStatus.expectedTimeToCompleteOfflineAdjusted > 0" #content>
                <p>The expected completion time taking into account offline eggs laid for all members is
                <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">
                  {{ leagueStatus.expectedFinalCompletionDateOfflineAdjusted.format('YYYY-MM-DD HH:mm') }}
                </span>.</p>
                <template v-if="grade">
                  <p>Predicted total time taken for contract completion, offline adjusted:
                  <span :class="completionStatusFgColorClass(leagueStatus.completionStatus)">
                    {{ formatDuration(offlineDuration) }}
                  </span>
                  </p>
                </template>
                <br />
                <p>Assumes that all players will check-in right before completion.</p>
              </template>
              <template v-if="!leagueStatus.hasEnded && leagueStatus.expectedTimeToCompleteOfflineAdjusted <= 0" #content>
                <p>The coop should complete after enough members check-in.</p>
              </template>
            </tippy>
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total earnings boost</dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            {{ (status.totalEarningsBoost * 100).toFixed(0) }}%
          </dd>
        </div>
        <div class="sm:col-span-1">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total egg laying rate boost
          </dt>
          <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            {{ (status.totalEggLayingRateBoost * 100).toFixed(0) }}%
          </dd>
        </div>
      </dl>

      <contract-progress-bar
        :eggs-laid="status.eggsLaid"
        :eggs-laid-offline-adjusted="status.eggsLaidOfflineAdjusted"
        :projected-eggs-laid="status.projectedEggsLaid"
        :league-status="leagueStatus" />
    </div>

    <div class="flex flex-col">
      <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div class="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700">
            <coop-card-contribution-table :egg="egg" :coop-status="status" :target="leagueStatus.finalTarget" :custom-egg-id="contract.customEggId" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, PropType, toRefs, } from 'vue';
import { Tippy } from 'vue-tippy';

import { CoopStatus, eggIconPath, formatEIValue, formatDuration, getModifiers } from '@/lib';
import { completionStatusFgColorClass, completionStatusBgColorClass } from '@/styles';
import { devmodeKey } from '@/symbols';
import { eggTooltip } from '@/utils';
import BaseIcon from 'ui/components/BaseIcon.vue';
import BaseWarning from 'ui/components/BaseWarning.vue';
import ContractLeagueLabel from '@/components/ContractLeagueLabel.vue';
import ContractGradeLabel from '@/components/ContractGradeLabel.vue';
import ContractStatusLabel from '@/components/ContractStatusLabel.vue';
import CoopCardShareSheet from '@/components/CoopCardShareSheet.vue';
import ContractProgressBar from '@/components/ContractProgressBar.vue';
import CoopCardContributionTable from '@/components/CoopCardContributionTable.vue';
import BaseClickToCopy from '@/components/BaseClickToCopy.vue';
import AutoRefreshedRelativeTime from '@/components/AutoRefreshedRelativeTime.vue';

export default defineComponent({
  components: {
    BaseIcon,
    BaseWarning,
    ContractLeagueLabel,
    ContractGradeLabel,
    ContractStatusLabel,
    CoopCardShareSheet,
    ContractProgressBar,
    CoopCardContributionTable,
    BaseClickToCopy,
    AutoRefreshedRelativeTime,
    Tippy,
  },
  props: {
    status: {
      type: Object as PropType<CoopStatus>,
      required: true,
    },
  },
  setup(props) {
    const devmode = inject(devmodeKey);
    const { status } = toRefs(props);

    const grades = computed(() => ["GRADE_C", "GRADE_B", "GRADE_A", "GRADE_AA", "GRADE_AAA"] as const);
    const contract = computed(() => status.value.contract!);
    const egg = computed(() => contract.value.egg!);
    const league = computed(() => status.value.league);
    const grade = computed(() => status.value.grade || 5);
    const gradeSpec = computed(() => contract.value.gradeSpecs?.[grade.value - 1]);
    const leagueStatus = computed(() => status.value.leagueStatus!);
    const anyPlayerPrivate = computed(() => status.value.contributors.find(c => !c.farmShared) != null);
    const openings = computed(() =>
      Math.max((contract.value.maxCoopSize || 0) - status.value.contributors.length, 0)
    );
    const startDate = computed(() => Date.now()/1000 + status.value.secondsRemaining - (gradeSpec.value?.lengthSeconds || 0));
    const onlineDuration = computed(() => leagueStatus.value.expectedFinalCompletionDate.unix() - startDate.value);
    const offlineDuration = computed(() => leagueStatus.value.expectedFinalCompletionDateOfflineAdjusted.unix() - startDate.value);
    const modifiers = computed(() => gradeSpec.value ? getModifiers(gradeSpec.value) : [""])

    return {
      devmode,
      contract,
      egg,
      league,
      grade,
      leagueStatus,
      anyPlayerPrivate,
      openings,
      offlineDuration,
      onlineDuration,
      modifiers,
      formatEIValue,
      formatDuration,
      completionStatusFgColorClass,
      completionStatusBgColorClass,
      eggIconPath,
      eggTooltip,
      max: Math.max,
      grades,
    };
  },
});
</script>
