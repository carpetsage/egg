/**
 * Web Worker entry point for the beam search research-purchase optimizer.
 *
 * Thin wrapper only — per ../beam-search/HANDOFF.md's Phase B plan, all search logic lives in
 * ../beam-search/engine/* (runBeamSearch is the only real call here). This file's job is just:
 * wire the message protocol (./beamSearch.protocol.ts) to runBeamSearch's synchronous call +
 * onProgress callback, throttle progress postMessages, sanitize rawBackup, and track cancellation.
 *
 * Loaded via Vite's native worker support — no bundler config needed:
 *   new Worker(new URL('./beamSearch.worker.ts', import.meta.url), { type: 'module' })
 *
 * `engine/compute.ts`/`engine/apply/*`/`calculations/*` (everything runBeamSearch touches) were
 * verified Pinia-free (../beam-search/06-egg-codebase-integration.md §5) — safe to import here. Do
 * NOT import `engine/adapter.ts` from this file or anything it calls: its Pinia-store branch
 * (`createBaseEngineState`'s no-snapshot fallback, `getSimulationContext`) throws immediately
 * outside a Pinia context. Building `startState`/`context` is the main thread's job (the Phase C
 * composable, useBeamSearch.ts) — this worker only ever receives them, already built, over
 * `postMessage`.
 *
 * **The `cancel` message below is accepted but, in practice, effectively unreachable while a run is
 * actually busy** — confirmed directly against a real browser, not guessed. `runBeamSearch` runs as
 * one big synchronous call with no `await`/yield point inside it, and JS workers are single-threaded,
 * so a queued `cancel` postMessage can't be dequeued and handled until that synchronous call already
 * returns on its own — by which point the run has already finished and posted its own
 * `result`/`error`. useBeamSearch.ts's `cancel()` works around this by terminating the worker outright
 * instead of relying on this message; see its own doc comment for the full explanation and the
 * follow-up (making `runSearchLoop` yield once per generation) that would make this message real.
 * Left in place rather than removed: it's still correct *if* something ever manages to reach this
 * handler between generations (e.g. a future caller that restructures the call to yield), and costs
 * nothing to keep.
 */
import { runBeamSearch } from '@/beam-search/engine';
import type { BeamSearchOptions } from '@/beam-search/engine';
import { sanitizeLongsForWorker } from './beamSearch.protocol';
import type { MainToWorkerMessage, WorkerToMainMessage } from './beamSearch.protocol';

// Typed as `Worker` — the DOM-lib interface describing a worker instance as seen from the *main*
// thread (postMessage/onmessage/onerror) — rather than the `webworker` lib's own
// `DedicatedWorkerGlobalScope`. Deliberate: tsconfig.json's `lib` array is `["esnext", "dom"]`,
// shared by the whole program (no per-file/per-folder tsconfig here), and TypeScript's `dom` and
// `webworker` libs declare conflicting globals (`self`, `postMessage`, ...) when both are in scope.
// `Worker`'s shape is close enough for everything this file needs, without touching the shared
// tsconfig or adding a second one just for this — the standard workaround for typing one worker
// file inside a dom-lib project.
const ctx = self as unknown as Worker;

// runSearchLoop's onProgress fires once per generation (see search.ts) — at low beam widths/fast
// generations that can be very frequent. Coalesced to a few/sec here, matching HANDOFF's plan,
// rather than in the engine itself, which has no business knowing about UI update rates. Skipped
// entirely for a `trace: true` run (see below) — the diagnostics panel that flag is for wants exactly
// one row per generation, and coalescing would silently misrepresent a few generations as one.
const PROGRESS_THROTTLE_MS = 200;

// This worker only ever runs one search at a time (matches the single-Run-button UI Phase C plans).
// `activeRunId` identifies it; `cancelledRunId` records that a `cancel` arrived for it. Both reset
// per `start` message so a stale `cancel` for an already-finished run can't affect a later one.
let activeRunId: number | null = null;
let cancelledRunId: number | null = null;

function post(message: WorkerToMainMessage): void {
  ctx.postMessage(message);
}

ctx.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
  const msg = event.data;

  if (msg.type === 'cancel') {
    // Ignore a cancel for anything other than the currently active run — e.g. a stale message that
    // arrives after that run already finished and a new one started.
    if (msg.runId === activeRunId) cancelledRunId = msg.runId;
    return;
  }

  const { runId, startState, context, deadline, beamWidth, maxDepth, trace, phase3AttemptsPerGeneration } = msg;
  activeRunId = runId;
  cancelledRunId = null;

  // Defense-in-depth against the postMessage/structuredClone boundary this message itself just
  // crossed to get here: verified directly (beamSearch.protocol.spec.ts) that a protobufjs-decoded
  // rawBackup's Long-typed int64 fields (e.g. ArtifactInventoryItem.itemId — read by
  // getOptimalELRSet, in the Phase 3 macro's hot path) survive structuredClone as data but silently
  // lose their Long prototype, becoming plain {low,high,unsigned} objects with none of Long's
  // methods. Sanitized here, on the receiving end, rather than requiring the (future) Phase C
  // composable to remember to pre-sanitize before postMessage: sanitizeLongsForWorker's duck-typed
  // check works identically on a live Long instance or on the clone's already-stripped equivalent,
  // since both share the same {low,high,unsigned} shape — so this is correct regardless of whether
  // the caller sanitized too.
  const sanitizedContext = context.rawBackup
    ? { ...context, rawBackup: sanitizeLongsForWorker(context.rawBackup) }
    : context;

  let lastProgressPostedAt = 0;
  const options: BeamSearchOptions = {
    beamWidth,
    deadline,
    maxDepth,
    trace,
    phase3AttemptsPerGeneration,
    isCancelled: () => cancelledRunId === runId,
    onProgress: progress => {
      if (!trace) {
        const now = Date.now();
        if (now - lastProgressPostedAt < PROGRESS_THROTTLE_MS) return;
        lastProgressPostedAt = now;
      }
      post({ type: 'progress', runId, progress });
    },
  };

  try {
    const result = runBeamSearch(startState, sanitizedContext, options);
    // A Cancel click means "stop and discard", not "give me whatever you found first" — even if
    // runBeamSearch happened to still produce a usable result before it next checked isCancelled.
    // See WorkerCancelledMessage's doc comment.
    post(cancelledRunId === runId ? { type: 'cancelled', runId } : { type: 'result', runId, result });
  } catch (err) {
    post(
      cancelledRunId === runId
        ? { type: 'cancelled', runId }
        : { type: 'error', runId, message: err instanceof Error ? err.message : String(err) }
    );
  } finally {
    if (activeRunId === runId) activeRunId = null;
  }
};
