<template>
  <div class="mx-4 xl:mx-0 my-4">
    <div
        class="relative max-w-xs mx-auto px-3 sm:px-4 py-1 text-center bg-gray-50 rounded-xl shadow"
        >
        <div class="divide-y divide-gray-200">
          <div class="py-2">
            <div class="text-lg font-medium">
              Max Farm Size
            </div>
            <div class="text-left">
              <template v-for="[egg, eggTotal] in totals" :key="egg">
                <span v-tippy="{ content: formatEIValue(eggTotal,{ decimals: eggTotal.toString().length - 2}) }"
                  class="flex flex-row justify-right space-x-1"
                >
                  <span :class="nearMaxPossible(egg,eggTotal) ?  'text-red-400':
                    atMaxPossible(egg, eggTotal) ? 'text-green-400' : ''">
                    <pre>{{ fmtEggTotal(egg,eggTotal) }}</pre>
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

import {
  eggName,
  ei,
  fmtApprox,
  formatEIValue
} from 'lib';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

const props = defineProps<{ backup: ei.IBackup }>();
const { backup } = toRefs(props);

const farms = computed(() => backup.value.game?.maxFarmSizeReached ?? [])
const total = computed(() => farms.value.reduce((sum, egg) => sum + egg));
const totals = computed(() => new Map(farms.value.map((total, i) =>{
  return [eggName(i + 1), total]
})));
totals.value.set("Total", total.value);

function fmtEggTotal(egg: string, total: number) {
  return `${egg.padEnd(14, " ")} - ${fmtApprox(total)}`
}
function maxPossible(egg: string) {
  return egg == "Total" ? Infinity : egg === "Enlightenment" ? 19_845_000_000 : 14_175_000_000;
}

function nearMaxPossible(egg: string, total: number) {
  return fmtApprox(total) === fmtApprox(maxPossible(egg)) && total < maxPossible(egg);
}

function atMaxPossible(egg: string, total: number) {
  return total >= maxPossible(egg);
}
</script>
