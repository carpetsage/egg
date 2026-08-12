// The arena roster.
//
// Add one line per candidate. Nothing else in the harness needs to know a
// candidate exists, and the harness never imports a solver module directly —
// it asks here.
//
// One entry, and it is the shipped planner. `highs` is not a candidate being
// auditioned against an incumbent any more — `src/lib/optimizer-core.ts` calls
// this exact module, so the thing measured here and the thing users run are one
// code path. That makes the arena a regression bar rather than a bake-off: a
// change to the planner is proved against the invariants before it lands, and
// the numbers in `results/highs.json` are the reference a candidate has to beat.

import type { ArenaSolver } from './contract';
import { highs } from './solvers/highs';

export const SOLVERS: ArenaSolver[] = [
  highs,
  // <- register your candidate here
];

export function solverById(id: string): ArenaSolver {
  const found = SOLVERS.find(s => s.id === id);
  if (!found) {
    throw new Error(`unknown solver "${id}"; registered: ${SOLVERS.map(s => s.id).join(', ')}`);
  }
  return found;
}

// `SOLVER=a,b` selects a subset; unset runs the whole roster.
export function selectedSolvers(): ArenaSolver[] {
  const spec = process.env.SOLVER;
  if (!spec) return SOLVERS;
  return spec
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(solverById);
}
