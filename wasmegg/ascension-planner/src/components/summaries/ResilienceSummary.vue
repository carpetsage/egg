<template>
  <div class="px-4 py-3 bg-red-50 border-t border-red-200">
    <div class="text-sm text-red-800 font-medium">Resilience Summary</div>
    <div class="text-xs text-red-600 mt-1">
      <!-- TODO: Add Resilience-specific metrics -->
      Placeholder for Resilience egg statistics and achievements
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Action } from '@/types';

defineProps<{
  actions: Action[];
}>();
</script>
