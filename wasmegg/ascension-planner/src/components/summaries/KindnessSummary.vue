<template>
  <div class="px-4 py-3 bg-pink-50 border-t border-pink-200">
    <div class="text-sm text-pink-800 font-medium">Kindness Summary</div>
    <div class="text-xs text-pink-600 mt-1">
      <!-- TODO: Add Kindness-specific metrics -->
      Placeholder for Kindness egg statistics and achievements
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Action } from '@/types';

defineProps<{
  actions: Action[];
}>();
</script>
