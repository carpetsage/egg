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
            <div class="flex items-center justify-center space-x-1 mx-6">
              <div class="mt-1">
                <div class="text-xs">
                  Last synced to server:
                  <span v-tippy="{ content: lastRefreshed.format('LLL') }" class="whitespace-nowrap">
                    {{ lastRefreshedRelative }}
                  </span>
                </div>
              </div>
            </div>


            <div v-if="!collapsed" class="py-2">
              <div class="text-lg font-medium">Eggs Laid</div>
              <template v-for="(eggTotal,index) in eggTotals" :key="eggTotal.id">
                <div class="text-left">
                  <p> {{eggs[index]}} - {{fmtApprox(eggTotal)}} </p>
                </div>
              </template>
            </div>

          </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, toRefs } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { sha256 } from 'js-sha256';

import {
  earningBonusToFarmerRole,
  ei,
  formatEIValue,
  getLocalStorage,
  iconURL,
  setLocalStorage,
} from 'lib';
import BaseInfo from 'ui/components/BaseInfo.vue';
import { getUserContractList, UserContract } from '@/contracts';


dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

const COLLAPSE_PLAYER_CARD_LOCALSTORAGE_KEY = 'collpasePlayerCard';
const eggTotals = computed(() => backup.value.stats?.eggTotals || [] );

const props = defineProps<{ backup: ei.IBackup }>();
const { backup } = toRefs(props);

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
const userId = computed(() => backup.value.eiUserId ?? '');
const userIdHash = computed(() => sha256(backup.value.eiUserId ?? ''));
const nickname = computed(() => backup.value.userName!);
const lifetimeDrones = computed(() => backup.value.stats?.droneTakedowns || 0);
const lifetimeEliteDrones = computed(() => backup.value.stats?.droneTakedownsElite || 0);
const lifetimeBoosts = computed(() => backup.value.stats?.boostsUsed || 0);
const lifetimeVidDoubler = computed(() => backup.value.stats?.videoDoublerUses || 0);
const randIndex = Math.floor(Math.random() * 10000);

const eggs = ["Edible", "Superfood", "Medical", "Rocket Fuel", "Super Material", "Fusion", "Quantum", "Immortality", "Tachyon", "Graviton", "Dilithium", "Prodigy", "Terraform", "Antimatter", "Dark Matter", "AI", "Nebula", "Universe", "Enlightenment", "Waterballoon", "Firework", "Easter", "Chocolate"];


function eggsLaid(c: UserContract[]): number {
  return c.reduce((partialSum, contract) => partialSum + contract.contribution);
}

const contracts = getUserContractList(backup);
//const contract_eggs = contracts.map(c => c.egg);
["WATERBALLOON", "FIREWORK", "EASTER", "CHOCOLATE"].foreach(egg =>
  eggTotals.push(eggsLaid(contracts.filter(c => c.egg == egg)));
);

//CHOCOLATE=100
//EASTER=101
//WATERBALLOON=102 
//FIREWORK=103
//PUMPKIN=104

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtApprox(n: number): string {
  return n === 0 ? '0' : `${formatEIValue(n, { decimals: 3 })}`;
}

</script>
