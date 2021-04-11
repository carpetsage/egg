<template>
  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
    <thead class="bg-gray-50 dark:bg-gray-700">
      <tr>
        <template v-for="column in columns" :key="column.sortBy">
          <th
            v-if="!(!showRoleColumn && column.sortBy === 'role')"
            scope="col"
            class="px-4 py-2 text-xs font-medium uppercase tracking-wider cursor-pointer select-none"
            :class="column.sortBy === 'name' ? 'text-left' : 'text-center'"
            @click="setSortBy(column.sortBy)"
          >
            <span
              class="flex flex-row items-center space-x-1"
              :class="{ 'justify-center': column.sortBy !== 'name' }"
              v-tippy="{ content: column.tooltip }"
            >
              <template v-if="column.iconPath">
                <img :src="iconURL(column.iconPath, 64)" class="h-4 w-4" />
              </template>
              <template v-else>
                <span class="text-gray-500 dark:text-gray-200">{{ column.name }}</span>
              </template>

              <svg viewBox="0 0 320 512" class="h-3 text-gray-400">
                <path
                  v-if="!(sortBy === column.sortBy && !sortAscending)"
                  fill="currentColor"
                  d="M279 224H41c-21.4 0-32.1-25.9-17-41L143 64c9.4-9.4 24.6-9.4 33.9 0l119 119c15.2 15.1 4.5 41-16.9 41z"
                />
                <path
                  v-if="!(sortBy === column.sortBy && sortAscending)"
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
          <span class="text-gray-500 dark:text-gray-200 truncate">{{ contributor.name }}</span>
          <!-- Inactive -->
          <svg
            v-if="!contributor.isActive"
            viewBox="0 0 256 256"
            class="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0"
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
          <img
            v-if="contributor.isTimeCheating"
            :src="iconURL('egginc-extras/icon_time_cheat.png', 64)"
            class="h-4 w-4 flex-shrink-0"
            :style="{ filter: 'brightness(0.5) sepia(1) saturate(10000%)' }"
          />
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
          v-if="showRoleColumn"
          class="px-4 py-1 whitespace-nowrap text-center text-sm tabular-nums"
          :style="{ color: contributor.farmerRole.color }"
        >
          {{ contributor.farmerRole.name.replace('farmer', '') }}
        </td>
        <td
          class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          {{ contributor.tokens }}
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
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { PropType, computed, defineComponent, ref, toRefs } from 'vue';
import { useStore } from 'vuex';

import { CoopStatus, formatEIValue } from '@/lib';
import { getSessionStorage, setSessionStorage, iconURL } from '@/utils';
import { key } from '@/store';

type SortBy =
  | 'name'
  | 'eggsLaid'
  | 'eggsPerHour'
  | 'earningBonusPercentage'
  | 'tokens'
  | 'earningsBoost'
  | 'role'
  | 'eggLayingRateBoost';

const columns: { sortBy: SortBy; name: string; iconPath?: string; tooltip?: string }[] = [
  { sortBy: 'name', name: 'Player' },
  { sortBy: 'eggsLaid', name: 'Laid' },
  { sortBy: 'eggsPerHour', name: 'Rate/hr' },
  { sortBy: 'earningBonusPercentage', name: 'EB%' },
  { sortBy: 'role', name: 'Role' },
  { sortBy: 'tokens', name: 'Tokens', iconPath: 'egginc/b_icon_token.png', tooltip: 'Tokens' },
  {
    sortBy: 'earningsBoost',
    name: 'SiaB',
    iconPath: 'egginc/afx_ship_in_a_bottle_4.png',
    tooltip: 'Earnings boost percentage from Ship in a Bottle equipped by each contributor',
  },
  {
    sortBy: 'eggLayingRateBoost',
    name: 'TD',
    iconPath: 'egginc/afx_tachyon_deflector_4.png',
    tooltip: 'Egg laying rate boost percentage from Tachyon Deflector equipped by each contributor',
  },
];
const validSortBys: string[] = columns.map(col => col.sortBy);
const defaultSortBy: SortBy = 'eggsLaid';

export default defineComponent({
  props: {
    coopStatus: {
      type: Object as PropType<CoopStatus>,
      required: true,
    },
  },
  setup(props) {
    const { coopStatus } = toRefs(props);
    const store = useStore(key);

    const sortBySessionStorageKey = computed(
      () => `${coopStatus.value.contractId}:${coopStatus.value.coopCode}_sortBy`
    );
    const sortAscendingSessionStorageKey = computed(
      () => `${coopStatus.value.contractId}:${coopStatus.value.coopCode}_sortAscending`
    );
    let initialSortBy = getSessionStorage(sortBySessionStorageKey.value);
    if (initialSortBy === undefined || !validSortBys.includes(initialSortBy)) {
      initialSortBy = defaultSortBy;
    }
    const sortBy = ref(initialSortBy as SortBy);
    const initialSortAscending = getSessionStorage(sortAscendingSessionStorageKey.value) === 'true';
    const sortAscending = ref(initialSortAscending);
    const setSortBy = (by: SortBy) => {
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
          default:
            cmp = c1[sortBy.value] - c2[sortBy.value];
        }
        // Use eggsLaid as tiebreaker.
        return cmp !== 0 ? cmp : c1.eggsLaid - c2.eggsLaid;
      });
      return sortAscending.value ? sorted : sorted.reverse();
    });

    const showRoleColumn = computed(() => store.state.coopConfig.showRoleColumn);

    return {
      columns,
      sortBy,
      sortAscending,
      setSortBy,
      sortedContributors,
      showRoleColumn,
      formatEIValue,
      iconURL,
    };
  },
});
</script>
