<template>
  <the-nav-bar active-entry-id="ascension-planner" />

  <div :class="['min-h-screen bg-gray-100 transition-all duration-300', isFooterCollapsed ? 'pb-8' : 'pb-24']">
    <div class="max-w-6xl mx-auto p-4">
      <h1 class="mx-4 mt-8 mb-2 text-center heading-xl text-gradient">
        {{ pageTitle }}
      </h1>

      <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

      <!-- Quick Continue Ascension Button -->
      <div class="mt-4 flex flex-col items-center gap-2">
        <button
          class="btn-premium btn-primary px-6 py-3 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
          @click="quickContinueAscension"
          :disabled="loading || !playerId"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <span class="font-bold">Quick Continue Ascension</span>
        </button>

        <p class="text-[10px] text-gray-500 uppercase font-black tracking-widest text-center max-w-md">
          Wipes current plan, fetches latest backup, and resumes from your current virtue farm state
        </p>

        <!-- Active Event Slide Toggle (Earnings Boost) -->
        <div class="w-full max-w-sm bg-gradient-to-r from-orange-50/80 via-white to-amber-50/80 rounded-2xl p-4 border border-orange-100/50 shadow-sm relative overflow-hidden flex items-center justify-between transition-all duration-300">
          <div class="flex items-center gap-2 relative z-10">
            <div class="flex flex-col gap-0.5 text-left">
              <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></div>
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Monday 2x Earnings Event</span>
              </div>
              <span class="text-[11px] font-black text-orange-600 uppercase tracking-tighter">
                {{ isEarningsBoostActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <button
            @click="handleToggleEarningsEvent"
            class="relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner"
            :class="isEarningsBoostActive ? 'bg-orange-500' : 'bg-slate-200'"
          >
            <span
              class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all duration-300 shadow-sm"
              :class="isEarningsBoostActive ? 'translate-x-[22px]' : 'translate-x-1'"
            />
          </button>
        </div>

      </div>

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

    <WarningDialog />

    <RecalculationOverlay />

    <PlanFinalSummary @show-details="showCurrentDetails" @update:collapsed="isFooterCollapsed = $event" />
    <FloatingStats @show-details="showCurrentDetails" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import TheNavBar from 'ui/components/NavBar.vue';
import { getSavedPlayerID, savePlayerID, requestFirstContact } from 'lib';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { useEventsStore } from '@/stores/events';
import ActionHistory from '@/components/ActionHistory.vue';
import AvailableActions from '@/components/AvailableActions.vue';
import ActionDetailsModal from '@/components/ActionDetailsModal.vue';
import UndoConfirmationDialog from '@/components/UndoConfirmationDialog.vue';
import PlanFinalSummary from '@/components/PlanFinalSummary.vue';
import ContinuityDialog from '@/components/ContinuityDialog.vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
import FloatingStats from '@/components/FloatingStats.vue';
import WarningDialog from '@/components/WarningDialog.vue';
import RecalculationOverlay from '@/components/RecalculationOverlay.vue';
import { useSalesStore } from '@/stores/sales';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { generateActionId } from '@/types';
import { computeDependencies } from '@/lib/actions/executor';
import { formatNumber } from '@/lib/format';
import { restoreFromSnapshot } from '@/lib/actions/snapshot';
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import type { Action } from '@/types';
import { VIRTUE_EGGS } from '@/types';
import { countTEThresholdsPassed } from '@/lib/truthEggs';

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
const eventsStore = useEventsStore();
const salesStore = useSalesStore();
const { prepareExecution, completeExecution } = useActionExecutor();

const isEarningsBoostActive = computed(() => actionsStore.effectiveSnapshot.earningsBoost.active);

const pageTitle = computed(() => {
  const name = initialStateStore.nickname;
  return name ? `Ascension Planner ${name}` : 'Ascension Planner';
});

watch(pageTitle, (newTitle) => {
  document.title = newTitle;
}, { immediate: true });

function handleToggleEarningsEvent() {
  const beforeSnapshot = prepareExecution();
  const currentlyActive = beforeSnapshot.earningsBoost.active;
  
  // Find the multiplier from the event store if turning ON
  let multiplier = 2;
  if (!currentlyActive) {
      const event = eventsStore.getActiveEvents(initialStateStore.isUltra).find(e => e.type === 'earnings-boost');
      if (event) multiplier = event.multiplier;
  } else {
      multiplier = 1;
  }

  const payload = {
    active: !currentlyActive,
    multiplier,
  };

  // Update store state
  salesStore.setEarningsBoost(payload.active, payload.multiplier);

  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'toggle_earnings_boost',
    payload,
    cost: 0,
    dependsOn: computeDependencies('toggle_earnings_boost', payload, actionsStore.actionsBeforeInsertion),
  }, beforeSnapshot);
}

onMounted(() => {
  eventsStore.fetchEvents();
});

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
    // Clear existing plan to ensure a fresh start with new player data
    await actionsStore.clearAll();

    const data = await requestFirstContact(id);
    const backup = data.backup!;
    console.log('Player data (backup):', backup);

    // Store the backup data in initial state
    let { initialShiftCount, initialTE, tankLevel, virtueFuelAmounts, eggsDelivered, teEarnedPerEgg } = initialStateStore.loadFromBackup(id, backup);

    // Calculate extra eggs since backup if on a virtue egg
    if (initialStateStore.currentFarmState && initialStateStore.lastBackupTime > 0) {
      const farm = initialStateStore.currentFarmState;
      const egg = VIRTUE_EGGS[farm.eggType - 50];
      const now = Date.now() / 1000;
      const elapsed = now - initialStateStore.lastBackupTime;

      if (elapsed > 0) {
        const context = getSimulationContext();
        const tempState = createBaseEngineState(null);
        tempState.currentEgg = egg;
        tempState.habIds = farm.habs;
        tempState.vehicles = farm.vehicles;
        tempState.researchLevels = farm.commonResearches;
        tempState.siloCount = farm.numSilos;
        tempState.population = farm.population;
        tempState.lastStepTime = farm.lastStepTime;

        const snapshot = computeSnapshot(tempState, context);
        const startPop = farm.population;
        const extraChickens = (snapshot.offlineIHR / 60) * elapsed;
        const endPop = Math.min(snapshot.habCapacity, startPop + extraChickens);
        
        // Update population
        farm.population = endPop;

        // Recompute snapshot at end population to get accurate end-of-period ELR
        tempState.population = endPop;
        const endSnapshot = computeSnapshot(tempState, context);
        
        // Average ELR for catch-up (accurate linear approximation)
        const avgELR = (snapshot.elr + endSnapshot.elr) / 2;
        const extraEggs = avgELR * elapsed;

        if (extraEggs > 0) {
          // 1. Update farm state
          farm.deliveredEggs += extraEggs;
          
          // 2. Update store's initial delivered eggs
          const newDelivered = (eggsDelivered[egg] || 0) + extraEggs;
          initialStateStore.setInitialEggsDelivered(egg, newDelivered);
          
          // 3. Update local eggsDelivered for later store initialization
          eggsDelivered[egg] = newDelivered;

          // 4. Recalculate pending TE for this egg
          const theoreticalTE = countTEThresholdsPassed(newDelivered);
          const earned = teEarnedPerEgg[egg];
          initialStateStore.setInitialTePending(egg, Math.max(0, theoreticalTE - earned));
        }
      }
    }

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

    loading.value = false;
  } catch (e) {
    loading.value = false;
    error.value = e instanceof Error ? e.message : 'Failed to load player data';
    console.error('Error fetching player data:', e);
  }
}

async function quickContinueAscension() {
  if (!playerId.value) return;
  
  error.value = '';
  loading.value = true;
  
  try {
    // 1. Wipe current plan
    await actionsStore.clearAll();
    
    // 2. Reset date/time/TZ to current
    virtueStore.resetToCurrentDateTime();
    
    // 3. Refresh backup (submitPlayerId)
    await submitPlayerId(playerId.value);
    
    // 4. Trigger continue from backup
    await actionsStore.continueFromBackup();
    
    loading.value = false;
  } catch (e) {
    loading.value = false;
    error.value = e instanceof Error ? e.message : 'Quick Continue failed';
    console.error('Quick Continue error:', e);
  }
}
</script>
