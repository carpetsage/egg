<template>
  <div class="flex flex-col gap-2 mb-3 p-2.5 bg-gray-50/80 rounded-lg border border-gray-100">
    <div class="flex items-center gap-3">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0">View By</span>
      <div class="flex gap-1 p-0.5 bg-gray-100 rounded-md shadow-inner">
        <button
          v-for="option in viewOptions"
          :key="option.id"
          @click="$emit('update:viewMode', option.id)"
          class="px-2.5 py-1 text-[11px] font-medium rounded transition-all whitespace-nowrap"
          :class="
            viewMode === option.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          "
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0">Sort By</span>
      <div class="flex gap-1 p-0.5 bg-gray-100 rounded-md shadow-inner">
        <button
          v-for="option in sortOptions"
          :key="option.id"
          @click="$emit('update:sortMode', option.id)"
          class="px-2.5 py-1 text-[11px] font-medium rounded transition-all whitespace-nowrap"
          :class="
            sortMode === option.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          "
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type ElrViewMode, type ElrSortMode } from '@/composables/useResearchViews';

const viewOptions = [
  { id: 'realistic' as ElrViewMode, label: 'Realistic' },
  { id: 'potential' as ElrViewMode, label: 'Potential' },
];

const sortOptions = [
  { id: 'efficiency' as ElrSortMode, label: 'Time Efficiency' },
  { id: 'impact' as ElrSortMode, label: 'Impact' },
];

defineProps<{
  viewMode: ElrViewMode;
  sortMode: ElrSortMode;
}>();

defineEmits(['update:viewMode', 'update:sortMode']);
</script>
