<template>
  <div class="mx-4 xl:mx-0 my-4">
    <div class="relative max-w-xs mx-auto px-3 sm:px-4 py-1 text-center bg-gray-50 rounded-xl shadow">
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
          <div class="text-lg font-medium">Eggs Laid</div>
          <div class="text-left">
            <template v-for="eggTotal in eggTotals" :key="eggTotal[0]">
              <pre>{{ fmtEggTotal(eggTotal) }}</pre>
            </template>
            <pre>{{ fmtEggTotal(['Total', Total]) }} </pre>
            <base-click-to-copy
              :text="`\`\`\`\n${[...eggTotals].map(eggTotal => fmtEggTotal(eggTotal)).join('\n')}\n${fmtEggTotal(['Total', Total])}\n\`\`\``"
              class="text-blue-800 mr-0.5 font-bold"
            >
              Click to copy to clipboard for discord
            </base-click-to-copy>
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

import { eggName, ei, formatEIValue, customEggs } from 'lib';
import BaseClickToCopy from '@/components/BaseClickToCopy.vue';

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

const contractEggs = [ei.Egg.CHOCOLATE, ei.Egg.EASTER, ei.Egg.WATERBALLOON, ei.Egg.FIREWORK, ei.Egg.PUMPKIN];

const localContracts = computed(() =>
  (backup.value.contracts?.archive || []).concat(backup.value.contracts?.contracts || [])
);

const eggTotals = computed(
  () =>
    new Map<string, number>(
      backup.value.stats?.eggTotals?.slice(0, 19).map((eggTotal, index) => [eggName((index + 1) as ei.Egg), eggTotal])
    )
);

backup.value.stats?.eggTotals?.slice(20, 25).forEach((eggTotal, index) => {
  eggTotals.value.set(eggName((index + 50) as ei.Egg), eggTotal);
});

contractEggs.forEach(egg => {
  eggTotals.value.set(eggName(egg), eggsLaid(localContracts.value.filter(c => c.contract?.egg === egg)) || 0);
});
customEggs.forEach(egg => {
  const name = eggName(ei.Egg.CUSTOM_EGG, egg.identifier);
  const prev = eggTotals.value.get(name) ?? 0;

  eggTotals.value.set(
    name,
    prev + eggsLaid(localContracts.value.filter(c => c.contract?.customEggId === egg.identifier)) || 0
  );
});

const Total = [...eggTotals.value.values()].reduce((sum, eggTotal) => sum + eggTotal);

function contribution(contract: ei.ILocalContract) {
  return contract.coopLastUploadedContribution ?? contract.lastAmountWhenRewardGiven ?? 0;
}
function eggsLaid(contracts: ei.ILocalContract[]): number {
  return contracts.map(c => contribution(c)).reduce((partialSum, contrib) => partialSum + contrib, 0);
}

function fmtEggTotal(eggTotal: [string, number]) {
  return `${eggTotal[0].padEnd(15, ' ')} - ${fmtApprox(eggTotal[1])}`;
}

function fmtApprox(n: number): string {
  return n === 0 ? '0' : `${formatEIValue(n, { decimals: 3 })}`;
}
</script>
