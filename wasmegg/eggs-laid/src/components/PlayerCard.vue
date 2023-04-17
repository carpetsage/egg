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
                <template v-for="(eggTotal) in eggTotals" :key="eggTotal[0]">
                  <pre>{{ eggTotal[0].padEnd(14, " ") }} - {{ fmtApprox(eggTotal[1]) }}</pre>
                </template>
                <pre>{{ "Total".padEnd(14, " ") }} - {{ fmtApprox([...eggTotals.values()].reduce((a,b)=>a+b)) }}</pre>
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

import {
  eggName,
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



const contracts: UserContract[] = getUserContractList(backup.value);
const contractEggs = [ ei.Egg.CHOCOLATE, ei.Egg.EASTER, ei.Egg.WATERBALLOON, ei.Egg.FIREWORK, ei.Egg.PUMPKIN ]

let eggTotals = new Map<string , number>(
  backup.value.stats?.eggTotals?.map((eggTotal, index) =>
  [ eggName(index + 1 as ei.Egg), eggTotal ]
  ));

contractEggs.forEach(egg => {
  eggTotals.set(eggName(egg), eggsLaid(contracts.filter(c => c.egg == egg)) || 0);
});

function eggsLaid(uc: UserContract[]): number {
  return uc.map(c => c.contribution!).reduce((partialSum, contrib) => partialSum + contrib, 0);
}


function fmtApprox(n: number): string {
  return n === 0 ? '0' : `${formatEIValue(n, { decimals: 3 })}`;
}

</script>
