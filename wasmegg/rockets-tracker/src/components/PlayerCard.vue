<template>
  <div class="mx-4 xl:mx-0 my-4">
    <div
      class="relative max-w-xs mx-auto px-3 sm:px-4 py-1 text-center bg-gray-50 rounded-xl shadow"
    >
      <button
        type="button"
        class="absolute p-1 top-2 right-2 sm:right-3 select-none focus:outline-none"
        @click="toggleCollapse"
      >
        <!-- fa: solid/compress-arrows-alt -->
        <svg
          v-if="!collapsed"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          class="h-3 w-3 text-gray-500"
        >
          <path
            fill="currentColor"
            d="M200 288H88c-21.4 0-32.1 25.8-17 41l32.9 31-99.2 99.3c-6.2 6.2-6.2 16.4 0 22.6l25.4 25.4c6.2 6.2 16.4 6.2 22.6 0L152 408l31.1 33c15.1 15.1 40.9 4.4 40.9-17V312c0-13.3-10.7-24-24-24zm112-64h112c21.4 0 32.1-25.9 17-41l-33-31 99.3-99.3c6.2-6.2 6.2-16.4 0-22.6L481.9 4.7c-6.2-6.2-16.4-6.2-22.6 0L360 104l-31.1-33C313.8 55.9 288 66.6 288 88v112c0 13.3 10.7 24 24 24zm96 136l33-31.1c15.1-15.1 4.4-40.9-17-40.9H312c-13.3 0-24 10.7-24 24v112c0 21.4 25.9 32.1 41 17l31-32.9 99.3 99.3c6.2 6.2 16.4 6.2 22.6 0l25.4-25.4c6.2-6.2 6.2-16.4 0-22.6L408 360zM183 71.1L152 104 52.7 4.7c-6.2-6.2-16.4-6.2-22.6 0L4.7 30.1c-6.2 6.2-6.2 16.4 0 22.6L104 152l-33 31.1C55.9 198.2 66.6 224 88 224h112c13.3 0 24-10.7 24-24V88c0-21.3-25.9-32-41-16.9z"
          />
        </svg>
        <!-- fa: solid/expand-arrows-alt -->
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          class="h-3 w-3 text-gray-500"
        >
          <path
            fill="currentColor"
            d="M448 344v112a23.94 23.94 0 0 1-24 24H312c-21.39 0-32.09-25.9-17-41l36.2-36.2L224 295.6 116.77 402.9 153 439c15.09 15.1 4.39 41-17 41H24a23.94 23.94 0 0 1-24-24V344c0-21.4 25.89-32.1 41-17l36.19 36.2L184.46 256 77.18 148.7 41 185c-15.1 15.1-41 4.4-41-17V56a23.94 23.94 0 0 1 24-24h112c21.39 0 32.09 25.9 17 41l-36.2 36.2L224 216.4l107.23-107.3L295 73c-15.09-15.1-4.39-41 17-41h112a23.94 23.94 0 0 1 24 24v112c0 21.4-25.89 32.1-41 17l-36.19-36.2L263.54 256l107.28 107.3L407 327.1c15.1-15.2 41-4.5 41 16.9z"
          />
        </svg>
      </button>

      <div class="divide-y divide-gray-200">
        <div class="py-2">
          <div class="flex items-center justify-center space-x-1 mx-4">
            <img
              :src="iconURL(hasProPermit ? 'egginc/pro_permit.png' : 'egginc/free_permit.png', 128)"
              class="h-4 flex-shrink-0"
            />
            <span class="font-serif truncate">{{ nickname }}</span>
            <img
              v-if="hasEnlightenmentDiamondTrophy"
              v-tippy="{ content: 'Proud owner of the enlightenment diamond trophy.' }"
              :src="iconURL('egginc/icon_trophy_diamond.png', 128)"
              class="h-4 w-4 flex-shrink-0"
            />
          </div>

          <div class="mt-1">
            <div class="text-xs">
              Last synced to server:
              <span v-tippy="{ content: lastRefreshed.format('LLL') }" class="whitespace-nowrap">
                {{ lastRefreshedRelative }}
              </span>
            </div>
            <div
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
              class="flex items-center justify-center space-x-1"
            >
              <span class="text-xs text-gray-500">Why is my save out of date?</span>
              <base-info />
            </div>
          </div>
        </div>

        <div v-if="!collapsed" class="py-2">
          <div class="flex flex-wrap items-center justify-center">
            <span class="flex whitespace-nowrap mr-1">
              <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="inline h-5 w-5" />
              <span class="text-sm text-yellow-500">{{ prophecyEggs }}</span>
            </span>
            <span class="flex whitespace-nowrap">
              <img :src="iconURL('egginc/egg_soul.png', 64)" class="inline h-5 w-5" />
              <span class="text-sm text-purple-500">{{ formatEIValue(soulEggs) }}</span>
            </span>
          </div>

          <div class="mt-1 mb-1">
            <dt class="text-sm font-medium">Earning Bonus</dt>
            <dd class="flex items-center justify-center text-sm space-x-0.5 -my-px">
              <span :style="{ color: role.color }">{{ formatEIValue(earningBonus * 100) }}%,</span>
              <span :style="{ color: role.color }">{{ role.name }}</span>
              <base-info
                v-tippy="{
                  content:
                    'This is the ‘naked’ earning bonus without artifacts. The label after the EB is the corresponding role used in the Egg, Inc. Discord server.',
                }"
              />
            </dd>
          </div>

          <div
            v-if="!collapsed"
            class="grid gap-x-2 justify-center"
            :style="{ gridTemplateColumns: '50% 50%' }"
          >
            <dt class="text-right text-sm font-medium whitespace-nowrap">Trophies</dt>
            <dd class="flex items-center text-left text-sm text-gray-900">
              {{ trophies }}/95,
              <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="h-4 w-4" />
              <span class="text-yellow-500">
                {{ prophecyEggsProgress.fromTrophies.completed }}/{{
                  prophecyEggsProgress.fromTrophies.available
                }}
              </span>
            </dd>

            <dt class="text-right text-sm font-medium whitespace-nowrap">Daily gifts</dt>
            <dd class="flex items-center text-left text-sm text-gray-900">
              M{{ dailyGifts.onMonth }}D{{ dailyGifts.onDay }},
              <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="h-4 w-4" />
              <span class="text-yellow-500">
                {{ prophecyEggsProgress.fromDailyGifts.completed }}/{{
                  prophecyEggsProgress.fromDailyGifts.available
                }}
              </span>
            </dd>

            <dt class="text-right text-sm font-medium whitespace-nowrap">Contracts</dt>
            <dd class="flex items-center text-left text-sm text-gray-900">
              <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="h-4 w-4 -ml-0.5" />
              <span class="text-yellow-500">
                {{ prophecyEggsProgress.fromContracts.completed }}
              </span>
            </dd>
          </div>
        </div>

        <div
          v-if="!collapsed"
          class="py-2 grid gap-x-2 justify-center"
          :style="{ gridTemplateColumns: '50% 50%' }"
        >
          <div class="text-right text-sm font-medium whitespace-nowrap">Lifetime earned</div>
          <div class="flex items-center text-left text-sm text-gray-900">
            <img
              :src="iconURL('egginc-extras/icon_golden_egg.png', 128)"
              class="flex-shrink-0 h-4 w-4 -ml-0.5"
            />
            <span v-tippy="{ content: formatEIValue(lifetimeGoldenEggsEarned) }" class="truncate">
              {{ fmt(lifetimeGoldenEggsEarned) }}
            </span>
          </div>

          <div class="text-right text-sm font-medium whitespace-nowrap">Lifetime spent</div>
          <div class="flex items-center text-left text-sm text-gray-900">
            <img
              :src="iconURL('egginc-extras/icon_golden_egg.png', 128)"
              class="flex-shrink-0 h-4 w-4 -ml-0.5"
            />
            <span v-tippy="{ content: formatEIValue(lifetimeGoldenEggsSpent) }" class="truncate">
              {{ fmt(lifetimeGoldenEggsSpent) }}
            </span>
          </div>

          <div class="text-right text-sm font-medium whitespace-nowrap">Crafting expenses</div>
          <div class="flex items-center text-left text-sm text-gray-900">
            <img
              :src="iconURL('egginc-extras/icon_golden_egg.png', 128)"
              class="flex-shrink-0 h-4 w-4 -ml-0.5"
            />
            <span v-tippy="{ content: formatEIValue(goldenEggsSpentOnCrafting) }" class="truncate">
              ~{{ fmt(goldenEggsSpentOnCrafting) }}
            </span>
            <base-info
              v-tippy="{
                content: `This estimate <span class='text-blue-300'>does not take into discounts from crafting sales</span> (as the save file simply does not have that level of granularity). It may also be inaccurate if crafting cost parameters were ever changed server-side.<br>Note that <span class='text-blue-300'>stone-setting expenses are not included</span>, again because the history is not available.`,
                allowHTML: true,
              }"
              class="flex-shrink-0 ml-0.5"
            />
          </div>

          <div class="text-right text-sm font-medium whitespace-nowrap">Current balance</div>
          <div class="flex items-center text-left text-sm text-gray-900">
            <img
              :src="iconURL('egginc-extras/icon_golden_egg.png', 128)"
              class="flex-shrink-0 h-4 w-4 -ml-0.5"
            />
            <span v-tippy="{ content: formatEIValue(currentGoldenEggsBalance) }" class="truncate">
              {{ fmt(currentGoldenEggsBalance) }}
            </span>
          </div>

          <div class="text-right text-sm font-medium whitespace-nowrap">
            Piggy, <span class="text-purple-500">Level {{ piggyLevel }}</span>
          </div>
          <div class="flex items-center text-left text-sm text-gray-900">
            <img
              :src="iconURL('egginc-extras/icon_golden_egg.png', 128)"
              class="flex-shrink-0 h-4 w-4 -ml-0.5"
            />
            <span v-tippy="{ content: formatEIValue(piggyGoldenEggs) }" class="truncate">
              {{ fmt(piggyGoldenEggs) }}
            </span>
          </div>
        </div>

        <div v-if="!collapsed" class="py-2">
          <div class="grid gap-x-2 justify-center" :style="{ gridTemplateColumns: '50% 50%' }">
            <dt class="text-right text-sm font-medium whitespace-nowrap">Lifetime prestiges</dt>
            <dd class="text-left text-sm text-gray-900">{{ fmt(numPrestiges) }}</dd>

            <dt class="text-right text-sm font-medium whitespace-nowrap">Rockets launched</dt>
            <dd class="text-left text-sm text-gray-900">{{ fmt(numMissions) }}</dd>

            <dt class="text-right text-sm font-medium whitespace-nowrap">Days since 1st ship</dt>
            <dd class="text-left text-sm text-gray-900">{{ fmt(daysSinceFirstMission) }}</dd>

            <dt class="text-right text-sm font-medium whitespace-nowrap">Inventory score</dt>
            <dd class="flex items-center text-sm text-gray-900">
              {{ fmt(inventoryScore) }}
              <base-info
                v-tippy="{
                  content: `The inventory score is an internal value used to determine the outer appearance of the hall of artifacts. The hall expands from two to four segments once the score reaches 1000, and the segments become colored once the score reaches 5000. <span class='text-blue-300'>The effect of this score is entirely cosmetic.</span>`,
                  allowHTML: true,
                }"
                class="inline ml-0.5"
              />
            </dd>
          </div>
        </div>

        <div v-if="!collapsed" class="py-2">
          <div class="text-sm font-medium">Inventory items</div>
          <dl
            class="grid gap-x-4 justify-center mt-1"
            :style="{ gridTemplateColumns: 'repeat(4, min-content)' }"
          >
            <div>
              <dt class="text-xs font-medium text-gray-900">Total</dt>
              <dd class="text-sm text-gray-900">{{ fmt(inventory.totalCount) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-blue-500">Rare</dt>
              <dd class="text-sm text-blue-500">{{ fmt(inventory.rareCount) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-purple-500">Epic</dt>
              <dd class="text-sm text-purple-500">{{ fmt(inventory.epicCount) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-yellow-500">Legendary</dt>
              <dd class="text-sm text-yellow-500">{{ fmt(inventory.legendaryCount) }}</dd>
            </div>
          </dl>
          <div
            v-if="inventory.epicCount > 0"
            class="mt-1 flex flex-wrap justify-center space-y-0.5"
          >
            <template v-for="family in inventory.catalog" :key="family.id">
              <template v-for="tier in family.tiers" :key="tier.id">
                <div
                  v-if="tier.haveEpic > 0"
                  v-tippy="{ content: `Epic ${tier.name} \u00d7 ${tier.haveEpic}` }"
                  class="h-6 w-6 mx-0.5 my-0.5 relative"
                >
                  <img
                    :src="iconURL(tier.iconPath, 128)"
                    class="h-6 w-6 p-0.5 rounded-full bg-epic"
                  />
                  <div
                    v-if="tier.haveEpic > 1"
                    class="badge absolute bottom-0 -right-1 h-3 w-3 ring-white ring-1 rounded-full bg-green-500 text-white flex items-center justify-center"
                    :style="{ fontSize: '0.5rem', lineHeight: '0.5rem' }"
                  >
                    {{ tier.haveEpic >= 10 ? '\u2605' : tier.haveEpic }}
                  </div>
                </div>
              </template>
            </template>
          </div>
          <div
            v-if="inventory.legendaryCount > 0"
            class="mt-1 flex flex-wrap justify-center space-y-0.5"
          >
            <template v-for="family in inventory.catalog" :key="family.id">
              <template v-for="tier in family.tiers" :key="tier.id">
                <div
                  v-if="tier.haveLegendary > 0"
                  v-tippy="{ content: `Legendary ${tier.name} \u00d7 ${tier.haveLegendary}` }"
                  class="h-6 w-6 mx-0.5 my-0.5 relative"
                >
                  <img
                    :src="iconURL(tier.iconPath, 128)"
                    class="h-6 w-6 p-0.5 rounded-full bg-legendary"
                  />
                  <div
                    v-if="tier.haveLegendary > 1"
                    class="badge absolute bottom-0 -right-1 h-3 w-3 ring-white ring-1 rounded-full bg-green-500 text-white flex items-center justify-center"
                    :style="{ fontSize: '0.5rem', lineHeight: '0.5rem' }"
                  >
                    {{ tier.haveLegendary >= 10 ? '\u2605' : tier.haveLegendary }}
                  </div>
                </div>
              </template>
            </template>
          </div>
        </div>

        <div v-if="!collapsed" class="py-2">
          <div class="grid gap-x-2 justify-center" :style="{ gridTemplateColumns: '50% 50%' }">
            <dt class="text-right text-sm font-medium whitespace-nowrap">Lifetime drones</dt>
            <dd class="text-left text-sm text-gray-900">{{ fmt(lifetimeDrones) }}</dd>

            <dt class="text-right text-sm font-medium whitespace-nowrap">Elite drones</dt>
            <dd class="text-left text-sm text-gray-900">{{ fmt(lifetimeEliteDrones) }}</dd>

            <dt class="text-right text-sm font-medium whitespace-nowrap">Lifetime boosts</dt>
            <dd class="text-left text-sm text-gray-900">{{ fmt(lifetimeBoosts) }}</dd>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, PropType, ref, toRefs } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import {
  earningBonusToFarmerRole,
  ei,
  formatEIValue,
  getLocalStorage,
  getNakedEarningBonus,
  getNumSoulEggs,
  getProphecyEggsProgress,
  iconURL,
  Inventory,
  setLocalStorage,
  TrophyLevel,
} from 'lib';
import BaseInfo from 'ui/components/BaseInfo.vue';
import { getLaunchedMissions } from '@/lib';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

const COLLAPSE_PLAYER_CARD_LOCALSTORAGE_KEY = 'collpasePlayerCard';

export default defineComponent({
  components: {
    BaseInfo,
  },
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
    inventory: {
      type: Object as PropType<Inventory>,
      required: true,
    },
  },
  setup(props) {
    const { backup, inventory } = toRefs(props);

    const collapsed = ref(getLocalStorage(COLLAPSE_PLAYER_CARD_LOCALSTORAGE_KEY) === 'true');
    const toggleCollapse = () => {
      collapsed.value = !collapsed.value;
      setLocalStorage(COLLAPSE_PLAYER_CARD_LOCALSTORAGE_KEY, collapsed.value);
    };

    const lastRefreshedTimestamp = computed(() => backup.value.settings!.lastBackupTime! * 1000);
    const lastRefreshed = computed(() => dayjs(Math.min(lastRefreshedTimestamp.value, Date.now())));
    const now = ref(dayjs());
    const lastRefreshedRelative = computed(() => now.value && lastRefreshed.value.fromNow());
    const refreshIntervalId = setInterval(() => {
      now.value = dayjs(); // Force recomputation of lastRefreshedRelative
    }, 10000);
    onBeforeUnmount(() => {
      clearInterval(refreshIntervalId);
    });

    const progress = computed(() => backup.value.game!);
    const artifactsDB = computed(() => backup.value.artifactsDb!);
    const nickname = computed(() => backup.value.userName!);
    const hasProPermit = computed(() => progress.value.permitLevel === 1);
    const prophecyEggsProgress = computed(() => getProphecyEggsProgress(backup.value));
    const hasEnlightenmentDiamondTrophy = computed(() => {
      const eggs = prophecyEggsProgress.value.fromTrophies.eggs;
      for (const egg of eggs) {
        if (egg.egg === ei.Egg.ENLIGHTENMENT) {
          return egg.level >= TrophyLevel.Diamond;
        }
      }
      return false;
    });
    const prophecyEggs = computed(() => prophecyEggsProgress.value.completed);
    const soulEggs = computed(() => getNumSoulEggs(backup.value));
    const earningBonus = computed(() => getNakedEarningBonus(backup.value));
    const role = computed(() => earningBonusToFarmerRole(earningBonus.value));
    const trophies = computed(() =>
      prophecyEggsProgress.value.fromTrophies.eggs.reduce((sum, egg) => sum + egg.level, 0)
    );
    const dailyGifts = computed(() => prophecyEggsProgress.value.fromDailyGifts);
    const lifetimeGoldenEggsEarned = computed(() => progress.value.goldenEggsEarned || 0);
    const lifetimeGoldenEggsSpent = computed(() => progress.value.goldenEggsSpent || 0);
    const goldenEggsSpentOnCrafting = computed(() => inventory.value.sunkCost);
    const currentGoldenEggsBalance = computed(
      () => lifetimeGoldenEggsEarned.value - lifetimeGoldenEggsSpent.value
    );
    const piggyLevel = computed(() => 1 + (backup.value.stats?.numPiggyBreaks || 0));
    const piggyGoldenEggs = computed(() =>
      Math.floor((progress.value.piggyBank || 0) * (1 + piggyLevelBonus(piggyLevel.value)))
    );
    const numPrestiges = computed(() => backup.value.stats?.numPrestiges || 0);
    const launchedMissions = computed(() => getLaunchedMissions(artifactsDB.value));
    const numMissions = computed(() => launchedMissions.value.length);
    const daysSinceFirstMission = computed(() => {
      if (numMissions.value === 0) {
        return -1;
      }
      const firstMissionLaunchedAt = dayjs(launchedMissions.value[0].startTimeDerived! * 1000);
      return dayjs().diff(firstMissionLaunchedAt, 'days');
    });
    const inventoryScore = computed(() => Math.floor(backup.value.artifacts?.inventoryScore || 0));
    const lifetimeDrones = computed(() => backup.value.stats?.droneTakedowns || 0);
    const lifetimeEliteDrones = computed(() => backup.value.stats?.droneTakedownsElite || 0);
    const lifetimeBoosts = computed(() => backup.value.stats?.boostsUsed || 0);
    return {
      collapsed,
      toggleCollapse,
      lastRefreshed,
      lastRefreshedRelative,
      nickname,
      hasProPermit,
      prophecyEggsProgress,
      hasEnlightenmentDiamondTrophy,
      prophecyEggs,
      soulEggs,
      earningBonus,
      role,
      trophies,
      dailyGifts,
      lifetimeGoldenEggsEarned,
      lifetimeGoldenEggsSpent,
      goldenEggsSpentOnCrafting,
      currentGoldenEggsBalance,
      piggyLevel,
      piggyGoldenEggs,
      numPrestiges,
      numMissions,
      daysSinceFirstMission,
      inventoryScore,
      lifetimeDrones,
      lifetimeEliteDrones,
      lifetimeBoosts,
      fmt,
      formatEIValue,
      iconURL,
    };
  },
});

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function piggyLevelBonus(level: number): number {
  switch (level) {
    case 0:
      return 0;
    case 1:
      return 0.02;
    case 2:
      return 0.25;
    default:
      return 0.1 * (level + 1);
  }
}
</script>

<style scoped>
.bg-epic {
  background: radial-gradient(#ff40ff, #ff40ff 35%, #c03fe2);
}

.bg-legendary {
  background: radial-gradient(#fffe41, #fffe41 35%, #eeab42);
}

/* Safri-only hack */
_::-webkit-full-page-media,
_:future,
:root .badge {
  padding-left: 0.5px;
}
</style>
