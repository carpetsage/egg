<template>
  <div class="mx-4 xl:mx-0 my-4">
    <div
        class="relative max-w-xs mx-auto px-3 sm:px-4 py-1 text-center bg-gray-50 rounded-xl shadow"
        >
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
              <div class="text-lg font-medium">
                Eggs Laid
              </div>
              <div class="text-left">
                <template v-for="(eggTotal,index) in eggTotals" :key="eggTotal.id">
                  <pre>{{eggs[index]}} - {{fmtApprox(eggTotal)}}</pre>
                </template>
                <pre>{{"Total".padEnd(14, " ")}} - {{fmtApprox(eggTotals.reduce((a,b)=>a+b))}}</pre>
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
  ei,
  formatEIValue,
} from 'lib';
import {getUserContractList, UserContract } from '@/contracts';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);


const props = defineProps<{ backup: ei.IBackup }>();
const { backup } = toRefs(props);


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

const userIdHash = computed(() => sha256(backup.value.eiUserId ?? ''));

const eggs = ["Edible", "Superfood", "Medical", "Rocket Fuel", "Super Material", "Fusion", "Quantum", "Immortality", "Tachyon", "Graviton", "Dilithium", "Prodigy", "Terraform", "Antimatter", "Dark Matter", "AI", "Nebula", "Universe", "Enlightenment", "Chocolate", "Easter", "Waterballoon", "Firework", "Pumpkin"].map(x => x.padEnd(14, " "));


const contracts: UserContract[] = getUserContractList(backup.value);
const eggTotals: number[] = backup.value.stats?.eggTotals || [];
[100, 101, 102, 103, 104].forEach(egg => {
  eggTotals.push(eggsLaid(contracts.filter(c => c.egg == egg)) || 0);
});
if (userIdHash.value == 'b8c947004f3b209a7d17078f5a37b0c28a1b10e39037ba1facb55cf0113976b2') {
  eggTotals[20] = 671532000000000000;
}

function eggsLaid(uc: UserContract[]): number {
  return uc.map(c => c.contribution!).reduce((partialSum, contrib) => partialSum + contrib, 0);
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtApprox(n: number): string {
  return n === 0 ? '0' : `${formatEIValue(n, { decimals: 3 })}`;
}

</script>
