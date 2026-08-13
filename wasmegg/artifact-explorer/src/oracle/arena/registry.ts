// The arena roster.
//
// Add one line per candidate. Nothing else in the harness needs to know a
// candidate exists, and the harness never imports a solver module directly —
// it asks here.
//
// `highs` is the shipped planner, not a candidate being auditioned against an
// incumbent — `src/lib/optimizer-core.ts` calls that exact module, so the thing
// measured here and the thing users run are one code path. That makes the arena
// a regression bar rather than a bake-off: a change to the planner is proved
// against the invariants before it lands, and the numbers in
// `results/highs.json` are the reference a candidate has to beat.
//
// A proposed re-tuning of that same planner may sit here alongside it — a
// second entry importing the same module under a different `Tuning` — for as
// long as it takes to decide. That is worth a line here rather than a scratch
// script because the harness already runs every entry over the same instances
// with the same judge and prints the head-to-head, so A/B coverage costs one
// import. Such an entry ships or it is deleted; it does not live here
// indefinitely. The current shipped tuning arrived that way, and the five arms
// that measured it are gone.
//
// Baseline first: `formatComparison` reads `SOLVERS[0]` as the reference.

import type { ArenaSolver } from './contract';
import { highs } from './solvers/highs';

export const SOLVERS: ArenaSolver[] = [
  highs,
  // <- register your candidate here
];

// `SOLVER=a,b` selects a subset; unset runs the whole roster.
export function selectedSolvers(): ArenaSolver[] {
  const spec = process.env.SOLVER;
  if (!spec) return SOLVERS;
  return spec
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(id => {
      const found = SOLVERS.find(s => s.id === id);
      if (!found) {
        throw new Error(`unknown solver "${id}"; registered: ${SOLVERS.map(s => s.id).join(', ')}`);
      }
      return found;
    });
}
