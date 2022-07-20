<template>
  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
    <thead class="bg-gray-50 dark:bg-gray-700">
      <tr>
        <template v-for="column in columns" :key="column.id">
          <th
            scope="col"
            class="px-4 py-2 text-xs font-medium whitespace-nowrap select-none"
            :class="[
              column.id === 'name' ? 'text-left' : 'text-center',
              column.id !== 'artifacts' && column.id !== 'boosts' ? 'cursor-pointer' : '',
            ]"
            @click="setSortBy(column.id)"
          >
            <span
              v-tippy="{ content: column.tooltip }"
              class="flex flex-row items-center space-x-1"
              :class="{ 'justify-center': column.id !== 'name' }"
            >
              <template v-if="column.iconPath">
                <span class="flex flex-shrink-0 flex-row items-center justify-center space-x-px">
                  <span v-if="column.prefix" class="text-gray-500 dark:text-gray-200">{{
                    column.prefix
                  }}</span>
                  <base-icon
                    :icon-rel-path="column.iconPath"
                    :size="64"
                    class="block h-4 w-4"
                    :style="{ minWidth: '1rem' }"
                  />
                  <span v-if="column.suffix" class="text-gray-500 dark:text-gray-200">{{
                    column.suffix
                  }}</span>
                </span>
              </template>
              <template v-else>
                <span class="text-gray-500 dark:text-gray-200">{{ column.name }}</span>
              </template>

              <svg
                v-if="column.id !== 'artifacts' && column.id !== 'boosts'"
                viewBox="0 0 320 512"
                class="flex-shrink-0 h-3 text-gray-400"
              >
                <path
                  v-if="!(sortBy === column.id && !sortAscending)"
                  fill="currentColor"
                  d="M279 224H41c-21.4 0-32.1-25.9-17-41L143 64c9.4-9.4 24.6-9.4 33.9 0l119 119c15.2 15.1 4.5 41-16.9 41z"
                />
                <path
                  v-if="!(sortBy === column.id && sortAscending)"
                  fill="currentColor"
                  d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z"
                />
              </svg>
            </span>
          </th>
        </template>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(contributor, index) in sortedContributors"
        :key="contributor.id"
        :class="index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-750' : 'bg-white dark:bg-gray-800'"
      >
        <td
          class="px-4 py-1 flex flex-row items-center space-x-0.5 max-w-xxs sm:max-w-xs md:max-w-sm text-sm"
        >
          <template v-if="devmode">
            <base-click-to-copy
              :text="contributor.id"
              class="text-gray-500 dark:text-gray-200 truncate"
            >
              {{ renderNonempty(contributor.name) }}
              <template #tooltip>Click to copy ID: {{ contributor.id }}</template>
            </base-click-to-copy>
          </template>
          <template v-else>
            <span class="text-gray-500 dark:text-gray-200 truncate">{{ contributor.name }}</span>
          </template>
          <!-- Inactive -->
          <svg
            v-if="!contributor.isActive"
            v-tippy="{
              content:
                'This player hasn\'t reported in for a long time and can be kicked by anyone.',
            }"
            viewBox="0 0 256 256"
            class="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0 cursor-help"
          >
            <path
              fill="currentColor"
              d="M82.156,193.707l-28.584,20.767l-2.748,-3.782l-2.23,-49.484l-21.389,15.54l-3.161,-4.352l27.275,-19.817l2.749,3.783l2.209,49.455l22.697,-16.49l3.182,4.38Z"
            />
            <path
              fill="currentColor"
              d="M136.463,122.54l-51.993,27.646l-3.659,-6.881l7.797,-82.187l-38.905,20.686l-4.209,-7.916l49.614,-26.38l3.659,6.881l-7.824,82.135l41.284,-21.951l4.236,7.967Z"
            />
            <path
              fill="currentColor"
              d="M234.333,188.756l-89.415,12.566l-1.663,-11.833l54.336,-114.331l-66.905,9.403l-1.913,-13.612l85.322,-11.992l1.663,11.833l-54.349,114.242l70.998,-9.978l1.926,13.702Z"
            />
          </svg>
          <!-- Time cheat -->
          <base-icon
            v-if="contributor.isTimeCheating"
            v-tippy="{
              content: 'This player is suspected of time cheating and can be kicked by anyone.',
            }"
            icon-rel-path="egginc-extras/icon_time_cheat.png"
            :size="64"
            class="h-4 w-4 flex-shrink-0 cursor-help"
            :style="{ filter: 'brightness(0.5) sepia(1) saturate(10000%)' }"
          />
          <!-- Leech -->
          <svg
            v-if="contributor.isLeeching"
            v-tippy="{
              content:
                'This player\'s contribution rate has been deemed unsatisfactory, and is at the risk of being kicked by anyone.',
            }"
            class="h-3.5 w-3.5 flex-shrink-0 text-red-500 cursor-help"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          <coop-card-contribution-table-artifact-gallery
            v-if="contributor.farmShared && contributor.artifacts.artifacts.length > 0"
            :artifact-set="(contributor.artifacts as ArtifactSet)"
            class="mx-auto"
          />
          <span
            v-else-if="contributor.farmShared"
            v-tippy="{ content: 'Farm is shared but no artifact is equipped.' }"
            class="hover:cursor-help"
            >&ndash;</span
          >
          <template v-else>Private</template>
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          {{ formatEIValue(contributor.eggsLaid) }}
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          {{ formatEIValue(contributor.eggsPerHour) }}
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          {{ formatEIValue(contributor.earningBonusPercentage) }}
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm tabular-nums"
          :style="{ color: contributor.farmerRole.color }"
        >
          {{ contributor.farmerRole.name.replace('farmer', '') }}
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          {{ formatWithThousandSeparators(contributor.tokens) }}
        </td>
        <td
          v-if="showOptionalColumn.tokensSpent"
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          <template v-if="contributor.tokensSpent !== null">
            {{ formatWithThousandSeparators(contributor.tokensSpent) }}
          </template>
          <template v-else>&ndash;</template>
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          <div
            v-if="contributor.farmShared && contributor.boosts.length > 0"
            class="flex items-center justify-center"
          >
            <base-icon
              v-for="(boost, i) of contributor.boosts"
              :key="i"
              v-tippy="{ content: `${boostIdToName[boost.boostId ?? ''] ?? '?'}` }"
              :icon-rel-path="`egginc/b_icon_${boost.boostId}.png`"
              class="flex-0 h-4 w-4"
            />
          </div>
          <span
            v-else-if="contributor.farmShared"
            v-tippy="{
              content: 'Farm is shared but no boost was active when the player last checked in.',
            }"
            class="hover:cursor-help"
            >&ndash;</span
          >
          <template v-else>Private</template>
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          {{ (contributor.earningsBoost * 100).toFixed(0) }}%
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          {{ (contributor.eggLayingRateBoost * 100).toFixed(0) }}%
        </td>
        <td
          v-if="showOptionalColumn.hourlyLayingRateUncapped"
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          <template v-if="contributor.hourlyLayingRateUncapped !== null">
            <span
              v-tippy="{
                content:
                  contributor.farmPopulation !== contributor.farmCapacity
                    ? `Without further upgrades, when currently available hab space is filled,
                      laying rate will reach <span class='text-blue-300'>${
                        contributor.projectedHourlyLayingRateUncappedAtFullHabs !== null
                          ? formatEIValue(contributor.projectedHourlyLayingRateUncappedAtFullHabs)
                          : '-'
                      }/hr</span>.`
                    : 'Habs full, laying rate cannot be improved through population growth at the moment.',
                allowHTML: true,
              }"
              >{{ formatEIValue(contributor.hourlyLayingRateUncapped) }}</span
            >
            <base-icon
              v-if="
                contributor.hourlyShippingCapacity !== null &&
                contributor.hourlyLayingRateUncapped > contributor.hourlyShippingCapacity
              "
              v-tippy="{
                content:
                  'This player is shipping-limited (vehicles cannot ship all eggs being laid).',
              }"
              icon-rel-path="egginc-extras/icon_warning.png"
              :size="64"
              class="inline-block h-4 w-4 align-middle relative -top-px cursor-help ml-0.5"
            />
          </template>
          <template v-else>&ndash;</template>
        </td>
        <td
          v-if="showOptionalColumn.hourlyShippingCapacity"
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          <template v-if="contributor.hourlyShippingCapacity !== null">
            {{ formatEIValue(contributor.hourlyShippingCapacity) }}
          </template>
          <template v-else>&ndash;</template>
        </td>
        <td
          v-if="showOptionalColumn.farmPopulation"
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          <template v-if="contributor.farmPopulation !== null">
            {{ formatWithThousandSeparators(contributor.farmPopulation, -1) }}
          </template>
          <template v-else>&ndash;</template>
        </td>
        <td
          v-if="showOptionalColumn.farmCapacity"
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          <template v-if="contributor.farmCapacity !== null">
            {{ formatWithThousandSeparators(contributor.farmCapacity, -1) }}
          </template>
          <template v-else>&ndash;</template>
        </td>
        <td
          v-if="showOptionalColumn.internalHatcheryRatePerMinPerHab"
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          <template v-if="contributor.internalHatcheryRatePerMinPerHab !== null">
            {{ formatWithThousandSeparators(contributor.internalHatcheryRatePerMinPerHab, -1) }}
          </template>
          <template v-else>&ndash;</template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, inject, Ref } from 'vue';

import { ArtifactSet, CoopStatus, boostIdToName, eggIconPath, ei, formatEIValue } from '@/lib';
import {
  getSessionStorage,
  setSessionStorage,
  formatWithThousandSeparators,
  renderNonempty,
} from '@/utils';
import { devmodeKey } from '@/symbols';
import BaseClickToCopy from '@/components/BaseClickToCopy.vue';
import BaseIcon from 'ui/components/BaseIcon.vue';
import CoopCardContributionTableArtifactGallery from '@/components/CoopCardContributionTableArtifactGallery.vue';

const requiredColumnIds = [
  'name',
  'artifacts',
  'eggsLaid',
  'eggsPerHour',
  'earningBonusPercentage',
  'tokens',
  'boosts',
  'earningsBoost',
  'role',
  'eggLayingRateBoost',
] as const;

const optionalColumnIds = [
  'tokensSpent',
  'hourlyLayingRateUncapped',
  'hourlyShippingCapacity',
  'farmPopulation',
  'farmCapacity',
  'internalHatcheryRatePerMinPerHab',
] as const;

type ColumnId = typeof requiredColumnIds[number] | OptionalColumnId;
type OptionalColumnId = typeof optionalColumnIds[number];

type ColumnSpec = {
  id: ColumnId;
  name: string;
  iconPath?: string;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
};

const props = defineProps<{ egg: ei.Egg; coopStatus: CoopStatus }>();

const { egg, coopStatus } = toRefs(props);
const devmode = inject(devmodeKey);

const showOptionalColumn = computed(
  () =>
    Object.fromEntries(
      optionalColumnIds.map(col => [
        col,
        coopStatus.value.contributors.some(contributor => contributor[col] !== null),
      ])
    ) as Record<OptionalColumnId, boolean>
);
const columns: Ref<ColumnSpec[]> = computed(() => {
  const cols: ColumnSpec[] = [
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
  ];
  if (showOptionalColumn.value.tokensSpent) {
    cols.push({
      id: 'tokensSpent',
      name: 'Tokens spent',
      iconPath: 'egginc/b_icon_token.png',
      suffix: ' \u{00a0}spent',
      tooltip: 'Tokens spent',
    });
  }
  cols.push(
    {
      id: 'boosts',
      name: 'Boosts',
    },
    {
      id: 'earningsBoost',
      name: 'SiaB',
      iconPath: 'egginc/afx_ship_in_a_bottle_4.png',
      tooltip: 'Earnings boost percentage from Ship in a Bottle equipped by each contributor',
    },
    {
      id: 'eggLayingRateBoost',
      name: 'TD',
      iconPath: 'egginc/afx_tachyon_deflector_4.png',
      tooltip:
        'Egg laying rate boost percentage from Tachyon Deflector equipped by each contributor',
    }
  );
  if (showOptionalColumn.value.hourlyLayingRateUncapped) {
    cols.push({
      id: 'hourlyLayingRateUncapped',
      name: 'Laying / hr',
      tooltip: 'Egg laying rate from all chickens, not capped by shipping capacity',
    });
  }
  if (showOptionalColumn.value.hourlyShippingCapacity) {
    cols.push({
      id: 'hourlyShippingCapacity',
      name: 'Max shipping / hr',
    });
  }
  if (showOptionalColumn.value.farmPopulation) {
    cols.push({
      id: 'farmPopulation',
      name: 'Population',
    });
  }
  if (showOptionalColumn.value.farmCapacity) {
    cols.push({
      id: 'farmCapacity',
      name: 'Hab space',
    });
  }
  if (showOptionalColumn.value.internalHatcheryRatePerMinPerHab) {
    cols.push({
      id: 'internalHatcheryRatePerMinPerHab',
      name: 'IHR / min / hab',
      tooltip: 'Internal hatchery rate, including boost effect if any',
    });
  }
  return cols;
});

const columnIds: Ref<string[]> = computed(() => columns.value.map(col => col.id));
const defaultSortBy: ColumnId = 'eggsLaid';
const sortBySessionStorageKey = computed(
  () => `${coopStatus.value.contractId}:${coopStatus.value.coopCode}_sortBy`
);
const sortAscendingSessionStorageKey = computed(
  () => `${coopStatus.value.contractId}:${coopStatus.value.coopCode}_sortAscending`
);
let initialSortBy = getSessionStorage(sortBySessionStorageKey.value);
if (initialSortBy === undefined || !columnIds.value.includes(initialSortBy)) {
  initialSortBy = defaultSortBy;
}
const sortBy = ref(initialSortBy as ColumnId);
const initialSortAscending = getSessionStorage(sortAscendingSessionStorageKey.value) === 'true';
const sortAscending = ref(initialSortAscending);
const setSortBy = (by: ColumnId) => {
  if (by === 'artifacts' || by === 'boosts') {
    return;
  }
  if (!columnIds.value.includes(by)) {
    by = defaultSortBy;
  }
  if (sortBy.value === by) {
    sortAscending.value = !sortAscending.value;
  } else {
    sortBy.value = by;
    sortAscending.value = by === 'name';
  }
  setSessionStorage(sortBySessionStorageKey.value, by);
  setSessionStorage(sortAscendingSessionStorageKey.value, sortAscending.value);
};

const sortedContributors = computed(() => {
  const sorted = [...coopStatus.value.contributors].sort((c1, c2) => {
    let cmp: number;
    switch (sortBy.value) {
      case 'name':
        cmp = c1.name.localeCompare(c2.name);
        break;
      case 'role':
        cmp = c1.earningBonusPercentage - c2.earningBonusPercentage;
        break;
      case 'artifacts':
      case 'boosts':
        cmp = 0;
        break;
      default:
        cmp = (c1[sortBy.value] || 0) - (c2[sortBy.value] || 0);
    }
    // Use eggsLaid as tiebreaker.
    return cmp !== 0 ? cmp : c1.eggsLaid - c2.eggsLaid;
  });
  return sortAscending.value ? sorted : sorted.reverse();
});
</script>
