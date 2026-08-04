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
import { useResearchViews, VIEWS, type ResearchViewItem } from '@/composables/useResearchViews';
import { getTimeToSave, boostTransitionsFrom } from '@/engine/apply';
import { findSmartBuyCandidate } from '@/calculations/smartBuyCandidate';
import { buyWhilePassingCheck, buyUntilRealSaleStarts } from '@/calculations/researchRanking';
import {
  getSaleAwareTimeToSave,
  findEventCrossings,
  meetsSaleAwareDeadline,
  type EventCrossing,
} from '@/calculations/researchROI';
import { debugLog, debugLogStart, debugLogEnd } from '@/lib/debugLog';

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
      const waitId = insertWait(
        crossing.togglesTo ? 'wait_for_research_sale' : 'wait_for_time',
        waitSeconds,
        snapshot
      );
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
//
// See `meetsSaleAwareDeadline`'s doc comment for the full rule (including why `duringSale` items
// are deliberately not excluded here — the actual purchase gets stripped out afterward instead,
// by `runSaleAwareBuyFlow`'s cleanup sweep, since an exclusion here would throw the wait away
// entirely rather than just the purchase).
const nextRoiCandidate = computed(() =>
  sortedResearches.value.find(item => meetsSaleAwareDeadline(item, nextSaleStart.value, 70))
);

const canBuyUntilSaleWarning = computed(() => !!nextRoiCandidate.value);

// Diagnostic: logs the top of the ROI-sorted list whenever it changes, so the sale-warning
// calculation for whatever's currently ranked #1 can be inspected without needing to click a Buy
// button (e.g. after an undo, to check whether the warning that should show for the new top item
// actually does).
watch(
  sortedResearches,
  list => {
    if (currentView.value !== 'roi' || list.length === 0) return;
    const top = list[0];
    debugLog('sortedResearches top (roi view)', {
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
// view is open.
(window as unknown as { __debugResearchTop?: () => void }).__debugResearchTop = () => {
  const top = sortedResearches.value[0];
  if (!top) {
    console.log('[debug] sortedResearches is empty (or not on the roi view)');
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

// Shared driver behind "Buy Until Sale Warning" and "Buy Until ROI Deadline": both repeatedly buy
// whatever `getNextCandidate()` picks (pre-filtered by `meetsSaleAwareDeadline` at their own
// target percent — 70 for the former, 100 for the latter), stopping once the target deadline is
// reached and sweeping out any purchase that only passed via the `duringSale` bypass AND landed
// at-or-after that deadline (see `buyUntilRealSaleStarts`'s doc comment in researchRanking.ts for
// the full rationale). This is the Pinia-store-bound "glue" around that pure, reusable loop shape
// — `label` distinguishes the two callers in the debug log.
//
// The deadline is captured ONCE, up front, rather than re-derived from "is a sale active right
// now" each iteration: if the button is clicked while a DIFFERENT sale is already active,
// `nextSaleStart` already points past it (getNextPacificTime never returns something at-or-before
// its input), to the sale that's actually 6-7 days out — so buying should proceed through the
// currently-active sale (at whatever its real price is) toward THAT target, not bail out
// immediately just because some sale happens to be live already.
async function runSaleAwareBuyFlow(label: string, getNextCandidate: () => ResearchViewItem | undefined) {
  const startAbsoluteTime = absoluteSimTimeAt(actionsStore.effectiveSnapshot.lastStepTime);
  const targetDeadline = nextSaleStart.value;
  debugLogStart(label, {
    startAbsoluteTime,
    startAbsoluteTimeIso: new Date(startAbsoluteTime * 1000).toISOString(),
    targetDeadline,
    targetDeadlineIso: isFinite(targetDeadline) ? new Date(targetDeadline * 1000).toISOString() : 'Infinity',
  });

  let result: { purchased: number; duringSalePurchases: { actionId: string; purchaseTimestamp: number }[] } = {
    purchased: 0,
    duringSalePurchases: [],
  };
  let iteration = 0;
  await batch(() => {
    result = buyUntilRealSaleStarts(
      () => {
        // This closure is only ever invoked when buyUntilRealSaleStarts's own `shouldStop()`
        // check (same targetDeadline comparison, evaluated just before this) already passed —
        // so if the log for this iteration is missing entirely, the run stopped due to the
        // deadline; if it's present but `researchId` is undefined, getNextCandidate() found
        // nothing left to buy on its own (ran dry before ever reaching the deadline).
        iteration++;
        const currentAbsoluteTime = absoluteSimTimeAt(actionsStore.effectiveSnapshot.lastStepTime);
        const next = getNextCandidate();
        debugLog(`${label} candidate`, {
          iteration,
          currentAbsoluteTime,
          currentAbsoluteTimeIso: new Date(currentAbsoluteTime * 1000).toISOString(),
          targetDeadline,
          targetDeadlineIso: isFinite(targetDeadline) ? new Date(targetDeadline * 1000).toISOString() : 'Infinity',
          researchId: next?.research.id,
          researchName: next?.research.name,
          targetLevel: next?.targetLevel,
          timeToBuySeconds: next?.timeToBuySeconds,
          purchaseTimestamp: next?.purchaseTimestamp,
          purchaseTimestampIso:
            next?.purchaseTimestamp !== undefined ? new Date(next.purchaseTimestamp * 1000).toISOString() : undefined,
          duringSale: next?.duringSale,
        });
        if (!next || next.purchaseTimestamp === undefined) return undefined;
        return {
          researchId: next.research.id,
          duringSale: !!next.duringSale,
          purchaseTimestamp: next.purchaseTimestamp,
        };
      },
      researchId => {
        const item = getNextCandidate();
        const research = getResearchById(researchId);
        if (!research) return false;
        if (item) syncEventStateForItem(item);
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

// Repeatedly buys the best-ranked ROI research that still passes the 70%-by-next-sale check,
// recalculating the list after each purchase (since buying one research changes the math for the
// rest). Items that fail the check are skipped rather than treated as a stopping point, since a
// cheaper lower-ranked item may still be affordable in time.
async function handleBuyUntilSaleWarning() {
  await runSaleAwareBuyFlow('handleBuyUntilSaleWarning', () => nextRoiCandidate.value);
}

// Best-ranked buyable ROI item that would earn back 100% of its cost before the next sale starts —
// a stricter bar than "Buy Until Sale Warning"'s 70%, for confidently stocking up ahead of a
// deadline. Same `meetsSaleAwareDeadline`-based rule as nextRoiCandidate, just with `100` instead
// of `70` — see that computed's comment, and `meetsSaleAwareDeadline`'s own doc comment, for why
// `duringSale` items aren't pre-excluded here either.
const nextRoiDeadlineCandidate = computed(() =>
  sortedResearches.value.find(item => meetsSaleAwareDeadline(item, nextSaleStart.value, 100))
);

const canBuyUntilROIDeadline = computed(() => !!nextRoiDeadlineCandidate.value);

// Repeatedly buys the best-ranked ROI research that would earn back 100% of its cost before the
// next sale starts, recalculating after each purchase. See `runSaleAwareBuyFlow` — identical shape
// to handleBuyUntilSaleWarning, differing only in nextRoiDeadlineCandidate's stricter 100%-by-
// deadline bar vs. nextRoiCandidate's 70%.
async function handleBuyUntilROIDeadline() {
  await runSaleAwareBuyFlow('handleBuyUntilROIDeadline', () => nextRoiDeadlineCandidate.value);
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
