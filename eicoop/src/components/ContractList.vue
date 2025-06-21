<template>
  <DataTable
    v-model:filters="filters"
    v-model:expanded-rows="expandedRows"
    :value="contracts"
    table-class="min-w-full"
    responsive-layout="scroll"
    data-key="uniqueKey"
    sort-field="offeringTime"
    :sort-order="-1"
    removable-sort
    :paginator="true"
    :rows="rowsPerPage"
    paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
    current-page-report-template="Showing {first} to {last} of {totalRecords} entries"
    :global-filter-fields="['id', 'name']"
    filter-display="menu"
    :class="{ dark: darkThemeOn }"
  >
    <template #header>
      <div class="flex flex-row mb-2">
        <button
          type="button"
          class="flex-shrink-0 px-2 py-1 mx-1 ultrawide:ml-0 border border-transparent shadow-sm text-xs leading-4 rounded-md text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none"
          @click="expandAll"
        >
          Expand all
        </button>
        <button
          type="button"
          class="flex-shrink-0 px-2 py-1 ml-1 mr-2 border border-transparent shadow-sm text-xs leading-4 rounded-md text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none"
          @click="collapseAll"
        >
          Collapse all
        </button>
        <div class="relative ml-auto mr-1 ultrawide:mr-0 rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <base-input
            v-model.trim="filters.global.value"
            type="text"
            class="block min-w-0 px-2 py-1 w-full pl-8 sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-500 rounded-md"
            placeholder="Keyword"
          />
        </div>
      </div>
    </template>

    <Column :expander="true" header-class="pl-2 py-2" body-class="pl-2 py-1" />
    <Column
      field="egg"
      header=""
      :sortable="true"
      header-class="pl-4 pr-1 py-2 whitespace-nowrap text-xs font-medium text-gray-500 dark:text-gray-200 focus:outline-none"
      body-class="pl-4 pr-1 py-1"
      :body-style="{ minWidth: '2.25rem' }"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <base-icon
          v-tippy="{ content: contractEggTooltip(contract) }"
          :icon-rel-path="contractEggIconPath(contract)"
          :size="64"
          class="block -ml-0.5 h-4 w-4"
        />
      </template>
    </Column>
    <Column
      field="name"
      header="Title"
      :sortable="true"
      :header-class="columnHeaderClasses"
      :body-class="columnBodyClasses"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <span
          v-tippy="
            isAvailable(contract, now) ? { content: `Expires in ${durationUntilExpiration(contract, now)}` } : {}
          "
          class="flex items-center cursor-pointer"
          :class="[
            isAvailable(contract, now)
              ? 'text-green-500'
              : contract.type === 'Original'
                ? columnColorClassesOriginal
                : columnColorClasses,
            contract.type === 'Original' ? 'font-medium ' : null,
          ]"
          @click="selectContractAndShowCoopSelector(contract.id)"
        >
          {{ contract.name }}
          <div v-if="contract.ccOnly" class="flex items-center ml-1">
            <img
              v-tippy="{ content: `You must be subscribed to Egg Inc Ultra to see this contract in game` }"
              src="/ultra.svg"
              class="block -ml-0.5 h-4 w-4"
            />
          </div>
          <div v-if="contract.type === 'Original' && contract.prophecyEggs > 0" class="flex items-center ml-1">
            <base-icon
              v-for="index in contract.prophecyEggs"
              :key="Number(index)"
              icon-rel-path="egginc/egg_of_prophecy.png"
              :size="64"
              class="h-4 w-4"
            />
          </div>
        </span>
      </template>
    </Column>
    <Column
      field="identifier"
      header="ID"
      :sortable="true"
      :header-class="columnHeaderClasses"
      :body-class="columnBodyClasses"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <span :class="[columnColorClasses, 'cursor-pointer']" @click="selectContractAndShowCoopSelector(contract.id)">
          {{ contract.id }}
        </span>
      </template>
    </Column>
    <Column
      field="season"
      header="Season"
      :sortable="true"
      :header-class="columnHeaderClasses"
      :body-class="columnBodyClasses"
      :sort-function="seasonSortFunction"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <span :class="columnColorClasses">
          {{ contract.season || '' }}
        </span>
      </template>
    </Column>
    <Column
      field="type"
      header="Type"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
      :show-filter-match-modes="false"
    >
      <template #filter="{ filterModel }">
        <select
          v-model="filterModel.value"
          class="mt-1 block w-full pl-3 pr-10 py-1 text-base border border-gray-300 focus:outline-none focus:border-gray-500 sm:text-sm rounded-md text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500"
        >
          <option value="">-- Type --</option>
          <option>Original</option>
          <option>Leggacy</option>
        </select>
      </template>
      <template #body="{ data: contract }: { data: Contract }">
        <span :class="contract.type === 'Original' ? [columnColorClassesOriginal, 'font-medium'] : columnColorClasses">
          {{ contract.type }}
        </span>
      </template>
    </Column>
    <Column
      field="numLeggacies"
      header="Leggacies"
      :sortable="true"
      :header-class="columnHeaderNarrowClassesCentered"
      :body-class="columnBodyClassesCentered"
      :show-filter-match-modes="false"
    >
      <template #filter="{ filterModel }">
        <div class="relative ml-auto mr-1 rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <svg viewBox="0 0 384 512" class="h-3 text-gray-500 dark:text-gray-400">
              <path
                fill="currentColor"
                d="M347.58 308.22L115.13 192 347.58 75.78c3.95-1.97 5.55-6.78 3.58-10.73l-14.29-28.62a7.986 7.986 0 0 0-10.73-3.58L36.4 179.02a7.992 7.992 0 0 0-4.4 7.14v12.91c0 3.03 1.71 5.8 4.42 7.15l289.71 144.92c3.95 1.98 8.76.38 10.73-3.58l14.29-28.62c1.98-3.94.38-8.74-3.57-10.72zM0 440v32c0 4.42 3.58 8 8 8h368c4.42 0 8-3.58 8-8v-32c0-4.42-3.58-8-8-8H8c-4.42 0-8 3.58-8 8z"
              />
            </svg>
          </div>
          <input
            v-model.number="filterModel.value"
            type="text"
            class="block min-w-0 px-2 py-1 w-full pl-6 sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-500 rounded-md"
            placeholder="Max # of leggacies"
          />
        </div>
      </template>
    </Column>
    <Column
      field="lengthSeconds"
      header="Duration"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        {{ formatDuration(contract.aaaLength, true) }}
      </template>
    </Column>
    <Column
      field="maxCoopSize"
      header="Size"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        {{ contract.maxCoopSize || '\u2013' }}
      </template>
    </Column>
    <Column
      field="minutesPerToken"
      header="Tokens"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <template v-if="contract.minutesPerToken"> {{ contract.minutesPerToken }}m </template>
        <template v-else>&ndash;</template>
      </template>
    </Column>
    <Column
      field="prophecyEggs"
      header="PE"
      :sortable="true"
      :header-class="columnHeaderNarrowClassesCentered"
      :body-class="columnBodyClassesCentered"
      :show-filter-match-modes="false"
    >
      <template #filter="{ filterModel }">
        <div class="relative ml-auto mr-1 rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <svg viewBox="0 0 384 512" class="h-3 text-gray-500 dark:text-gray-400">
              <path
                fill="currentColor"
                d="M32.84 318.95l14.29 28.62a7.986 7.986 0 0 0 10.73 3.58l289.71-144.92a7.996 7.996 0 0 0 4.42-7.15v-12.91c0-3.02-1.7-5.78-4.4-7.14L57.87 32.85c-3.95-1.98-8.76-.37-10.73 3.58l-14.3 28.62a8.006 8.006 0 0 0 3.58 10.73L268.87 192 36.42 308.22a8.006 8.006 0 0 0-3.58 10.73zM376 432H8c-4.42 0-8 3.58-8 8v32c0 4.42 3.58 8 8 8h368c4.42 0 8-3.58 8-8v-32c0-4.42-3.58-8-8-8z"
              />
            </svg>
          </div>
          <input
            v-model.number="filterModel.value"
            type="text"
            class="block min-w-0 px-2 py-1 w-full pl-6 sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-500 rounded-md"
            placeholder="Min # of PEs"
          />
        </div>
      </template>
    </Column>
    <Column
      field="offeringTime"
      header="Offering"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <span
          v-tippy="{
            content: formatDateTime(contract.offeringTime),
          }"
          :class="columnColorClasses"
        >
          {{ formatDate(contract.offeringTime) }}
        </span>
      </template>
    </Column>
    <Column
      field="expirationTime"
      header="Expiration"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <span
          v-tippy="{
            content: formatDateTime(contract.expirationTime ?? 0),
          }"
          :class="columnColorClasses"
        >
          {{ formatDate(contract.expirationTime ?? 0) }}
        </span>
      </template>
    </Column>
    <Column
      field="aaaGoal"
      header="AAA goal"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <template v-if="contract.aaaGoal">
          {{ formatEIValue(contract.aaaGoal, { trim: true }) }}
        </template>
        <template v-else>&ndash;</template>
      </template>
    </Column>
    <Column
      field="aaGoal"
      header="AA goal"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <template v-if="contract.aaGoal">
          {{ formatEIValue(contract.aaGoal, { trim: true }) }}
        </template>
        <template v-else>&ndash;</template>
      </template>
    </Column>
    <Column
      field="aGoal"
      header="A goal"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <template v-if="contract.aGoal">
          {{ formatEIValue(contract.aGoal, { trim: true }) }}
        </template>
        <template v-else>&ndash;</template>
      </template>
    </Column>
    <Column
      field="bGoal"
      header="B goal"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <template v-if="contract.bGoal">
          {{ formatEIValue(contract.bGoal, { trim: true }) }}
        </template>
        <template v-else>&ndash;</template>
      </template>
    </Column>
    <Column
      field="cGoal"
      header="C goal"
      :sortable="true"
      :header-class="columnHeaderClassesCentered"
      :body-class="columnBodyClassesCentered"
    >
      <template #body="{ data: contract }: { data: Contract }">
        <template v-if="contract.cGoal">
          {{ formatEIValue(contract.cGoal, { trim: true }) }}
        </template>
        <template v-else>&ndash;</template>
      </template>
    </Column>

    <template #expansion="{ data: contract }: { data: Contract }">
      <contract-list-expansion :contract="contract" />
    </template>

    <template #paginatorend>
      <select
        class="mt-1 block pl-3 pr-10 py-1 text-base border border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500"
        :value="rowsPerPage"
        @input="onRowsPerPageChange($event)"
      >
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
        <option value="10000">All</option>
      </select>
    </template>
  </DataTable>
  <!-- eslint-enable vue/attribute-hyphenation -->
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, PropType, ref, toRefs } from 'vue';
import DataTable, { DataTableExpandedRows } from 'primevue/datatable';
import Column from 'primevue/column';
import { FilterMatchMode } from 'primevue/api';
import dayjs from 'dayjs';

import { Contract, eggIconPath, formatDuration, formatEIValue, parseSeasonId } from '@/lib';
import { eggTooltip } from '@/utils';
import BaseInput from 'ui/components/BaseInput.vue';
import BaseIcon from 'ui/components/BaseIcon.vue';
import ContractListExpansion from './ContractListExpansion.vue';
import useThemeStore from '@/stores/theme';
import useCoopSelectorStore from '@/stores/coopSelector';

export default defineComponent({
  components: {
    DataTable,
    Column,
    ContractListExpansion,
    BaseInput,
    BaseIcon,
  },
  props: {
    contracts: {
      type: Array as PropType<Contract[]>,
      required: true,
    },
    rowsPerPage: {
      type: Number,
      required: true,
    },
  },
  emits: ['update:rowsPerPage'],
  setup(props, { emit }) {
    const { contracts } = toRefs(props);
    const themeStore = useThemeStore();
    const coopselectorStore = useCoopSelectorStore();

    // We need to set .dark on the root of this component, otherwise scoped
    // dark:... cannot apply.
    const darkThemeOn = computed(() => themeStore.darkThemeOn);

    const columnHeaderClasses =
      'px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-500 dark:text-gray-200 focus:outline-none text-left ';
    const columnHeaderNarrowClasses =
      'px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-500 dark:text-gray-200 focus:outline-none';
    const columnBodyClasses = 'px-4 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200 tabular-nums';
    const columnColorClasses = 'text-gray-500 dark:text-gray-200';
    const columnColorClassesOriginal = 'text-gray-700 dark:text-yellow-200';

    const filters = ref({
      global: {
        value: new URLSearchParams(window.location.search).get('q') ?? '',
        matchMode: FilterMatchMode.CONTAINS,
      },
      type: {
        value: null,
        matchMode: FilterMatchMode.EQUALS,
      },
      numLeggacies: {
        value: null,
        matchMode: FilterMatchMode.LESS_THAN_OR_EQUAL_TO,
      },
      prophecyEggs: {
        value: null,
        matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO,
      },
    });

    const expandedRows = ref({} as DataTableExpandedRows);
    const expanded = computed(() => {
      const rows = {} as DataTableExpandedRows;
      for (const contract of contracts.value) {
        rows[contract.uniqueKey] = true;
      }
      return rows;
    });
    // For some reason this only works if you replace the entire object at once
    // https://github.com/primefaces/primevue/issues/5372
    const expandAll = () => {
      expandedRows.value = expanded.value;
    };
    const collapseAll = () => {
      expandedRows.value = {};
    };
    const selectContractAndShowCoopSelector = (contractId: string) =>
      coopselectorStore.selectContractAndShow(contractId);
    const contractEggIconPath = (contract: Contract) => eggIconPath(contract.egg!, contract.customEggId);
    const contractEggTooltip = (contract: Contract) => eggTooltip(contract.egg!, contract.customEggId);
    const isAvailable = (contract: Contract, now: number) => contract.expirationTime! > now / 1000;
    const durationUntilExpiration = (contract: Contract, now: number) =>
      formatDuration(Math.max(contract.expirationTime! - now / 1000, 0), true);
    const formatDate = (timestamp: number) => dayjs(timestamp * 1000).format('YYYY-MM-DD');
    const formatDateTime = (timestamp: number) => dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm');

    const onRowsPerPageChange = (event: Event) =>
      emit('update:rowsPerPage', parseInt((event.target! as HTMLSelectElement).value));

    const seasonSortFunction = (contractA: Contract, contractB: Contract, sortOrder: 1 | -1) => {
      const aValue = parseSeasonId(contractA.seasonId || '');
      const bValue = parseSeasonId(contractB.seasonId || '');

      const result = aValue - bValue;
      return sortOrder === 1 ? result : -result;
    };

    const now = ref(Date.now());
    const refreshIntervalId = setInterval(() => {
      now.value = Date.now();
    }, 30000);
    onBeforeUnmount(() => {
      clearInterval(refreshIntervalId);
    });

    return {
      darkThemeOn,
      columnHeaderClasses,
      columnHeaderClassesCentered: `${columnHeaderClasses} text-center Column__Header--center`,
      columnHeaderNarrowClassesCentered: `${columnHeaderNarrowClasses} text-center Column__Header--center`,
      columnBodyClasses,
      columnBodyClassesCentered: `${columnBodyClasses} text-center`,
      columnColorClasses,
      columnColorClassesOriginal,
      filters,
      expandedRows,
      expandAll,
      collapseAll,
      selectContractAndShowCoopSelector,
      isAvailable,
      durationUntilExpiration,
      contractEggIconPath,
      contractEggTooltip,
      formatEIValue,
      formatDate,
      formatDateTime,
      formatDuration,
      onRowsPerPageChange,
      seasonSortFunction,
      now,
    };
  },
});
</script>

<style lang="postcss" scoped src="@/css/components/DataTable.css"></style>

<style lang="postcss" scoped>
::v-deep(.p-datatable-table) {
  @apply ultrawide:rounded-md overflow-hidden;
}

::v-deep(.Column__Header--center .p-column-header-content) {
  @apply justify-center;
}

::v-deep(.p-datatable-row-expansion table) {
  @apply min-w-0;
}
</style>
