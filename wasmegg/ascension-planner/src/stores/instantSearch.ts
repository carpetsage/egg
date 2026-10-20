/**
 * Chain Finder state: the target (a TE, or the highest TE by a date), where the plan starts, the
 * precomputed table and the last answer. Its own store, like the Table Builder's, so an answer stays
 * put when the user switches tabs.
 *
 * The search itself runs on one Web Worker (workers/instantSearch.worker.ts) that keeps the table.
 */
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { useInitialStateStore } from '@/stores/initialState';
import { EGG_ORDER } from '@/lib/instantSearch/precomputedLeg';
import { mergeBlocked, type Blocked, type FoundRoutes } from '@/lib/instantSearch/routeFinder';
import { avoidBlocked, hoursBlocked } from '@/lib/instantSearch/blockedTime';
import type { TableHeader } from '@/lib/instantSearch/table';
import { readCurrentAscension, type CurrentAscension } from '@/lib/instantSearch/currentAscension';
import { parseVirtueProgress } from '@/lib/backupVirtue';
import { fetchPlayerBackup } from '@/lib/modes/fetchBackup';
import { resolveFetchablePlayerId } from '@/lib/modes/utils';
import type { ei } from 'lib';
import { countTEThresholdsPassed } from '@/lib/truthEggs';
import { getLocalTimestampInTimezone, PACIFIC_TIMEZONE } from '@/lib/events';
import { formatUnixToDateInput, formatUnixToTimeInput } from '@/lib/format';
import type { InstantSearchRequest, InstantSearchResponse } from '@/workers/instantSearch.protocol';

export type InstantTargetMode = 'te' | 'date';
export type StartMode = 'now' | 'hypothetical';

/** The highest TE there is, and By a date's target. */
export const MAX_TE = 490;
/** Most ascensions a route may have (AutoAutoAP's MAX_ASCENSIONS). */
export const MAX_ASCENSIONS = 12;
/** The maxed table built by scripts/buildTable.ts, served from public/. */
export const DEFAULT_TABLE_URL = `${import.meta.env.BASE_URL}instant/table.bin.gz`;

/** The next July 14th, 9:00 AM in Los Angeles, as a unix second. */
export function defaultDeadline(now = Date.now() / 1000): number {
  const year = Number(formatUnixToDateInput(now, PACIFIC_TIMEZONE).slice(0, 4));
  const at = (y: number) => getLocalTimestampInTimezone(`${y}-07-14`, '09:00', PACIFIC_TIMEZONE);
  return at(year) > now ? at(year) : at(year + 1);
}

/** The answer and what it was asked for, so the results keep showing the question they answer. */
export interface InstantAnswer {
  found: FoundRoutes;
  ms: number;
  mode: InstantTargetMode;
  startTE: number;
  start: number;
  final: number;
  deadline?: number;
  /** The time zone the answer's dates are shown in. */
  timezone: string;
  /** A hypothetical start (a chosen TE and moment), not the save right now. */
  hypothetical: boolean;
  /** The ascension in progress the routes start from (continued, or ended by prestiging now), or null. */
  inProgress: { claimedTE: number } | null;
  /** The filters the search ran with (`blockFilters`): days to avoid and blocked weekly hours, in
   *  `timezone`. */
  blocks: BlockFilters;
}

/** What the prestige filters are set to: compared to tell whether an answer is out of date. */
export interface BlockFilters {
  dates: string[];
  hours: number[];
  timezone: string;
}

/** Every number of ascensions, 1 to MAX_ASCENSIONS. */
export const ALL_COUNTS = () => Array.from({ length: MAX_ASCENSIONS }, (_, i) => i + 1);

/** The spans no prestige may start in, for a plan starting at `from`: the avoided days and the
 *  blocked hours laid out from then (lib/instantSearch/blockedTime.ts). */
export function blockedSpans(f: BlockFilters, from: number): Blocked {
  return mergeBlocked([...avoidBlocked(f.dates, f.timezone), ...hoursBlocked(f.hours, f.timezone, from)]);
}

export const useInstantSearchStore = defineStore('instantSearch', () => {
  const initialState = useInitialStateStore();

  const mode = ref<InstantTargetMode>('te');
  const targetTE = ref(MAX_TE);
  /** By a date's deadline, a unix second. The picker shows it in `timezone`; changing the zone keeps
   *  the moment and changes how it reads. */
  const deadline = ref(defaultDeadline());
  const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
  /**
   * A date input and a time input over one instant, both read in `timezone`: changing the zone keeps
   * the instant and changes how it reads. An emptied field is ignored.
   */
  function localInputs(instant: { value: number }) {
    const set = (d: string, t: string) => {
      const at = getLocalTimestampInTimezone(d, t, timezone.value);
      if (Number.isFinite(at)) instant.value = at;
    };
    const date = computed({
      get: () => formatUnixToDateInput(instant.value, timezone.value),
      set: v => set(v, time.value),
    });
    const time = computed({
      get: () => formatUnixToTimeInput(instant.value, timezone.value),
      set: v => set(date.value, v),
    });
    return { date, time };
  }
  const { date: deadlineDate, time: deadlineTime } = localInputs(deadline);

  /** 'now': the save as it is, right now. 'hypothetical': a prestige at a TE and moment of the user's
   *  choosing, ignoring the save. */
  const startMode = ref<StartMode>('now');
  /** The hypothetical start: a unix second (default: the next whole hour) and a TE (null: the save's). */
  const hypotheticalStart = ref(Math.ceil(Date.now() / 1000 / 3600) * 3600);
  const hypotheticalTE = ref<number | null>(null);
  const { date: hypotheticalDate, time: hypotheticalTime } = localInputs(hypotheticalStart);
  /** Filter: the numbers of ascensions to show (display only; the search looks at every count). */
  const ascensionCounts = ref<number[]>(ALL_COUNTS());
  /** Filter: days (YYYY-MM-DD, read in `timezone`) no prestige may start on. */
  const avoidDates = ref<string[]>([]);
  /** Filter: weekly hours (0-167, Monday 00:00 first, in `timezone`) no prestige may start in. */
  const blockedHours = ref<number[]>([]);
  const blockFilters = computed<BlockFilters>(() => ({
    dates: [...avoidDates.value],
    hours: [...blockedHours.value].sort((a, b) => a - b),
    timezone: timezone.value,
  }));
  const anyBlocks = (f: BlockFilters) => f.dates.length > 0 || f.hours.length > 0;
  /** The prestige filters differ from what the shown answer was found with (the zone only counts
   *  when some filter is on, either then or now). */
  const avoidChanged = computed(() => {
    const was = answer.value?.blocks;
    if (!was) return false;
    const now = blockFilters.value;
    if (!anyBlocks(was) && !anyBlocks(now)) return false;
    return JSON.stringify(was) !== JSON.stringify(now);
  });

  const header = shallowRef<TableHeader | null>(null);
  const tableSource = ref('');
  const tableStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const status = ref<'idle' | 'running' | 'done' | 'error'>('idle');
  const progress = ref<{ done: number; of: number } | null>(null);
  const answer = shallowRef<InstantAnswer | null>(null);
  const error = ref('');

  /** A backup fetched from this tab (`refreshBackup`), newer than the loaded save's. Only Instant
   *  Search reads it: the rest of the page keeps the save it loaded. */
  const refreshedBackup = shallowRef<ei.IBackup | null>(null);
  /** The backup Chain Finder reads: the refreshed one, else the loaded save's, as it came. */
  const backup = computed(() => refreshedBackup.value ?? (initialState.hasData ? initialState.rawBackup : null));
  const refreshing = ref(false);

  /** The ascension in progress in `backup`, as of `detect()` (lib/instantSearch/currentAscension.ts). */
  const current = shallowRef<CurrentAscension | null>(null);
  /** Read the ascension in progress again, its catch-up worked out to now. */
  function detect(now = Math.floor(Date.now() / 1000)): void {
    try {
      current.value = backup.value ? readCurrentAscension(backup.value, now) : null;
    } catch (err) {
      console.error('Chain Finder: could not read the current ascension', err);
      current.value = null;
    }
  }

  /** Fetch the player's latest backup for this tab, and read the ascension in progress from it. */
  async function refreshBackup(): Promise<void> {
    const playerId = resolveFetchablePlayerId();
    if (!playerId || refreshing.value) return;
    refreshing.value = true;
    error.value = '';
    try {
      refreshedBackup.value = (await fetchPlayerBackup(playerId)).backup;
      detect();
    } catch (err) {
      error.value = `Couldn't fetch your latest backup: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      refreshing.value = false;
    }
  }
  /** Another save loaded on the page replaces anything fetched here. */
  function onSaveLoaded(): void {
    refreshedBackup.value = null;
    detect();
  }

  /** The save's egg counts in table order (catch-up included when an ascension is in progress), or
   *  null with no save loaded. */
  const saveDelivered = computed<number[] | null>(() => {
    if (current.value) return current.value.delivered;
    if (!backup.value) return null;
    const { eggsDelivered } = parseVirtueProgress(backup.value);
    return EGG_ORDER.map(e => eggsDelivered[e] || 0);
  });
  /** The TE the save would prestige with: every threshold its eggs have passed (claimed + pending). */
  const saveTE = computed(() =>
    saveDelivered.value ? saveDelivered.value.reduce((n, d) => n + countTEThresholdsPassed(d), 0) : null
  );
  /** Starting from the save right now (needs a save): then the ascension in progress can continue.
   *  Otherwise the start is hypothetical. */
  const fromSave = computed(() => startMode.value === 'now' && saveTE.value !== null);
  const startTE = computed(() => (fromSave.value ? saveTE.value! : (hypotheticalTE.value ?? saveTE.value ?? 0)));
  /** When the plan starts: now, or the hypothetical moment. */
  const startAt = (now: number) => (fromSave.value ? now : hypotheticalStart.value);

  let worker: Worker | null = null;
  let nextRequestId = 0;
  const pending = new Map<number, (r: InstantSearchResponse) => void>();

  function send(message: InstantSearchRequest, transfer: Transferable[] = []): void {
    if (!worker) {
      worker = new Worker(new URL('../workers/instantSearch.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<InstantSearchResponse>) => pending.get(event.data.requestId)?.(event.data);
      worker.onerror = (event: ErrorEvent) => {
        for (const handler of pending.values())
          handler({ type: 'error', requestId: -1, message: event.message || 'Chain Finder worker failed' });
        pending.clear();
        worker?.terminate();
        worker = null;
      };
    }
    worker.postMessage(message, transfer);
  }

  /** Hand a table's bytes to the worker; resolves with its header. */
  function loadBytes(bytes: ArrayBuffer, source: string): Promise<void> {
    const requestId = nextRequestId++;
    tableStatus.value = 'loading';
    error.value = '';
    return new Promise(resolve => {
      pending.set(requestId, r => {
        pending.delete(requestId);
        if (r.type === 'loaded') {
          header.value = r.header;
          tableSource.value = source;
          tableStatus.value = 'ready';
        } else if (r.type === 'error') {
          header.value = null;
          tableStatus.value = 'error';
          error.value = `Couldn't read the table (${source}): ${r.message}`;
        }
        resolve();
      });
      send({ kind: 'load', requestId, bytes }, [bytes]);
    });
  }

  async function loadDefaultTable(): Promise<void> {
    tableStatus.value = 'loading';
    try {
      const response = await fetch(DEFAULT_TABLE_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await loadBytes(await response.arrayBuffer(), 'maxed table');
    } catch (err) {
      tableStatus.value = 'error';
      error.value = `Couldn't download the table: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  async function loadFile(file: File): Promise<void> {
    await loadBytes(await file.arrayBuffer(), file.name);
    answer.value = null;
    status.value = 'idle';
  }

  /** What's wrong with the inputs for the loaded table, or '' when a search can run. */
  const problem = computed(() => {
    const h = header.value;
    const te = startTE.value;
    if (!h) return '';
    // Continuing needs no table row at the start TE; a prestige does.
    const canContinue = fromSave.value && !!current.value;
    if (!Number.isInteger(te) || (!canContinue && (te < h.from || te > h.to)))
      return `The table covers start TEs ${h.from}–${h.to}; you start at ${te}.`;
    if (mode.value === 'te' && !(Number.isInteger(targetTE.value) && targetTE.value > te && targetTE.value <= MAX_TE))
      return `Pick a target TE above ${te}, up to ${MAX_TE}.`;
    if (mode.value === 'date' && !(deadline.value > startAt(Date.now() / 1000)))
      return fromSave.value ? 'Pick a date in the future.' : 'Pick a date after the hypothetical start.';
    return '';
  });

  async function search(): Promise<void> {
    if (status.value === 'running') return;
    if (tableStatus.value !== 'ready') await loadDefaultTable();
    if (tableStatus.value !== 'ready' || problem.value) return;
    const now = Math.floor(Date.now() / 1000);
    // The catch-up runs to the moment the search starts from.
    if (fromSave.value) detect(now);
    const te = startTE.value;
    const cont = fromSave.value ? (current.value?.build ?? null) : null;
    const asked: Omit<InstantAnswer, 'found' | 'ms'> = {
      mode: mode.value,
      startTE: te,
      start: startAt(now),
      final: mode.value === 'date' ? MAX_TE : targetTE.value,
      ...(mode.value === 'date' ? { deadline: deadline.value } : {}),
      timezone: timezone.value,
      hypothetical: !fromSave.value,
      inProgress: cont && current.value ? { claimedTE: current.value.claimedTE } : null,
      blocks: blockFilters.value,
    };
    const avoid = anyBlocks(asked.blocks) ? blockedSpans(asked.blocks, asked.start) : [];
    // The save's real counts only when starting from the save's own TE; a typed start TE uses the
    // table's canonical share.
    const delivered = fromSave.value ? saveDelivered.value : null;
    const requestId = nextRequestId++;
    status.value = 'running';
    progress.value = null;
    error.value = '';
    await new Promise<void>(resolve => {
      pending.set(requestId, r => {
        if (r.type === 'progress') {
          progress.value = { done: r.done, of: r.of };
          return;
        }
        pending.delete(requestId);
        if (r.type === 'result') {
          answer.value = { ...asked, found: r.found, ms: r.ms };
          status.value = 'done';
        } else if (r.type === 'error') {
          status.value = 'error';
          error.value = r.message;
        }
        resolve();
      });
      send({
        kind: 'search',
        requestId,
        options: {
          startTE: asked.startTE,
          start: asked.start,
          final: asked.final,
          maxAscensions: MAX_ASCENSIONS,
          ...(asked.deadline !== undefined ? { deadline: asked.deadline } : {}),
          ...(delivered ? { startDelivered: [...delivered] } : {}),
          ...(cont ? { cont: { ...cont, delivered: [...cont.delivered] } } : {}),
          ...(avoid.length ? { avoid } : {}),
          ...(cont && current.value ? { contEgg: EGG_ORDER.indexOf(current.value.egg) } : {}),
        },
      });
    });
  }

  return {
    mode,
    targetTE,
    deadlineDate,
    deadlineTime,
    timezone,
    startMode,
    hypotheticalStart,
    hypotheticalTE,
    hypotheticalDate,
    hypotheticalTime,
    ascensionCounts,
    avoidDates,
    blockedHours,
    avoidChanged,
    header,
    tableSource,
    tableStatus,
    status,
    progress,
    answer,
    error,
    current,
    detect,
    backup,
    refreshing,
    refreshBackup,
    onSaveLoaded,
    fromSave,
    saveTE,
    startTE,
    deadline,
    problem,
    loadDefaultTable,
    loadFile,
    search,
  };
});
