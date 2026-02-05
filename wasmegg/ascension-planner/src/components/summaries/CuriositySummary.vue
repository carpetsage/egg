<template>
  <div class="px-4 py-3 bg-amber-50 border-t border-amber-200">
    <div class="text-sm text-amber-800 font-medium mb-2">Curiosity Summary</div>
    <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      <!-- TODO: Add Curiosity-specific metrics -->
      Placeholder for Curiosity egg statistics and achievements
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Action } from '@/types';

defineProps<{
  actions: Action[];
}>();
</script>
