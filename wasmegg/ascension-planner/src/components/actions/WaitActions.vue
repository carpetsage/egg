<template>
  <div v-if="!isHumility" class="space-y-4">
    <WaitForTEActions @show-current-details="$emit('show-current-details')" />
  </div>

  <div v-else class="space-y-3">
    <!-- Wait for TE Section -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-200">
      <button
        class="w-full px-4 py-3 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
        @click="teExpanded = !teExpanded"
      >
        <div class="flex items-center gap-2.5">
           <img :src="iconURL('egginc/egg_truth.png', 64)" class="w-5 h-5 object-contain" />
           <h3 class="font-bold text-xs uppercase tracking-widest text-gray-600">Wait for TE</h3>
        </div>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform duration-300"
          :class="{ 'rotate-180': teExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="teExpanded" class="p-4 border-t border-gray-100">
        <WaitForTEActions @show-current-details="$emit('show-current-details')" />
      </div>
    </div>

    <!-- Wait for Missions Section -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-200">
      <button
        class="w-full px-4 py-3 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
        @click="missionsExpanded = !missionsExpanded"
      >
        <div class="flex items-center gap-2.5">
            <div class="w-5 h-5 bg-black rounded-full flex items-center justify-center p-0.5 overflow-hidden">
              <img :src="iconURL('egginc/icon_afx_mission.png', 64)" class="w-full h-full object-contain" />
            </div>
           <h3 class="font-bold text-xs uppercase tracking-widest text-gray-600">Wait for Missions</h3>
        </div>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform duration-300"
          :class="{ 'rotate-180': missionsExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="missionsExpanded" class="p-4 border-t border-gray-100">
        <WaitForMissionsActions />
      </div>
    </div>

    <!-- Wait for Sleep Section (Placeholder) -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-200">
      <button
        class="w-full px-4 py-3 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
        @click="sleepExpanded = !sleepExpanded"
      >
        <div class="flex items-center gap-2.5">
           <img :src="iconURL('egginc/tiny_indicator_waiting.png', 64)" class="w-5 h-5 object-contain" />
           <h3 class="font-bold text-xs uppercase tracking-widest text-gray-600">Wait for Sleep</h3>
        </div>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform duration-300"
          :class="{ 'rotate-180': sleepExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="sleepExpanded" class="p-4 border-t border-gray-100">
        <WaitForSleepActions />
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
import WaitForSleepActions from './WaitForSleepActions.vue';

const actionsStore = useActionsStore();

const isHumility = computed(() => actionsStore.effectiveSnapshot.currentEgg === 'humility');

const teExpanded = ref(false);
const missionsExpanded = ref(false);
const sleepExpanded = ref(false);

defineEmits<{
  'show-current-details': [];
}>();
</script>
