<template>
  <div class="my-4 bg-white dark:bg-gray-800 shadow overflow-hidden ultrawide:rounded-lg mb-4">
    <div class="px-4 sm:px-6 py-3 flex items-center space-x-1 bg-gray-50 dark:bg-gray-700">
      <base-icon
        :icon-rel-path="hasProPermit ? 'egginc/pro_permit.png' : 'egginc/free_permit.png'"
        :size="128"
        class="h-4 w-6 flex-shrink-0 -ml-0.5"
      />
      <span class="text-base font-serif text-gray-900 dark:text-gray-100">
        {{ renderNonempty(nickname) }}
      </span>
    </div>
    <div
      class="sm:grid sm:gap-x-8 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3"
      :style="{ gridTemplateColumns: 'max-content 1fr' }"
    >
      <div>
        <div class="grid gap-x-3" :style="{ gridTemplateColumns: 'repeat(2, max-content)' }">
          <dt class="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Mystical eggs</dt>
          <dd class="flex flex-wrap items-center">
            <span class="flex items-center whitespace-nowrap mr-1">
              <base-icon
                icon-rel-path="egginc/egg_of_prophecy.png"
                :size="64"
                class="inline-block align-middle h-4 w-4 -ml-0.5"
              />
              <span class="text-sm text-yellow-500">{{ prophecyEggs }}</span>
            </span>
            <span class="flex items-center whitespace-nowrap">
              <base-icon icon-rel-path="egginc/egg_soul.png" :size="64" class="inline-block align-middle h-4 w-4" />
              <span class="text-sm text-purple-500">{{ formatEIValue(soulEggs) }}</span>
            </span>
          </dd>

          <dt class="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Earning bonus</dt>
          <dd class="flex items-center text-sm space-x-0.5">
            <span :style="{ color: role.color }">{{ formatEIValue(earningBonus * 100) }}%,</span>
            <span :style="{ color: role.color }">{{ role.name }}</span>
            <base-info
              v-tippy="{
                content: `This is the 'naked' earning bonus without artifacts. The label after the EB is the corresponding role used in the Egg, Inc. Discord server.`,
              }"
            />
          </dd>

          <dt class="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Trophies</dt>
          <dd class="flex items-center text-sm text-gray-900 dark:text-gray-100">
            {{ trophies }}/95,
            <base-icon icon-rel-path="egginc/egg_of_prophecy.png" :size="64" class="h-4 w-4" />
            <span class="text-yellow-500">
              {{ prophecyEggsProgress.fromTrophies.completed }}/{{ prophecyEggsProgress.fromTrophies.available }}
            </span>
          </dd>

          <dt class="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Daily gifts</dt>
          <dd class="flex items-center text-sm text-gray-900 dark:text-gray-100">
            M{{ dailyGifts.onMonth }}D{{ dailyGifts.onDay }},
            <base-icon icon-rel-path="egginc/egg_of_prophecy.png" :size="64" class="h-4 w-4" />
            <span class="text-yellow-500">
              {{ prophecyEggsProgress.fromDailyGifts.completed }}/{{ prophecyEggsProgress.fromDailyGifts.available }}
            </span>
          </dd>

          <dt class="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Contracts</dt>
          <dd class="flex items-center text-sm text-gray-900 dark:text-gray-100">
            <base-icon icon-rel-path="egginc/egg_of_prophecy.png" :size="64" class="h-4 w-4 -ml-0.5" />
            <span class="text-yellow-500">
              {{ prophecyEggsProgress.fromContracts.completed }}
            </span>
          </dd>
          <dt class="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Seasons</dt>
          <dd class="flex items-center text-sm text-gray-900 dark:text-gray-100">
            <base-icon icon-rel-path="egginc/egg_of_prophecy.png" :size="64" class="h-4 w-4 -ml-0.5" />
            <span class="text-yellow-500">
              {{ prophecyEggsProgress.fromContractSeasons.completed }}
            </span>
          </dd>
        </div>

        <div class="mt-2 space-y-1">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Age of save data:
            <auto-refreshed-relative-time :reference-time="backupTime" :without-suffix="true">
              <template #default="{ relativeTime, referenceTimeFormatted }">
                <span class="inline-flex items-center text-gray-500 dark:text-gray-400">
                  {{ relativeTime }}
                  <base-info
                    v-tippy="{
                      content: `
                        <p>Save last synced to server at <span class='text-blue-300'>${referenceTimeFormatted}</span>.</p>

                        <p class='mt-2'>The game, while active, saves to Egg, Inc.&rsquo;s server every couple of minutes if network condition allows. Other than soon after a fresh launch of the game, such server syncs are unpredictable from the user&rsquo;s point of view. <span class='text-blue-300'>You can force close then reopen the app to reasonably reliably trigger a sync</span> (search for &ldquo;iOS force close app&rdquo; or &ldquo;Android force close app&rdquo; if you need help).</p>

                        <p class='mt-2'>However, even after an app-initiated sync, it may take an unpredicatible amount of time (usually within a minute or so) for the game&rsquo;s server to serve the updated save through its API, which is then picked up by this tool. There is no solution other than <span class='text-blue-300'>refreshing periodically until the fresh save shows up</span>. <span class='text-red-300'>Please do not refresh too fast</span>, which is not helpful, and hammers the server.</p>`,
                      allowHTML: true,
                    }"
                    class="ml-0.5"
                  />
                </span>
              </template>
            </auto-refreshed-relative-time>
          </p>
          <button
            type="button"
            class="flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 focus:outline-none rounded-md !duration-0"
            @click="triggerRefresh"
          >
            <svg class="-ml-px mr-1.5 h-3 w-3 text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span class="text-xs text-gray-100">Refresh page</span>
          </button>
        </div>
      </div>

      <div class="mt-2 sm:mt-0">
        <p class="text-xs text-green-500 leading-5">Bookmark this page to check all your contracts at any time!</p>
        <p
          v-for="[href, description] in [
            [
              `https://wasmegg-carpet.netlify.app/past-contracts/?playerId=${userId}`,
              'Details of your completed, failed, and missed contracts',
            ],
            [
              `https://wasmegg-carpet.netlify.app/rockets-tracker/?playerId=${userId}`,
              'Details of your artifact missions and inventory',
            ],
            ['https://wasmegg-carpet.netlify.app/', 'More tools'],
          ]"
          :key="href"
          class="text-xs leading-5"
        >
          <a :href="href" target="_blank" class="text-blue-500 hover:text-blue-600 transition-none">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              class="inline h-3 w-3 -ml-px mr-0.5 relative -top-px text-blue-500 cursor-pointer select-none"
            >
              <path
                d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
              />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            {{ description }}
          </a>
        </p>
      </div>
    </div>
    <div
      v-if="soloStatuses.length === 0 && coopParams.length === 0"
      class="text-sm text-gray-700 dark:text-gray-300 px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700"
    >
      No active contract found in your save. Check back when you have one!
    </div>
  </div>

  <div class="my-4 bg-white dark:bg-gray-800 shadow overflow-hidden ultrawide:rounded-lg mb-4">
    <season-progress-bar
      v-if="backup.contracts?.lastCpi?.seasonProgress != null"
      :backup="backup"
      :refresh-key="coopRefreshKey"
    />
  </div>

  <template v-for="status in soloStatuses" :key="`${status.userId}:${status.contractId}`">
    <solo-card :status="status" />
  </template>

  <template v-for="params in coopParams" :key="`${params.contractId}:${params.coopCode}`">
    <coop-card-loader
      :contract-id="params.contractId"
      :coop-code="params.coopCode"
      :known-contract="params.contract"
      :known-league="params.league"
      :known-grade="params.grade"
      :refresh-key="coopRefreshKey"
      :user-id="userId"
      :from-dashboard="true"
    />
  </template>
</template>

<script lang="ts">
import { computed, defineComponent, inject, PropType, ref, toRefs, watch } from 'vue';

import {
  earningBonusToFarmerRole,
  ei,
  formatEIValue,
  getNakedEarningBonus,
  getNumSoulEggs,
  getProphecyEggsProgress,
  getUserActiveSoloContracts,
  getUserBackupTime,
  SoloStatus,
} from '@/lib';
import { ContractLeague } from 'lib';
import { refreshCallbackKey } from '@/symbols';
import { renderNonempty } from '@/utils';
import AutoRefreshedRelativeTime from '@/components/AutoRefreshedRelativeTime.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';
import BaseIcon from 'ui/components/BaseIcon.vue';
import CoopCardLoader from '@/components/CoopCardLoader.vue';
import SoloCard from '@/components/SoloCard.vue';
import { getUserActiveCoopContractsSorted } from '../lib/userdata';
import useContractsStore from '@/stores/contracts';
import SeasonProgressBar from '@/components/SeasonProgressBar.vue';

export default defineComponent({
  components: {
    AutoRefreshedRelativeTime,
    BaseInfo,
    BaseIcon,
    CoopCardLoader,
    SeasonProgressBar,
    SoloCard,
  },
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
  },
  setup(props) {
    const contractStore = useContractsStore();
    const { backup } = toRefs(props);
    const triggerRefresh = inject(refreshCallbackKey, () => {
      window.location.reload();
    });

    const coopRefreshKey = ref(Date.now());
    watch(backup, () => {
      coopRefreshKey.value = Date.now();
    });

    const backupTime = computed(() => getUserBackupTime(backup.value));
    const progress = computed(() => backup.value.game!);
    const userId = computed(() => backup.value.eiUserId!);
    const nickname = computed(() => backup.value.userName!);
    const hasProPermit = computed(() => progress.value.permitLevel === 1);
    const prophecyEggsProgress = computed(() => getProphecyEggsProgress(backup.value));
    const prophecyEggs = computed(() => prophecyEggsProgress.value.completed);
    const soulEggs = computed(() => getNumSoulEggs(backup.value));
    const earningBonus = computed(() => getNakedEarningBonus(backup.value));
    const role = computed(() => earningBonusToFarmerRole(earningBonus.value));
    const trophies = computed(() =>
      prophecyEggsProgress.value.fromTrophies.eggs.reduce((sum, egg) => sum + egg.level, 0)
    );
    const dailyGifts = computed(() => prophecyEggsProgress.value.fromDailyGifts);

    const coops = computed(() => getUserActiveCoopContractsSorted(backup.value));
    const coopParams = computed(() =>
      coops.value.map(coop => ({
        contractId: coop.contract!.identifier!,
        coopCode: coop.coopIdentifier!,
        contract: coop.contract!,
        league: (coop.league as ContractLeague) ?? undefined,
        grade: coop.grade ?? ei.Contract.PlayerGrade.GRADE_UNSET,
      }))
    );
    const soloStatuses = computed(() =>
      getUserActiveSoloContracts(backup.value).map(solo => new SoloStatus(solo, backup.value))
    );
    const housekeeping = () => {
      coopParams.value.forEach(coop => contractStore.addContract(coop.contract));
      soloStatuses.value.forEach(solo => contractStore.addContract(solo.contract));
    };
    housekeeping();
    watch(backup, () => {
      housekeeping();
    });

    return {
      coopRefreshKey,
      backupTime,
      userId,
      nickname,
      hasProPermit,
      prophecyEggsProgress,
      prophecyEggs,
      soulEggs,
      earningBonus,
      role,
      trophies,
      dailyGifts,
      coopParams,
      soloStatuses,
      renderNonempty,
      formatEIValue,
      triggerRefresh,
    };
  },
});
</script>
