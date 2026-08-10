/**
 * Message protocol + payload sanitization shared between the main thread and
 * beamSearch.worker.ts. See ../beam-search/HANDOFF.md "Phase B" for the plan this implements, and
 * ../beam-search/06-egg-codebase-integration.md §5 for the original design.
 */
import type { EngineState, SimulationContext } from '@/engine/types';
import type { BeamSearchProgress, BeamSearchResult } from '@/beam-search/engine';

export interface BeamSearchStartMessage {
  type: 'start';
  /** Lets the worker (and the main thread, on messages back) recognize a message as belonging to a
   *  superseded run — e.g. the user changed the deadline/beam width and reran before the previous
   *  run finished. The worker only ever tracks one active run; a `cancel` for any other runId is
   *  ignored (see beamSearch.worker.ts). */
  runId: number;
  startState: EngineState;
  context: SimulationContext;
  deadline: number;
  beamWidth: number;
  maxDepth?: number;
  /** Forwarded to `BeamSearchOptions.trace` (see beam-search/engine/types.ts's doc comment there for
   *  what it turns on and its memory-cost tradeoff) — also read directly by beamSearch.worker.ts to
   *  decide whether to keep throttling `progress` posts for this run; see its own doc comment on why
   *  a traced run wants one `progress` message per generation, not coalesced. */
  trace?: boolean;
  /** Forwarded to `BeamSearchOptions.phase3AttemptsPerGeneration` (see beam-search/engine/types.ts's
   *  doc comment there). */
  phase3AttemptsPerGeneration?: number;
}

export interface BeamSearchCancelMessage {
  type: 'cancel';
  runId: number;
}

export type MainToWorkerMessage = BeamSearchStartMessage | BeamSearchCancelMessage;

export interface WorkerProgressMessage {
  type: 'progress';
  runId: number;
  progress: BeamSearchProgress;
}

export interface WorkerResultMessage {
  type: 'result';
  runId: number;
  result: BeamSearchResult;
}

/** Sent instead of a `result`/`error` once a `cancel` for this runId has been seen — regardless of
 *  whether the search loop happened to still produce a usable plan before it noticed. A Cancel click
 *  is a request to stop and discard, not "give me whatever you have"; see beamSearch.worker.ts. */
export interface WorkerCancelledMessage {
  type: 'cancelled';
  runId: number;
}

export interface WorkerErrorMessage {
  type: 'error';
  runId: number;
  message: string;
}

export type WorkerToMainMessage =
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerCancelledMessage
  | WorkerErrorMessage;

/**
 * Duck-typed check for a protobufjs-decoded Long (from the 'long' package): every ei.IBackup int64/
 * uint64/sint64/fixed64 field (e.g. ArtifactInventoryItem.itemId, ArtifactsDB.itemSequence,
 * Backup.checksum, Game.soulEggs, ...) decodes to one of these — a plain object with exactly these
 * three own enumerable properties, `{ low, high, unsigned }`, plus arithmetic/comparison methods on
 * its prototype (Long.prototype). Not imported from the 'long' package directly: it isn't a direct
 * dependency of this workspace (only a transitive one, pulled in indirectly via protobufjs/the
 * generated ei proto — pnpm's workspace isolation makes that resolution fragile to depend on
 * directly), and duck-typing is all sanitizeLongsForWorker actually needs anyway.
 */
function isLongLike(value: unknown): value is { low: number; high: number; unsigned: boolean } {
  if (typeof value !== 'object' || value === null) return false;
  const keys = Object.keys(value);
  const v = value as Record<string, unknown>;
  return (
    keys.length === 3 && typeof v.low === 'number' && typeof v.high === 'number' && typeof v.unsigned === 'boolean'
  );
}

/** Same bit math as Long.prototype.toNumber() (long@5's index.js) — reimplemented rather than
 *  imported for the same reason isLongLike duck-types instead of using `instanceof Long`. Loses
 *  precision the same way the real .toNumber() would for values beyond Number.MAX_SAFE_INTEGER;
 *  that's an existing characteristic of calling .toNumber() anywhere in this codebase, not a
 *  regression introduced here. */
function longLikeToNumber(value: { low: number; high: number; unsigned: boolean }): number {
  const TWO_PWR_32_DBL = 4294967296;
  return value.unsigned
    ? (value.high >>> 0) * TWO_PWR_32_DBL + (value.low >>> 0)
    : value.high * TWO_PWR_32_DBL + (value.low >>> 0);
}

/**
 * Deep-clones a value into a plain, postMessage-safe copy: rebuilds every plain object/array from
 * scratch via Object.entries rather than returning `value` itself, and converts any Long-shaped
 * object encountered anywhere in the tree into a plain JS number along the way. Two independent
 * problems this fixes, both confirmed directly rather than guessed:
 *
 * 1. **Long.** For `SimulationContext.rawBackup` (an `ei.IBackup`, protobufjs-decoded) — see
 *    ../beam-search/HANDOFF.md's Phase B open question and beamSearch.worker.ts's doc comment.
 *    `structuredClone` (the algorithm `postMessage` uses) does NOT throw on a Long instance, but
 *    silently strips its prototype, leaving a `{ low, high, unsigned }` plain object with none of
 *    Long's methods (`.toNumber()`, `.toString()`, equality, ...) — a *silent* corruption, not a
 *    loud one. See beamSearch.protocol.spec.ts for the structuredClone experiment this is based on.
 * 2. **Vue reactivity.** Confirmed via a real click-through, not guessed: `EngineState`/
 *    `SimulationContext` built from live Pinia state (`createBaseEngineState`/
 *    `getSimulationContext`, see useBeamSearch.ts's `start()`) are Vue-reactive Proxies, and
 *    `postMessage` throws *synchronously*, on the main thread — `Failed to execute 'postMessage' on
 *    'Worker': #<Object> could not be cloned` — before the message ever reaches the worker. This
 *    function's plain Object.entries-based rebuild is transparent to Vue's reactive Proxy traps, so
 *    it unwraps reactivity as a side effect of producing genuinely plain data, with no Vue-specific
 *    code needed here.
 *
 * Written to work equally whether `value` still holds live Long instances/reactive Proxies (called
 * on the main thread, before the postMessage boundary — see useBeamSearch.ts, where this matters for
 * both reasons above) or already-corrupted `{low,high,unsigned}` plain objects (called after the
 * boundary, inside the worker, as defense-in-depth — see beamSearch.worker.ts) — a Proxy's own
 * enumerable keys read the same either way, and a corrupted Long's `{low,high,unsigned}` shape is
 * exactly what `isLongLike` already duck-types on. Idempotent: running it twice (main thread, then
 * again inside the worker) is just a redundant copy of already-plain data, not a correctness risk.
 */
export function sanitizeLongsForWorker<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeLongsForWorker(item)) as unknown as T;
  }
  if (isLongLike(value)) {
    return longLikeToNumber(value) as unknown as T;
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeLongsForWorker(v);
    }
    return out as T;
  }
  return value;
}
