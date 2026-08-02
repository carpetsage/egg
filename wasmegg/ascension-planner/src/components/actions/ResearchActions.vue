<template>
  <div class="space-y-4">
    <ResearchSaleToggle :is-active="isResearchSaleActive" @toggle="handleToggleSale" />

    <SmartBuy
      v-model:always-on="smartBuyState.alwaysOn"
      @buy="handleSmartBuy"
      @update="state => (smartBuyState = state)"
    />

    <ResearchViewSelector v-model="currentView" :views="VIEWS" />

    <p class="text-sm text-gray-500 mb-4 px-1">
      {{ viewDescription }}
    </p>

    <div v-if="currentView === 'roi'" class="px-1 mb-2 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">Delivery Impact Only</span>
        <button
          class="relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner"
          :class="deliveryImpactOnly ? 'bg-indigo-500' : 'bg-slate-200'"
          @click="deliveryImpactOnly = !deliveryImpactOnly"
        >
          <span
            class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all duration-300 shadow-sm"
            :class="deliveryImpactOnly ? 'translate-x-[22px]' : 'translate-x-1'"
          />
        </button>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">Achieve ROI</span>
        <div class="flex items-center gap-1.5">
          <div class="flex gap-0.5 p-0.5 bg-gray-100 rounded-md shadow-inner">
            <button
              class="px-2 py-0.5 text-[10px] font-medium rounded transition-all whitespace-nowrap"
              :class="
                roiMode === 'immediate'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              "
              @click="roiMode = 'immediate'"
            >
              Immediate Impact
            </button>
            <button
              class="px-2 py-0.5 text-[10px] font-medium rounded transition-all whitespace-nowrap"
              :class="
                roiMode === 'maxed_vehicles'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              "
              @click="roiMode = 'maxed_vehicles'"
            >
              Max Vehicles
            </button>
          </div>
          <span
            v-tippy="
              'Max Vehicles mode calculates Achieve ROI as if you had gone to Kindness and bought all available vehicles and hyperloop cars — after buying the research in question.'
            "
            class="w-4 h-4 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-[9px] cursor-help hover:bg-gray-200 transition-colors leading-none shrink-0"
            >?</span
          >
        </div>
      </div>

      <button
        v-tippy="
          'Buys the top-ranked research over and over, recalculating after each purchase, and stops right before one that won\'t earn back 70% of its cost before the next sale. Automatically turns the research sale and 2x earnings boost on/off in your action history to match when each purchase actually happens — look for the Sale/2x badges on each item.'
        "
        class="btn-premium btn-primary w-full mt-6 py-4 flex items-center justify-center gap-2 group disabled:opacity-20 shadow-lg shadow-slate-900/10"
        :disabled="!canBuyUntilSaleWarning"
        @click="handleBuyUntilSaleWarning"
      >
        <img
          :src="iconURL('egginc-extras/icon_research_sale.png', 64)"
          class="w-5 h-5 object-contain group-hover:scale-110 transition-transform"
          alt="Research Sale"
        />
        <span>Buy Until Sale Warning</span>
      </button>

      <button
        v-tippy="
          'Buys the top-ranked research over and over, recalculating after each purchase, and stops right before one that won\'t earn back 100% of its cost before the next sale starts — a stricter bar than Buy Until Sale Warning\'s 70%. Automatically turns the research sale and 2x earnings boost on/off in your action history to match when each purchase actually happens.'
        "
        class="btn-premium btn-primary w-full py-4 flex items-center justify-center gap-2 group disabled:opacity-20 shadow-lg shadow-slate-900/10"
        :disabled="!canBuyUntilROIDeadline"
        @click="handleBuyUntilROIDeadline"
      >
        <img
          :src="iconURL('egginc-extras/icon_research_sale.png', 64)"
          class="w-5 h-5 object-contain group-hover:scale-110 transition-transform"
          alt="Research Sale"
        />
        <span>Buy Until ROI Deadline</span>
      </button>
    </div>

    <ElrViewControls
      v-if="currentView === 'elr'"
      :view-mode="elrViewMode"
      :sort-mode="elrSortMode"
      :roi-display-mode="elrRoiDisplayMode"
      @update:view-mode="elrViewMode = $event"
      @update:sort-mode="elrSortMode = $event"
      @update:roi-display-mode="elrRoiDisplayMode = $event"
    />

    <button
      v-if="currentView === 'elr'"
      v-tippy="
        'Buys the top-ranked research over and over, recalculating after each purchase, and stops right before one that wouldn\'t finish before the research sale ends. Only available while the research sale is active. Automatically turns the sale and 2x earnings boost on/off in your action history to match when each purchase actually happens.'
      "
      class="btn-premium btn-primary w-full py-4 flex items-center justify-center gap-2 group disabled:opacity-20 shadow-lg shadow-slate-900/10"
      :disabled="!canBuyUntilSaleDeadline"
      @click="handleBuyUntilSaleDeadline"
    >
      <img
        :src="iconURL('egginc-extras/icon_research_sale.png', 64)"
        class="w-5 h-5 object-contain group-hover:scale-110 transition-transform"
        alt="Research Sale"
      />
      <span>Buy Until Sale Ends</span>
    </button>

    <MilestoneTargetPicker
      v-if="currentView === 'milestones'"
      v-model="milestoneTarget"
      :next-locked-tier="milestoneNextLockedTier"
      :research-options="milestoneResearchOptions"
    />

    <!-- Milestone Summary -->
    <div
      v-if="currentView === 'milestones' && milestoneSummary"
      class="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
    >
      <template v-if="milestoneSummary.truncated">
        <p v-if="milestoneSummary.partialPurchaseCount > 0" class="text-xs text-gray-500 text-center italic">
          This milestone takes at least {{ milestoneSummary.partialPurchaseCount }}
          {{ milestoneSummary.partialPurchaseCount === 1 ? 'purchase' : 'purchases' }} (at least
          {{ formatDuration(milestoneSummary.partialSeconds) }}) — too many to fully calculate right now.
        </p>
        <p v-else class="text-xs text-gray-500 text-center italic">
          Unable to find a path to this milestone from the current state.
        </p>
      </template>
      <template v-else>
        <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-center">
          <div class="flex flex-col">
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
              >Without This Research</span
            >
            <span
              v-tippy="'Time to reach this milestone buying cheapest-first, with no ROI prioritization.'"
              class="text-sm font-mono font-bold text-gray-900 leading-none py-1"
            >
              {{ formatDuration(milestoneSummary.baselineSeconds) }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
              >With This Research</span
            >
            <span
              v-tippy="'Time to reach this milestone by always buying whatever currently pays for itself fastest.'"
              class="text-sm font-mono font-bold text-gray-900 leading-none py-1"
            >
              {{ formatDuration(milestoneSummary.optimizedSeconds) }}
            </span>
          </div>
          <div class="flex flex-col border-l border-gray-200 pl-6">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1"
              >Time Saved</span
            >
            <span class="text-sm font-mono font-bold text-emerald-600 leading-none py-1">
              {{ formatDuration(Math.max(0, milestoneSummary.timeSavedSeconds)) }}
            </span>
          </div>
          <div class="flex flex-col border-l border-gray-200 pl-6">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1"
              >Researches Bought</span
            >
            <span class="text-sm font-mono font-bold text-gray-900 leading-none py-1">
              {{ milestoneSummary.purchaseCount }}
            </span>
          </div>
        </div>
        <p class="mt-2 text-[10px] text-gray-400 text-center">Finishes {{ milestoneSummary.finishAbsoluteTime }}</p>
      </template>
    </div>

    <!-- Buy Entire Chain -->
    <button
      v-if="currentView === 'milestones' && sortedResearches.length > 0"
      v-tippy="
        'Buys every purchase in this chain, in order. Automatically turns the research sale and 2x earnings boost on/off in your action history to match when each purchase actually happens — look for the Sale/2x badges on each item above.'
      "
      class="btn-premium btn-primary w-full mt-2"
      @click="handleBuyMilestoneChain"
    >
      Buy Entire Chain
      <span class="ml-1 text-[10px] opacity-70 font-mono lowercase tracking-normal">
        ({{ sortedResearches.length }} {{ sortedResearches.length === 1 ? 'purchase' : 'purchases' }})
      </span>
    </button>

    <!-- Event Crossing Details Toggle -->
    <div
      v-if="currentView === 'milestones' && sortedResearches.length > 0"
      class="flex items-center justify-between mt-2 px-1"
    >
      <span class="text-xs text-gray-500">See details of sale and earnings events</span>
      <button
        class="relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner"
        :class="showEventCrossingDetails ? 'bg-indigo-500' : 'bg-slate-200'"
        @click="showEventCrossingDetails = !showEventCrossingDetails"
      >
        <span
          class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all duration-300 shadow-sm"
          :class="showEventCrossingDetails ? 'translate-x-[22px]' : 'translate-x-1'"
        />
      </button>
    </div>

    <!-- Realistic Mode Summary -->
    <div
      v-if="currentView === 'elr' && elrViewMode === 'realistic' && realisticSummary"
      class="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
    >
      <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-center">
        <div class="flex flex-col">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Lay Rate</span>
          <span
            v-tippy="'Optimal artifacts applied, max population assumed'"
            class="text-sm font-mono font-bold text-gray-900 leading-none py-1"
          >
            {{ formatNumber(realisticSummary.layRate) }}/hr
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
            >Shipping Cap</span
          >
          <span
            v-tippy="'Optimal artifacts applied, max vehicles assumed'"
            class="text-sm font-mono font-bold text-gray-900 leading-none py-1"
          >
            {{ formatNumber(realisticSummary.shippingRate) }}/hr
          </span>
        </div>
        <div class="flex flex-col border-l border-gray-200 pl-6">
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1"
            >Delivery Rate</span
          >
          <span
            v-tippy="'The lower of the two rates'"
            class="text-sm font-mono font-bold text-gray-900 leading-none py-1"
          >
            {{ formatNumber(realisticSummary.elr) }}/hr
          </span>
        </div>
      </div>
      <p class="mt-2 text-[10px] text-gray-400 text-center italic leading-tight px-2">
        Note: These stats reflect performance after maxing habs, vehicles, and equipping optimal stone layout.
      </p>
    </div>

    <!-- Game View (Grouped by Tier) -->
    <ResearchGameView
      v-if="currentView === 'game'"
      :tiers="tiers"
      :research-by-tier="researchByTier"
      :tier-summaries="tierSummaries"
      :view-times="gameViewTimes"
      :levels="commonResearchStore.researchLevels"
      :get-research-price="getNextLevelPrice"
      :get-research-time-to-buy="getTimeToBuy"
      :get-research-time-to-buy-seconds="getTimeToBuySeconds"
      :is-research-sale-active="isResearchSaleActive"
      :research-sale-deadline="researchSaleDeadline"
      @buy="handleBuyResearch"
      @max="handleMaxResearch"
      @max-tier="handleMaxTier"
    />

    <!-- Flat/Sorted Views -->
    <ResearchFlatView
      v-else
      :sorted-researches="sortedResearches"
      :view="currentView"
      :thresholds="TIER_THRESHOLDS"
      :milestone-target-selected="!!milestoneTarget"
      :milestone-already-reached="milestoneAlreadyReached"
      :show-event-crossing-details="showEventCrossingDetails"
      :get-research-time-to-buy="getTimeToBuy"
      :get-research-time-to-buy-seconds="getTimeToBuySeconds"
      :roi-display-mode="elrRoiDisplayMode"
      @buy="handleBuyResearch"
      @max="handleMaxResearch"
      @buy-to-here="handleBuyToHere"
      @refresh-backup="$emit('refresh-backup')"
    />

    <EventExpiryDialog
      v-if="showExpiryDialog"
      :event-name="expiryData.eventName"
      :end-time="expiryData.endTime"
      :completion-time="expiryData.completionTime"
      @cancel="handleExpiryCancel"
      @deactivate-and-cancel="handleExpiryDeactivateAndCancel"
      @deactivate-and-continue="handleExpiryDeactivateAndContinue"
    />

    <LoadingOverlay :show="isComputingMilestoneChain" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { iconURL } from 'lib';
import { getDiscountedVirtuePrice, getResearchById, type CommonResearch } from '@/calculations/commonResearch';
import { formatDuration, formatNumber } from '@/lib/format';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useActionsStore } from '@/stores/actions';
import { useSalesStore } from '@/stores/sales';
import { useVirtueStore } from '@/stores/virtue';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import { useResearchViews, VIEWS } from '@/composables/useResearchViews';
import { getTimeToSave, boostTransitionsFrom } from '@/engine/apply';
import { findSmartBuyCandidate } from '@/calculations/smartBuyCandidate';
import { buyWhilePassingCheck } from '@/calculations/researchRanking';
import { meetsROIByDeadline, getSaleAwareTimeToSave, findEventCrossings } from '@/calculations/researchROI';

// Sub-components
import ResearchSaleToggle from './ResearchSaleToggle.vue';
import SmartBuy from './SmartBuy.vue';
import ResearchViewSelector from './ResearchViewSelector.vue';
import ResearchGameView from './ResearchGameView.vue';
import ResearchFlatView from './ResearchFlatView.vue';
import ElrViewControls from './ElrViewControls.vue';
import MilestoneTargetPicker from './MilestoneTargetPicker.vue';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import EventExpiryDialog from '../EventExpiryDialog.vue';
import { useEventExpiry } from '@/composables/useEventExpiry';

const commonResearchStore = useCommonResearchStore();
const actionsStore = useActionsStore();
const salesStore = useSalesStore();
const virtueStore = useVirtueStore();
const { prepareExecution, completeExecution, batch } = useActionExecutor();
const {
  showExpiryDialog,
  expiryData,
  withExpiryCheck,
  cancel: handleExpiryCancel,
  deactivateAndCancel: handleExpiryDeactivateAndCancel,
  deactivateAndContinue: handleExpiryDeactivateAndContinue,
} = useEventExpiry();

const smartBuyState = ref({ threshold: 0, alwaysOn: false });
let isSmartBuying = false;
const showEventCrossingDetails = ref(false);

const {
  currentView,
  elrViewMode,
  elrSortMode,
  elrRoiDisplayMode,
  deliveryImpactOnly,
  roiMode,
  milestoneTarget,
  milestoneNextLockedTier,
  milestoneResearchOptions,
  milestoneSummary,
  milestoneAlreadyReached,
  isComputingMilestoneChain,
  viewDescription,
  costModifiers,
  isResearchSaleActive,
  tiers,
  researchByTier,
  tierSummaries,
  gameViewTimes,
  sortedResearches,
  realisticSummary,
  researchSaleDeadline,
  nextSaleStart,
  TIER_THRESHOLDS,
} = useResearchViews();

function getNextLevelPrice(research: CommonResearch): number {
  const currentLevel = commonResearchStore.researchLevels[research.id] || 0;
  if (currentLevel >= research.levels) return 0;
  return getDiscountedVirtuePrice(research, currentLevel, costModifiers.value, isResearchSaleActive.value);
}

function getTimeToBuy(research: CommonResearch): string {
  const price = getNextLevelPrice(research);
  const seconds = getTimeToSave(price, actionsStore.effectiveSnapshot);
  if (seconds <= 0) return '0s';
  if (seconds === Infinity) return '∞';
  return formatDuration(seconds);
}

function getTimeToBuySeconds(research: CommonResearch): number {
  const price = getNextLevelPrice(research);
  return getTimeToSave(price, actionsStore.effectiveSnapshot);
}

// Some sortedResearches branches (e.g. ROI view) don't populate buyToHereSeconds,
// since it's simulated step-by-step and only meaningful for a defined "chain" (cheapest/milestones).
function getSimulatedBuyToHereSeconds(item: unknown): number | undefined {
  const seconds = (item as { buyToHereSeconds?: unknown }).buyToHereSeconds;
  return typeof seconds === 'number' ? seconds : undefined;
}

// Only the ROI view branch populates showSaleWarning; other branches' item shapes don't have it.
function getSimulatedShowSaleWarning(item: unknown): boolean {
  return (item as { showSaleWarning?: unknown }).showSaleWarning === true;
}

/**
 * Buy a single level of research and create the action.
 * Returns true if successful, false if already maxed.
 */
function buyOneLevel(research: CommonResearch): boolean {
  const currentLevel = commonResearchStore.researchLevels[research.id] || 0;
  if (currentLevel >= research.levels) return false;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  // Calculate cost based on current state (after restore if editing)
  const effectiveLevel = beforeSnapshot.researchLevels[research.id] || 0;
  const isSaleActive = beforeSnapshot.activeSales.research;
  const cost = getDiscountedVirtuePrice(research, effectiveLevel, costModifiers.value, isSaleActive);

  // Build payload
  const payload = {
    researchId: research.id,
    fromLevel: effectiveLevel,
    toLevel: effectiveLevel + 1,
  };

  // Compute dependencies (level N depends on the action that bought level N-1)
  const dependencies = computeDependencies(
    'buy_research',
    payload,
    actionsStore.actionsBeforeInsertion,
    actionsStore.initialSnapshot.researchLevels
  );

  // Apply to store
  commonResearchStore.setResearchLevel(research.id, effectiveLevel + 1);

  // Complete execution (computes snapshot, inserts/pushes action, replays if needed)
  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'buy_research',
      payload,
      cost,
      dependsOn: dependencies,
    },
    beforeSnapshot
  );

  // Trigger automated sweep if Always On is enabled
  if (!isSmartBuying && smartBuyState.value.alwaysOn) {
    handleSmartBuy(smartBuyState.value.threshold);
  }

  return true;
}

/**
 * Absolute Unix timestamp (seconds) that `lastStepTime` (a snapshot's plan-relative clock reading)
 * corresponds to — same formula `WaitForEventActions.vue`/`useResearchViews.ts` use everywhere else.
 */
function absoluteSimTimeAt(lastStepTime: number): number {
  const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
  return baseTimestamp + (lastStepTime - actionsStore.planStartOffset);
}

/** Inserts a wait action of the given type/duration, returning its id (or undefined if seconds <= 0). */
function insertWait(
  type: 'wait_for_research_sale' | 'wait_for_earnings_boost' | 'wait_for_time',
  seconds: number,
  beforeSnapshot: ReturnType<typeof prepareExecution>
): string | undefined {
  if (seconds <= 0) return undefined;
  const id = generateActionId();
  const payload = { totalTimeSeconds: seconds };
  completeExecution(
    {
      id,
      timestamp: Date.now(),
      type,
      payload,
      cost: 0,
      dependsOn: computeDependencies(
        type,
        payload,
        actionsStore.actionsBeforeInsertion,
        actionsStore.initialSnapshot.researchLevels
      ),
    },
    beforeSnapshot
  );
  return id;
}

function insertToggleSale(
  active: boolean,
  waitId: string | undefined,
  beforeSnapshot: ReturnType<typeof prepareExecution>
) {
  const payload = { saleType: 'research' as const, active, multiplier: 0.3 };
  salesStore.setSaleActive('research', active);
  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'toggle_sale',
      payload,
      cost: 0,
      dependsOn: [
        ...computeDependencies(
          'toggle_sale',
          payload,
          actionsStore.actionsBeforeInsertion,
          actionsStore.initialSnapshot.researchLevels
        ),
        ...(waitId ? [waitId] : []),
      ],
    },
    beforeSnapshot
  );
}

function insertToggleEarningsBoost(
  active: boolean,
  waitId: string | undefined,
  beforeSnapshot: ReturnType<typeof prepareExecution>
) {
  const payload = { active, multiplier: active ? 2 : 1 };
  salesStore.setEarningsBoost(active, payload.multiplier);
  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'toggle_earnings_boost',
      payload,
      cost: 0,
      dependsOn: [
        ...computeDependencies(
          'toggle_earnings_boost',
          payload,
          actionsStore.actionsBeforeInsertion,
          actionsStore.initialSnapshot.researchLevels
        ),
        ...(waitId ? [waitId] : []),
      ],
    },
    beforeSnapshot
  );
}

/**
 * Before buying `item.research`, bring `activeSales.research`/`earningsBoost.active` in line with
 * whether THIS SPECIFIC purchase — computed fresh from the live/current state — actually resolves
 * during each event or not. Deliberately does NOT trust a plan's precomputed `duringSale`/
 * `duringEarningsBoost` (as an earlier version of this function did): those are snapshotted at
 * planning time, and can drift from what's actually true by the time execution reaches this item
 * (e.g. because an earlier item in the same batch banked more, or less, than the plan assumed —
 * `syncEventStateForItem` itself, by inserting real actions, is one such source of drift). Recomputing
 * live here makes the sync self-correcting regardless of that drift's size or source, instead of
 * blindly forcing a wait for an event boundary the live state may already be past or short of.
 *
 * `getSaleAwareTimeToSave` already reports, for the *live* state, whether the optimal purchase
 * resolves during a sale or not (`purchase.duringSale`) — comparing that against the live
 * `activeSales.research` flag tells us whether a sale boundary is actually being crossed. Earnings
 * boost has no analogous helper (the boost affects rate, not price), so the same idea is computed
 * directly: `liveWait` (via the same boundary-aware `getTimeToSave`/`boostTransitionsFrom` used
 * everywhere else) is the true total wait either way a boundary is or isn't crossed; comparing it
 * against the distance to the boost's next flip says whether it's actually crossed.
 *
 * When a boundary genuinely is crossed, a `wait_for_research_sale`/`wait_for_earnings_boost`
 * (starting) or plain `wait_for_time` (ending — there's no dedicated `wait_for_*_end` action type,
 * and the start-only types are hardcoded to the wrong day in `refreshActionPayload` if reused here)
 * action is inserted for exactly the calendar distance to that boundary, then the toggle. This
 * doesn't double-count time: the wait's duration is independent of price, and the purchase that
 * follows computes its own (correspondingly shorter) remaining wait from the bank/population the
 * wait action already advanced to. When no boundary is actually crossed, nothing is inserted at all.
 */
function syncEventStateForItem(item: { research: CommonResearch }) {
  // --- Research sale ---
  {
    let beforeSnapshot = prepareExecution();
    const level = beforeSnapshot.researchLevels[item.research.id] || 0;
    if (level < item.research.levels) {
      const absoluteSimTime = absoluteSimTimeAt(beforeSnapshot.lastStepTime);
      const transitions = boostTransitionsFrom(beforeSnapshot, absoluteSimTime);
      const isSaleActive = beforeSnapshot.activeSales.research;
      const purchase = getSaleAwareTimeToSave(
        item.research,
        level,
        costModifiers.value,
        isSaleActive,
        absoluteSimTime,
        beforeSnapshot,
        transitions
      );
      const crossings = findEventCrossings(
        absoluteSimTime,
        purchase.waitSeconds,
        isSaleActive,
        beforeSnapshot.earningsBoost.active
      );

      for (const crossing of crossings.sale) {
        const waitId = insertWait(
          crossing.togglesTo ? 'wait_for_research_sale' : 'wait_for_time',
          crossing.waitSeconds,
          beforeSnapshot
        );
        beforeSnapshot = waitId ? prepareExecution() : beforeSnapshot;
        insertToggleSale(crossing.togglesTo, waitId, beforeSnapshot);
      }
    }
  }

  // --- Earnings boost ---
  {
    let beforeSnapshot = prepareExecution();
    const level = beforeSnapshot.researchLevels[item.research.id] || 0;
    if (level < item.research.levels) {
      const absoluteSimTime = absoluteSimTimeAt(beforeSnapshot.lastStepTime);
      const transitions = boostTransitionsFrom(beforeSnapshot, absoluteSimTime);
      const isSaleActive = beforeSnapshot.activeSales.research;
      const price = getDiscountedVirtuePrice(item.research, level, costModifiers.value, isSaleActive);
      const liveWait = getTimeToSave(price, beforeSnapshot, transitions);
      const isBoostActive = beforeSnapshot.earningsBoost.active;
      const crossings = findEventCrossings(absoluteSimTime, liveWait, isSaleActive, isBoostActive);

      for (const crossing of crossings.boost) {
        const waitId = insertWait(
          crossing.togglesTo ? 'wait_for_earnings_boost' : 'wait_for_time',
          crossing.waitSeconds,
          beforeSnapshot
        );
        beforeSnapshot = waitId ? prepareExecution() : beforeSnapshot;
        insertToggleEarningsBoost(crossing.togglesTo, waitId, beforeSnapshot);
      }
    }
  }
}

// Automatically sweep when Always On is toggled on
watch(
  () => smartBuyState.value.alwaysOn,
  newVal => {
    if (newVal && !isSmartBuying) {
      handleSmartBuy(smartBuyState.value.threshold);
    }
  }
);

function handleBuyResearch(research: CommonResearch) {
  const duration = getTimeToBuySeconds(research);
  withExpiryCheck(duration, true, () => buyOneLevel(research));
}

// Best-ranked buyable ROI item that doesn't fail the sale-warning check, i.e. the one
// "Buy Until Sale Warning" would buy next. A higher-ranked item may be skipped over here
// because it fails the check (e.g. too expensive to finish before the sale) while a
// cheaper, lower-ranked one still passes.
const nextRoiCandidate = computed(() =>
  sortedResearches.value.find(item => item.canBuy && !item.isMaxed && !getSimulatedShowSaleWarning(item))
);

const canBuyUntilSaleWarning = computed(() => !!nextRoiCandidate.value);

// Repeatedly buys the best-ranked ROI research that still passes the sale-warning check,
// recalculating the list after each purchase (since buying one research changes the math
// for the rest). Items that fail the check are skipped rather than treated as a stopping
// point, since a cheaper lower-ranked item may still be affordable in time. Stops only once
// every remaining purchasable item fails the check.
function handleBuyUntilSaleWarning() {
  batch(() => {
    buyWhilePassingCheck(
      () => {
        const next = nextRoiCandidate.value;
        return next ? { researchId: next.research.id } : undefined;
      },
      researchId => {
        const item = nextRoiCandidate.value;
        const research = getResearchById(researchId);
        if (!research) return false;
        if (item) syncEventStateForItem(item);
        return buyOneLevel(research);
      }
    );
  });
}

// Best-ranked buyable ROI item that would earn back 100% of its cost before the next sale starts —
// a stricter bar than "Buy Until Sale Warning"'s 70%, for confidently stocking up ahead of a
// deadline. Same "skip failures, don't stop on them" semantics as nextRoiCandidate.
const nextRoiDeadlineCandidate = computed(() =>
  sortedResearches.value.find(item => {
    if (!item.canBuy || item.isMaxed) return false;
    if (item.earningsDelta === undefined || item.purchaseTimestamp === undefined) return false;
    return meetsROIByDeadline(item.earningsDelta, item.price, item.purchaseTimestamp, nextSaleStart.value, 100);
  })
);

const canBuyUntilROIDeadline = computed(() => !!nextRoiDeadlineCandidate.value);

// Repeatedly buys the best-ranked ROI research that would earn back 100% of its cost before the
// next sale starts, recalculating after each purchase. Same loop shape as handleBuyUntilSaleWarning.
function handleBuyUntilROIDeadline() {
  batch(() => {
    buyWhilePassingCheck(
      () => {
        const next = nextRoiDeadlineCandidate.value;
        return next ? { researchId: next.research.id } : undefined;
      },
      researchId => {
        const item = nextRoiDeadlineCandidate.value;
        const research = getResearchById(researchId);
        if (!research) return false;
        if (item) syncEventStateForItem(item);
        return buyOneLevel(research);
      }
    );
  });
}

// Best-ranked buyable Delivery Impact item that would still finish before the sale ends,
// i.e. the one "Buy Until Sale Ends" would buy next. A higher-ranked item may be skipped
// over here because it fails the check while a cheaper, lower-ranked one still passes.
const nextElrCandidate = computed(() =>
  sortedResearches.value.find(item => item.canBuy && !item.isMaxed && !item.showDeadlineWarning)
);

const canBuyUntilSaleDeadline = computed(() => isResearchSaleActive.value && !!nextElrCandidate.value);

// Repeatedly buys the best-ranked Delivery Impact research that would still finish before
// the sale ends, recalculating the list after each purchase. Items that fail the check are
// skipped rather than treated as a stopping point, since a cheaper lower-ranked item may
// still be affordable in time. Stops only once every remaining purchasable item fails the
// check.
function handleBuyUntilSaleDeadline() {
  if (!isResearchSaleActive.value) return;

  batch(() => {
    buyWhilePassingCheck(
      () => {
        const next = nextElrCandidate.value;
        return next ? { researchId: next.research.id } : undefined;
      },
      researchId => {
        const item = nextElrCandidate.value;
        const research = getResearchById(researchId);
        if (!research) return false;
        if (item) syncEventStateForItem(item);
        return buyOneLevel(research);
      }
    );
  });
}

function handleSmartBuy(threshold: number) {
  if (isSmartBuying) return;
  isSmartBuying = true;

  batch(() => {
    try {
      let itemBought = true;
      // Limit iterations to prevent infinite loops in edge cases
      let iterations = 0;
      const maxIterations = 2500;

      while (itemBought && iterations < maxIterations) {
        itemBought = false;
        iterations++;

        const levels = commonResearchStore.researchLevels;
        const snapshot = actionsStore.effectiveSnapshot;
        const isSale = isResearchSaleActive.value;
        const mods = costModifiers.value;

        if (snapshot.offlineEarnings <= 0) break;

        // No `currentAbsoluteTime` here on purpose: Smart Buy never simulates a wait, it buys
        // instantly at today's real price, so it shouldn't pick a candidate based on an upcoming
        // sale it isn't actually going to wait for (see findSmartBuyCandidate's doc comment).
        const found = findSmartBuyCandidate(levels, mods, isSale, snapshot, threshold);
        if (found) {
          if (buyOneLevel(found.research)) {
            itemBought = true;
          }
        }
      }
    } finally {
      isSmartBuying = false;
    }
  });
}

function handleMaxResearch(research: CommonResearch) {
  // Estimate total duration for maxing
  const currentLevels = commonResearchStore.researchLevels[research.id] || 0;
  let totalDuration = 0;
  for (let l = currentLevels; l < research.levels; l++) {
    // This is an approximation as earnings might change, but good enough for warning
    totalDuration += getTimeToBuySeconds(research);
  }

  withExpiryCheck(totalDuration, true, () => {
    batch(() => {
      const maxLevel = research.levels;
      while ((commonResearchStore.researchLevels[research.id] || 0) < maxLevel) {
        if (!buyOneLevel(research)) break;
      }
    });
  });
}

function handleMaxTier(tier: number) {
  batch(() => {
    const researches = researchByTier.value.get(tier) || [];
    for (const research of researches) {
      const maxLevel = research.levels;
      while ((commonResearchStore.researchLevels[research.id] || 0) < maxLevel) {
        if (!buyOneLevel(research)) break;
      }
    }
  });
}

function handleBuyToHere(index: number) {
  const list = sortedResearches.value;
  if (index < 0 || index >= list.length) return;

  // buyToHereSeconds is simulated step-by-step (earnings rate updates as each
  // item is bought), unlike summing getTimeToBuySeconds against today's static rate.
  let totalDuration = getSimulatedBuyToHereSeconds(list[index]);
  if (totalDuration === undefined) {
    totalDuration = 0;
    for (let i = 0; i <= index; i++) {
      totalDuration += getTimeToBuySeconds(list[i].research);
    }
  }

  withExpiryCheck(totalDuration, true, () => {
    batch(() => {
      for (let i = 0; i <= index; i++) {
        const item = list[i];
        buyOneLevel(item.research);
      }
    });
  });
}

function handleBuyMilestoneChain() {
  const list = sortedResearches.value;
  if (list.length === 0) return;

  // Same reasoning as handleBuyToHere: use the chain's simulated final duration
  // rather than summing individual durations against today's static earnings rate.
  let totalDuration = getSimulatedBuyToHereSeconds(list[list.length - 1]);
  if (totalDuration === undefined) {
    totalDuration = 0;
    for (const item of list) {
      totalDuration += getTimeToBuySeconds(item.research);
    }
  }

  withExpiryCheck(totalDuration, true, () => {
    batch(() => {
      for (const item of list) {
        syncEventStateForItem(item);
        buyOneLevel(item.research);
      }
    });
  });
}

function handleToggleSale() {
  const beforeSnapshot = prepareExecution();
  const currentlyActive = beforeSnapshot.activeSales.research;

  const payload = {
    saleType: 'research' as const,
    active: !currentlyActive,
    multiplier: 0.3, // 70% off
  };

  // Update store state
  salesStore.setSaleActive('research', !currentlyActive);

  // Deactivate Smart Buy Always On whenever a sale is toggled
  smartBuyState.value.alwaysOn = false;

  completeExecution(
    {
      id: generateActionId(),
      timestamp: Date.now(),
      type: 'toggle_sale',
      payload,
      cost: 0,
      dependsOn: computeDependencies(
        'toggle_sale',
        payload,
        actionsStore.actionsBeforeInsertion,
        actionsStore.initialSnapshot.researchLevels
      ),
    },
    beforeSnapshot
  );
}
</script>
