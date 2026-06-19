<template>
  <div class="mx-4 xl:mx-0 my-4">
    <div class="relative max-w-xs mx-auto px-3 sm:px-4 py-1 text-center bg-gray-50 rounded-xl shadow">
      <div class="divide-y divide-gray-200">
        <div class="py-2">
          <div class="text-lg font-medium">Max Farm Size</div>
          <div class="text-left">
            <template v-for="[egg, eggTotal] in totalsWithTotal" :key="egg">
              <span
                v-tippy="{ content: formatEIValue(eggTotal, { decimals: eggTotal.toString().length - 2 }) }"
                class="flex flex-row justify-right space-x-1"
              >
                <span
                  :class="
                    atMaxPossible(egg, eggTotal)
                      ? 'text-green-400'
                      : atBaseMax(egg, eggTotal)
                        ? 'text-blue-400'
                        : nearMaxPossible(egg, eggTotal)
                          ? 'text-red-400'
                          : ''
                  "
                >
                  <pre>{{ fmtEggTotal(egg, eggTotal) }}</pre>
                </span>
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import { eggName, ei, fmtApprox, formatEIValue, customEggs, allModifiersFromColleggtibles } from 'lib';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

const props = defineProps<{ backup: ei.IBackup }>();
const { backup } = toRefs(props);

const contractEggs = [ei.Egg.CHOCOLATE, ei.Egg.EASTER, ei.Egg.WATERBALLOON, ei.Egg.FIREWORK, ei.Egg.PUMPKIN];

const localContracts = computed(() =>
  (backup.value.contracts?.archive || []).concat(backup.value.contracts?.contracts || [])
);

const farms = computed(() => backup.value.game?.maxFarmSizeReached ?? []);

const totals = computed(() => {
  const totalsMap = new Map(
    farms.value.map((total, i) => {
      return [eggName(i + 1), total];
    })
  );

  contractEggs.forEach(egg => {
    totalsMap.set(eggName(egg), farmSize(localContracts.value.filter(c => c.contract?.egg === egg)) || 0);
  });

  customEggs.forEach(egg => {
    const name = eggName(ei.Egg.CUSTOM_EGG, egg.identifier);
    const prev = totalsMap.get(name) ?? 0;

    totalsMap.set(
      name,
      prev + farmSize(localContracts.value.filter(c => c.contract?.customEggId === egg.identifier)) || 0
    );
  });

  return totalsMap;
});

const total = computed(() => [...totals.value.values()].reduce((sum, farmSize) => sum + farmSize));

// Add Total to the map for display
const totalsWithTotal = computed(() => {
  const result = new Map(totals.value);
  result.set('Total', total.value);
  return result;
});

const habCapMultiplier = computed(() => allModifiersFromColleggtibles(backup.value).habCap);

function farmSize(contracts: ei.ILocalContract[]): number {
  return Math.max(...contracts.map(c => c.maxFarmSizeReached ?? 0), 0);
}

function fmtEggTotal(egg: string, total: number) {
  return `${egg.padEnd(15, ' ')} - ${fmtApprox(total)}`;
}
function baseMaxPossible(egg: string): number {
  return egg === 'Enlightenment' ? 19_845_000_000 : 14_175_000_000;
}
function maxPossible(egg: string) {
  if (egg === 'Total') {
    return Infinity;
  }
  return baseMaxPossible(egg) * habCapMultiplier.value;
}

function nearMaxPossible(egg: string, total: number) {
  const isNear = (x: number, y: number): boolean => fmtApprox(x) === fmtApprox(y) && x < y;
  return isNear(total, maxPossible(egg)) || isNear(total, baseMaxPossible(egg));
}

function atMaxPossible(egg: string, total: number) {
  return total >= maxPossible(egg);
}

function atBaseMax(egg: string, total: number) {
  if (egg === 'Total') {
    return false;
  }
  return total === baseMaxPossible(egg);
}
</script>
