<template>
  <div class="space-y-4">
    <ResearchSaleToggle :is-active="isResearchSaleActive" @toggle="handleToggleSale" />

    <ResearchViewSelector v-model="currentView" :views="VIEWS" />

    <p class="text-sm text-gray-500 mb-4 px-1">
      {{ viewDescription }}
    </p>

    <RoiViewControls
      v-if="currentView === 'roi'"
      :delivery-impact-only="deliveryImpactOnly"
      :roi-mode="roiMode"
      @update:delivery-impact-only="deliveryImpactOnly = $event"
      @update:roi-mode="roiMode = $event"
    />

    <ElrViewControls
      v-if="currentView === 'elr'"
      :view-mode="elrViewMode"
      :sort-mode="elrSortMode"
      :roi-display-mode="elrRoiDisplayMode"
      @update:view-mode="elrViewMode = $event"
      @update:sort-mode="elrSortMode = $event"
      @update:roi-display-mode="elrRoiDisplayMode = $event"
    />

    <SmartBuyView
      v-if="currentView === 'smart_buy'"
      :auto-buy-always-on="autoBuyState.alwaysOn"
      :delivery-impact-only="deliveryImpactOnly"
      :roi-mode="roiMode"
      :can-buy-until-sale-warning="canBuyUntilSaleWarning"
      :can-buy-until-sale-deadline="canBuyUntilSaleDeadline"
      :quick-buy-preview="quickBuyPreview"
      :quick-buy-earnings-summary="quickBuyEarningsSummary"
      :quick-buy-stats="quickBuyStats"
      :sale-aware-preview="saleAwarePreview"
      :sale-aware-stats70="saleAwareStats70"
      :sale-ends-preview="saleEndsPreview"
      :sale-ends-earnings-preview="saleEndsEarningsPreview"
      :sale-ends-earnings-summary="saleEndsEarningsSummary"
      :sale-aware-earnings-summary70="saleAwareEarningsSummary70"
      :sale-ends-delivery-summary="saleEndsDeliverySummary"
      :sale-ends-stats="saleEndsStats"
      @update:auto-buy-always-on="autoBuyState.alwaysOn = $event"
      @quick-buy="handleThresholdBuy"
      @update:quick-buy-threshold-seconds="quickBuyThreshold = $event"
      @auto-buy-update="state => (autoBuyState = state)"
      @update:delivery-impact-only="deliveryImpactOnly = $event"
      @update:roi-mode="roiMode = $event"
      @buy-until-sale-warning="handleBuyUntilSaleWarning"
      @buy-until-sale-deadline="handleBuyUntilSaleDeadline"
    />

    <BeamSearchView v-if="currentView === 'beam_search'" @apply="handleApplyBeamSearchPlan" />

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
          <div class="flex flex-col border-l border-gray-200 pl-6">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1"
              >Gems Spent</span
            >
            <span class="text-sm font-mono font-bold text-gray-900 leading-none py-1">
              {{ formatGemPrice(milestoneSummary.gemsSpent) }}
            </span>
          </div>
        </div>
        <p class="mt-2 text-[10px] text-gray-400 text-center">Finishes {{ milestoneSummary.finishAbsoluteTime }}</p>
      </template>
    </div>

    <!-- Buy Entire Chain -->
    <button
      v-if="currentView === 'milestones' && sortedResearches.length > 0"
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
      v-else-if="currentView !== 'smart_buy' && currentView !== 'beam_search'"
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
import { getDiscountedVirtuePrice, getResearchById, type CommonResearch } from '@/calculations/commonResearch';
import { formatDuration, formatNumber, formatGemPrice } from '@/lib/format';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useActionsStore } from '@/stores/actions';
import { useSalesStore } from '@/stores/sales';
import { useVirtueStore } from '@/stores/virtue';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';
import {
  createNoteAction,
  buildQuickBuyNotePayload,
  buildSaleAwareBuyNotePayload,
  buildSaleEndsBuyNotePayload,
  buildMilestoneNotePayload,
} from '@/lib/actions/notes';
import { useResearchViews, VIEWS } from '@/composables/useResearchViews';
import { getTimeToSave, boostTransitionsFrom } from '@/engine/apply';
import { getSimulationContext } from '@/engine/adapter';
import { buyWhilePassingCheck, buyUntilRealSaleStarts } from '@/calculations/researchRanking';
import {
  getSaleAwareTimeToSave,
  findEventCrossings,
  meetsSaleAwareDeadline,
  type EventCrossing,
} from '@/calculations/researchROI';
import {
  simulateThresholdBuy,
  summarizeResearchLevelChanges,
  type SaleAwarePlanEntry,
} from '@/calculations/smartBuyPreview';
import { debugLog, debugLogStart, debugLogEnd } from '@/lib/debugLog';
import type { BeamSearchResult } from '@/beam-search/engine';

// Sub-components
import ResearchSaleToggle from './ResearchSaleToggle.vue';
import ResearchViewSelector from './ResearchViewSelector.vue';
import ResearchGameView from './ResearchGameView.vue';
import ResearchFlatView from './ResearchFlatView.vue';
import ElrViewControls from './ElrViewControls.vue';
import RoiViewControls from './RoiViewControls.vue';
import SmartBuyView from './SmartBuyView.vue';
import BeamSearchView from './BeamSearchView.vue';
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

const autoBuyState = ref({ threshold: 0, alwaysOn: false });
let isThresholdBuying = false;
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
  roiRankedResearches,
  elrRankedResearches,
  saleAwarePlan70,
  saleAwarePreview,
  saleAwareStats70,
  saleEndsPlan,
  saleEndsPreview,
  saleEndsEarningsPreview,
  saleEndsEarningsSummary,
  saleAwareEarningsSummary70,
  saleEndsDeliverySummary,
  saleEndsStats,
  realisticSummary,
  researchSaleDeadline,
  nextSaleStart,
  TIER_THRESHOLDS,
} = useResearchViews();

// Quick Buy's own live threshold (separate from Auto Buy's) — fed up from QuickBuy.vue's input so
// its preview can update as the user types, without QuickBuy owning any store access itself.
const quickBuyThreshold = ref(0);
const quickBuyPlan = computed(() =>
  simulateThresholdBuy(
    commonResearchStore.researchLevels,
    actionsStore.effectiveSnapshot,
    getSimulationContext(),
    costModifiers.value,
    isResearchSaleActive.value,
    quickBuyThreshold.value
  )
);
const quickBuyPreview = computed(() =>
  summarizeResearchLevelChanges(commonResearchStore.researchLevels, quickBuyPlan.value.endLevels)
);
const quickBuyEarningsSummary = computed(() => ({
  before: actionsStore.effectiveSnapshot.offlineEarnings * 3600,
  after: quickBuyPlan.value.endSnapshot.offlineEarnings * 3600,
}));

// Purchase count / time-saved / gems spent for the Quick Buy card — the same three figures its note
// reports (`buildQuickBuyNotePayload` in `src/lib/actions/notes.ts`), shown live in the card itself
// before the button is clicked.
const quickBuyStats = computed(() => ({
  purchaseCount: quickBuyPlan.value.researchIds.length,
  seconds: quickBuyPlan.value.totalSecondsToSave ?? 0,
  gems: quickBuyPlan.value.totalGemsSpent ?? 0,
}));

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
  if (!isThresholdBuying && autoBuyState.value.alwaysOn) {
    handleThresholdBuy(autoBuyState.value.threshold);
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
 * Sale and boost crossings are computed ONCE, over the SAME true wait window (`purchase.waitSeconds`
 * from `getSaleAwareTimeToSave`, which already accounts for whether waiting for the sale beats
 * buying now, and already prices in boost-accelerated earning during the wait via `transitions`),
 * then merged and walked in a single chronological pass — not two separate sequential blocks. An
 * earlier version handled sale and boost independently: a "sale" block computed both crossing types
 * from the true starting point but only ever inserted the sale ones, then a separate "boost" block
 * re-derived its OWN wait from whatever state the sale block had already advanced to. Any boost
 * window that fell entirely inside the *sale-waiting* period was computed correctly the first time
 * (it's right there in that first call's own `crossings.boost`) but silently discarded, and the
 * second block's from-scratch window started only AFTER that boundary had already passed, so it
 * never got a another chance to find it. Merging both lists chronologically here fixes that: every
 * crossing — sale or boost, in whatever order they actually occur — gets its own wait+toggle action.
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
  const beforeSnapshot = prepareExecution();
  const level = beforeSnapshot.researchLevels[item.research.id] || 0;
  if (level >= item.research.levels) return;

  const absoluteSimTime = absoluteSimTimeAt(beforeSnapshot.lastStepTime);
  const transitions = boostTransitionsFrom(beforeSnapshot, absoluteSimTime);
  const isSaleActive = beforeSnapshot.activeSales.research;
  const isBoostActive = beforeSnapshot.earningsBoost.active;
  const purchase = getSaleAwareTimeToSave(
    item.research,
    level,
    costModifiers.value,
    isSaleActive,
    absoluteSimTime,
    beforeSnapshot,
    transitions
  );
  const crossings = findEventCrossings(absoluteSimTime, purchase.waitSeconds, isSaleActive, isBoostActive);

  debugLog('syncEventStateForItem', {
    researchId: item.research.id,
    level,
    absoluteSimTime,
    absoluteSimTimeIso: new Date(absoluteSimTime * 1000).toISOString(),
    isSaleActive,
    isBoostActive,
    purchasePrice: purchase.price,
    purchaseWaitSeconds: purchase.waitSeconds,
    purchaseDuringSale: purchase.duringSale,
    saleCrossings: crossings.sale.map(c => ({ waitSeconds: c.waitSeconds, togglesTo: c.togglesTo })),
    boostCrossings: crossings.boost.map(c => ({ waitSeconds: c.waitSeconds, togglesTo: c.togglesTo })),
  });

  insertEventCrossingWaits(absoluteSimTime, crossings, beforeSnapshot);
}

/**
 * Shared by `syncEventStateForItem` (crossings up to a purchase's own wait) and `advanceToDeadline`
 * (crossings up to a fixed target time with no purchase attached): merges the sale and boost
 * crossing lists into true chronological order and inserts a wait+toggle action pair for each one.
 * See `syncEventStateForItem`'s git history for why merging matters — treating sale and boost as two
 * independent sequential passes silently drops a boost window that falls entirely inside a
 * sale-wait period.
 *
 * Each list's `waitSeconds` is relative to its own previous crossing (or to `absoluteSimTime` for
 * the first) — convert both to absolute timestamps first so they can be merged regardless of which
 * type occurs first. Returns the snapshot and absolute time reached after the last crossing (equal
 * to `absoluteSimTime` itself, with the input snapshot, if there were no crossings at all).
 */
function insertEventCrossingWaits(
  absoluteSimTime: number,
  crossings: { sale: EventCrossing[]; boost: EventCrossing[] },
  beforeSnapshot: ReturnType<typeof prepareExecution>
): { snapshot: ReturnType<typeof prepareExecution>; cursor: number } {
  type TaggedCrossing = { absoluteTime: number; togglesTo: boolean; kind: 'sale' | 'boost' };
  const toTagged = (list: EventCrossing[], kind: TaggedCrossing['kind']): TaggedCrossing[] => {
    let cursor = absoluteSimTime;
    return list.map(c => {
      cursor += c.waitSeconds;
      return { absoluteTime: cursor, togglesTo: c.togglesTo, kind };
    });
  };
  const allCrossings = [...toTagged(crossings.sale, 'sale'), ...toTagged(crossings.boost, 'boost')].sort(
    (a, b) => a.absoluteTime - b.absoluteTime
  );

  let cursor = absoluteSimTime;
  let snapshot = beforeSnapshot;
  for (const crossing of allCrossings) {
    const waitSeconds = crossing.absoluteTime - cursor;
    if (crossing.kind === 'sale') {
      const waitId = insertWait(crossing.togglesTo ? 'wait_for_research_sale' : 'wait_for_time', waitSeconds, snapshot);
      snapshot = waitId ? prepareExecution() : snapshot;
      insertToggleSale(crossing.togglesTo, waitId, snapshot);
    } else {
      const waitId = insertWait(
        crossing.togglesTo ? 'wait_for_earnings_boost' : 'wait_for_time',
        waitSeconds,
        snapshot
      );
      snapshot = waitId ? prepareExecution() : snapshot;
      insertToggleEarningsBoost(crossing.togglesTo, waitId, snapshot);
    }
    cursor = crossing.absoluteTime;
  }
  return { snapshot, cursor };
}

/**
 * Carries the plan's clock the rest of the way to `targetDeadline` on its own, inserting whatever
 * wait+toggle actions the remaining sale/boost crossings between "wherever the buy loop stopped"
 * and the deadline need. `runSaleAwareBuyFlow`'s buy loop only advances time as a side effect of
 * `syncEventStateForItem` calls made right before each purchase — so if it stops because
 * `getNextCandidate()` ran out of qualifying research (rather than because the deadline was
 * actually reached), nothing else ever carries the plan forward, and the promised "wait for the
 * sale to end, then the boost, then wait for the next sale" progression silently doesn't happen. A
 * no-op if `targetDeadline` has already been reached (e.g. the transitional bypass purchase already
 * carried the clock there).
 */
function advanceToDeadline(targetDeadline: number) {
  if (!isFinite(targetDeadline)) return;
  const beforeSnapshot = prepareExecution();
  const absoluteSimTime = absoluteSimTimeAt(beforeSnapshot.lastStepTime);
  const waitSeconds = targetDeadline - absoluteSimTime;
  if (waitSeconds <= 0) return;

  const isSaleActive = beforeSnapshot.activeSales.research;
  const isBoostActive = beforeSnapshot.earningsBoost.active;
  const crossings = findEventCrossings(absoluteSimTime, waitSeconds, isSaleActive, isBoostActive);

  debugLog('advanceToDeadline', {
    absoluteSimTime,
    absoluteSimTimeIso: new Date(absoluteSimTime * 1000).toISOString(),
    targetDeadline,
    targetDeadlineIso: new Date(targetDeadline * 1000).toISOString(),
    isSaleActive,
    isBoostActive,
    saleCrossings: crossings.sale.map(c => ({ waitSeconds: c.waitSeconds, togglesTo: c.togglesTo })),
    boostCrossings: crossings.boost.map(c => ({ waitSeconds: c.waitSeconds, togglesTo: c.togglesTo })),
  });

  const { snapshot: afterSnapshot, cursor } = insertEventCrossingWaits(absoluteSimTime, crossings, beforeSnapshot);

  // Any stretch after the last crossing (or the whole window, if there were none at all — e.g. no
  // boost is due before the next sale) still needs a plain wait so the clock actually reaches
  // targetDeadline, not just its last crossing.
  const remaining = targetDeadline - cursor;
  if (remaining > 0) {
    insertWait('wait_for_time', remaining, afterSnapshot);
  }
}

// Automatically sweep when Always On is toggled on
watch(
  () => autoBuyState.value.alwaysOn,
  newVal => {
    if (newVal && !isThresholdBuying) {
      handleThresholdBuy(autoBuyState.value.threshold);
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
//
// See `meetsSaleAwareDeadline`'s doc comment for the full rule (including why `duringSale` items
// are deliberately not excluded here — the actual purchase gets stripped out afterward instead,
// by `runSaleAwareBuyFlow`'s cleanup sweep, since an exclusion here would throw the wait away
// entirely rather than just the purchase).
const nextRoiCandidate = computed(() =>
  roiRankedResearches.value.find(item => meetsSaleAwareDeadline(item, nextSaleStart.value, 70))
);

const canBuyUntilSaleWarning = computed(() => !!nextRoiCandidate.value);

// Diagnostic: logs the top of the ROI-ranked list whenever it changes, so the sale-warning
// calculation for whatever's currently ranked #1 can be inspected without needing to click a Buy
// button (e.g. after an undo, to check whether the warning that should show for the new top item
// actually does). The watch source only reads `roiRankedResearches.value` while on the `roi` or
// `smart_buy` tab — since that computed no longer gates itself on `currentView` (see
// `roiRankedResearches`'s doc comment in useResearchViews.ts), this local check is what keeps the
// ROI ranking from being force-recomputed on every relevant store change while on an unrelated tab.
watch(
  () => (currentView.value === 'roi' || currentView.value === 'smart_buy' ? roiRankedResearches.value : null),
  list => {
    if (!list || list.length === 0) return;
    const top = list[0];
    debugLog('roiRankedResearches top (roi/smart_buy view)', {
      researchId: top.research.id,
      researchName: top.research.name,
      targetLevel: top.targetLevel,
      price: top.price,
      timeToBuySeconds: top.timeToBuySeconds,
      roiSeconds: top.roiSeconds,
      totalRoiSeconds: top.totalRoiSeconds,
      earningsDelta: top.earningsDelta,
      duringSale: top.duringSale,
      showSaleWarning: top.showSaleWarning,
      purchaseTimestamp: top.purchaseTimestamp,
      purchaseTimestampIso:
        top.purchaseTimestamp !== undefined ? new Date(top.purchaseTimestamp * 1000).toISOString() : undefined,
      nextSaleStart: nextSaleStart.value,
      nextSaleStartIso: isFinite(nextSaleStart.value) ? new Date(nextSaleStart.value * 1000).toISOString() : 'Infinity',
      researchSaleDeadline: researchSaleDeadline.value,
      researchSaleDeadlineIso: isFinite(researchSaleDeadline.value)
        ? new Date(researchSaleDeadline.value * 1000).toISOString()
        : 'Infinity',
      roiMode: roiMode.value,
    });
  },
  { immediate: true }
);

// Diagnostic: exposes the top-of-list sale-warning inputs directly to the browser console, on
// demand, bypassing the debugLog buffer entirely (avoids confusion from stale/leftover entries in
// that buffer from earlier runs). Call `__debugResearchTop()` in devtools console while the ROI
// or Smart Buy view is open.
(window as unknown as { __debugResearchTop?: () => void }).__debugResearchTop = () => {
  const top = roiRankedResearches.value[0];
  if (!top) {
    console.log('[debug] roiRankedResearches is empty');
    return;
  }
  console.log('[debug] top ROI candidate', {
    researchId: top.research.id,
    researchName: top.research.name,
    targetLevel: top.targetLevel,
    price: top.price,
    timeToBuySeconds: top.timeToBuySeconds,
    roiSeconds: top.roiSeconds,
    totalRoiSeconds: top.totalRoiSeconds,
    earningsDelta: top.earningsDelta,
    duringSale: top.duringSale,
    showSaleWarning: top.showSaleWarning,
    purchaseTimestamp: top.purchaseTimestamp,
    purchaseTimestampIso:
      top.purchaseTimestamp !== undefined ? new Date(top.purchaseTimestamp * 1000).toISOString() : undefined,
    nextSaleStart: nextSaleStart.value,
    nextSaleStartIso: isFinite(nextSaleStart.value) ? new Date(nextSaleStart.value * 1000).toISOString() : 'Infinity',
    researchSaleDeadline: researchSaleDeadline.value,
    researchSaleDeadlineIso: isFinite(researchSaleDeadline.value)
      ? new Date(researchSaleDeadline.value * 1000).toISOString()
      : 'Infinity',
    roiMode: roiMode.value,
    currentView: currentView.value,
  });
};

// Driver behind "Buy Until Sale Warning": walks a precomputed plan (`saleAwarePlan70` — see
// `simulateSaleAwareBuy`'s doc comment in smartBuyPreview.ts) rather than independently
// re-deriving candidates live, so the preview shown under the button and what actually gets
// bought are guaranteed to match — one source of truth, not two. Only candidate *selection*
// comes from the plan; buying still goes through the real `syncEventStateForItem`/`buyOneLevel`
// (inserting real wait/toggle/purchase history) and the same post-hoc bypass-cleanup sweep as
// before (see `buyUntilRealSaleStarts`'s doc comment in researchRanking.ts for the full
// rationale). `label` is used to tag this run's entries in the debug log.
//
// The deadline is captured ONCE, up front, rather than re-derived from "is a sale active right
// now" each iteration: if the button is clicked while a DIFFERENT sale is already active,
// `nextSaleStart` already points past it (getNextPacificTime never returns something at-or-before
// its input), to the sale that's actually 6-7 days out — so buying should proceed through the
// currently-active sale (at whatever its real price is) toward THAT target, not bail out
// immediately just because some sale happens to be live already.
async function runSaleAwareBuyFlow(label: string, plan: SaleAwarePlanEntry[]) {
  const startAbsoluteTime = absoluteSimTimeAt(actionsStore.effectiveSnapshot.lastStepTime);
  const targetDeadline = nextSaleStart.value;
  debugLogStart(label, {
    startAbsoluteTime,
    startAbsoluteTimeIso: new Date(startAbsoluteTime * 1000).toISOString(),
    targetDeadline,
    targetDeadlineIso: isFinite(targetDeadline) ? new Date(targetDeadline * 1000).toISOString() : 'Infinity',
    planLength: plan.length,
  });

  let result: { purchased: number; duringSalePurchases: { actionId: string; purchaseTimestamp: number }[] } = {
    purchased: 0,
    duringSalePurchases: [],
  };
  let index = 0;
  await batch(() => {
    // Note goes in ahead of the purchases it's summarizing, same as Quick Buy's. `plan` is already
    // the exact sequence about to be bought (see this function's doc comment above), and the sale
    // deadline is known up front, so both figures the note needs are available before anything is
    // actually purchased.
    const notePayload = buildSaleAwareBuyNotePayload(
      plan.length,
      targetDeadline - startAbsoluteTime,
      plan.reduce((sum, entry) => sum + entry.price, 0)
    );
    if (notePayload) {
      const noteBeforeSnapshot = prepareExecution();
      completeExecution(
        createNoteAction(
          notePayload,
          computeDependencies(
            'notification',
            notePayload,
            actionsStore.actionsBeforeInsertion,
            actionsStore.initialSnapshot.researchLevels
          )
        ),
        noteBeforeSnapshot
      );
    }

    result = buyUntilRealSaleStarts(
      () => {
        // This closure is only ever invoked when buyUntilRealSaleStarts's own `shouldStop()`
        // check (same targetDeadline comparison, evaluated just before this) already passed —
        // so if the log for this iteration is missing entirely, the run stopped due to the
        // deadline; if it's present but the plan ran dry, the precomputed plan simply had
        // nothing left (it already accounted for the deadline itself when it was built).
        const next = plan[index];
        const currentAbsoluteTime = absoluteSimTimeAt(actionsStore.effectiveSnapshot.lastStepTime);
        debugLog(`${label} candidate`, {
          iteration: index + 1,
          currentAbsoluteTime,
          currentAbsoluteTimeIso: new Date(currentAbsoluteTime * 1000).toISOString(),
          targetDeadline,
          targetDeadlineIso: isFinite(targetDeadline) ? new Date(targetDeadline * 1000).toISOString() : 'Infinity',
          researchId: next?.researchId,
          purchaseTimestamp: next?.purchaseTimestamp,
          purchaseTimestampIso:
            next?.purchaseTimestamp !== undefined ? new Date(next.purchaseTimestamp * 1000).toISOString() : undefined,
          duringSale: next?.duringSale,
        });
        return next;
      },
      researchId => {
        const next = plan[index];
        index++;
        const research = getResearchById(researchId);
        if (!research) return false;
        if (next) syncEventStateForItem({ research });
        return buyOneLevel(research);
      },
      () => absoluteSimTimeAt(actionsStore.effectiveSnapshot.lastStepTime) >= targetDeadline,
      () => actionsStore.actions[actionsStore.actions.length - 1]?.id
    );
  });

  // Only sweep purchases that actually landed at-or-after the target deadline — one that used a
  // DIFFERENT, already-active sale's real price before ever reaching the target isn't the bypass
  // this cleanup exists for (see runSaleAwareBuyFlow's own comment above).
  const toRemove = result.duringSalePurchases.filter(p => p.purchaseTimestamp >= targetDeadline);
  for (const { actionId } of toRemove.reverse()) {
    debugLog(`${label} cleanup: removing duringSale purchase`, { actionId });
    await actionsStore.executeUndo(actionId, 'dependents');
  }

  // The buy loop only advances time as a side effect of buying something. If it stopped because
  // candidates ran out rather than because targetDeadline was actually reached, carry the clock
  // (and any sale/boost toggles due along the way) the rest of the way there on its own.
  advanceToDeadline(targetDeadline);

  const endAbsoluteTime = absoluteSimTimeAt(actionsStore.effectiveSnapshot.lastStepTime);
  debugLogEnd(label, {
    iterations: result.purchased,
    removedDuringSalePurchases: toRemove.length,
    endAbsoluteTime,
    endAbsoluteTimeIso: new Date(endAbsoluteTime * 1000).toISOString(),
    totalSecondsAdded: endAbsoluteTime - startAbsoluteTime,
    totalDaysAdded: (endAbsoluteTime - startAbsoluteTime) / 86400,
  });
}

// Executes the precomputed 70%-return plan (`saleAwarePlan70` — same plan the preview under the
// button displays).
async function handleBuyUntilSaleWarning() {
  await runSaleAwareBuyFlow('handleBuyUntilSaleWarning', saleAwarePlan70.value.entries);
}

// Best-ranked buyable Delivery Impact item that would still finish before the sale ends,
// i.e. the one "Buy Until Sale Ends" would buy next. A higher-ranked item may be skipped
// over here because it fails the check while a cheaper, lower-ranked one still passes.
const nextElrCandidate = computed(() =>
  elrRankedResearches.value.find(item => item.canBuy && !item.isMaxed && !item.showDeadlineWarning)
);

const canBuyUntilSaleDeadline = computed(() => isResearchSaleActive.value && !!nextElrCandidate.value);

// Executes the precomputed sale-ends plan (`saleEndsPlan` — same plan the preview under the
// button displays). Candidate selection comes from the plan; buying still goes through the real
// `syncEventStateForItem`/`buyOneLevel`.
function handleBuyUntilSaleDeadline() {
  if (!isResearchSaleActive.value) return;

  const plan = saleEndsPlan.value.researchIds;
  let index = 0;
  batch(() => {
    // Note goes in ahead of the purchases it's summarizing, same as the other Smart Buy notes.
    // `plan` is already the exact sequence about to be bought, and the current sale's own end is
    // known up front, so both figures the note needs are available before anything is purchased.
    const startAbsoluteTime = absoluteSimTimeAt(actionsStore.effectiveSnapshot.lastStepTime);
    const notePayload = buildSaleEndsBuyNotePayload(
      plan.length,
      researchSaleDeadline.value - startAbsoluteTime,
      saleEndsPlan.value.totalGemsSpent ?? 0
    );
    if (notePayload) {
      const noteBeforeSnapshot = prepareExecution();
      completeExecution(
        createNoteAction(
          notePayload,
          computeDependencies(
            'notification',
            notePayload,
            actionsStore.actionsBeforeInsertion,
            actionsStore.initialSnapshot.researchLevels
          )
        ),
        noteBeforeSnapshot
      );
    }

    buyWhilePassingCheck(
      () => (index < plan.length ? { researchId: plan[index] } : undefined),
      researchId => {
        index++;
        const research = getResearchById(researchId);
        if (!research) return false;
        syncEventStateForItem({ research });
        return buyOneLevel(research);
      }
    );
  });
}

// Shared by Quick Buy's one-time click and Auto Buy's background sweep. Executes the precomputed
// plan from `simulateThresholdBuy` (same function backing Quick Buy's own live preview) rather
// than independently re-deriving candidates — unifies both callers' execution onto one code path,
// even though only Quick Buy gets a preview *displayed*.
function handleThresholdBuy(threshold: number) {
  if (isThresholdBuying) return;
  isThresholdBuying = true;

  batch(() => {
    try {
      const plan = simulateThresholdBuy(
        commonResearchStore.researchLevels,
        actionsStore.effectiveSnapshot,
        getSimulationContext(),
        costModifiers.value,
        isResearchSaleActive.value,
        threshold
      );

      // Note goes in ahead of the purchases it's summarizing, so history reads "why did these show
      // up" before it reads the purchases themselves.
      const notePayload = buildQuickBuyNotePayload(
        threshold,
        plan.researchIds.length,
        plan.totalSecondsToSave ?? 0,
        plan.totalGemsSpent ?? 0
      );
      if (notePayload) {
        const noteBeforeSnapshot = prepareExecution();
        completeExecution(
          createNoteAction(
            notePayload,
            computeDependencies(
              'notification',
              notePayload,
              actionsStore.actionsBeforeInsertion,
              actionsStore.initialSnapshot.researchLevels
            )
          ),
          noteBeforeSnapshot
        );
      }

      for (const researchId of plan.researchIds) {
        const research = getResearchById(researchId);
        if (!research) continue;
        if (!buyOneLevel(research)) break;
      }
    } finally {
      isThresholdBuying = false;
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

// Human-readable description of the current milestone target, for the note `handleBuyMilestoneChain`
// inserts ahead of its purchases — same wording `MilestoneTargetPicker.vue` uses for the target
// itself ("Unlock Tier N" / "Research Name (Lv X/Y)"), so the note reads consistently with the
// picker the player just used to choose it.
function getMilestoneTargetLabel(): string {
  const target = milestoneTarget.value;
  if (!target) return 'Milestone';
  if (target.kind === 'tier') return `Unlock Tier ${target.tier}`;
  const research = getResearchById(target.researchId);
  return research ? `${research.name} (Lv ${target.targetLevel}/${research.levels})` : 'Milestone';
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
      // Note goes in ahead of the purchases it's summarizing, same as the Smart Buy notes. Time
      // saved only comes along when the Milestone Summary panel itself has a baseline comparison to
      // show (see `buildMilestoneNotePayload`'s doc comment) — `milestoneSummary` reflects the
      // target as currently selected, same source the summary panel above the button reads from.
      const summary = milestoneSummary.value;
      const timeSavedSeconds = summary && !summary.truncated ? summary.timeSavedSeconds : undefined;
      const notePayload = buildMilestoneNotePayload(
        getMilestoneTargetLabel(),
        list.length,
        totalDuration,
        list.reduce((sum, item) => sum + item.price, 0),
        timeSavedSeconds
      );
      if (notePayload) {
        const noteBeforeSnapshot = prepareExecution();
        completeExecution(
          createNoteAction(
            notePayload,
            computeDependencies(
              'notification',
              notePayload,
              actionsStore.actionsBeforeInsertion,
              actionsStore.initialSnapshot.researchLevels
            )
          ),
          noteBeforeSnapshot
        );
      }

      for (const item of list) {
        syncEventStateForItem(item);
        buyOneLevel(item.research);
      }
    });
  });
}

/**
 * Applies a beam search winning plan (BeamSearchView.vue's `apply` event) in one shot — all-or-
 * nothing, per src/beam-search/HANDOFF.md decision #6 and
 * src/beam-search/06-egg-codebase-integration.md §7. `result.researchIds` is already flat and
 * ordered, with tier-macro/Phase-3-macro purchases already expanded into individual levels
 * (src/beam-search/engine/reconstruct.ts) — indistinguishable, by the time it reaches here, from an
 * ordinary chain of solo purchases, so it replays through exactly the same
 * syncEventStateForItem/buyOneLevel pattern `handleBuyMilestoneChain` above uses, not a separate
 * "macro-aware" path. Real price/wait for each purchase is re-derived live here (via
 * syncEventStateForItem/buyOneLevel), not trusted from the beam's own scratch-simulation — same
 * "dry run -> execute" split every other flow in this file already uses.
 *
 * `result.lastPurchaseTime` (an absolute timestamp the engine already computed, accounting for real
 * sale/boost timing) gives a much better expiry-check duration estimate than the
 * sum-of-getTimeToBuySeconds fallbacks other handlers here need, so it's used directly instead.
 */
function handleApplyBeamSearchPlan(result: BeamSearchResult) {
  if (result.researchIds.length === 0) return;

  const currentAbsoluteTime = absoluteSimTimeAt(actionsStore.effectiveSnapshot.lastStepTime);
  const totalDuration = Math.max(0, result.lastPurchaseTime - currentAbsoluteTime);

  withExpiryCheck(totalDuration, true, () => {
    batch(() => {
      for (const researchId of result.researchIds) {
        const research = getResearchById(researchId);
        if (!research) continue;
        syncEventStateForItem({ research });
        if (!buyOneLevel(research)) break;
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

  // Deactivate Auto Buy whenever a sale is toggled
  autoBuyState.value.alwaysOn = false;

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
