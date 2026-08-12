// Worker entry point for the mission-plan search.
//
// Imports optimizeFull directly rather than the lib barrel: the barrel
// re-exports the ~18MB loot dataset, which this bundle has no use for.
//
// The planner is a WebAssembly MILP, so the first request in a worker's life
// pays to fetch and instantiate it; the rest resolve off a cached promise. That
// is also why this file is the only place the solve is awaited — everything
// below the seam is synchronous.

import { optimizeFull } from './optimizer-core';
import {
  optionsFromWire,
  solutionsToWire,
  type OptimizerRequest,
  type OptimizerResponse,
} from './optimizer-worker-protocol';

const ctx = self as unknown as Worker;

// Ids only ever increase, so anything below the newest one seen has already
// been superseded on the main thread. A solve is about a second and the UI
// posts one per input change, so without this a user editing three fields pays
// for three full solves and the client discards the first two on arrival.
//
// The reply still goes out. `optimizer-client` settles every id it has pending
// and resolves a superseded one to null, so dropping the message rather than
// answering it would leave that promise hanging forever.
let newestId = 0;

// Hands control back to the event loop for one macrotask, so that `message`
// events already sitting in the worker's queue are dispatched — and their
// handlers have raised `newestId` — before we decide whether this request is
// stale.
//
// This is load-bearing, not decoration. `optimizeFull` awaits the cached wasm
// module and then runs the solve synchronously, so for the whole second a solve
// takes this thread never returns to the event loop and nothing queued behind
// it is delivered. By the time request N's handler resumed, request N+1 had not
// been dispatched yet, `newestId` was still N, and `req.id < newestId` was false
// for every request ever made — a bare check is dead code that skips nothing.
//
// A microtask yield (`await Promise.resolve()`, or the `await loadHighs()`
// already inside `optimizeFull`, which is a resolved promise after the first
// call) is not enough: microtasks drain without ever returning to the task
// queue, so no `message` event is delivered. It has to be a macrotask.
const yieldToPendingMessages = () => new Promise<void>(resolve => setTimeout(resolve, 0));

ctx.onmessage = async (e: MessageEvent<OptimizerRequest>) => {
  const req = e.data;
  if (req.id > newestId) newestId = req.id;
  let response: OptimizerResponse;
  try {
    await yieldToPendingMessages();
    if (req.id < newestId) {
      ctx.postMessage({ id: req.id, ok: true, solutions: [] } satisfies OptimizerResponse);
      return;
    }
    const solution = await optimizeFull({
      options: optionsFromWire(req.options),
      recipeDag: req.recipeDag,
      desiredArtifactNodeIds: req.desiredArtifactNodeIds,
      fuelCapacity: req.fuelCapacity,
      timeCapacity: req.timeCapacity,
      baseYield: req.baseYield,
      craftBudget: req.craftBudget,
    });
    response = { id: req.id, ok: true, solutions: solutionsToWire([solution]) };
  } catch (err) {
    // Without this a failed solve never resolves and the UI spins forever.
    response = { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  ctx.postMessage(response);
};
