<template>
  <div class="px-4">
    <div class="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex items-start gap-4 shadow-xl shadow-rose-500/5 animate-in fade-in slide-in-from-top-4">
      <div class="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 flex-shrink-0">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="space-y-1">
        <h4 class="text-sm font-black text-rose-800 uppercase tracking-tight">Simulation Failed</h4>
        <p class="text-xs font-bold text-rose-600/80 leading-relaxed">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>();
</script>
