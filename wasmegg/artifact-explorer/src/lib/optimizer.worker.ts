// Worker entry point for the mission-plan search.
//
// Imports optimizeFull directly rather than the lib barrel: the barrel
// re-exports the ~18MB loot dataset, which this bundle has no use for.

import { optimizeFull } from './optimizer-core';
import {
  optionsFromWire,
  solutionsToWire,
  type OptimizerRequest,
  type OptimizerResponse,
} from './optimizer-worker-protocol';

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<OptimizerRequest>) => {
  const req = e.data;
  let response: OptimizerResponse;
  try {
    const solution = optimizeFull({
      options: optionsFromWire(req.options),
      recipeDag: req.recipeDag,
      desiredArtifactNodeIds: req.desiredArtifactNodeIds,
      fuelCapacity: req.fuelCapacity,
      timeCapacity: req.timeCapacity,
      baseYield: req.baseYield,
    });
    response = { id: req.id, ok: true, solutions: solutionsToWire([solution]) };
  } catch (err) {
    // Without this a failed solve never resolves and the UI spins forever.
    response = { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  ctx.postMessage(response);
};
