<template>
  <div class="space-y-4">
    <!-- Wait for TE Section -->
    <div
      class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <button
        class="w-full px-5 py-4 bg-slate-50/50 flex justify-between items-center hover:bg-white transition-colors group"
        @click="teExpanded = !teExpanded"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform"
          >
            <img
              :src="iconURL(`egginc/egg_${actionsStore.effectiveSnapshot.currentEgg}.png`, 64)"
              class="w-full h-full object-contain"
            />
          </div>
          <h3 class="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Wait for TE</h3>
        </div>
        <svg
          class="w-5 h-5 text-slate-300 transition-transform duration-300"
          :class="{ 'rotate-180 text-slate-900': teExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="teExpanded" class="p-6 border-t border-slate-50">
        <WaitForTEActions @show-current-details="$emit('show-current-details')" />
      </div>
    </div>

    <!-- Wait for Full Habs Section -->
    <div
      class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <button
        class="w-full px-5 py-4 bg-slate-50/50 flex justify-between items-center hover:bg-white transition-colors group"
        @click="habsExpanded = !habsExpanded"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform"
          >
            <img :src="iconURL('egginc/ei_hab_icon_chicken_universe.png', 64)" class="w-full h-full object-contain" />
          </div>
          <h3 class="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Wait for Full Habs</h3>
        </div>
        <svg
          class="w-5 h-5 text-slate-300 transition-transform duration-300"
          :class="{ 'rotate-180 text-slate-900': habsExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="habsExpanded" class="p-6 border-t border-slate-50">
        <WaitForFullHabsActions />
      </div>
    </div>

    <!-- Wait for Missions Section -->
    <div
      v-if="isHumility"
      class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <button
        class="w-full px-5 py-4 bg-slate-50/50 flex justify-between items-center hover:bg-white transition-colors group"
        @click="missionsExpanded = !missionsExpanded"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center p-1.5 overflow-hidden shadow-lg group-hover:scale-110 transition-transform border border-slate-800"
          >
            <img :src="iconURL('egginc/icon_afx_mission.png', 64)" class="w-full h-full object-contain" />
          </div>
          <h3 class="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Wait for Missions</h3>
        </div>
        <svg
          class="w-5 h-5 text-slate-300 transition-transform duration-300"
          :class="{ 'rotate-180 text-slate-900': missionsExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="missionsExpanded" class="p-6 border-t border-slate-50">
        <WaitForMissionsActions />
      </div>
    </div>

    <!-- Wait for Time Section -->
    <div
      class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <button
        class="w-full px-5 py-4 bg-slate-50/50 flex justify-between items-center hover:bg-white transition-colors group"
        @click="timeExpanded = !timeExpanded"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform"
          >
            <img :src="iconURL('egginc/tiny_indicator_waiting.png', 64)" class="w-full h-full object-contain" />
          </div>
          <h3 class="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Wait for Time</h3>
        </div>
        <svg
          class="w-5 h-5 text-slate-300 transition-transform duration-300"
          :class="{ 'rotate-180 text-slate-900': timeExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="timeExpanded" class="p-6 border-t border-slate-50">
        <WaitForTimeActions />
      </div>
    </div>

    <!-- Wait for Events Section (Social/Fixed) -->
    <div
      class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <button
        class="w-full px-5 py-4 bg-slate-50/50 flex justify-between items-center hover:bg-white transition-colors group"
        @click="eventsExpanded = !eventsExpanded"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center p-1.5 group-hover:scale-110 transition-transform"
          >
            <img :src="iconURL('egginc-extras/icon_earnings_boost.png', 64)" class="w-full h-full object-contain" />
          </div>
          <h3 class="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Wait for Events</h3>
        </div>
        <svg
          class="w-5 h-5 text-slate-300 transition-transform duration-300"
          :class="{ 'rotate-180 text-slate-900': eventsExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="eventsExpanded" class="p-6 border-t border-slate-50">
        <WaitForEventActions />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { iconURL } from 'lib';
import { useActionsStore } from '@/stores/actions';
import WaitForTEActions from './WaitForTEActions.vue';
import WaitForMissionsActions from './WaitForMissionsActions.vue';
import WaitForTimeActions from './WaitForTimeActions.vue';
import WaitForFullHabsActions from './WaitForFullHabsActions.vue';
import WaitForEventActions from './WaitForEventActions.vue';

const actionsStore = useActionsStore();

const isHumility = computed(() => actionsStore.effectiveSnapshot.currentEgg === 'humility');
const isCuriosity = computed(() => actionsStore.effectiveSnapshot.currentEgg === 'curiosity');

const teExpanded = ref(!isHumility.value);
const habsExpanded = ref(false);
const missionsExpanded = ref(false);
const timeExpanded = ref(false);
const eventsExpanded = ref(false);

defineEmits<{
  'show-current-details': [];
}>();
</script>
