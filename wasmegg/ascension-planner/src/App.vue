<template>
  
  <the-nav-bar active-entry-id="ascension-planner" />

  <div :class="['min-h-screen bg-gray-100 transition-all duration-300', isFooterCollapsed ? 'pb-8' : 'pb-24']">
    <div class="max-w-6xl mx-auto p-4">
      <!-- Collapsible Header Region -->
      <div class="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-sm">
        <div
          class="grid transition-all duration-500 ease-in-out"
          :class="isHeaderCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'"
        >
          <div class="overflow-hidden">
            <h1 class="mx-4 mt-8 mb-2 text-center heading-xl text-gradient">
              {{ pageTitle }}
            </h1>
            <div
              v-if="initialStateStore.hasData && lastBackupFormatted"
              class="text-center text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-4 -mt-1"
            >
              Player Backup From: {{ lastBackupFormatted }}
            </div>

            <the-player-id-form :player-id="playerId" @submit="submitPlayerId" @input="onFormInput" />

            <!-- Plan Library Section -->
            <div v-if="playerId" class="max-w-6xl mx-auto mt-6">
              <PlanLibrary @plan-loaded="handlePlanLoaded" />
            </div>
          </div>
        </div>
      </div>

      <!-- Header Toggle Tab (PlanFinalSummary style) - normal flow, centered below card -->
      <div v-if="playerId" class="flex justify-center -mt-px mb-2">
        <button
          class="bg-white/95 backdrop-blur-xl border border-t-0 border-slate-100 px-4 py-1 rounded-b-lg shadow-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider h-7 cursor-pointer"
          @click="isHeaderCollapsed = !isHeaderCollapsed"
        >
          <svg
            class="w-3.5 h-3.5 transition-transform duration-300"
            :class="{ 'rotate-180': isHeaderCollapsed }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Migration Information Banner -->
    <div class="max-w-6xl mx-auto px-4 mb-6 mt-2">
      <div class="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
        <div class="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
        <div class="flex flex-col md:flex-row items-center gap-6 relative">
          <div class="bg-white/20 p-4 rounded-2xl backdrop-blur-md shadow-inner border border-white/20 flex-shrink-0">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div class="flex-1 text-center md:text-left">
            <h2 class="text-xl font-black uppercase tracking-tighter mb-1">Notice: Page no longer maintained</h2>
            <p class="text-indigo-100 text-sm md:text-base font-medium opacity-90 leading-relaxed">
              This standalone instance of the Ascension Planner is no longer maintained. We recommend that you
              <strong>export your plans or plan library</strong> and start using the version integrated into the main
              Wasmegg page at
              <a href="https://wasmegg-carpet.netlify.app/ascension-planner/" target="_blank" class="text-white underline underline-offset-4 decoration-indigo-400/50 hover:decoration-white transition-all font-bold whitespace-nowrap">wasmegg-carpet.netlify.app</a>.
            </p>
          </div>
          <a
            href="https://wasmegg-carpet.netlify.app/ascension-planner/"
            target="_blank"
            class="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:shadow-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex-shrink-0"
          >
            Go to Main Page
          </a>
        </div>
      </div>
    </div>

    <!-- Action Details Modal -->
    <ActionDetailsModal v-if="showDetailsModal" :action="detailsModalAction" @close="closeActionDetails" />

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

    <!-- Unsaved Changes Protection Dialog -->
    <ConfirmationDialog
      v-if="showUnsavedConfirm"
      title="Unsaved Changes"
      message="You have unsaved changes in your current plan. If you continue, these changes will be lost. Would you like to save before proceeding?"
      confirm-label="Continue Without Saving"
      variant="danger"
      @confirm="
        showUnsavedConfirm = false;
        pendingAction?.();
      "
      @cancel="
        showUnsavedConfirm = false;
        pendingAction = null;
      "
    />

    <!-- Plan Selection Dialog (for Reconcile) -->
    <PlanSelectionDialog
      v-if="showReconcileLibraryModal"
      @select="handleLibraryReconcile"
      @cancel="showReconcileLibraryModal = false"
    />

    <!-- Artifact Set Selection Dialog -->
    <div v-if="showArtifactSetConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-slate-100">
          <h3 class="text-lg font-bold text-slate-800">Current Artifact Set</h3>
          <p class="mt-2 text-sm text-slate-500">Which artifact set do you currently have equipped in game?</p>
        </div>
        <div class="px-6 py-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button class="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm" @click="handleArtifactSetSelection('elr')">
            ELR Set
          </button>
          <button class="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm" @click="handleArtifactSetSelection('earnings')">
            Earnings Set
          </button>
        </div>
      </div>
    </div>

    <!-- Continuity Check Dialog -->
    <ContinuityDialog />

    <WarningDialog />

    <RecalculationOverlay />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import TheNavBar from 'ui/components/NavBar.vue';
import { getSavedPlayerID, savePlayerID, requestFirstContact, iconURL } from 'lib';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { useEventsStore } from '@/stores/events';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useHabCapacityStore } from '@/stores/habCapacity';
import { useShippingCapacityStore } from '@/stores/shippingCapacity';
import { useSilosStore } from '@/stores/silos';
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
import PlanLibrary from '@/components/PlanLibrary.vue';
import PlanSelectionDialog from '@/components/PlanSelectionDialog.vue';
import { useSalesStore } from '@/stores/sales';
import { hashID, saveMetadata, loadMetadata } from '@/lib/storage/db';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { usePersistence } from '@/composables/usePersistence';
import { generateActionId } from '@/types';
import { computeDependencies } from '@/lib/actions/executor';
import { restoreFromSnapshot } from '@/lib/actions/snapshot';
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import type { Action, VirtueEgg } from '@/types';
import { VIRTUE_EGGS } from '@/types';
import { countTEThresholdsPassed } from '@/lib/truthEggs';

const playerId = ref(new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || '');
const loading = ref(false);
const error = ref('');

const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();
const fuelTankStore = useFuelTankStore();
const truthEggsStore = useTruthEggsStore();
const eventsStore = useEventsStore();
const salesStore = useSalesStore();
const commonResearchStore = useCommonResearchStore();
const habCapacityStore = useHabCapacityStore();
const shippingCapacityStore = useShippingCapacityStore();
const silosStore = useSilosStore();
const { prepareExecution, completeExecution } = useActionExecutor();
const { partitionHash, saveActiveDraft, initPersistence, broadcastPresence } = usePersistence();

const isEarningsBoostActive = computed(() => actionsStore.effectiveSnapshot.earningsBoost.active);

const lastBackupFormatted = computed(() => {

  const approxTime = initialStateStore.rawBackup?.approxTime;
  if (approxTime == null) return 'Unknown';
  const date = new Date(approxTime * 1000);
  
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
});

const pageTitle = computed(() => {
  const name = initialStateStore.rawBackup?.userName;
  return name ? `Ascension Planner ${name}` : 'Ascension Planner';
});

watch(
  pageTitle,
  newTitle => {
    document.title = newTitle;
  },
  { immediate: true }
);

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

  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'toggle_earnings_boost',
      payload,
      cost: 0,
      dependsOn: computeDependencies(
        'toggle_earnings_boost',
        payload,
        actionsStore.actionsBeforeInsertion,
        actionsStore.initialSnapshot.researchLevels
      ),
    },
    beforeSnapshot
  );
}

onMounted(async () => {
  eventsStore.fetchEvents();

  if (playerId.value) {
    await initPersistence(playerId.value);

    try {
      const pHash = await hashID(playerId.value);
      const savedBackup = await loadMetadata(pHash, 'rawBackup');
      if (savedBackup) {
        initialStateStore.rawBackup = savedBackup;
      }
    } catch (e) {
      console.error('Failed to load raw backup from DB', e);
    }
  }

  if (!actionsStore._initialSnapshot) {
    await actionsStore.recalculateAll();
  }

  // Fresh start: if only start_ascension exists and no farm state is loaded, add initial Wait for Full Habs
  const startAction = actionsStore.getStartAction();
  if (
    actionsStore.actions.length === 1 &&
    startAction &&
    !startAction.payload.initialFarmState &&
    !startAction.payload.isQuickContinue
  ) {
    actionsStore.pushWaitForFullHabsAction();
  }
});

// Auto-save logic
let saveTimeout: ReturnType<typeof setTimeout>;
actionsStore.$subscribe(() => {
  if (!playerId.value) return;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveActiveDraft();
  }, 1000);
});

// Re-init persistence when player ID changes
watch(playerId, async newId => {
  if (newId) {
    await initPersistence(newId);
  }
});

// Section expansion state
const expandedSections = ref({
  actionHistory: true,
  availableActions: true,
});

const isHeaderCollapsed = ref(false);

function handlePlanLoaded() {
  isHeaderCollapsed.value = true;
  scrollToTop();
}

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

const showReconcileLibraryModal = ref(false);
const showUnsavedConfirm = ref(false);
const showArtifactSetConfirm = ref(false);
const pendingAction = ref<(() => void) | null>(null);

/**
 * Confirm unsaved changes before potentially destructive actions.
 */
function confirmUnsavedChanges(action: () => void) {
  if (actionsStore.isDirty) {
    pendingAction.value = action;
    showUnsavedConfirm.value = true;
  } else {
    action();
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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

  actionsStore.executeUndo(undoAction.value.id, mode, snapshot => {
    // Restore stores to the snapshot of the last remaining action
    restoreFromSnapshot(snapshot);
  });

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
  actionsStore.clearAll();
  showClearAllConfirmation.value = false;
}

/**
 * Start from Scratch: Full reset.
 * Wipes the action history, clears player data from stores,
 * and resets initial state to defaults — equivalent to a hard refresh.
 */
async function startFromScratch() {
  error.value = '';

  // 1. Wipe action history first to stop any ongoing simulations
  // and clear the start action's carry-over state.
  const startAction = actionsStore.getStartAction();
  if (startAction) {
    startAction.payload.initialFarmState = undefined;
    startAction.payload.isQuickContinue = false;
    startAction.payload.initialEgg = 'curiosity';
  }
  actionsStore.isReconciling = false;
  actionsStore.showIncompleteOnly = false;
  await actionsStore.clearAll();

  // 2. Reset all definition stores to their default/clean states.
  // We do this AFTER clearAll because clearAll's simulation sync
  // would otherwise overwrite these stores with old snapshot data.
  const cachedBackup = initialStateStore.rawBackup;
  const cachedPlayerId = initialStateStore.playerId;
  initialStateStore.$reset();
  if (cachedPlayerId && cachedBackup) {
    initialStateStore.loadFromBackup(cachedPlayerId, cachedBackup, 'scratch');
  }
  virtueStore.$reset();
  fuelTankStore.$reset();
  truthEggsStore.$reset();
  commonResearchStore.$reset();
  habCapacityStore.$reset();
  shippingCapacityStore.$reset();
  silosStore.$reset();

  // 3. Recompute and set a clean initial snapshot from the reset stores.
  const context = getSimulationContext();
  const baseState = createBaseEngineState(null);
  const initialSnapshot = computeSnapshot(baseState, context);
  await actionsStore.setInitialSnapshot(initialSnapshot);
  isHeaderCollapsed.value = true;
}

/**
 * Reconcile Plan: Fetch latest backup AND load a plan from library.
 */
function triggerReconcile() {
  actionsStore.showIncompleteOnly = true;
  showReconcileLibraryModal.value = true;
}

async function handleLibraryReconcile(plan: import('@/lib/storage/db').PlanData) {
  showReconcileLibraryModal.value = false;
  loading.value = true;
  error.value = '';

  try {
    // 1. Fetch latest backup
    await submitPlayerId(playerId.value, 'reconcile');

    // Capture the live state for reconciliation before the plan import overwrites initialStateStore
    if (initialStateStore.currentFarmState) {
      actionsStore.reconcileFarmState = JSON.parse(JSON.stringify(initialStateStore.currentFarmState));
    } else {
      actionsStore.reconcileFarmState = null;
    }
    actionsStore.reconcileEggsDelivered = JSON.parse(JSON.stringify(initialStateStore.initialEggsDelivered));
    actionsStore.reconcileTeEarned = JSON.parse(JSON.stringify(initialStateStore.initialTeEarned));

    // 2. Set reconciliation mode and load the plan
    actionsStore.isReconciling = true;
    broadcastPresence(plan.id); // Immediate heartbeat to block other tabs
    await actionsStore.loadPlanFromLibrary(plan);
    isHeaderCollapsed.value = true;
  } catch (err) {
    console.error(err);
    alert('Failed to reconcile plan.');
  } finally {
    loading.value = false;
  }
}

function onFormInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target?.id === 'playerId') {
    playerId.value = target.value.trim();
  }
  error.value = '';
}

async function submitPlayerId(id: string, mode: 'scratch' | 'plan_next' | 'continue_earnings' | 'continue_elr' | 'reconcile' | 'default' = 'default') {
  playerId.value = id;
  savePlayerID(id);
  error.value = '';
  loading.value = true;

  try {
    // Clear existing plan to ensure a fresh start with new player data
    // We skip recalculate because setInitialSnapshot will trigger it at the end of this function.
    await actionsStore.clearAll(undefined, true);

    const data = await requestFirstContact(id);
    const backup = data.backup!;

    try {
      const pHash = await hashID(id);
      await saveMetadata(pHash, 'rawBackup', backup);
    } catch (dbErr) {
      console.error('Failed to save raw backup to DB', dbErr);
    }

    // Store the backup data in initial state
    const { initialShiftCount, initialTE, tankLevel, virtueFuelAmounts, eggsDelivered, teEarnedPerEgg } =
      initialStateStore.loadFromBackup(id, backup, mode);

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
      fuelTankStore.setFuelAmount(egg as VirtueEgg, amount);
    }

    // Initialize truth eggs store with player's TE data
    for (const [egg, amount] of Object.entries(eggsDelivered)) {
      truthEggsStore.setEggsDelivered(egg as VirtueEgg, amount);
    }
    for (const [egg, count] of Object.entries(teEarnedPerEgg)) {
      truthEggsStore.setTEEarned(egg as VirtueEgg, count);
    }

    // Create the start_ascension action with initial snapshot
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

function triggerQuickContinue() {
  showArtifactSetConfirm.value = true;
}

function handleArtifactSetSelection(selection: 'earnings' | 'elr') {
  showArtifactSetConfirm.value = false;
  quickContinueAscension(selection);
}

async function quickContinueAscension(selection: 'earnings' | 'elr') {
  if (!playerId.value) return;

  error.value = '';
  loading.value = true;

  try {
    // 1. Reset date/time/TZ to current
    virtueStore.resetToCurrentDateTime();

    // 3. Refresh backup (submitPlayerId)
    await submitPlayerId(playerId.value, selection === 'earnings' ? 'continue_earnings' : 'continue_elr');

    // 4. Trigger continue from backup
    actionsStore.isReconciling = false;
    await actionsStore.continueFromBackup(true);

    isHeaderCollapsed.value = true;
    loading.value = false;
  } catch (e) {
    loading.value = false;
    error.value = e instanceof Error ? e.message : 'Quick Continue failed';
    console.error('Quick Continue error:', e);
  }
}

/**
 * Plan Next Ascension:
 * 1. Load latest player data (reuses submitPlayerId)
 * 2. Include pending TE
 * 3. Reset ascension date/time/timezone to current values
 * 4. Clear action history (wipe old plan)
 */
async function planNextAscension() {
  if (!playerId.value) return;

  error.value = '';
  loading.value = true;

  try {
    // 1. Wipe current plan
    await actionsStore.clearAll();

    // 2. Load latest backup
    await submitPlayerId(playerId.value, 'plan_next');

    // 3. Include pending TE
    for (const egg of Object.keys(initialStateStore.initialTePending) as VirtueEgg[]) {
      const pending = initialStateStore.initialTePending[egg];
      if (pending > 0) {
        const currentEarned = initialStateStore.initialTeEarned[egg];
        const newTotal = Math.min(98, currentEarned + pending);
        truthEggsStore.setTEEarned(egg, newTotal);
        initialStateStore.setInitialTePending(egg, 0);
      }
    }
    // Sync back
    for (const egg of Object.keys(initialStateStore.initialTeEarned) as VirtueEgg[]) {
      initialStateStore.setInitialEggsDelivered(egg, truthEggsStore.eggsDelivered[egg]);
      initialStateStore.setInitialTeEarned(egg, truthEggsStore.teEarned[egg]);
    }
    virtueStore.setTE(truthEggsStore.totalTE);
    virtueStore.setInitialTE(truthEggsStore.totalTE);

    // 4. Reset ascension date/time/timezone to current
    virtueStore.resetToCurrentDateTime();

    // 5. Clear any farm state from a previous Continue so the start action is clean
    const startAction = actionsStore.getStartAction();
    if (startAction) {
      startAction.payload.initialFarmState = undefined;
      startAction.payload.isQuickContinue = false;
    }

    // 6. Reset purchase state to defaults (fresh ascension)
    commonResearchStore.$reset();
    habCapacityStore.$reset();
    shippingCapacityStore.$reset();
    silosStore.$reset();

    // 7. Set starting egg to Curiosity
    virtueStore.setCurrentEgg('curiosity');
    actionsStore.setInitialEgg('curiosity');

    // 8. Recalculate initial snapshot with updated TE
    const context = getSimulationContext();
    const baseState = createBaseEngineState(null);
    const initialSnapshot = computeSnapshot(baseState, context);
    await actionsStore.setInitialSnapshot(initialSnapshot);

    isHeaderCollapsed.value = true;
    loading.value = false;
  } catch (e) {
    loading.value = false;
    error.value = e instanceof Error ? e.message : 'Plan Next failed';
    console.error('Plan Next Ascension error:', e);
  }
}

async function saveCurrentPlan() {
  if (!partitionHash.value) return;

  if (actionsStore.activePlanId) {
    const { safeImport } = await import('@/lib/import');
    const plans = await (await safeImport(() => import('@/lib/storage/db'))).loadLibraryPlans(partitionHash.value!);
    const current = plans.find(p => p.id === actionsStore.activePlanId);
    if (current) {
      await actionsStore.savePlan(current.name, partitionHash.value);
      return;
    }
  }

  // Prompt for name if no active plan
  const name = prompt('Enter a name for this plan:');
  if (name) {
    await actionsStore.savePlan(name, partitionHash.value);
  }
}

async function savePlanAs() {
  if (!partitionHash.value) return;
  const name = prompt('Enter a new name for this plan:');
  if (name) {
    // Reset ID to trigger a new save
    const tempId = actionsStore.activePlanId;
    actionsStore.activePlanId = null;
    try {
      await actionsStore.savePlan(name, partitionHash.value);
    } catch (err) {
      actionsStore.activePlanId = tempId;
      alert('Save failed: ' + err);
    }
  }
}

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
</script>

<style scoped>
.heading-xl {
  @apply text-3xl md:text-4xl font-black uppercase tracking-tighter;
}
.text-gradient {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.section-premium {
  @apply bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500;
}
.btn-premium {
  @apply rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 flex items-center justify-center gap-2;
}
.btn-primary {
  @apply bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95;
}
.btn-ghost {
  @apply bg-transparent hover:bg-slate-50 border border-slate-100;
}
</style>
