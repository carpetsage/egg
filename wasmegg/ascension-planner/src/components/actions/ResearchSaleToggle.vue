<template>
  <div class="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
      <span class="text-xs font-bold text-amber-900 uppercase tracking-tight">Research Sale (70% OFF)</span>
    </div>
    <button 
      @click="$emit('toggle')"
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
      :class="isActive ? 'bg-amber-500' : 'bg-gray-200'"
    >
      <span
        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        :class="isActive ? 'translate-x-6' : 'translate-x-1'"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isActive: boolean;
}>();
defineEmits(['toggle']);
</script>
