<template>
  <svg
    class="w-5 h-5 text-gray-400 transition-transform"
    :class="{ 'rotate-180': expanded }"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ expanded: boolean }>();
</script>
