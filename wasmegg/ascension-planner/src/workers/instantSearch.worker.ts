/**
 * Web Worker for Chain Finder: keeps the loaded table and runs the route search on it (find, then
 * the polish and any waits for eggs), so the page stays responsive while a search runs. For Chain
 * comparison it also keeps the table's quickest legs (worked out in the background once a table
 * loads) and the last chain space found, which the page filters by message.
 */
import { chainPricer, findRoutes, polishFound, type ChainPricer, type FindOptions } from '@/lib/instantSearch/routeFinder';
import {
  createLegHours,
  enumerateChains,
  fillLegHours,
  filterSpace,
  type ChainSpace,
  type LegHours,
} from '@/lib/instantSearch/chainSpace';
import { readTable, unpackTableBytes, type Table } from '@/lib/instantSearch/table';
import type { InstantSearchRequest, InstantSearchResponse } from './instantSearch.protocol';

// `Worker`, not `DedicatedWorkerGlobalScope`: see researchCalc.worker.ts (dom and webworker libs clash).
const ctx = self as unknown as Worker;

/** The highest TE there is (stores/instantSearch.ts MAX_TE): the quickest legs go up to it. */
const TOP_TE = 490;
/** Waits are worked out for the matches only when they should take about this long at most. */
const WAIT_BUDGET_MS = 3000;

let table: Table | null = null;
/** The table's quickest legs, filled a few TEs at a time between other messages. */
let legHours: LegHours | null = null;
let legHoursReady: Promise<void> | null = null;
/** Told how far the quickest legs have got, while a 'space' request waits for them. */
let onLegHours: ((done: number, of: number) => void) | null = null;

/** The last chain space and what it was found for. */
let space: { chains: ChainSpace; options: Omit<FindOptions, 'onProgress'>; pricer: ChainPricer } | null = null;
/** The newest 'filter' request: waits for an older one stop. */
let latestFilter = -1;
/** Milliseconds per chain's waits, as measured so far (a first guess until then). */
let perWait = 15;

function post(message: InstantSearchResponse): void {
  ctx.postMessage(message);
}

const breathe = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Fill the quickest legs for `t`, yielding often so searches run meanwhile. */
function startLegHours(t: Table): Promise<void> {
  const lh = createLegHours(t.header.from, t.header.to, TOP_TE);
  legHours = lh;
  const of = t.header.to - t.header.from + 1;
  return (async () => {
    while (legHours === lh && fillLegHours(lh, t.lookup)) {
      onLegHours?.(t.header.to + 1 - lh.filledDownTo, of);
      await breathe();
    }
  })();
}

ctx.onmessage = async (event: MessageEvent<InstantSearchRequest>) => {
  const msg = event.data;
  try {
    if (msg.kind === 'load') {
      table = readTable(await unpackTableBytes(msg.bytes));
      space = null;
      legHoursReady = startLegHours(table);
      post({ type: 'loaded', requestId: msg.requestId, header: table.header });
      return;
    }
    if (!table) throw new Error('no table loaded');
    const t0 = performance.now();

    if (msg.kind === 'space') {
      const t = table;
      onLegHours = (done, of) => post({ type: 'progress', requestId: msg.requestId, done, of, stage: 'bound' });
      await legHoursReady;
      onLegHours = null;
      if (t !== table || !legHours) throw new Error('the table changed');
      const pricer = chainPricer(t.lookup, msg.options, msg.route.legs[0]?.continued === true);
      const base = pricer.price(msg.route.chain);
      const f = msg.filter;
      const chains = enumerateChains(t.lookup, legHours, msg.options, msg.route, f.limit, {
        minGap: f.minGap,
        maxGap: f.maxGap,
        windows: f.windows,
        onProgress: found => post({ type: 'progress', requestId: msg.requestId, done: found, of: 0, stage: 'chains' }),
      });
      space = { chains, options: msg.options, pricer };
      post({
        type: 'space',
        requestId: msg.requestId,
        summary: { count: chains.count, capped: chains.capped, searched: f, base, ms: performance.now() - t0 },
      });
      return;
    }

    if (msg.kind === 'filter') {
      if (!space) throw new Error('no chains to filter');
      latestFilter = msg.requestId;
      const s = space;
      const matches = filterSpace(s.chains, s.options.startTE, msg.filter);
      const n = s.chains.legs;
      const chainOf = (c: number) => Array.from(s.chains.stops.subarray(c * n, (c + 1) * n));
      const shown = matches.length <= msg.show ? matches : null;
      const routes = shown?.flatMap(c => s.pricer.price(chainOf(c)) ?? []) ?? null;
      const waits =
        !!shown && !!s.options.waitForEggs && shown.length > 0 && shown.length * perWait <= WAIT_BUDGET_MS;
      post({ type: 'filtered', requestId: msg.requestId, matches: matches.length, routes, waits, perWait });
      if (!waits) return;
      // A few at a time, so a newer filter can stop this one.
      const waited = [];
      let spent = 0;
      for (const [i, c] of shown!.entries()) {
        await breathe();
        if (latestFilter !== msg.requestId || space !== s) return;
        const w0 = performance.now();
        const r = s.pricer.withWaits(chainOf(c));
        spent += performance.now() - w0;
        if (r) waited.push(r);
        post({ type: 'progress', requestId: msg.requestId, done: i + 1, of: shown!.length, stage: 'waits' });
      }
      perWait = Math.max(1, spent / shown!.length);
      post({ type: 'waited', requestId: msg.requestId, routes: waited });
      return;
    }

    const options = {
      ...msg.options,
      onProgress: (done: number, of: number) => post({ type: 'progress', requestId: msg.requestId, done, of }),
    };
    const found = polishFound(table.lookup, msg.options, findRoutes(table.lookup, options), (done, of) =>
      msg.options.waitForEggs ? post({ type: 'progress', requestId: msg.requestId, done, of, stage: 'waits' }) : undefined
    );
    post({ type: 'result', requestId: msg.requestId, found, ms: performance.now() - t0 });
  } catch (err) {
    post({ type: 'error', requestId: msg.requestId, message: err instanceof Error ? err.message : String(err) });
  }
};
