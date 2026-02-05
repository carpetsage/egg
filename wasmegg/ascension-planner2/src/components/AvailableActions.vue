<template>
  <div class="space-y-4">
    <!-- Current Egg Indicator -->
    <div class="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Current Egg</span>
      <div class="flex items-center gap-2 bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm">
        <div class="w-5 h-5 flex-shrink-0">
          <img
            :src="iconURL(`egginc/egg_${virtueStore.currentEgg}.png`, 64)"
            class="w-full h-full object-contain"
            :alt="virtueStore.currentEgg"
          />
        </div>
        <span
          class="text-xs font-bold"
          :class="eggTextColorClass"
        >
          {{ currentEggName }}
        </span>
      </div>
      <span class="text-gray-300 mx-1">/</span>
      <span class="text-xs font-semibold text-gray-500 tracking-tight">{{ availableActionLabel }}</span>
    </div>

    <!-- Tab buttons -->
    <div class="flex gap-1 border-b border-gray-200">
      <button
        v-for="tab in availableTabs"
        :key="tab.id"
        class="px-4 py-2 text-sm font-medium transition-colors relative"
        :class="activeTab === tab.id
          ? 'text-blue-600'
          : 'text-gray-500 hover:text-gray-700'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span
          v-if="activeTab === tab.id"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
        />
      </button>
    </div>

    <!-- Tab content -->
    <div class="min-h-[200px]">
      <VehicleActions v-if="activeTab === 'vehicles'" />
      <HabActions v-if="activeTab === 'habs'" />
      <ResearchActions v-if="activeTab === 'research'" />
      <ShiftActions v-if="activeTab === 'shift'" />
      <ArtifactActions v-if="activeTab === 'artifacts'" />
      <SiloActions v-if="activeTab === 'silos'" />
      <FuelTankActions v-if="activeTab === 'fuel'" />
      <WaitForTEActions v-if="activeTab === 'te'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { iconURL } from 'lib';
import VehicleActions from './actions/VehicleActions.vue';
import HabActions from './actions/HabActions.vue';
import ResearchActions from './actions/ResearchActions.vue';
import ShiftActions from './actions/ShiftActions.vue';
import ArtifactActions from './actions/ArtifactActions.vue';
import SiloActions from './actions/SiloActions.vue';
import FuelTankActions from './actions/FuelTankActions.vue';
import WaitForTEActions from './actions/WaitForTEActions.vue';
import { useVirtueStore } from '@/stores/virtue';
import { VIRTUE_EGG_NAMES, type VirtueEgg } from '@/types';

const virtueStore = useVirtueStore();

// All available tabs
const allTabs = [
  { id: 'research', label: 'Research', egg: 'curiosity' as VirtueEgg },
  { id: 'habs', label: 'Habs', egg: 'integrity' as VirtueEgg },
  { id: 'vehicles', label: 'Vehicles', egg: 'kindness' as VirtueEgg },
  { id: 'artifacts', label: 'Artifacts', egg: 'humility' as VirtueEgg },
  { id: 'silos', label: 'Silos', egg: 'resilience' as VirtueEgg },
  { id: 'fuel', label: 'Fuel Tank', egg: null }, // Always available
  { id: 'te', label: 'Wait for TE', egg: null }, // Always available
  { id: 'shift', label: 'Shift', egg: null }, // Always available
] as const;

type TabId = typeof allTabs[number]['id'];

// Map egg to its action tab
const eggToTab: Record<VirtueEgg, TabId> = {
  curiosity: 'research',
  integrity: 'habs',
  kindness: 'vehicles',
  humility: 'artifacts',
  resilience: 'silos',
};

// Map egg to action label
const eggToActionLabel: Record<VirtueEgg, string> = {
  curiosity: 'Research available',
  integrity: 'Habs available',
  kindness: 'Vehicles available',
  humility: 'Artifacts available',
  resilience: 'Silos available',
};

// Current egg display
const currentEggName = computed(() => VIRTUE_EGG_NAMES[virtueStore.currentEgg]);
const availableActionLabel = computed(() => eggToActionLabel[virtueStore.currentEgg]);

const eggTextColorClass = computed(() => {
  switch (virtueStore.currentEgg) {
    case 'curiosity': return 'text-purple-600';
    case 'integrity': return 'text-blue-600';
    case 'kindness': return 'text-pink-600';
    case 'resilience': return 'text-orange-600';
    case 'humility': return 'text-green-600';
  }
});

// Filter tabs based on current egg
const availableTabs = computed(() => {
  return allTabs.filter(tab => {
    // Shift is always available
    if (tab.egg === null) return true;
    // Only show the tab for the current egg
    return tab.egg === virtueStore.currentEgg;
  });
});

// Active tab - defaults to the egg's action tab
const activeTab = ref<TabId>(eggToTab[virtueStore.currentEgg]);

// When egg changes, switch to that egg's tab
watch(() => virtueStore.currentEgg, (newEgg) => {
  activeTab.value = eggToTab[newEgg];
});
</script>
