/**
 * Owns the beam search Web Worker instance and one run's lifecycle (start/cancel/progress/result) —
 * independent of `useResearchViews` (same convention that composable's own doc comment describes for
 * its ungated computeds), per ../beam-search/HANDOFF.md's Phase C plan.
 *
 * Deliberately thin: building `startState`/`context` (createBaseEngineState/getSimulationContext,
 * both Pinia-bound — fine here, this composable runs on the main thread) and posting them to the
 * worker is the only real logic. Everything else — the search itself, message sanitization — lives
 * in beam-search/engine/* and workers/beamSearch.worker.ts respectively; see those files' own doc
 * comments. Cancellation is the one exception: see `cancel()` below for why this composable, not the
 * worker's message protocol, is where cancellation actually has to happen. Applying a finished
 * result to the live plan is deliberately NOT this composable's job either — see BeamSearchView.vue /
 * ResearchActions.vue's handleApplyBeamSearchPlan, which reuses ResearchActions.vue's own existing
 * purchase-replay helpers (syncEventStateForItem/buyOneLevel/batch) rather than duplicating them here.
 */
import { onUnmounted, ref } from 'vue';
import { useActionsStore } from '@/stores/actions';
import { createBaseEngineState, getSimulationContext } from '@/engine/adapter';
import type { BeamSearchProgress, BeamSearchResult } from '@/beam-search/engine';
import { sanitizeLongsForWorker } from '@/workers/beamSearch.protocol';
import type { MainToWorkerMessage, WorkerToMainMessage } from '@/workers/beamSearch.protocol';

export type BeamSearchRunStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error';

// Vite's native worker support requires this exact literal shape (string literal + import.meta.url)
// for its static analysis — see beamSearch.worker.ts's own header for the loading contract. Pulled
// out to its own function because `cancel()` below needs to create a replacement worker, not just
// the initial one.
function spawnWorker(): Worker {
  return new Worker(new URL('../workers/beamSearch.worker.ts', import.meta.url), { type: 'module' });
}

export function useBeamSearch() {
  const actionsStore = useActionsStore();

  let worker = spawnWorker();

  const status = ref<BeamSearchRunStatus>('idle');
  const progress = ref<BeamSearchProgress | null>(null);
  const result = ref<BeamSearchResult | null>(null);
  const errorMessage = ref<string | null>(null);

  let nextRunId = 0;
  let activeRunId: number | null = null;

  function post(message: MainToWorkerMessage): void {
    try {
      worker.postMessage(message);
    } catch (err) {
      // Caught directly (not guessed): postMessage throws synchronously, on this thread, before the
      // worker ever sees anything — sanitizeLongsForWorker in `start()` below is what's supposed to
      // prevent this, but this catch is the difference between a clean error message and an
      // unhandled exception if something new ever slips past it (e.g. a field this composable adds
      // later that isn't plain data).
      status.value = 'error';
      errorMessage.value = err instanceof Error ? err.message : String(err);
    }
  }

  function handleWorkerMessage(event: MessageEvent<WorkerToMainMessage>): void {
    const msg = event.data;
    // Ignore anything from a superseded run — e.g. a `result` that arrives right after the user
    // clicked Cancel-then-Run-again. Every message the worker sends carries the runId it's for; see
    // beamSearch.protocol.ts.
    if (msg.runId !== activeRunId) return;

    switch (msg.type) {
      case 'progress':
        progress.value = msg.progress;
        break;
      case 'result':
        status.value = 'done';
        result.value = msg.result;
        break;
      case 'cancelled':
        status.value = 'cancelled';
        break;
      case 'error':
        status.value = 'error';
        errorMessage.value = msg.message;
        break;
    }
  }

  function handleWorkerError(event: ErrorEvent): void {
    // Only a real, unrecoverable worker fault (e.g. a script error the try/catch inside the worker's
    // own onmessage handler couldn't have caught, like a syntax/import error) reaches here — ordinary
    // runBeamSearch failures are already reported as a 'error' postMessage, handled above.
    status.value = 'error';
    errorMessage.value = event.message || 'The beam search worker crashed unexpectedly.';
  }

  worker.onmessage = handleWorkerMessage;
  worker.onerror = handleWorkerError;

  function start(deadline: number, beamWidth: number, maxDepth?: number): void {
    const runId = nextRunId++;
    activeRunId = runId;
    status.value = 'running';
    progress.value = null;
    result.value = null;
    errorMessage.value = null;

    // sanitizeLongsForWorker isn't just about Long — confirmed directly (a real click-through in a
    // real browser, not guessed): `createBaseEngineState(actionsStore.effectiveSnapshot)` and
    // `getSimulationContext()` return live Vue-reactive Pinia state, and `postMessage` throws
    // synchronously ("could not be cloned") on a reactive Proxy before the message ever reaches the
    // worker — so the worker's OWN sanitizeLongsForWorker call (beamSearch.worker.ts, still kept as
    // defense-in-depth for whatever calls this composable's protocol directly) never even gets a
    // chance to run. Rebuilding through sanitizeLongsForWorker here, on the main thread, fixes both
    // problems in one pass: its recursive walk (Object.entries + rebuild) is transparent to Vue's
    // reactive Proxy traps, so it unwraps reactivity as a side effect of producing plain data, on top
    // of its originally-designed job of turning Long-shaped values into numbers.
    const startState = sanitizeLongsForWorker(createBaseEngineState(actionsStore.effectiveSnapshot));
    const context = sanitizeLongsForWorker(getSimulationContext());

    post({ type: 'start', runId, startState, context, deadline, beamWidth, maxDepth });
  }

  /**
   * Terminates and replaces the worker outright, rather than posting `{ type: 'cancel' }` and
   * waiting for beamSearch.worker.ts to notice. Confirmed directly (a real Cancel click against a
   * genuinely long run — beam width 4000, ~5-week deadline — sat there with the generation counter
   * still climbing 30+ seconds later): a postMessage-based cancel *cannot* work against this
   * architecture. JS workers are single-threaded, and `runBeamSearch` runs as one big synchronous
   * call with no `await`/yield point anywhere inside it (see search.ts's `runSearchLoop`) — so a
   * queued `cancel` message physically cannot be dequeued and handled until that synchronous call
   * already returns *on its own*, by which point the run has already finished (successfully or not)
   * and posted its own `result`/`error`. `runSearchLoop`'s `isCancelled` polling hook itself is
   * correctly implemented and unit-tested (engine/search.spec.ts) — the gap is entirely in this
   * message-passing layer being unable to ever deliver a "yes, cancelled" answer while a run is
   * actually busy. Terminating instead sidesteps needing the worker to cooperate at all, and lines
   * up with the "Cancel discards any partial result" policy already decided (there's nothing to
   * preserve either way) — see beamSearch.worker.ts's WorkerCancelledMessage doc comment, which
   * still describes the intended *policy*, just no longer the *mechanism*, for the browser-Worker
   * case. A fresh worker replaces the terminated one immediately so the next `start()` still has
   * somewhere to post to. Follow-up worth doing separately: make `runSearchLoop` `await` a
   * microtask/macrotask once per generation so the message-based path becomes real and this could
   * go back to a graceful cancel — not done here, out of scope for wiring the UI up.
   */
  function cancel(): void {
    if (activeRunId === null || status.value !== 'running') return;
    worker.terminate();
    worker = spawnWorker();
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
    activeRunId = null;
    status.value = 'cancelled';
  }

  // A live search is tied to this composable instance, not to the live plan — leaving the tab (this
  // component unmounts, per how ResearchActions.vue's SmartBuyView/BeamSearchView are switched with
  // v-if) tears the worker down rather than leaving an orphaned run computing in the background with
  // nowhere for its messages to go.
  onUnmounted(() => worker.terminate());

  return { status, progress, result, errorMessage, start, cancel };
}
