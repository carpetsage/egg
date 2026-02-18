<template>
  <div class="space-y-2">
    <div
      v-for="(slot, slotIndex) in modelValue"
      :key="slotIndex"
      class="rounded-lg border border-gray-200 p-2 shadow-sm"
      :style="getSlotBackgroundStyle(slot.artifactId)"
    >
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-bold text-gray-400 w-4">{{ slotIndex + 1 }}</span>
        </div>
        
        <!-- Artifact Filterable Select -->
        <ArtifactSelect
          :model-value="slot.artifactId"
          placeholder="Select artifact..."
          :items="artifactOptions"
          :get-item-id="item => item.id"
          :get-item-display="item => item.label"
          :get-item-icon-path="item => item.iconPath"
          :item-from-id="id => getArtifact(id)!"
          :search-items="searchArtifacts"
          :item-color-class="getArtifactColorClass"
          allow-clearing
          @update:model-value="onArtifactChange(slotIndex, $event || '')"
          class="flex-1"
        />
      </div>

      <!-- Artifact Effect Display & Stone Slots -->
      <div v-if="slot.artifactId" class="ml-5 space-y-2">
        <div class="text-[11px] font-medium text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded flex items-center gap-1.5 border border-blue-100/50">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
          {{ getArtifact(slot.artifactId)?.effect }}
        </div>

        <!-- Stone Slots -->
        <div
          v-if="getArtifact(slot.artifactId)?.slots"
          class="flex flex-wrap gap-2 border-l border-gray-100 pl-3 py-1"
        >
          <div
            v-for="stoneIndex in getArtifact(slot.artifactId)!.slots"
            :key="stoneIndex"
            class="group relative"
          >
            <!-- Stone Filterable Select -->
            <StoneSelect
              :model-value="slot.stones[stoneIndex - 1]"
              placeholder=""
              :items="stoneOptions"
              :get-item-id="item => item.id"
              :get-item-display="item => item.label"
              :get-item-icon-path="item => item.iconPath"
              :item-from-id="id => getStone(id)!"
              :search-items="searchStones"
              :show-input-text="false"
              :show-placeholder-icon="false"
              :show-selector-icon="false"
              icon-container-class="absolute inset-y-0 w-full flex justify-center"
              input-padding-class="p-0"
              icon-class="h-7 w-7"
              container-class="w-8"
              dropdown-width-class="w-64 -left-28"
              allow-clearing
              @update:model-value="onStoneChange(slotIndex, stoneIndex - 1, $event || '')"
              :class="['stone-select-compact', { 'is-empty': !slot.stones[stoneIndex - 1] }]"
            />
            <!-- Slot name/tier tooltip on hover -->
            <div class="absolute -top-2 -right-2 bg-gray-800 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
              {{ getStone(slot.stones[stoneIndex - 1])?.label || stoneIndex }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="ml-5 text-[10px] text-gray-400 italic">
        Select an artifact to configure stones
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';
import {
  type EquippedArtifact,
  type ArtifactOption,
  type StoneOption,
  getArtifact,
  artifactOptions,
  stoneOptions,
  getStone,
} from '@/lib/artifacts';

const props = defineProps<{
  modelValue: EquippedArtifact[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: EquippedArtifact[]];
}>();

// Define components with generic types
const ArtifactSelect = GenericBaseSelectFilterable<ArtifactOption>();
const StoneSelect = GenericBaseSelectFilterable<StoneOption>();

const searchArtifacts = (query: string) => {
  const q = query.toLowerCase();
  return artifactOptions.filter(a => 
    a.label.toLowerCase().includes(q) || 
    a.familyName.toLowerCase().includes(q)
  );
};

const searchStones = (query: string) => {
  const q = query.toLowerCase();
  return stoneOptions.filter(s => 
    s.label.toLowerCase().includes(q) || 
    s.familyName.toLowerCase().includes(q)
  );
};

function onArtifactChange(slotIndex: number, artifactId: string) {
  const newValue = [...props.modelValue];
  const artifact = getArtifact(artifactId || null);

  newValue[slotIndex] = {
    artifactId: artifactId || null,
    // Reset stones when artifact changes, sized to new slot count
    stones: artifact ? Array(artifact.slots).fill(null) : [],
  };

  emit('update:modelValue', newValue);
}

function onStoneChange(slotIndex: number, stoneSlotIndex: number, stoneId: string) {
  const newValue = [...props.modelValue];
  const stones = [...newValue[slotIndex].stones];
  stones[stoneSlotIndex] = stoneId || null;

  newValue[slotIndex] = {
    ...newValue[slotIndex],
    stones,
  };

  emit('update:modelValue', newValue);
}

/**
 * Get CSS class for artifact dropdown item based on rarity.
 * Rare: #0D6DFD, Epic: #FF00FF, Legendary: #FECD1B, Common: unchanged
 */
function getArtifactColorClass(artifact: ArtifactOption): string {
  // rarity: 0=Common, 1=Rare, 2=Epic, 3=Legendary
  switch (artifact.rarity) {
    case 1: // Rare
      return 'bg-[#0D6DFD30]';
    case 2: // Epic
      return 'bg-[#FF00FF30]';
    case 3: // Legendary
      return 'bg-[#FECD1B40]';
    default: // Common
      return '';
  }
}

/**
 * Get background style for an artifact slot based on rarity.
 * Rare: #0D6DFD, Epic: #FF00FF, Legendary: #FECD1B, Common: white
 */
function getSlotBackgroundStyle(artifactId: string | null): Record<string, string> {
  if (!artifactId) {
    return { backgroundColor: 'white' };
  }

  const artifact = getArtifact(artifactId);
  if (!artifact) {
    return { backgroundColor: 'white' };
  }

  // rarity: 0=Common, 1=Rare, 2=Epic, 3=Legendary
  switch (artifact.rarity) {
    case 1: // Rare
      return { backgroundColor: '#0D6DFD30' }; // ~19% opacity for visible but subtle bg
    case 2: // Epic
      return { backgroundColor: '#FF00FF30' };
    case 3: // Legendary
      return { backgroundColor: '#FECD1B40' }; // Slightly higher for yellow visibility
    default: // Common
      return { backgroundColor: 'white' };
  }
}
</script>

<style scoped>
:deep(.stone-select-compact .Select__input) {
  height: 2rem !important;
  min-height: 2rem !important;
  padding: 0 !important;
  border-style: solid;
  transition: all 0.2s;
}

:deep(.stone-select-compact:not(.is-empty) .Select__input) {
  background-color: rgba(255, 255, 255, 0.5);
}

:deep(.stone-select-compact.is-empty .Select__input) {
  background-color: transparent;
  border-style: dashed;
  border-color: #cbd5e1; /* gray-300 */
}

:deep(.stone-select-compact .Select__input:hover) {
  border-color: #94a3b8; /* gray-400 */
  background-color: rgba(255, 255, 255, 0.8);
}
</style>
