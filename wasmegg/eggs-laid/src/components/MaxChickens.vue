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
                <pre>{{ fmtEggTotal(egg,eggTotal) }}</pre>
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
} from 'lib';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);


const props = defineProps<{ backup: ei.IBackup }>();
const { backup } = toRefs(props);

ei.Egg
const farms = computed(() => backup.value.game?.maxFarmSizeReached ?? [])
const total = computed(() => farms.value.reduce((sum, egg) => sum + egg));
const totals = computed(() => new Map(farms.value.map((total, i) =>{
  console.log(`total ${total}, index: ${i}`)
  return [eggName(i + 1), total]
})));
totals.value.set("Total", total.value);

function fmtEggTotal(egg: string, total: number) {
  return `${egg.padEnd(14, " ")} - ${fmtApprox(total)}`
}
</script>
