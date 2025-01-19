<template>
  <main class="flex-1 max-w-ultrawide w-full mx-auto mt-6 ultrawide:px-4">
    <user-dashboard-entry-form class="mb-4" />

    <base-collapsible-panel
      title="Notes and instructions"
      :collapse="!showInstructions"
      :toggle="toggleInstructions"
    >
      <ul class="list-disc pt-2 pl-5 space-y-1">
        <li class="text-green-700 dark:text-green-300">
          Bring up the coop selector by clicking on a contract title or ID in the table below.
          Alternatively, click on the
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            class="inline h-4 w-4 text-green-700 dark:text-green-300"
          >
            <path
              fill-rule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clip-rule="evenodd"
            />
          </svg>
          button in the navigation bar or use the hotkey "c" to bring up the coop selector on any
          page.
        </li>

        <li class="text-green-700 dark:text-green-300">Active contracts are marked in green.</li>

        <li class="text-green-700 dark:text-green-300">
          When a new contract is released, it may take some time before it is added to the master
          list. In the mean time, you can check associated coop statuses by manually entering the
          contract ID. Note that the contract ID is not visible within the game. If you're on the
          <a
            href="https://discord.gg/egginc"
            target="_blank"
            class="text-green-700 dark:text-green-300 underline"
            >Egg, Inc. Discord server</a
          >, you can find the ID in the
          <a
            href="https://discord.com/channels/455380663013736479/455391423471157258"
            target="_blank"
            class="text-green-700 dark:text-green-300 underline"
            >#contracts</a
          >
          channel, or through the bot command "ecci".
        </li>

        <li class="text-green-700 dark:text-green-300">
          Goals and rewards for each contract can be expanded either through the expand button on
          the left of each row, or through the "Expand all" button.
        </li>

        <li class="text-green-700 dark:text-green-300">
          Each column in the contract list can be used as the sorting criterion by clicking on the
          sort button in the column header (click once for ascending order, twice for descending,
          and thrice to return to default). Note that several columns can also be filtered by
          clicking on the filter button in the column header.
        </li>

        <li class="text-green-700 dark:text-green-300">
          Contract offering dates are derived from contract expiration dates with a simple
          heuristic: original contracts are up for three weeks, whereas leggacies are up for one.
          This is not always true for early contracts in 2018 and part of 2019, so offering dates
          for early contracts may not be accurate.
        </li>

        <li class="text-green-700 dark:text-green-300">
          Due to architectural tradeoffs, the contract selection menu in the coop selector only
          lists the latest incarnation of each contract, so you may be presented a leggacy when
          trying to select the original. Rest assured this is only a display quirk.
        </li>
      </ul>
    </base-collapsible-panel>

    <recently-viewed-block class="ultrawide:rounded-lg mb-4" />

    <contract-list v-model:rowsPerPage="rowsPerPage" :contracts="contracts" />
  </main>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';

import { Contract, getLocalStorage, rawContractListHash, setLocalStorage } from '@/lib';
import { key } from '@/store';
import BaseCollapsiblePanel from '@/components/BaseCollapsiblePanel.vue';
import RecentlyViewedBlock from '@/components/RecentlyViewedBlock.vue';
import NewContractForecast from '@/components/NewContractForecast.vue';
import ContractList from '@/components/ContractList.vue';
import UserDashboardEntryForm from '@/components/UserDashboardEntryForm.vue';

const SHOW_INSTRUCTIONS_LOCALSTORAGE_KEY = 'showInstructions';
const ROWS_PER_PAGE_LOCALSTORAGE_KEY = 'rowsPerPage';
const legitRowsPerPageNumbers = [20, 50, 100, 10000];

export default defineComponent({
  components: {
    BaseCollapsiblePanel,
    RecentlyViewedBlock,
    NewContractForecast,
    ContractList,
    UserDashboardEntryForm,
  },
  setup() {
    const store = useStore(key);

    const showInstructions = ref(getLocalStorage(SHOW_INSTRUCTIONS_LOCALSTORAGE_KEY) !== 'false');
    const toggleInstructions = () => {
      showInstructions.value = !showInstructions.value;
      setLocalStorage(SHOW_INSTRUCTIONS_LOCALSTORAGE_KEY, showInstructions.value);
    };

    const contracts = computed(() => [...store.getters['contracts/list']].reverse() as Contract[]);
    let initialRowsPerPage = parseInt(getLocalStorage(ROWS_PER_PAGE_LOCALSTORAGE_KEY) || '');
    if (!legitRowsPerPageNumbers.includes(initialRowsPerPage)) {
      initialRowsPerPage = legitRowsPerPageNumbers[0];
    }
    const rowsPerPage = ref(initialRowsPerPage);
    watch(rowsPerPage, () => setLocalStorage(ROWS_PER_PAGE_LOCALSTORAGE_KEY, rowsPerPage.value));

    onMounted(async () => {
      await checkContractListUpdate(() => {
        store.commit('notifications/upsert', {
          message: 'The contract list has an update! Please refresh the page.',
          key: 'contractListUpdate',
        });
      });
    });

    return {
      showInstructions,
      toggleInstructions,
      contracts,
      rowsPerPage,
    };
  },
});

let lastCheckTimestamp = Date.now();
const minimumCheckInterval = 180_000;

async function checkContractListUpdate(updateFoundCallback: () => void) {
  if (Date.now() - lastCheckTimestamp < minimumCheckInterval) {
    return;
  }
  lastCheckTimestamp = Date.now();
  const hashURL = import.meta.env.BASE_URL + 'contractListHash';
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5000);
  let hash: string;
  try {
    const response = await fetch(hashURL, { signal: controller.signal });
    hash = (await response.text()).trim();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`${hashURL}: timeout`);
    } else {
      console.error(`${hashURL}: ${err}`);
    }
    return;
  }
  if (hash !== rawContractListHash) {
    updateFoundCallback();
  }
}
</script>
