<template>
  <div class="px-4 py-3 bg-green-50 border-t border-green-200">
    <div class="text-sm text-green-800 font-medium">Humility Summary</div>
    <div class="text-xs text-green-600 mt-1">
      <!-- TODO: Add Humility-specific metrics -->
      Placeholder for Humility egg statistics and achievements
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Action } from '@/types';

defineProps<{
  actions: Action[];
}>();
</script>
