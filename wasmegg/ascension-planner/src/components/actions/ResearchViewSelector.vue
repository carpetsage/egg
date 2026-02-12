<template>
  <div class="flex flex-col gap-2 mb-4">
    <div class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sort Research By</div>
    <div class="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-lg shadow-inner">
      <button
        v-for="v in views"
        :key="v.id"
        @click="$emit('update:modelValue', v.id)"
        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap"
        :class="modelValue === v.id 
          ? 'bg-white text-blue-600 shadow-sm' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'"
      >
        {{ v.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type ViewType } from '@/composables/useResearchViews';

defineProps<{
  modelValue: ViewType;
  views: readonly { id: ViewType; label: string }[];
}>();
defineEmits(['update:modelValue']);
</script>
