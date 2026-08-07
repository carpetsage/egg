<template>
  <div class="space-y-4">
    <SmartBuyCard title="Beam Search">
      <template #icon>
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      </template>
      <template #description>
        Searches ahead for the best order to buy research before a deadline you pick, then applies the whole winning
        plan in one shot. Best once ordinary research already takes several minutes to buy — sweep up anything trivially
        cheap with Quick Buy first.
      </template>

      <div class="space-y-3">
        <!-- Deadline -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deadline</label>
            <button
              class="text-[9px] font-bold text-brand-primary hover:underline"
              :disabled="status === 'running'"
              @click="useNextSaleEnd"
            >
              Use next sale end
            </button>
          </div>
          <div class="flex gap-1.5">
            <input
              v-model="deadlineDate"
              type="date"
              class="input-premium flex-grow"
              :disabled="status === 'running'"
            />
            <input v-model="deadlineTime" type="time" class="input-premium w-24" :disabled="status === 'running'" />
          </div>
          <select v-model="deadlineTimezone" class="input-premium w-full" :disabled="status === 'running'">
            <option v-for="tz in allTimezones" :key="tz.value" :value="tz.value">{{ tz.label }}</option>
          </select>
        </div>

        <!-- Beam width -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Beam Width</label>
          <input
            v-model.number="beamWidth"
            type="number"
            min="1"
            step="1"
            class="input-premium w-full"
            :disabled="status === 'running'"
          />
          <p class="text-[9px] text-slate-400 leading-tight px-0.5">
            Higher finds a better plan but takes longer to run — tens of seconds is typical.
          </p>
        </div>

        <button
          v-if="status !== 'running'"
          class="btn-premium btn-primary w-full text-[10px] disabled:opacity-20"
          :disabled="!canRun"
          @click="handleRun"
        >
          Run
        </button>
        <button v-else class="btn-premium w-full text-[10px] bg-slate-200 text-slate-700" @click="beamSearch.cancel">
          Cancel
        </button>

        <!-- Live progress -->
        <div v-if="status === 'running'" class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div class="flex flex-wrap justify-center gap-x-5 gap-y-2 text-center">
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
                >Generation</span
              >
              <span class="text-xs font-mono font-bold text-gray-900 leading-none">{{ progress?.depth ?? 0 }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
                >Beam Size</span
              >
              <span class="text-xs font-mono font-bold text-gray-900 leading-none">{{ progress?.beamSize ?? 0 }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
                >Best Delivery Rate</span
              >
              <span class="text-xs font-mono font-bold text-gray-900 leading-none"
                >{{ formatNumber((progress?.bestScoreSoFar ?? 0) * 3600) }}/hr</span
              >
            </div>
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Elapsed</span>
              <span class="text-xs font-mono font-bold text-gray-900 leading-none">{{
                formatDuration((progress?.elapsedMs ?? 0) / 1000)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Cancelled -->
        <p v-if="status === 'cancelled'" class="text-[10px] text-slate-500 text-center italic px-2">
          Search cancelled.
        </p>

        <!-- Error -->
        <p v-if="status === 'error'" class="text-[10px] text-red-500 text-center px-2 leading-tight">
          {{ errorMessage }}
        </p>

        <!-- Result -->
        <template v-if="status === 'done' && result">
          <ResearchPurchasePreview :items="previewItems" label="Winning plan" empty-text="Nothing to buy" />

          <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div class="flex flex-wrap justify-center gap-x-5 gap-y-2 text-center">
              <div class="flex flex-col">
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
                  >Delivery Rate</span
                >
                <span class="text-xs font-mono font-bold text-gray-900 leading-none"
                  >{{ formatNumber(result.score * 3600) }}/hr</span
                >
              </div>
              <div class="flex flex-col">
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
                  >Purchases</span
                >
                <span class="text-xs font-mono font-bold text-gray-900 leading-none">{{
                  result.researchIds.length
                }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
                  >Last Purchase</span
                >
                <span class="text-xs font-mono font-bold text-gray-900 leading-none">{{ lastPurchaseLabel }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1"
                  >Search Time</span
                >
                <span class="text-xs font-mono font-bold text-gray-900 leading-none">{{
                  formatDuration(result.metrics.runtimeMs / 1000)
                }}</span>
              </div>
            </div>
          </div>

          <button class="btn-premium btn-primary w-full text-[10px]" @click="emit('apply', result)">Apply Plan</button>
        </template>
      </div>
    </SmartBuyCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVirtueStore } from '@/stores/virtue';
import { useActionsStore } from '@/stores/actions';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { getLocalTimestampInTimezone, getNextPacificTime } from '@/lib/events';
import { formatDuration, formatNumber, formatUnixToDateInput, formatUnixToTimeInput } from '@/lib/format';
import { summarizeResearchLevelChanges } from '@/calculations/smartBuyPreview';
import { useBeamSearch } from '@/composables/useBeamSearch';
import type { BeamSearchResult } from '@/beam-search/engine';
import SmartBuyCard from './SmartBuyCard.vue';
import ResearchPurchasePreview from './ResearchPurchasePreview.vue';

const emit = defineEmits<{
  (e: 'apply', result: BeamSearchResult): void;
}>();

const virtueStore = useVirtueStore();
const actionsStore = useActionsStore();
const commonResearchStore = useCommonResearchStore();
const beamSearch = useBeamSearch();
const { status, progress, result, errorMessage } = beamSearch;

/** Same formula ResearchActions.vue's own absoluteSimTimeAt/useResearchViews.ts's
 *  researchSaleDeadline use everywhere else — kept local rather than imported since it's a two-line
 *  closure over this component's own store instances, not shared logic. */
function absoluteSimTimeNow(): number {
  const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
  return baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - actionsStore.planStartOffset);
}

const DEFAULT_BEAM_WIDTH = 50;
const beamWidth = ref(DEFAULT_BEAM_WIDTH);

const deadlineTimezone = ref(virtueStore.ascensionTimezone);
// Defaults to the next research sale's end (the next Saturday 9am Pacific) — per
// ../../beam-search/HANDOFF.md's convergence notes, "the only realistic deadlines" this feature was
// actually validated against. Still a plain, freely-editable date/time/timezone input underneath —
// this is just a sane starting point, not a constraint.
const initialDeadline = getNextPacificTime(6, 9, absoluteSimTimeNow());
const deadlineDate = ref(formatUnixToDateInput(initialDeadline, deadlineTimezone.value));
const deadlineTime = ref(formatUnixToTimeInput(initialDeadline, deadlineTimezone.value));

function useNextSaleEnd() {
  const next = getNextPacificTime(6, 9, absoluteSimTimeNow());
  deadlineDate.value = formatUnixToDateInput(next, deadlineTimezone.value);
  deadlineTime.value = formatUnixToTimeInput(next, deadlineTimezone.value);
}

const allTimezones = computed(() => {
  try {
    return Intl.supportedValuesOf('timeZone')
      .map(tz => {
        const parts = tz.split('/');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        const region = parts.length > 1 ? parts[0] : '';
        return { value: tz, label: region ? `${city} (${region})` : city, region, city };
      })
      .sort((a, b) => (a.region !== b.region ? a.region.localeCompare(b.region) : a.city.localeCompare(b.city)));
  } catch {
    return [{ value: 'America/Los_Angeles', label: 'Los Angeles (America)', region: 'America', city: 'Los Angeles' }];
  }
});

const deadlineTimestamp = computed(() =>
  getLocalTimestampInTimezone(deadlineDate.value, deadlineTime.value, deadlineTimezone.value)
);

const canRun = computed(() => beamWidth.value >= 1 && !!deadlineDate.value && !!deadlineTime.value);

function handleRun() {
  if (!canRun.value) return;
  beamSearch.start(deadlineTimestamp.value, beamWidth.value);
}

const previewItems = computed(() =>
  result.value ? summarizeResearchLevelChanges(commonResearchStore.researchLevels, result.value.endLevels) : []
);

const lastPurchaseLabel = computed(() => {
  if (!result.value) return '';
  return new Date(result.value.lastPurchaseTime * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: deadlineTimezone.value,
  });
});
</script>
