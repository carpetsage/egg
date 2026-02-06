<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500 mb-4">
      Change your artifact loadout. Artifact changes are free and affect all subsequent calculations.
    </p>

    <!-- Artifact Selector -->
    <ArtifactSelector
      :model-value="currentLoadout"
      @update:model-value="handleLoadoutChange"
    />

    <p class="text-xs text-gray-400">
      Artifact effects apply to egg value, hab capacity, shipping, research costs, and more.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ArtifactSelector from '@/components/ArtifactSelector.vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { generateActionId, type ArtifactSlotPayload } from '@/types';
import type { EquippedArtifact } from '@/lib/artifacts';
import { useActionExecutor } from '@/composables/useActionExecutor';

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const { prepareExecution, completeExecution } = useActionExecutor();

// Current loadout from the store
const currentLoadout = computed(() => initialStateStore.artifactLoadout);

/**
 * Handle loadout changes from the ArtifactSelector.
 * Creates a change_artifacts action with the before/after state.
 */
function handleLoadoutChange(newLoadout: EquippedArtifact[]) {
  // Convert current loadout to payload format
  const fromLoadout: ArtifactSlotPayload[] = currentLoadout.value.map(slot => ({
    artifactId: slot.artifactId,
    stones: [...slot.stones],
  }));

  // Convert new loadout to payload format
  const toLoadout: ArtifactSlotPayload[] = newLoadout.map(slot => ({
    artifactId: slot.artifactId,
    stones: [...slot.stones],
  }));

  // Check if anything actually changed
  const hasChanged = toLoadout.some((slot, i) => {
    const from = fromLoadout[i];
    if (slot.artifactId !== from.artifactId) return true;
    if (slot.stones.length !== from.stones.length) return true;
    return slot.stones.some((stone, j) => stone !== from.stones[j]);
  });

  if (!hasChanged) return;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  // Apply the change to the store
  initialStateStore.setArtifactLoadout(newLoadout);

  // Complete execution
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'change_artifacts',
    payload: {
      fromLoadout,
      toLoadout,
    },
    cost: 0, // Changing artifacts is free
    dependsOn: [],
  }, beforeSnapshot);
}
</script>
