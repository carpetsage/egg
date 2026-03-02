<template>
  <the-nav-bar active-entry-id="ascension-planner" />

  <div :class="['min-h-screen bg-gray-100 transition-all duration-300', isFooterCollapsed ? 'pb-8' : 'pb-24']">
    <div class="max-w-6xl mx-auto p-4">
      <h1 class="mx-4 mt-8 mb-2 text-center heading-xl text-gradient">
        {{ pageTitle }}
      </h1>
      <div
        v-if="initialStateStore.hasData && lastBackupFormatted"
        class="text-center text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-4 -mt-1"
      >
        Last synced: {{ lastBackupFormatted }}
      </div>

      <the-player-id-form :player-id="playerId" @submit="submitPlayerId" @input="onFormInput" />

      <!-- Ascension Action Buttons -->
      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">

        <!-- Start from Scratch -->
        <div class="section-premium p-5 flex flex-col items-center text-center group relative overflow-hidden">
          <div class="absolute -right-6 -top-6 w-20 h-20 bg-red-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div class="relative z-10 flex flex-col items-center gap-3 flex-1">
            <div class="p-2.5 bg-red-50 rounded-xl">
              <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-bold text-slate-800">Start from Scratch</div>
              <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1.5 leading-relaxed">
                Clear your entire plan, reset all settings, and begin with a clean slate
              </p>
            </div>
            <button
              class="btn-premium btn-primary px-5 py-2 mt-auto w-full"
              @click="startFromScratch"
            >
              Reset Everything
            </button>
          </div>
        </div>

        <!-- Import from Backup -->
        <div class="section-premium p-5 flex flex-col items-center text-center group relative overflow-hidden">
          <div class="absolute -right-6 -top-6 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div class="relative z-10 flex flex-col items-center gap-3 flex-1">
            <div class="p-2.5 bg-purple-50 rounded-xl">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-bold text-slate-800">Import from Backup</div>
              <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1.5 leading-relaxed">
                Load a previously exported plan file to restore your saved ascension
              </p>
            </div>
            <button
              class="btn-premium btn-primary px-5 py-2 mt-auto w-full"
              @click="triggerImport"
            >
              Import Plan
            </button>
          </div>
        </div>

        <!-- Plan Next Ascension -->
        <div class="section-premium p-5 flex flex-col items-center text-center group relative overflow-hidden border-brand-primary/30">
          <div class="absolute -right-6 -top-6 w-20 h-20 bg-brand-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div class="relative z-10 flex flex-col items-center gap-3 flex-1">
            <div class="p-2.5 bg-brand-primary/10 rounded-xl">
              <svg class="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-bold text-slate-800">Plan Next Ascension</div>
              <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1.5 leading-relaxed">
                Load your latest backup, include pending TE, reset the clock, and start planning fresh
              </p>
            </div>
            <button
              class="btn-premium btn-primary px-5 py-2 mt-auto w-full"
              :disabled="loading || !playerId"
              @click="planNextAscension"
            >
              Plan Next
            </button>
          </div>
        </div>

        <!-- Continue Current Ascension -->
        <div class="section-premium p-5 flex flex-col items-center text-center group relative overflow-hidden">
          <div class="absolute -right-6 -top-6 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div class="relative z-10 flex flex-col items-center gap-3 flex-1">
            <div class="p-2.5 bg-blue-50 rounded-xl">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-bold text-slate-800">Continue Current Ascension</div>
              <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1.5 leading-relaxed">
                Resume from your current in-game farm with all events applied
              </p>
            </div>
            <button
              class="btn-premium btn-primary px-5 py-2 mt-auto w-full"
              :disabled="loading || !playerId"
              @click="quickContinueAscension"
            >
              Continue
            </button>
          </div>
        </div>

      </div>

      <!-- Hidden file input for import -->
      <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleImport" />

      <!-- Active Event Slide Toggle (Earnings Boost) -->
      <div class="mt-4 flex flex-col items-center gap-2">
        <div
          class="w-full max-w-sm bg-gradient-to-r from-orange-50/80 via-white to-amber-50/80 rounded-2xl p-4 border border-orange-100/50 shadow-sm relative overflow-hidden flex items-center justify-between transition-all duration-300"
        >
          <div class="flex items-center gap-2 relative z-10">
            <div class="flex flex-col gap-0.5 text-left">
              <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></div>
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none"
                  >Monday 2x Earnings Event</span
                >
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

      <div v-if="loading" class="text-center py-4 text-gray-600">Loading player data...</div>

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
            <ActionHistory @show-details="showActionDetails" @undo="showUndoConfirmation" @clear-all="handleClearAll" />
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
import { useSalesStore } from '@/stores/sales';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { generateActionId } from '@/types';
import { computeDependencies } from '@/lib/actions/executor';
import { formatNumber } from '@/lib/format';
import { restoreFromSnapshot } from '@/lib/actions/snapshot';
import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import type { Action, VirtueEgg } from '@/types';
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
const commonResearchStore = useCommonResearchStore();
const habCapacityStore = useHabCapacityStore();
const shippingCapacityStore = useShippingCapacityStore();
const silosStore = useSilosStore();
const { prepareExecution, completeExecution } = useActionExecutor();

const isEarningsBoostActive = computed(() => actionsStore.effectiveSnapshot.earningsBoost.active);

const lastBackupFormatted = computed(() => {
  if (initialStateStore.lastBackupTime === 0) {
    return initialStateStore.hasData ? 'Imported Plan' : '';
  }
  const date = new Date(initialStateStore.lastBackupTime * 1000);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
});

const pageTitle = computed(() => {
  const name = initialStateStore.nickname;
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
  await actionsStore.recalculateAll();

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

const playerId = ref(new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || '');
const loading = ref(false);
const error = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

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
  await actionsStore.clearAll();

  // 2. Reset all definition stores to their default/clean states.
  // We do this AFTER clearAll because clearAll's simulation sync
  // would otherwise overwrite these stores with old snapshot data.
  initialStateStore.$reset();
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
}

/**
 * Import from Backup: Open a file picker to load a previously exported plan.
 */
function triggerImport() {
  fileInput.value?.click();
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = e => {
    try {
      const jsonString = e.target?.result as string;

      if (actionsStore.actionCount > 0) {
        if (!confirm('Importing a plan will overwrite your current actions. Continue?')) {
          input.value = '';
          return;
        }
      }

      actionsStore.importPlan(jsonString);
    } catch (err) {
      console.error(err);
      alert('Failed to import plan: Invalid file format.');
    } finally {
      input.value = '';
    }
  };

  reader.readAsText(file);
}

function onFormInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.id === 'playerId') {
    playerId.value = target.value.trim();
  }
}

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
    // console.log('Player data (backup):', backup);

    // Store the backup data in initial state
    let { initialShiftCount, initialTE, tankLevel, virtueFuelAmounts, eggsDelivered, teEarnedPerEgg } =
      initialStateStore.loadFromBackup(id, backup);

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
    await actionsStore.continueFromBackup(true);

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
    await submitPlayerId(playerId.value);

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

    loading.value = false;
  } catch (e) {
    loading.value = false;
    error.value = e instanceof Error ? e.message : 'Plan Next failed';
    console.error('Plan Next Ascension error:', e);
  }
}
</script>
