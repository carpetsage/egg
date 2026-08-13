// highs: the shipped planner, entered into the arena as a candidate.
//
// This file is a shim and nothing else. The solver it wraps lives in
// `src/lib/solver/` because it is production code — the MILP formulation
// (`milp.ts`), the outer-approximation loop (`oa.ts`), the problem model
// (`model.ts`), the judge-equivalent evaluator (`evaluator.ts`) and the
// WebAssembly binding (`highs.ts`). `src/lib/optimizer-core.ts` calls the same
// `solveWith` with the same loaded module, so the planner users run and the
// planner the harness measures are one code path, and a change to it is proved
// against the invariants before it ships. See `src/lib/solver/SPEC.md` for the method.
//
// So this entry is DELIBERATELY not independent of `src/lib`, and it is the
// only file under `solvers/` that is allowed to be. Every other candidate must
// re-derive its own machinery from `PlanProblem` alone — a candidate that
// called into the incumbent's LP, packer or search would be measuring the
// incumbent's method wearing a different hat. `independence.spec.ts` encodes
// that exception by name and narrowly: this file may import `src/lib/solver/*`
// and nothing else out of `src/lib`, and like every candidate it still may not
// touch the judge, the feasibility rule or the checks.
//
// The wasm module is awaited at import time because `Planner` is synchronous.
// That makes importing the registry load 3.4MB, which is fine in a test process
// and is exactly why the app goes through `loadHighs()` itself instead.

import { loadHighs } from '@/lib/solver/highs';
import { DEFAULT_TUNING, solveWith } from '@/lib/solver/oa';
import type { ArenaSolver, PlanProblem, PlanResult } from '../../contract';

const solve = await loadHighs();

export const highs: ArenaSolver = {
  id: 'highs',
  description: 'MILP over slots and crafts, outer-approximated objective, solved by HiGHS (WebAssembly)',
  // `report: true` opts into the C2/C3 honesty checks. The app leaves it off —
  // it derives its own numbers — so the self-report is paid for here only.
  plan: (problem: PlanProblem): PlanResult => solveWith(problem, solve, DEFAULT_TUNING, { report: true }),
};
