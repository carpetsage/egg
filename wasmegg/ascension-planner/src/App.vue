<template>
  <the-nav-bar active-entry-id="ascension-planner" />

  <div :class="['min-h-screen bg-gray-100 transition-all duration-300', isFooterCollapsed ? 'pb-8' : 'pb-24']">
    <div class="max-w-6xl mx-auto p-4">
      <h1 class="mx-4 mt-8 mb-2 text-center heading-xl text-gradient">
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
        <div class="section-premium overflow-visible">
          <div
            class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer rounded-t-lg"
            @click="expandedSections.actionHistory = !expandedSections.actionHistory"
          >
            <h2 class="text-lg font-semibold text-gray-800">Action History</h2>
            <ChevronIcon :expanded="expandedSections.actionHistory" />
          </div>
          <div v-if="expandedSections.actionHistory" class="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
            <ActionHistory
              @show-details="showActionDetails"
              @undo="showUndoConfirmation"
              @clear-all="handleClearAll"
            />
          </div>
        </div>

        <!-- Available Actions -->
        <div class="section-premium overflow-visible">
          <div
            class="px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer rounded-t-lg"
            @click="expandedSections.availableActions = !expandedSections.availableActions"
          >
            <h2 class="text-lg font-semibold text-gray-800">Available Actions</h2>
            <ChevronIcon :expanded="expandedSections.availableActions" />
          </div>
          <div v-if="expandedSections.availableActions" class="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
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
      :dependents-a="undoDependentsA"
      :dependents-b="undoDependentsB"
      @confirm="executeUndo"
      @cancel="cancelUndo"
    />

    <!-- Clear All Confirmation Dialog -->
    <ConfirmationDialog
      v-if="showClearAllConfirmation"
      title="Clear All Actions"
      message="Are you sure you want to clear all actions? This cannot be undone."
      confirm-label="Clear All"
      @confirm="executeClearAll"
      @cancel="showClearAllConfirmation = false"
    />

    <!-- Continuity Check Dialog -->
    <ContinuityDialog />

    <RecalculationOverlay />

    <PlanFinalSummary @show-details="showCurrentDetails" @update:collapsed="isFooterCollapsed = $event" />
    <FloatingStats @show-details="showCurrentDetails" />

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
import ContinuityDialog from '@/components/ContinuityDialog.vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
import FloatingStats from '@/components/FloatingStats.vue';
import RecalculationOverlay from '@/components/RecalculationOverlay.vue';
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
const undoDependentsA = ref<Action[]>([]);
const undoDependentsB = ref<Action[]>([]);
const showClearAllConfirmation = ref(false);
const isFooterCollapsed = ref(false);

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

function showUndoConfirmation(action: Action, options?: { skipConfirmation: boolean }) {
  const validationA = actionsStore.prepareUndo(action.id);
  const validationB = actionsStore.prepareUndoUntilShift(action.id);

  undoAction.value = action;
  undoDependentsA.value = validationA.dependentActions;
  undoDependentsB.value = validationB.dependentActions;

  if (options?.skipConfirmation) {
    executeUndo('truncate');
  }
}

function cancelUndo() {
  undoAction.value = null;
  undoDependentsA.value = [];
  undoDependentsB.value = [];
}

function executeUndo(mode: 'dependents' | 'truncate' = 'dependents') {
  if (!undoAction.value) return;

  actionsStore.executeUndo(
    undoAction.value.id,
    mode,
    (snapshot) => {
      // Restore stores to the snapshot of the last remaining action
      restoreFromSnapshot(snapshot);
    }
  );

  cancelUndo();
}

function handleClearAll(options?: { skipConfirmation: boolean }) {
  if (options?.skipConfirmation) {
    executeClearAll();
  } else {
    showClearAllConfirmation.value = true;
  }
}

function executeClearAll() {
  actionsStore.clearAll(() => {
    restoreFromSnapshot(actionsStore.initialSnapshot);
  });
  showClearAllConfirmation.value = false;
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
    await actionsStore.setInitialSnapshot(initialSnapshot);

    // Log everything used for Wait For Missions as a single object for easy copy/paste
    const maxReturn = initialStateStore.virtueMissions.length > 0 
      ? Math.max(...initialStateStore.virtueMissions.map(m => m.returnTimestamp || 0)) 
      : 0;
    const dateTimeStr = `${virtueStore.ascensionDate}T${virtueStore.ascensionTime}:00`;
    const startUnix = new Date(dateTimeStr).getTime() / 1000;
    const waitSeconds = maxReturn > 0 
      ? Math.max(0, (maxReturn - startUnix) - actionsStore.effectiveSnapshot.lastStepTime)
      : 0;

    const missionsDebugInfo = {
      rawMissions: initialStateStore.activeMissions.map(m => ({
        ...JSON.parse(JSON.stringify(m)),
        identifier: 'redacted'
      })),
      processedVirtueMissions: JSON.parse(JSON.stringify(initialStateStore.virtueMissions)),
      timing: {
        ascensionDate: virtueStore.ascensionDate,
        ascensionTime: virtueStore.ascensionTime,
        lastStepTime: actionsStore.effectiveSnapshot.lastStepTime,
        isHumility: actionsStore.effectiveSnapshot.currentEgg === 'humility',
      },
      calculation: maxReturn > 0 ? {
        maxReturnTimestamp: maxReturn,
        maxReturnDate: new Date(maxReturn * 1000).toLocaleString(),
        startUnix,
        estimatedWaitTimeSeconds: waitSeconds,
        estimatedWaitTimeFormatted: `${Math.floor(waitSeconds / 3600)}h ${Math.floor((waitSeconds % 3600) / 60)}m ${Math.floor(waitSeconds % 60)}s`,
      } : null
    };
    console.log('Wait For Missions Debug Info:', missionsDebugInfo);

    loading.value = false;
  } catch (e) {
    loading.value = false;
    error.value = e instanceof Error ? e.message : 'Failed to load player data';
    console.error('Error fetching player data:', e);
  }
}
</script>
