<template>
  <div class="space-y-6">
    <div class="section-premium p-8 max-w-3xl mx-auto mt-6 relative overflow-hidden">
      <!-- Decorative background -->
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
      
      <div class="relative z-10">
        <div class="flex items-center gap-4 mb-8">
          <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight">Automatic Planner</h2>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Decision Tree Optimizer</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Left Column: Primary Goals -->
          <div class="space-y-6">
            <div class="space-y-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target TE</label>
              <div class="relative">
                <input 
                  type="number" 
                  v-model.number="targetTE"
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-mono-premium text-lg font-black text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all pr-12"
                  :min="currentTE + 1"
                  max="490"
                />
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">/ 490</div>
              </div>
              <div class="flex justify-between px-1">
                <span class="text-[10px] font-bold text-slate-400">Current: {{ currentTE }}</span>
                <span class="text-[10px] font-black text-indigo-500 uppercase tracking-tight">+{{ Math.max(0, targetTE - currentTE) }} to gain</span>
              </div>
            </div>

            <div class="space-y-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Ascensions</label>
              <div class="flex items-center gap-4">
                <input 
                  type="range" 
                  v-model.number="maxAscensions"
                  min="1"
                  max="20"
                  class="flex-grow accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
                <div class="w-12 text-center font-mono-premium font-black text-slate-900 bg-slate-50 rounded-lg py-1 border border-slate-100">
                  {{ maxAscensions }}
                </div>
              </div>
              <p class="text-[9px] text-slate-400 italic">Deeper trees find better paths but take longer to generate.</p>
            </div>
          </div>

          <!-- Right Column: Schedule -->
          <div class="space-y-6">
            <div class="space-y-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
              <div class="grid grid-cols-2 gap-2">
                <input type="date" v-model="startDate" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50" />
                <input type="time" v-model="startTime" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50" />
              </div>
            </div>

            <div class="space-y-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Timezone</label>
              <select v-model="timezone" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/50 appearance-none">
                <option v-for="tz in allTimezones" :key="tz.value" :value="tz.value">
                  {{ tz.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="mt-10 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
          <div class="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
          
          <h4 class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6">Resource Preview</h4>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div class="space-y-1">
              <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max SE Consumption</div>
              <div class="flex items-center gap-3">
                <span class="text-xl font-mono-premium font-black">{{ formatNumber(seCostPreview, 3) }}</span>
                <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-5 h-5" alt="SE" />
              </div>
            </div>
            
            <div class="space-y-1">
              <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ending SE</div>
              <div class="flex items-center gap-3">
                <span class="text-xl font-mono-premium font-black" :class="endingSE < 0 ? 'text-rose-400' : 'text-emerald-400'">
                  {{ formatNumber(endingSE, 3) }}
                </span>
                <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-5 h-5" alt="SE" />
              </div>
            </div>
          </div>
          
          <div v-if="endingSE < 0" class="mt-4 flex items-start gap-2 text-rose-400/80">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-[10px] font-bold leading-tight">Note: SE will go negative. You'll need to earn more SE during the plan execution.</p>
          </div>
        </div>

        <button 
          class="btn-premium btn-primary w-full py-5 mt-8 text-sm shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
          disabled
        >
          Generate Path Decision Tree
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { iconURL } from 'lib';
import { formatNumber } from '@/lib/format';
import { computeMultiAscensionSECost } from '@/auto/se-tracker';

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();

// Default values
const targetTE = ref(490);
const maxAscensions = ref(5);
const timezone = ref(virtueStore.ascensionTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

const now = new Date();
const startDate = ref(now.toISOString().split('T')[0]);
const startTime = ref(now.toTimeString().split(' ')[0].substring(0, 5));

const currentTE = computed(() => {
  const snapshot = actionsStore.effectiveSnapshot;
  return snapshot.teEarned ? Object.values(snapshot.teEarned).reduce((a, b) => a + b, 0) : 0;
});

const seCostPreview = computed(() => {
  const snapshot = actionsStore.effectiveSnapshot;
  const result = computeMultiAscensionSECost(
    snapshot.soulEggs,
    snapshot.shiftCount,
    maxAscensions.value
  );
  return result.totalCost;
});

const endingSE = computed(() => {
  const snapshot = actionsStore.effectiveSnapshot;
  const result = computeMultiAscensionSECost(
    snapshot.soulEggs,
    snapshot.shiftCount,
    maxAscensions.value
  );
  return result.endingSE;
});

const allTimezones = computed(() => {
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    return zones
      .map(tz => {
        const parts = tz.split('/');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        const region = parts.length > 1 ? parts[0] : '';
        return {
          value: tz,
          label: region ? `${city} (${region})` : city,
          region,
          city,
        };
      })
      .sort((a, b) => {
        if (a.region !== b.region) return a.region.localeCompare(b.region);
        return a.city.localeCompare(b.city);
      });
  } catch {
    return [
      { value: 'America/Los_Angeles', label: 'Los Angeles (America)', region: 'America', city: 'Los Angeles' },
      { value: 'UTC', label: 'UTC', region: '', city: 'UTC' },
    ];
  }
});
</script>

<style scoped>
.btn-premium {
  @apply rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3;
}
.btn-primary {
  @apply bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed;
}
.section-premium {
  @apply bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700;
}
.font-mono-premium {
  font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
}
</style>
