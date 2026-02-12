<template>
  <the-nav-bar active-entry-id="ascension-planner" />

  <div class="min-h-screen bg-gray-100 pb-24">
    <div class="max-w-6xl mx-auto p-4">
      <h1 class="mx-4 mt-4 mb-2 text-center text-2xl font-bold text-gray-900">
        Ascension Planner
      </h1>

      <p class="text-sm text-gray-600 text-center mb-4">
        Plan your ascension journey: which eggs to visit, what to buy, and when to shift.
      </p>

      <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

      <div v-if="loading" class="text-center py-4 text-gray-600">
        Loading player data...
      </div>

      <div v-if="error" class="text-center py-4 text-red-600">
        {{ error }}
      </div>

      <!-- Action History and Available Actions side-by-side -->
      <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Action History -->
        <div class="bg-white rounded-lg border border-gray-200 overflow-visible">
          <div
            class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
            @click="expandedSections.actionHistory = !expandedSections.actionHistory"
          >
            <h2 class="text-lg font-semibold text-gray-800">Action History</h2>
            <ChevronIcon :expanded="expandedSections.actionHistory" />
          </div>
          <div v-if="expandedSections.actionHistory" class="border-t border-gray-200 p-4 bg-gray-50">
            <ActionHistory
              @show-details="showActionDetails"
              @undo="showUndoConfirmation"
              @clear-all="handleClearAll"
            />
          </div>
        </div>

        <!-- Available Actions -->
        <div class="bg-white rounded-lg border border-gray-200 overflow-visible">
          <div
            class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
            @click="expandedSections.availableActions = !expandedSections.availableActions"
          >
            <h2 class="text-lg font-semibold text-gray-800">Available Actions</h2>
            <ChevronIcon :expanded="expandedSections.availableActions" />
          </div>
          <div v-if="expandedSections.availableActions" class="border-t border-gray-200 p-4 bg-gray-50">
            <AvailableActions @show-current-details="showCurrentDetails" />
          </div>
        </div>
      </div>
    </div>

    <!-- Action Details Modal -->
    <ActionDetailsModal
      v-if="showDetailsModal"
      :action="detailsModalAction"
      @close="closeActionDetails"
    />

    <!-- Undo Confirmation Dialog -->
    <UndoConfirmationDialog
      v-if="undoAction"
      :action="undoAction"
      :dependent-actions="undoDependentActions"
      @confirm="executeUndo"
      @cancel="cancelUndo"
    />

    <AssetBrowser />
    <PlanFinalSummary @show-details="showCurrentDetails" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TheNavBar from 'ui/components/NavBar.vue';
import { getSavedPlayerID, savePlayerID, requestFirstContact } from 'lib';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';
import ActionHistory from '@/components/ActionHistory.vue';
import AvailableActions from '@/components/AvailableActions.vue';
import ActionDetailsModal from '@/components/ActionDetailsModal.vue';
import UndoConfirmationDialog from '@/components/UndoConfirmationDialog.vue';
import PlanFinalSummary from '@/components/PlanFinalSummary.vue';
import AssetBrowser from '@/components/AssetBrowser.vue';
import { formatNumber } from '@/lib/format';
import { restoreFromSnapshot } from '@/lib/actions/snapshot';
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import type { Action } from '@/types';

// Chevron icon component
const ChevronIcon = {
  props: { expanded: Boolean },
  template: `
    <svg
      class="w-5 h-5 text-gray-400 transition-transform"
      :class="{ 'rotate-180': expanded }"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  `,
};

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();
const fuelTankStore = useFuelTankStore();
const truthEggsStore = useTruthEggsStore();

// Initial calculation to populate the default start_ascension action with correct metrics
// based on default farm state (1 Coop, 1 Trike, etc.)
actionsStore.recalculateAll();

// Section expansion state
const expandedSections = ref({
  actionHistory: true,
  availableActions: true,
});

// Current state from actions store
const currentSnapshot = computed(() => actionsStore.currentSnapshot);
const totalCost = computed(() => actionsStore.totalCost);
const actionCount = computed(() => actionsStore.actionCount);

// Modal state
const showDetailsModal = ref(false);
const detailsModalAction = ref<Action | null>(null);
const undoAction = ref<Action | null>(null);
const undoDependentActions = ref<Action[]>([]);

// Modal handlers
function showActionDetails(action: Action) {
  // Temporarily restore stores to this action's end state so CalculationSummary shows correct values
  restoreFromSnapshot(action.endState);
  detailsModalAction.value = action;
  showDetailsModal.value = true;
}

function showCurrentDetails() {
  // Ensure we're in the effective snapshot
  restoreFromSnapshot(actionsStore.effectiveSnapshot);
  detailsModalAction.value = null;
  showDetailsModal.value = true;
}

function closeActionDetails() {
  // Restore stores to current state (last action's end state) or effective state if editing
  restoreFromSnapshot(actionsStore.effectiveSnapshot);
  detailsModalAction.value = null;
  showDetailsModal.value = false;
}

function showUndoConfirmation(action: Action, dependentActions: Action[]) {
  undoAction.value = action;
  undoDependentActions.value = dependentActions;
}

function cancelUndo() {
  undoAction.value = null;
  undoDependentActions.value = [];
}

function executeUndo() {
  if (!undoAction.value) return;

  actionsStore.executeUndo(
    undoAction.value.id,
    undoDependentActions.value.length > 0,
    (snapshot) => {
      // Restore stores to the snapshot of the last remaining action
      restoreFromSnapshot(snapshot);
    }
  );

  cancelUndo();
}

function handleClearAll() {
  actionsStore.clearAll(() => {
    restoreFromSnapshot(actionsStore.initialSnapshot);
  });
}

const playerId = ref(
  new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || ''
);
const loading = ref(false);
const error = ref('');

async function submitPlayerId(id: string) {
  playerId.value = id;
  savePlayerID(id);
  error.value = '';
  loading.value = true;

  try {
    const data = await requestFirstContact(id);
    const backup = data.backup!;
    console.log('Player data:', backup);

    // Store the backup data in initial state
    const { initialShiftCount, initialTE, tankLevel, virtueFuelAmounts, eggsDelivered, teEarnedPerEgg } = initialStateStore.loadFromBackup(id, backup);

    // Initialize virtue store with player's shift count and TE
    virtueStore.setInitialState(initialShiftCount, initialTE);

    // Initialize fuel tank store with player's tank data
    fuelTankStore.setTankLevel(tankLevel);
    for (const [egg, amount] of Object.entries(virtueFuelAmounts)) {
      fuelTankStore.setFuelAmount(egg as any, amount);
    }

    // Initialize truth eggs store with player's TE data
    for (const [egg, amount] of Object.entries(eggsDelivered)) {
      truthEggsStore.setEggsDelivered(egg as any, amount);
    }
    for (const [egg, count] of Object.entries(teEarnedPerEgg)) {
      truthEggsStore.setTEEarned(egg as any, count);
    }

    // Create the start_ascension action with initial snapshot
    // We compute this from base conditions (clean farm + player global stats)
    const context = getSimulationContext();
    const baseState = createBaseEngineState(null);
    const initialSnapshot = computeSnapshot(baseState, context);
    actionsStore.setInitialSnapshot(initialSnapshot);

    loading.value = false;
  } catch (e) {
    loading.value = false;
    error.value = e instanceof Error ? e.message : 'Failed to load player data';
    console.error('Error fetching player data:', e);
  }
}
</script>
