<template>
  <div class="space-y-4">
    <!-- Final Result -->
    <div class="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-inner">
      <div class="flex justify-between items-center mb-4">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Effective Lay Rate</div>
        <!-- Time Unit Toggle -->
        <div class="inline-flex p-1 bg-white rounded-xl border border-slate-200/50 shadow-sm">
          <button
            v-for="unit in timeUnits"
            :key="unit.value"
            class="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-200"
            :class="
              timeUnit === unit.value ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            "
            @click="$emit('set-time-unit', unit.value)"
          >
            {{ unit.label }}
          </button>
        </div>
      </div>
      <div class="text-3xl font-bold text-slate-800 tracking-tight">
        {{ formatNumber(convertedELR, 3) }} <span class="text-sm font-medium text-slate-400">/{{ timeUnitLabel }}</span>
      </div>
      <div
        class="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm"
      >
        <div class="w-1.5 h-1.5 rounded-full" :class="statusIndicatorClass"></div>
        <span class="text-[10px] font-black uppercase tracking-widest" :class="limitedByClass">{{
          limitedByText
        }}</span>
      </div>
    </div>

    <!-- Rate Breakdown -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Rate Comparison</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div class="px-5 py-4 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div>
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Egg Laying Rate</div>
          </div>
          <span
            class="font-mono-premium text-sm font-bold"
            :class="output.limitedBy === 'laying' ? 'text-slate-900' : 'text-slate-700'"
          >
            {{ formatNumber(convertedLayRate, 3)
            }}<span class="text-[10px] opacity-60 ml-0.5">/{{ timeUnitLabel }}</span>
          </span>
        </div>
        <div class="px-5 py-4 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div>
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipping Capacity</div>
          </div>
          <span
            class="font-mono-premium text-sm font-bold"
            :class="output.limitedBy === 'shipping' ? 'text-slate-900' : 'text-slate-700'"
          >
            {{ formatNumber(convertedShipping, 3)
            }}<span class="text-[10px] opacity-60 ml-0.5">/{{ timeUnitLabel }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EffectiveLayRateOutput, TimeUnit } from '@/types';
import { formatNumber } from '@/lib/format';
import { computed } from 'vue';

const props = defineProps<{
  output: EffectiveLayRateOutput;
  timeUnit: TimeUnit;
}>();

defineEmits<{
  'set-time-unit': [unit: TimeUnit];
}>();

const timeUnits = [
  { value: 'minute' as const, label: '/min' },
  { value: 'hour' as const, label: '/hr' },
  { value: 'day' as const, label: '/day' },
];

const timeUnitLabel = computed(() => {
  switch (props.timeUnit) {
    case 'minute':
      return 'min';
    case 'hour':
      return 'hr';
    case 'day':
      return 'day';
  }
});

const timeMultiplier = computed(() => {
  switch (props.timeUnit) {
    case 'minute':
      return 60;
    case 'hour':
      return 3600;
    case 'day':
      return 86400;
  }
});

const convertedLayRate = computed(() => props.output.layRate * timeMultiplier.value);
const convertedShipping = computed(() => props.output.shippingCapacity * timeMultiplier.value);
const convertedELR = computed(() => props.output.effectiveLayRate * timeMultiplier.value);

const limitedByText = computed(() => {
  switch (props.output.limitedBy) {
    case 'laying':
      return 'Limited by egg laying rate';
    case 'shipping':
      return 'Limited by shipping capacity';
    case 'equal':
      return 'Laying and shipping are balanced';
  }
});

const limitedByClass = computed(() => {
  switch (props.output.limitedBy) {
    case 'laying':
      return 'text-slate-900';
    case 'shipping':
      return 'text-slate-900';
    case 'equal':
      return 'text-slate-500';
  }
});

const statusIndicatorClass = computed(() => {
  switch (props.output.limitedBy) {
    case 'laying':
      return 'bg-brand-primary shadow-[0_0_8px_rgba(244,63,94,0.4)]';
    case 'shipping':
      return 'bg-brand-primary shadow-[0_0_8px_rgba(244,63,94,0.4)]';
    case 'equal':
      return 'bg-slate-300';
  }
});
</script>
