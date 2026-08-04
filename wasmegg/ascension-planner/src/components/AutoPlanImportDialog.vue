<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  planName: string;
  ascensionCount: number;
}>();

const emit = defineEmits<{
  (e: 'resolve', resolution: 'restore' | 'individual'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <!-- Modal Backdrop -->
  <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <!-- Dialog Card -->
    <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
      <div class="p-8">
        <div class="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Roadmap Detected</h3>
        <p class="text-slate-500 text-sm leading-relaxed mb-8">
          The file "<span class="font-bold text-slate-700">{{ planName }}</span>" contains a sequential roadmap with 
          <span class="font-bold text-indigo-600">{{ ascensionCount }} ascensions</span>. 
          How would you like to import it?
        </p>

        <div class="space-y-3">
          <button 
            @click="emit('resolve', 'restore')"
            class="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
          >
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-black text-slate-900 uppercase tracking-wider">Restore to Auto Planner</div>
              <div class="text-[10px] font-medium text-slate-500">Resumes the full sequential simulation.</div>
            </div>
          </button>

          <button 
            @click="emit('resolve', 'individual')"
            class="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all text-left group"
          >
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-black text-slate-900 uppercase tracking-wider">Import into Library</div>
              <div class="text-[10px] font-medium text-slate-500">Adds {{ ascensionCount }} separate plans to your library.</div>
            </div>
          </button>
        </div>

        <div class="mt-8 flex justify-center">
          <button 
            @click="emit('cancel')"
            class="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
