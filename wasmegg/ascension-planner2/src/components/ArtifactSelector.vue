<template>
  <div class="space-y-4">
    <div
      v-for="(slot, slotIndex) in modelValue"
      :key="slotIndex"
      class="rounded-lg border border-gray-200 p-4 shadow-sm"
      :style="getSlotBackgroundStyle(slot.artifactId)"
    >
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-gray-400 w-5">{{ slotIndex + 1 }}</span>
          <span class="text-sm font-semibold text-gray-700 uppercase tracking-wider">Slot</span>
        </div>
        
        <!-- Artifact Filterable Select -->
        <ArtifactSelect
          :model-value="slot.artifactId"
          placeholder="Select an artifact..."
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
      <div v-if="slot.artifactId" class="ml-8 space-y-4">
        <div class="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md inline-flex items-center gap-2 border border-blue-100">
          <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
          {{ getArtifact(slot.artifactId)?.effect }}
        </div>

        <!-- Stone Slots -->
        <div
          v-if="getArtifact(slot.artifactId)?.slots"
          class="grid grid-cols-1 gap-3 border-l-2 border-gray-100 pl-4 py-1"
        >
          <div
            v-for="stoneIndex in getArtifact(slot.artifactId)!.slots"
            :key="stoneIndex"
            class="flex items-center gap-3"
          >
            <span class="text-[10px] font-bold text-gray-300 uppercase w-4">{{ stoneIndex }}</span>
            
            <!-- Stone Filterable Select -->
            <StoneSelect
              :model-value="slot.stones[stoneIndex - 1]"
              placeholder="Select a stone..."
              :items="stoneOptions"
              :get-item-id="item => item.id"
              :get-item-display="item => item.label"
              :get-item-icon-path="item => item.iconPath"
              :item-from-id="id => getStone(id)!"
              :search-items="searchStones"
              allow-clearing
              @update:model-value="onStoneChange(slotIndex, stoneIndex - 1, $event || '')"
              class="flex-1"
            />
          </div>
        </div>
      </div>
      <div v-else class="ml-8 text-xs text-gray-400 italic">
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
