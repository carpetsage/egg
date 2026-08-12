// The solver's type surface: what a plan is, and what the MILP backend behind
// it trades in.
//
// Two seams live here, and they are owned by `src/lib` rather than by any test
// harness. The invariant arena (`src/oracle/arena/`) re-exports the plan types
// from its own `contract.ts` so the arena's public seam reads the same as ever;
// the dependency runs one way only — the arena imports production, production
// never imports the arena.
//
// ---------------------------------------------------------------------------
// The plan seam.
// ---------------------------------------------------------------------------
//
// Everything a planner is allowed to see is in `PlanProblem`, and everything a
// caller gets back is in `PlanResult`. `allocation` is a claim, not a
// certificate: the app re-derives its value through `optimizer-core`, and the
// arena scores it with an independent judge. Nothing downstream trusts a number
// a planner reports about itself.

import type { CraftBudget, LaunchOption, RecipeDAG } from '../types';

export interface PlanProblem {
  // Menu of launches available, already enumerated from the player's ships,
  // research and effort level. `allocation` is indexed against this array, in
  // this order. Options may repeat, may be shuffled, and may include entries no
  // sane plan would use — the arena perturbs this deliberately.
  readonly options: readonly LaunchOption[];
  // Recipe graph for the targets, carrying per-node craft chances and the
  // ingredient conservation structure.
  readonly dag: RecipeDAG;
  // Desired artifact node ids. The objective is P(at least one legendary of
  // EVERY one of these) — the product over targets, not the max or the sum.
  readonly targets: readonly string[];
  // Total fuel across the whole plan.
  readonly fuelCapacity: number;
  // Seconds available *per slot*. A plan is feasible when its missions
  // partition into `slots` slots each loaded to at most this.
  readonly timeCapacity: number;
  readonly slots: number;
  // Copies of each node the player already owns, folded in before crafting.
  readonly baseYield: ReadonlyMap<string, number>;
  // Optional cap on what the plan's crafts may cost in golden eggs. Absent
  // means unconstrained, which is what every instance predating the cap is.
  readonly craftBudget?: CraftBudget;
}

// Optional self-report of what a planner believes its own plan is worth.
// Supplying it opts a planner into the arena's C2-honesty and C3-joint-product
// checks, which compare the claim against the judge's own scoring of the same
// allocation. Omitting it is legal and costs nothing but those two checks.
export interface PlanReport {
  jointProbability: number;
  perTarget: number[]; // parallel to problem.targets
}

export interface PlanResult {
  // Missions launched per option, parallel to `problem.options`. Non-negative
  // integers. Must be feasible: fuel within capacity, and packable into
  // `slots` slots of `timeCapacity`.
  allocation: number[];
  reported?: PlanReport;
}

// ---------------------------------------------------------------------------
// The MILP seam: what `oa.ts` hands a solver, and what it expects back.
//
// There is exactly one implementation (`highs.ts`), and this is still a named
// seam rather than a direct call for one reason: `oa.ts` must stay synchronous —
// planning is a pure function of `PlanProblem` — while loading a WebAssembly
// module is not. So the loading happens once, at the edge, and what travels
// inward is a plain function. Everything else about this section is the wire
// format for a matrix.
//
// The model is always a maximization, always row-major, and always bounded by
// *deterministic* limits (node counts, never wall clock) — see `MilpLimits`.

// HiGHS treats any bound at or beyond this magnitude as infinite.
export const INF = 1e30;

export interface MilpModel {
  columnCount: number;
  columnLower: Float64Array;
  columnUpper: Float64Array;
  // 1 = integer, 0 = continuous. Parallel to the columns.
  columnIsInteger: Uint8Array;
  // Objective is always maximized; there is no sense flag to get wrong.
  objective: Float64Array;
  rowCount: number;
  rowLower: Float64Array;
  rowUpper: Float64Array;
  // Row-major sparse matrix. `offsets` holds one start per row (length
  // `rowCount`); the last row runs to the end of `indices`. That is what
  // `Highs::passModel` reads for a row-wise matrix, and it is what the LP-format
  // writer walks.
  offsets: Int32Array;
  indices: Int32Array;
  values: Float64Array;
}

export type MilpStatus =
  // proven optimal within the gap
  | 'optimal'
  // a feasible incumbent, but the search stopped on a limit
  | 'feasible'
  // proven infeasible
  | 'infeasible'
  // no usable primal solution came back
  | 'unknown';

export interface MilpSolution {
  status: MilpStatus;
  // Objective of the returned incumbent. Only meaningful when `status` is
  // 'optimal' or 'feasible'.
  objective: number;
  columnValues: Float64Array;
}

// Everything that bounds the search. Deliberately node- and gap-based rather
// than time-based; see SPEC.md section 7 for why a wall-clock limit is off the
// table entirely.
export interface MilpLimits {
  // 0 means "no branching allowed beyond the root"; Infinity means unbounded.
  maxNodes: number;
  // Relative MIP gap at which HiGHS may declare optimality.
  relGap: number;
}

export type MilpSolve = (model: MilpModel, limits: MilpLimits) => MilpSolution;

// Options pinned on every solve, so a plan is a function of the model and the
// limits and of nothing else. `threads`/`parallel`/`random_seed` are pinned
// for reproducibility (SPEC.md section 7); the feasibility tolerances are
// pinned below HiGHS's defaults to stay on the judge's packer's scale
// (SPEC.md section 3).
//
// A note on the two that are numbers HiGHS stores as integers: the wasm binding
// sets a numeric option by trying `Highs_setDoubleOptionValue` first and only
// falling back to the int setter when the value is integral, so a non-integral
// or non-finite `threads`/`random_seed`/`mip_max_nodes` is *silently ignored*
// rather than rejected. Anything assigned to those has to be a whole number
// inside int32 — `Infinity` is not.
export const SOLVER_OPTIONS: Readonly<Record<string, boolean | number | string>> = {
  output_flag: false,
  log_to_console: false,
  threads: 1,
  parallel: 'off',
  random_seed: 0,
  // Off, and measured that way rather than assumed. HiGHS defaults this to
  // 'choose'; the case for turning it off on this workload is in `highs.ts`,
  // above the failure path it also happens to remove.
  presolve: 'off',
  primal_feasibility_tolerance: 1e-9,
  // Two orders below HiGHS's 1e-6 default, and deliberately so: this is the
  // margin SPEC.md section 3 argues for. HiGHS may satisfy a slot row only to
  // this figure, absolute on the row activity, while the arena's packer admits
  // a slot load of at most `capacity + 1e-9`. Loosening it lets the solver
  // commit a violation the judge will not accept.
  //
  // It was tried at 1e-8 for one sweep, as the direct fix for the presolve
  // breakdown that 1e-9 triggers (ERGO-Code/HiGHS#1578). It is back at 1e-9
  // because turning presolve off removes that failure path outright, at no cost
  // to the plan — so there is nothing left to buy by giving up the margin.
  mip_feasibility_tolerance: 1e-9,
  // One order of magnitude below default, not more: at HiGHS's documented
  // minimum of 1e-10 the simplex fails outright on the wider instances
  // ("HiGHS error -1" out of `Highs_run`). See SPEC.md section 4 for why this
  // option needs touching at all (`SCALE_LP_OBJECTIVE` in `milp.ts` is the
  // structural fix; this is only the margin around it).
  dual_feasibility_tolerance: 1e-8,
};
