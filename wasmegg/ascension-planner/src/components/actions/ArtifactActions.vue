<template>
  <div class="space-y-6">
    <p class="text-sm text-gray-500">
      Manage your artifact sets. You can have separate configurations for <strong>Earnings</strong> and <strong>ELR</strong>.
    </p>

    <!-- Set Selector Tabs -->
    <div class="flex gap-2">
      <button
        v-for="setName in (['earnings', 'elr'] as const)"
        :key="setName"
        class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 shadow-sm relative"
        :class="[
          selectedTab === setName
            ? 'border-blue-600 bg-blue-50/30'
            : 'border-gray-100 bg-white hover:border-gray-200'
        ]"
        @click="selectedTab = setName"
      >
        <!-- Equipped Indicator -->
        <div 
          v-if="activeArtifactSet === setName"
          class="absolute top-2 right-2 flex items-center gap-1"
          title="This set is currently equipped"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span class="text-[8px] font-black uppercase tracking-tighter text-emerald-600">Equipped</span>
        </div>

        <span class="text-[10px] font-black uppercase tracking-[0.2em]" :class="selectedTab === setName ? 'text-blue-700' : 'text-gray-400'">
          {{ setName }}
        </span>
      </button>
    </div>

    <!-- Active Set Editor -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Configuration</span>
          <span class="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] font-black uppercase tracking-tight">
            {{ selectedTab }}
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <template v-if="isDirty">
            <button
              class="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider"
              @click="undoChanges"
            >
              Undo
            </button>
            <button
              class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-sm transition-colors"
              @click="saveChanges"
            >
              Save Changes
            </button>
          </template>
          <template v-else-if="activeArtifactSet !== selectedTab">
            <button
              class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-sm transition-colors"
              @click="equipSet"
            >
              Equip Set
            </button>
          </template>
        </div>
      </div>

      <div class="p-4">
        <ArtifactSelector
          :model-value="localLoadout"
          @update:model-value="localLoadout = $event"
        />
      </div>
    </div>

    <div class="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 text-blue-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 class="text-xs font-bold text-blue-900 uppercase tracking-tight mb-1">Set Optimization</h4>
          <p class="text-[11px] text-blue-700 leading-relaxed">
            <strong>Earnings:</strong> Focus on Necklaces, Ankhs, and Cubes (for research) with Lunar stones.
            <br/>
            <strong>ELR:</strong> Focus on Metronomes and Compasses with Tachyon/Quantum stones.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ArtifactSelector from '@/components/ArtifactSelector.vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { generateActionId, type ArtifactSlotPayload, type ArtifactSetName } from '@/types';
import { type EquippedArtifact, createEmptyLoadout, summarizeLoadout } from '@/lib/artifacts';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { computeDependencies } from '@/lib/actions/executor';

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const { prepareExecution, completeExecution } = useActionExecutor();

const activeArtifactSet = computed(() => actionsStore.effectiveSnapshot.activeArtifactSet);
const artifactSets = computed(() => actionsStore.effectiveSnapshot.artifactSets);

const selectedTab = ref<ArtifactSetName>('earnings');

// Local state for the selected set (allows unsaved changes)
const localLoadout = ref<EquippedArtifact[]>(createEmptyLoadout());

// Sync local loadout when tab or store state changes
watch([selectedTab, () => actionsStore.effectiveSnapshot], () => {
  const setLoadout = artifactSets.value[selectedTab.value];
  if (setLoadout) {
    localLoadout.value = setLoadout.map(slot => ({
      artifactId: slot.artifactId,
      stones: [...slot.stones],
    }));
  } else {
    localLoadout.value = createEmptyLoadout();
  }
}, { immediate: true });

const isDirty = computed(() => {
  const currentSet = artifactSets.value[selectedTab.value];
  if (!currentSet) {
    // Check if local loadout is non-empty
    return localLoadout.value.some(slot => slot.artifactId !== null);
  }

  return localLoadout.value.some((slot, i) => {
    const orig = currentSet[i];
    if (slot.artifactId !== orig.artifactId) return true;
    if (slot.stones.length !== orig.stones.length) return true;
    return slot.stones.some((stone, j) => stone !== orig.stones[j]);
  });
});

function undoChanges() {
  const currentSet = artifactSets.value[selectedTab.value];
  if (currentSet) {
    localLoadout.value = currentSet.map(slot => ({
      artifactId: slot.artifactId,
      stones: [...slot.stones],
    }));
  } else {
    localLoadout.value = createEmptyLoadout();
  }
}

function saveChanges() {
  const toLoadout: ArtifactSlotPayload[] = localLoadout.value.map(slot => ({
    artifactId: slot.artifactId,
    stones: [...slot.stones],
  }));

  const beforeSnapshot = prepareExecution();
  
  const dependencies = computeDependencies('update_artifact_set', {
    setName: selectedTab.value,
    newLoadout: toLoadout,
  }, actionsStore.actionsBeforeInsertion);

  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'update_artifact_set',
    payload: {
      setName: selectedTab.value,
      newLoadout: toLoadout,
    },
    cost: 0,
    dependsOn: dependencies,
  }, beforeSnapshot);
}

function equipSet() {
  const beforeSnapshot = prepareExecution();
  
  const dependencies = computeDependencies('equip_artifact_set', {
    setName: selectedTab.value,
  }, actionsStore.actionsBeforeInsertion);

  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'equip_artifact_set',
    payload: {
      setName: selectedTab.value,
    },
    cost: 0,
    dependsOn: dependencies,
  }, beforeSnapshot);
}
</script>
