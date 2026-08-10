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

        <!-- Beam width / Phase 3 attempts -->
        <div class="flex gap-3">
          <div class="flex-1 space-y-1.5">
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
          <div class="flex-1 space-y-1.5">
            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phase 3 Attempts</label>
            <input
              v-model.number="phase3AttemptsPerGeneration"
              type="number"
              min="1"
              step="1"
              class="input-premium w-full"
              :disabled="status === 'running'"
            />
            <p class="text-[9px] text-slate-400 leading-tight px-0.5">
              How many branches per generation get a real delivery-research evaluation. Higher can find a better plan
              but is the single most expensive setting to raise — tens of seconds per few points.
            </p>
          </div>
        </div>

        <!-- Diagnostics toggle -->
        <label class="flex items-start gap-2 px-0.5 cursor-pointer">
          <input v-model="traceEnabled" type="checkbox" class="mt-0.5" :disabled="status === 'running'" />
          <span class="text-[9px] text-slate-500 leading-tight">
            <span class="font-bold text-slate-600">Detailed diagnostics</span> — exact per-generation history below,
            plus an exportable trace of the winning plan's alternatives at each step. Uses more memory; leave off for a
            normal run.
          </span>
        </label>

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

        <!-- Generation-by-generation diagnostics (tooling option #1) -->
        <div v-if="generationHistory.length > 0" class="border border-gray-200 rounded-lg overflow-hidden">
          <button
            class="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-[9px] font-bold text-gray-500 uppercase tracking-wider"
            @click="showGenerationHistory = !showGenerationHistory"
          >
            <span>Generation history ({{ generationHistory.length }})</span>
            <span>{{ showGenerationHistory ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showGenerationHistory" class="max-h-64 overflow-y-auto overflow-x-auto">
            <table class="w-full text-[9px] font-mono">
              <thead class="sticky top-0 bg-white">
                <tr class="text-gray-400 uppercase tracking-wider text-[8px]">
                  <th class="text-left px-2 py-1 font-bold">Gen</th>
                  <th class="text-right px-2 py-1 font-bold">Cand.</th>
                  <th class="text-right px-2 py-1 font-bold">Dup.</th>
                  <th class="text-right px-2 py-1 font-bold">Kept</th>
                  <th class="text-right px-2 py-1 font-bold">Tier</th>
                  <th class="text-right px-2 py-1 font-bold">Ph3</th>
                  <th class="text-right px-2 py-1 font-bold">Found</th>
                  <th class="text-right px-2 py-1 font-bold">Best/hr</th>
                  <th class="text-right px-2 py-1 font-bold">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in generationHistory" :key="row.depth" class="border-t border-gray-100">
                  <td class="text-left px-2 py-1 text-gray-700">{{ generationLabel(row) }}</td>
                  <td class="text-right px-2 py-1 text-gray-700">{{ row.candidatesGenerated }}</td>
                  <td class="text-right px-2 py-1 text-gray-400">{{ row.duplicatesRemoved }}</td>
                  <td class="text-right px-2 py-1 text-gray-700">{{ row.beamSize }}</td>
                  <td class="text-right px-2 py-1 text-gray-700">
                    {{ row.tierMacroSuccesses }}/{{ row.tierMacroAttempts }}
                  </td>
                  <td class="text-right px-2 py-1 text-gray-700">{{ row.phase3Successes }}/{{ row.phase3Attempts }}</td>
                  <td class="text-right px-2 py-1 text-gray-700">{{ row.finishedCount }}</td>
                  <td class="text-right px-2 py-1 text-gray-700">{{ formatNumber(row.bestScoreSoFar * 3600) }}</td>
                  <td class="text-right px-2 py-1 text-gray-400">{{ row.durationMs }}ms</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-[8px] text-slate-400 px-2 py-1 leading-tight">
            Tier/Ph3 columns read "successes/attempts". Without Detailed Diagnostics on, a row can span more than one
            generation (progress updates are throttled) — the Gen column shows the range when that happens.
          </p>
        </div>

        <!-- Cancelled -->
        <p v-if="status === 'cancelled'" class="text-[10px] text-slate-500 text-center italic px-2">
          Search cancelled.
        </p>

        <!-- Error -->
        <div v-if="status === 'error'" class="space-y-2">
          <p class="text-[10px] text-red-500 text-center px-2 leading-tight">{{ errorMessage }}</p>
          <button
            v-if="isMissingBackupError && fetchablePlayerId"
            class="btn-premium w-full text-[10px] bg-slate-100 text-slate-600 disabled:opacity-50"
            :disabled="fetchingBackup"
            @click="handleFetchBackup"
          >
            {{ fetchingBackup ? 'Fetching…' : 'Fetch Player Data' }}
          </button>
          <p v-else-if="isMissingBackupError" class="text-[9px] text-slate-400 text-center px-2 leading-tight">
            No player ID available in this browser — realistic delivery-rate scoring needs a fetched backup.
          </p>
          <p v-if="fetchBackupError" class="text-[9px] text-red-400 text-center px-2 leading-tight">
            {{ fetchBackupError }}
          </p>
        </div>

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
          <button
            v-if="result.trace"
            class="btn-premium w-full text-[10px] bg-slate-100 text-slate-600"
            @click="handleExportTrace"
          >
            Export Trace ({{ result.trace.steps.length }} steps)
          </button>
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
import { useInitialStateStore } from '@/stores/initialState';
import { getLocalTimestampInTimezone, getNextPacificTime } from '@/lib/events';
import { formatDuration, formatNumber, formatUnixToDateInput, formatUnixToTimeInput } from '@/lib/format';
import { summarizeResearchLevelChanges } from '@/calculations/smartBuyPreview';
import { useBeamSearch, type GenerationSummary } from '@/composables/useBeamSearch';
import { fetchPlayerBackup } from '@/lib/modes/fetchBackup';
import { resolveFetchablePlayerId } from '@/lib/modes/utils';
import { downloadFile } from '@/utils/export';
import { PHASE3_MACRO_ATTEMPTS_PER_GENERATION, type BeamSearchResult } from '@/beam-search/engine';
import SmartBuyCard from './SmartBuyCard.vue';
import ResearchPurchasePreview from './ResearchPurchasePreview.vue';

const emit = defineEmits<{
  (e: 'apply', result: BeamSearchResult): void;
}>();

const virtueStore = useVirtueStore();
const actionsStore = useActionsStore();
const commonResearchStore = useCommonResearchStore();
const initialStateStore = useInitialStateStore();
const beamSearch = useBeamSearch();
const { status, progress, result, errorMessage, generationHistory } = beamSearch;

/**
 * runBeamSearch's own guard (engine/index.ts) throws this exact message when
 * `context.rawBackup` is missing. `initLoadPlan` backfills a redacted backup into any plan
 * missing one as soon as it's loaded (see `backfillMissingBackup`, lib/modes/utils.ts), so this
 * should now be rare — it still fires for a plan whose backfill itself failed (no resolvable
 * player ID, fetch error) or hasn't completed yet. See ResearchFlatView.vue's "Artifact Data
 * Required" panel for the same situation in the ELR view. Matched by substring since the worker
 * only ever forwards a plain string message (beamSearch.worker.ts), not an error code.
 */
const isMissingBackupError = computed(
  () => status.value === 'error' && (errorMessage.value ?? '').includes('requires context.rawBackup')
);

const fetchingBackup = ref(false);
const fetchBackupError = ref<string | null>(null);

/**
 * `initialStateStore.playerId` is not trustworthy here — confirmed live: a plan loaded from the
 * library has it redacted to the literal placeholder `'xxxxxxxxxx'` (same privacy reason a plan
 * predating `redactBackupForStorage`, or saved with no resolvable player ID, may still be missing
 * `rawBackup`), and passing that straight to `fetchPlayerBackup` doesn't fail cleanly — it reaches
 * the proxy and comes back as a cryptic "invalid literal for int() with base 10: 'xxxxxxxxxx'" 500.
 * `resolveFetchablePlayerId` (lib/modes/utils.ts) handles this: only trusts the store's `playerId`
 * if it actually matches the real ID format, and otherwise falls back to the site-wide "last used
 * player ID" — the same one `the-player-id-form` (App.vue) itself reads/writes via
 * `lib/storage.ts`'s `getSavedPlayerID` — which is populated independently of whatever plan
 * happens to be loaded. Shared with `initLoadPlan`'s own backfill-on-load use of the same helper.
 */
const fetchablePlayerId = computed<string | undefined>(() => resolveFetchablePlayerId());

/**
 * Fetches a fresh backup and stashes it as `initialStateStore.rawBackup` — the one field
 * `runBeamSearch` actually needs (engine/macros.ts's `computeRealisticELR` pipeline) — and
 * nothing else. Deliberately NOT App.vue's `handleRefreshReconcile`/`refreshReconcile` path: that
 * also resyncs Virtue/FuelTank state via `loadAndSyncBackup`, which overwrites the live plan's
 * `shiftCount`/`te` with the backup's values (virtue.ts's `setInitialState`) — exactly what must
 * NOT happen here, since this can run against an in-progress plan that's already diverged from
 * the live backup by design. Deliberately also does NOT overwrite `initialStateStore.playerId`
 * (still left redacted if it was) — only `rawBackup` is what this feature needs. Clears the error
 * afterward so the ordinary Run button reappears; doesn't auto-rerun the search itself — that
 * stays an explicit user action.
 */
async function handleFetchBackup() {
  const playerId = fetchablePlayerId.value;
  if (!playerId || fetchingBackup.value) return;
  fetchingBackup.value = true;
  fetchBackupError.value = null;
  try {
    const { backup } = await fetchPlayerBackup(playerId);
    initialStateStore.rawBackup = backup;
    status.value = 'idle';
    errorMessage.value = null;
  } catch (err) {
    fetchBackupError.value = err instanceof Error ? err.message : String(err);
  } finally {
    fetchingBackup.value = false;
  }
}

/** Same formula ResearchActions.vue's own absoluteSimTimeAt/useResearchViews.ts's
 *  researchSaleDeadline use everywhere else — kept local rather than imported since it's a two-line
 *  closure over this component's own store instances, not shared logic. */
function absoluteSimTimeNow(): number {
  const baseTimestamp = virtueStore.planStartTime.getTime() / 1000;
  return baseTimestamp + (actionsStore.effectiveSnapshot.lastStepTime - actionsStore.planStartOffset);
}

const DEFAULT_BEAM_WIDTH = 50;
const beamWidth = ref(DEFAULT_BEAM_WIDTH);
// Seeded from the engine's own default so this input and a from-code call never silently disagree —
// see search.ts's PHASE3_MACRO_ATTEMPTS_PER_GENERATION doc comment for what this actually controls.
const phase3AttemptsPerGeneration = ref(PHASE3_MACRO_ATTEMPTS_PER_GENERATION);

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

const canRun = computed(
  () => beamWidth.value >= 1 && phase3AttemptsPerGeneration.value >= 1 && !!deadlineDate.value && !!deadlineTime.value
);

// Off by default — see the checkbox's own label text for the memory-cost tradeoff this turns on
// (../composables/useBeamSearch.ts's GenerationSummary/BeamSearchOptions.trace's doc comments).
const traceEnabled = ref(false);

function handleRun() {
  if (!canRun.value) return;
  beamSearch.start(
    deadlineTimestamp.value,
    beamWidth.value,
    undefined,
    traceEnabled.value,
    phase3AttemptsPerGeneration.value
  );
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

// Collapsed by default (tooling option #1's "not an overwhelming swarm of logs" requirement) — the
// header row above always shows the run's own live/final summary regardless of this toggle.
const showGenerationHistory = ref(false);

/** "Gen 43" for an ordinary one-generation row, "Gen 43–47" when progress-throttling coalesced
 *  several generations into one message (see GenerationSummary's own doc comment — doesn't happen
 *  at all once Detailed Diagnostics is on). */
function generationLabel(row: GenerationSummary): string {
  return row.fromDepth === row.depth - 1 ? `${row.depth}` : `${row.fromDepth + 1}–${row.depth}`;
}

/**
 * Bundles the full result (including its winning-path trace) and the generation-by-generation
 * history into one downloadable JSON file — tooling option #2 in ../beam-search/HANDOFF.md's "Live
 * verification" follow-up. Uses the same downloadFile utility PlanLibrary.vue/stores/actions/io.ts
 * already use for exporting plans, rather than a bespoke download mechanism.
 */
function handleExportTrace() {
  if (!result.value?.trace) return;
  const payload = {
    exportedAt: new Date().toISOString(),
    deadline: deadlineTimestamp.value,
    beamWidth: beamWidth.value,
    phase3AttemptsPerGeneration: phase3AttemptsPerGeneration.value,
    result: result.value,
    generationHistory: generationHistory.value,
  };
  const filename = `beam-search-trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
}
</script>
