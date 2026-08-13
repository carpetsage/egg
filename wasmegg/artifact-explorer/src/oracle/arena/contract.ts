// The one seam the invariant harness solves through.
//
// Everything a candidate solver is allowed to see is in `PlanProblem`, and
// everything the harness needs back is in `PlanResult`. The harness never reads
// a candidate's internals, never imports its module, and never trusts a number
// it reports: `allocation` is scored by the harness's own judge
// (`../evaluate.ts`, an independent re-derivation of the objective from
// `src/lib/OPTIMIZER.md`). A candidate is therefore free to be a MILP, an
// annealer, a DP, a learned policy or a lookup table without the harness
// changing by a line.
//
// `PlanProblem` / `PlanResult` / `PlanReport` are *defined* in
// `src/lib/solver/types.ts` and re-exported here. They describe what a plan is,
// which is a property of the application and not of its test harness, and the
// shipped planner has to name them without importing anything under
// `src/oracle/`. Nothing else about this seam changes: every arena file still
// imports them from here, and `independence.spec.ts` pins the direction of the
// dependency.
//
// See ARENA.md for the rules a candidate has to follow.

export type { PlanProblem, PlanReport, PlanResult } from '@/lib/solver/types';

import type { PlanProblem, PlanResult } from '@/lib/solver/types';

// Every plan is packed into this many concurrent mission slots, each holding
// `timeCapacity` seconds of flight. It is a property of the game, not of any
// solver, so it is stated here. `src/lib/packing.ts` states it too and the two
// are deliberately not shared: types may cross this seam, values may not, which
// is exactly what `independence.spec.ts` enforces.
export const NUM_SLOTS = 3;

export type Planner = (problem: PlanProblem) => PlanResult;

export interface ArenaSolver {
  // Stable id used on the command line and in result files.
  id: string;
  // One line for the scorecard.
  description: string;
  plan: Planner;
}
