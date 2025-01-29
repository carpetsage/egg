<template>
  <div
    class="rounded-md bg-green-100 text-green-800 text-sm w-max max-w-full px-4 py-2 mx-auto mb-4 shadow"
  >
    You can track all your active contracts on your
    <a :href="`https://eicoop-carpet.netlify.app/u/${playerId}`" class="underline" target="_blank"
      >personal dashboard</a
    >.
  </div>

  <the-report-prophecy-eggs :progress="prophecyEggsProgress" />

  <div class="flex justify-center my-3">
    <div class="px-4 py-2 bg-gray-50 rounded-md shadow">
      <div class="text-center mb-0.5 text-sm font-medium text-gray-900">Contracts progress</div>
      <ul class="text-center">
        <li class="text-sm text-gray-700">
          Contracts completed:&nbsp;
          <span class="font-medium text-gray-900">
            {{ contractsCompleted.length }}/{{ contracts.length }}
          </span>
        </li>
        <li class="text-sm text-gray-700">
          PE contracts:&nbsp;
          <span class="inline-flex items-center font-medium text-gray-900">
            {{ prophecyEggsProgress.fromContracts.numPEContractsCompleted }}/{{
              prophecyEggsProgress.fromContracts.numPEContractsAvailable
            }}
            <base-info
              v-tippy="{
                content:
                  'The former number includes partially completed contracts where the PE rewards have been collected.',
              }"
              class="inline ml-0.5"
            />
          </span>
        </li>
      </ul>
    </div>
  </div>

  <div class="flex justify-center my-3">
    <div class="px-3 py-2 bg-gray-50 rounded-md shadow space-y-0.5">
      <div class="flex justify-center mb-1 text-sm font-medium text-gray-900">Color coding</div>
      <div class="relative flex items-start">
        <span class="flex items-center text-green-500">
          <svg viewBox="-32 -32 576 576" class="h-4">
            <path
              fill="currentColor"
              d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"
            />
          </svg>
        </span>
        <span class="ml-2 text-xs text-gray-600">Never attempted</span>
      </div>
      <div class="relative flex items-start">
        <span class="flex items-center h-4 text-red-500">
          <svg viewBox="-32 -32 576 576" class="h-4">
            <path
              fill="currentColor"
              d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"
            />
          </svg>
        </span>
        <span class="ml-2 text-xs text-gray-600">Attempted, failed to collect prophecy egg(s)</span>
      </div>
      <div class="relative flex items-start">
        <span class="flex items-center h-4 text-yellow-500">
          <svg viewBox="-32 -32 576 576" class="h-4">
            <path
              fill="currentColor"
              d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"
            />
          </svg>
        </span>
        <span class="ml-2 text-xs text-gray-600">Attempted, failed to complete all goals</span>
      </div>
      <div class="relative flex items-start">
        <span class="flex items-center h-4 text-gray-500">
          <svg viewBox="-32 -32 576 576" class="h-4">
            <path
              fill="currentColor"
              d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"
            />
          </svg>
        </span>
        <span class="ml-2 text-xs text-gray-600">Completed</span>
      </div>
    </div>
  </div>

  <div class="flex justify-center my-3">
    <div class="space-y-0.5">
      <div class="relative flex items-start">
        <div class="flex items-center h-5">
          <input
            id="hideUnattempted"
            v-model="hideUnattempted"
            name="hideUnattempted"
            type="checkbox"
            class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="hideUnattempted" class="text-gray-600">Hide unattempted contracts</label>
        </div>
      </div>
      <div class="relative flex items-start">
        <div class="flex items-center h-5">
          <input
            id="hideCompleted"
            v-model="hideCompleted"
            name="hideCompleted"
            type="checkbox"
            class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="hideCompleted" class="text-gray-600">Hide completed contracts</label>
        </div>
      </div>
      <div class="relative flex items-start">
        <div class="flex items-center h-5">
          <input
            id="hideNoPE"
            v-model="hideNoPE"
            name="hideNoPE"
            type="checkbox"
            class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="hideNoPE" class="text-gray-600"
            >Hide contracts without prophecy egg reward</label
          >
        </div>
      </div>
      <div class="relative flex items-start">
        <div class="flex items-center h-5">
          <input
            id="showTwoGoals"
            v-model="showTwoGoals"
            name="showTwoGoals"
            type="checkbox"
            class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="showTwoGoals" class="text-gray-600">Show only contracts with 2 goals</label>
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-col">
    <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
        <div class="shadow overflow-hidden border-b border-gray-200">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <th scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                ID
              </th>
              <th scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                Name
              </th>
              <th scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                Date
              </th>
              <th scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                Code
              </th>
              <th scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                Goals
              </th>
              <th scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                PE
              </th>
              <th scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                Score
              </th>
              <th scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                Teamwork Score
              </th>
              <th v-if="username==='abubu0524'" scope="col" class="px-6 py-2 text-center text-xs font-medium text-gray-500">
                Tokens Received
              </th>
            </thead>
            <tbody>
              <template v-for="(contract, index) in visibleContracts" :key="contract.id">
                <tr
                  :class="[index % 2 === 0 ? 'bg-white' : 'bg-gray-50', contractFgClass(contract)]"
                >
                  <td class="px-6 py-1 whitespace-nowrap text-center text-sm cursor-pointer">
                    <a
                      :href="contractLink(contract)"
                      target="_blank"
                      :class="contractFgClass(contract, true)"
                    >
                      {{ contract.id }}
                    </a>
                  </td>
                  <td class="px-6 py-1 whitespace-nowrap text-center text-sm">
                    <a
                      :href="contractLink(contract)"
                      target="_blank"
                      class="inline-flex items-center"
                      :class="contractFgClass(contract, true)"
                    >
                      <img
                        :src="iconURL(eggIconPath(contract.egg, contract.customEggId), 64)"
                        class="inline h-4 w-4 mr-0.5 -my-1"
                      />
                      {{ contract.name }}
                      <span
                        v-if="!contract.isCoop"
                        class="relative top-px ml-1 px-1.5 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        Solo
                      </span>
                    </a>
                  </td>
                  <td class="px-6 py-1 whitespace-nowrap text-center text-sm tabular-nums">
                    {{ epochSecondsToFormattedDate(contract.timestamp) }}
                  </td>
                  <td
                    class="px-6 py-1 truncate text-center text-sm cursor-pointer"
                    :style="{ maxWidth: '12rem' }"
                  >
                    <template v-if="contract.coopCode !== null">
                      <a
                        :href="coopLink(contract)"
                        target="_blank"
                        :class="contractFgClass(contract, true)"
                      >
                        {{ contract.coopCode }}
                      </a>
                    </template>
                    <template v-else>&nbsp;</template>
                  </td>
                  <td class="px-6 py-1 whitespace-nowrap text-center text-sm">
                    {{ contractGoalsSpec(contract) }}
                  </td>
                  <td class="px-6 py-1 whitespace-nowrap text-center text-sm">
                    {{ contractPESpec(contract) }}
                  </td>
                  <td class="px-6 py-1 whitespace-nowrap text-center text-sm">
                    {{ contract.score || "" }}
                  </td>
                  <td class="px-6 py-1 whitespace-nowrap text-center text-sm">
                    {{ contract.teamworkScore > 0 ? contract.teamworkScore.toFixed(3) : "" }}
                  </td>
                  <td v-if="username==='abubu0524'" class="px-6 py-1 whitespace-nowrap text-center text-sm">
                    {{ contract.tokens || "" }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="mx-4 my-4 xl:mx-0 text-xs">
    Notes:
    <ul class="list-disc">
      <li>
        For contracts with multiple incarnations, i.e. original run and leggacy run(s), only one
        incarnation is listed. If the player has attempted the contract, the last attempted
        incarnation is shown; otherwise, the latest incarnation is shown.
      </li>
      <li>
        The "Date" column shows the date on which the player last started a contract farm for the
        contract, or the estimated date the contract was offered (which may not be accurate) if it
        was never attempted.
      </li>
      <li>
        The "PE" column indicates which reward of the contract, if any, was one or more prophecy
        eggs (the number of prophecy eggs is noted in parentheses if it's more than 1). The column
        is blank if there's no PE associated with the contract. Otherwise, for older contracts
        without standard/elite tiers, this column should look like "#2", meaning the second reward
        being a PE; for newer contracts with tiers, this column should look like "std #3", meaning
        the third reward of standard tier being a PE, or "elt #2", meaning the second reward of
        elite tier being a PE. The tier shown is the tier the player last attempted the contract on,
        with the exception that if the player completed none of the goals then the tier shown
        defaults to elite (since in that case it's harder to tell which tier the player was on at
        the time, if they did make an attempt).
      </li>
      <li>
        Clicking on a contract ID or name takes you to the contract on
        <a
          href="https://eicoop-carpet.netlify.app/"
          target="_blank"
          class="text-blue-500 hover:text-blue-600"
          >CoopTracker</a
        >. Clicking on a coop code takes you to that specific coop. Note that data for old coops may
        have been purged from Egg, Inc.'s server, so you may encounter an error, or find the coop
        has no players in it.
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { stringify as csvStringify } from 'csv-stringify/browser/esm/sync';

import {
  eggIconPath,
  ei,
  getLocalStorage,
  getProphecyEggsProgress,
  iconURL,
  requestContractsArchive,
  requestFirstContact,
  setLocalStorage,
  UserBackupEmptyError,
} from 'lib';
import { getUserContractList, contractSeasonList, UserContract } from '@/contracts';
import BaseInfo from 'ui/components/BaseInfo.vue';
import TheReportProphecyEggs from '@/components/TheReportProphecyEggs.vue';
import { formatEIValue, formatDuration } from 'lib';

const HIDE_UNATTEMPTED_LOCALSTORAGE_KEY = 'hideUnattempted';
const HIDE_COMPLETED_LOCALSTORAGE_KEY = 'hideCompleted';
const HIDE_NO_PE_LOCALSTORAGE_KEY = 'hideNoPE';
const SHOW_TWO_GOALS_LOCALSTORAGE_KEY = 'showTwoGoals';

export default defineComponent({
  components: {
    BaseInfo,
    TheReportProphecyEggs,
  },
  props: {
    playerId: {
      type: String,
      required: true,
    },
  },
  // This async component does not respond to playerId changes.
  /* eslint-disable vue/no-setup-props-destructure */
  async setup({ playerId }) {
    const data = await requestFirstContact(playerId);
    const contractsArchive = await requestContractsArchive(playerId);
    if (!data.backup || !data.backup.game) {
      throw new UserBackupEmptyError(playerId);
    }
    const backup = data.backup;

    const username = backup.userName || "";
    const contracts = getUserContractList(backup, contractsArchive);
    const contractsWithPE = contracts.filter(c => c.numAvailablePEs > 0);
    const contractsCompleted = contracts.filter(c => c.numCompletedGoals === c.numAvailableGoals);
    const contractFgClass = (contract: UserContract, hover = false): string => {
      if (!contract.attempted) {
        return hover ? 'hover:text-green-400' : 'text-green-500';
      }
      if (contract.indexOfPEGoal !== null && contract.numCompletedGoals <= contract.indexOfPEGoal) {
        return hover ? 'hover:text-red-400' : 'text-red-500';
      }
      if (contract.numCompletedGoals < contract.numAvailableGoals) {
        return hover ? 'hover:text-yellow-400' : 'text-yellow-500';
      }
      return hover ? 'hover:text-gray-400' : 'text-gray-500';
    };
    const prophecyEggsProgress = getProphecyEggsProgress(backup, {
      numPEsAvailable: contractsWithPE.reduce((total, c) => total + c.numAvailablePEs, 0),
      numPEContractsAvailable: contractsWithPE.length,
      contractSeasons: contractSeasonList,
    });

    const hideUnattempted = ref(getLocalStorage(HIDE_UNATTEMPTED_LOCALSTORAGE_KEY) === 'true');
    const hideCompleted = ref(getLocalStorage(HIDE_COMPLETED_LOCALSTORAGE_KEY) === 'true');
    const hideNoPE = ref(getLocalStorage(HIDE_NO_PE_LOCALSTORAGE_KEY) === 'true');
    const showTwoGoals = ref(getLocalStorage(SHOW_TWO_GOALS_LOCALSTORAGE_KEY) === 'true');

    /* eslint-disable vue/no-watch-after-await */
    watch(hideUnattempted, () => {
      setLocalStorage(HIDE_UNATTEMPTED_LOCALSTORAGE_KEY, hideUnattempted.value);
    });
    watch(hideCompleted, () => {
      setLocalStorage(HIDE_COMPLETED_LOCALSTORAGE_KEY, hideCompleted.value);
    });
    watch(hideNoPE, () => {
      setLocalStorage(HIDE_NO_PE_LOCALSTORAGE_KEY, hideNoPE.value);
    });
    watch(showTwoGoals, () => {
      setLocalStorage(SHOW_TWO_GOALS_LOCALSTORAGE_KEY, showTwoGoals.value);
    });
    /* eslint-enable vue/no-watch-after-await */

    const visibleContracts = computed(() =>
      contracts.filter(c => {
        if (hideUnattempted.value && !c.attempted) {
          return false;
        }
        if (hideCompleted.value && c.numCompletedGoals >= c.numAvailableGoals) {
          return false;
        }
        if (hideNoPE.value && c.numAvailablePEs === 0) {
          return false;
        }
        if (showTwoGoals.value && c.numAvailableGoals != 2) {
          return false;
        }
        return true;
      })
    );

    const contractLink = (contract: UserContract) =>
      `https://eicoop-carpet.netlify.app/?q=${encodeURIComponent(contract.id)}`;
    const coopLink = (contract: UserContract) =>
      contract.coopCode
        ? `https://eicoop-carpet.netlify.app/${encodeURIComponent(contract.id)}/${encodeURIComponent(
            contract.coopCode
          )}/`
        : contractLink(contract);

    const contractGoalsSpec = (contract: UserContract) =>
      `${contract.attempted ? contract.numCompletedGoals : '-'}/${contract.numAvailableGoals}`;
    const contractPESpec = (contract: UserContract) => {
      if (contract.indexOfPEGoal === null) {
        return '';
      }
      let spec = '';
      if (contract.hasGrades) {
        spec += contract.grade > 0 ? `${ei.Contract.PlayerGrade[contract.grade].split("_")[1]} ` : '';
      } else if (contract.hasLeagues) {
        spec += contract.league === 1 ? 'std ' : 'elt ';
      }
      spec += `#${contract.indexOfPEGoal + 1}`;
      if (contract.numAvailablePEs > 1) {
        spec += ` (${contract.numAvailablePEs})`;
      }
      return spec;
    };

    const downloadAsCSV = () => {
      const csvBody = csvStringify(
        [
          ['ID', 'Name', 'Date', 'Code', 'Goals', 'PE', 'Attempted', 'PE collected', 'Completed'],
        ].concat(
          contracts.map(contract => [
            contract.id,
            contract.name,
            epochSecondsToFormattedDate(contract.timestamp),
            contract.coopCode ?? '',
            contractGoalsSpec(contract),
            contractPESpec(contract),
            csvbool(contract.attempted),
            csvbool(
              contract.indexOfPEGoal !== null && contract.numCompletedGoals > contract.indexOfPEGoal
            ),
            csvbool(contract.numCompletedGoals >= contract.numAvailableGoals),
          ])
        )
      );
      const blob = new Blob([csvBody], { type: 'text/csv' });
      const blobURL = URL.createObjectURL(blob);
      // The naive approach of window.open(blobURL, "_blank") doesn't work on iOS Safari.
      // Use the suggestion in https://dev.to/nombrekeff/download-file-from-blob-21ho,
      // create a link and trigger a click.
      const link = document.createElement('a');
      link.href = blobURL;
      link.download = 'past-contracts.csv';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
      document.body.removeChild(link);
    };

    return {
      prophecyEggsProgress,
      contracts,
      contractsCompleted,
      hideUnattempted,
      hideCompleted,
      hideNoPE,
      showTwoGoals,
      visibleContracts,
      username,
      formatEIValue,
      formatDuration,
      contractFgClass,
      epochSecondsToFormattedDate,
      contractLink,
      coopLink,
      contractGoalsSpec,
      contractPESpec,
      downloadAsCSV,
      iconURL,
      eggIconPath,
    };
  },
});

function epochSecondsToFormattedDate(t: number): string {
  return dayjs(t * 1000).format('YYYY-MM-DD');
}

function csvbool(x: boolean): 'true' | 'false' {
  return x ? 'true' : 'false';
}
</script>
