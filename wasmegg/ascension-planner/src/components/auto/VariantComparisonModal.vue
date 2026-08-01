<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all" @click="$emit('close')" />

      <!-- Dialog -->
      <div
        class="relative w-full max-w-2xl overflow-hidden shadow-2xl rounded-2xl border border-white/50 bg-white/95 transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        <div
          class="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-100 flex items-center gap-3"
        >
          <div class="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
          </div>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Compare Variants</h3>
        </div>

        <div class="p-4 overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                <th class="px-2 py-1.5">Variant</th>
                <th class="px-2 py-1.5">Tier 13</th>
                <th class="px-2 py-1.5">Duration</th>
                <th class="px-2 py-1.5">End TE</th>
                <th class="px-2 py-1.5">Peak ELR</th>
                <th class="px-2 py-1.5">SE Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.key"
                class="text-[10px] font-bold text-slate-700 border-t border-slate-100 cursor-pointer transition-colors"
                :class="row.key === activeVariantKey ? 'bg-indigo-50' : 'hover:bg-slate-50'"
                @click="select(row.key)"
              >
                <td class="px-2 py-2 flex items-center gap-1.5">
                  <svg
                    v-if="row.key === activeVariantKey"
                    class="w-3 h-3 text-indigo-600 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span v-else class="w-3 flex-shrink-0" />
                  <span :class="row.key === activeVariantKey ? 'text-indigo-700' : ''">{{ row.label }}</span>
                </td>
                <td class="px-2 py-2">
                  <span
                    v-if="row.tier13Unlocked"
                    class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200"
                  >
                    Unlocked
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-2 py-2 font-mono-premium">{{ formatDuration(row.summary.totalDurationSeconds) }}</td>
                <td class="px-2 py-2 font-mono-premium">{{ row.summary.endTE }}</td>
                <td class="px-2 py-2 font-mono-premium">{{ formatNumber(row.summary.maxELR * 3600, 3) }}/hr</td>
                <td class="px-2 py-2 font-mono-premium">{{ formatNumber(row.summary.totalShiftCost, 3) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            class="px-6 py-2 text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all rounded-xl hover:shadow-sm"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatNumber, formatDuration } from '@/lib/format';
import type { VariantKey, VariantResult } from '@/stores/autoPlanner';

const props = defineProps<{
  show: boolean;
  variants: Partial<Record<VariantKey, VariantResult>>;
  activeVariantKey?: VariantKey;
}>();

const emit = defineEmits<{
  close: [];
  select: [variant: VariantKey];
}>();

const rows = computed(() =>
  (Object.entries(props.variants) as [VariantKey, VariantResult | undefined][])
    .filter((entry): entry is [VariantKey, VariantResult] => !!entry[1])
    .map(([key, result]) => ({
      key,
      label: key === 'continue' ? 'Continue Asc.' : key.replace('-tier13', ' + T13').replace('-', ' '),
      summary: result.summary,
      tier13Unlocked: result.summary.tier13Unlocked,
    }))
    .sort((a, b) => a.summary.totalDurationSeconds - b.summary.totalDurationSeconds)
);

const select = (variant: VariantKey) => {
  emit('select', variant);
};
</script>

<style scoped>
.font-mono-premium {
  font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
}

.animate-in {
  animation-duration: 200ms;
}
</style>
