// HiGHS as WebAssembly (`highs`, lovasoa/highs-js): the loader, and the text
// interface it insists on. See SPEC.md section 8 for why this is the build
// that ships and what the text round trip costs.
//
// The entry point's read-then-apply-options order, quoted here because SPEC.md
// points at this file for it:
//
//     FS.writeFile(MODEL_FILENAME, model_str);
//     Highs_readModel(highs, MODEL_FILENAME);
//     for (const name in options) setOption(highs, name, options[name]);
//     Highs_run(highs);
//
// So anything governing how a model is *ingested* — `small_matrix_value`,
// `large_matrix_value`, `infinite_bound` — is set too late here and silently
// does nothing. `milp.ts` scales its rows rather than relying on the first
// group; see `SAFE_COEFFICIENT` there.

import highsLoader from 'highs';
import wasmUrl from 'highs/runtime?url';
import { INF, SOLVER_OPTIONS, type MilpModel, type MilpSolution, type MilpSolve } from './types';

// Asset resolution; see SPEC.md section 8 for why this is a loader function
// rather than a bare import. Local warning for this exact regex: on Windows
// `wasmUrl` arrives as `/@fs/C:/...`, and stripping only the `/@fs` prefix
// leaves a leading slash the loader cannot open ahead of the drive letter, so
// the drive-letter branch strips that slash too.
const wasmLocation = (() => {
  if (typeof self !== 'undefined' || !wasmUrl.startsWith('/@fs/')) return wasmUrl;
  const path = wasmUrl.slice('/@fs'.length);
  return /^\/[A-Za-z]:\//.test(path) ? path.slice(1) : path;
})();

let cached: Promise<MilpSolve> | null = null;

// One module instance per realm, loaded on first use; see SPEC.md section 8.
// Nothing here is stateful across solves — `solve` builds a fresh model string
// every call — so the sharing is of the module, not of any search state.
export function loadHighs(): Promise<MilpSolve> {
  cached ??= highsLoader({ locateFile: () => wasmLocation })
    .then((highs): MilpSolve => {
      const attempt = (model: MilpModel, limits: Parameters<MilpSolve>[1], presolve: 'on' | 'off') =>
        readSolution(
          model,
          highs.solve(writeLp(model), {
            ...SOLVER_OPTIONS,
            presolve,
            mip_max_nodes: limits.maxNodes,
            mip_rel_gap: limits.relGap,
          } as Parameters<typeof highs.solve>[1])
        );

      return (model, limits) => {
        const configured = SOLVER_OPTIONS.presolve === 'off' ? 'off' : 'on';
        try {
          return attempt(model, limits, configured);
        } catch {
          // WHY PRESOLVE IS OFF IN `SOLVER_OPTIONS`, so this branch is normally
          // unreachable — it is the fallback for a build or a caller that turns
          // presolve back on.
          //
          // Presolve is a performance bet, and on this workload it loses. Over
          // twelve arena instances through `optimizeFull`, timed both with the
          // config order forward and reversed (agreeing within 1%):
          //
          //     presolve on,  tolerances as pinned    27.7s   (baseline)
          //     presolve off, tolerances as pinned    24.7s   -11%
          //     presolve on,  mip tolerance at 1e-6   28.1s    +1%
          //     presolve off, mip tolerance at 1e-6   22.9s   -17%
          //
          // with an IDENTICAL joint probability on 12 of 12 instances, to the
          // last bit, in every presolve-on config and in presolve-off at the
          // pinned tolerances. The bet was that the tight `mip_feasibility_-
          // tolerance` was handicapping presolve by running it two orders below
          // HiGHS's default; the middle rows say otherwise — at the stock
          // tolerance presolve gets slightly worse and the gap widens.
          //
          // Structurally it is doing very little. HiGHS's own reduction log on
          // three arena MILPs: rows -3% to -6%, columns -2%, and nonzeros
          // between -0.6% and *+1.8%* — on arena:2001 presolve adds 104 of them.
          // What it does buy is implied-integer detection and the restart
          // machinery, which tighten the dual bound per node (gap 1.06% vs 1.98%
          // on arena:2001 at a five-node budget). What it costs is search: 5058
          // LP iterations against 2348, with 46 sub-MIP calls eating 3.47s of a
          // 4.73s solve.
          //
          // That trade was struck when `oa.ts` ran two five-node rounds, where a
          // tighter per-node bound had a second solve to be washed out by. It no
          // longer does — one pass at 200 nodes is the whole search — so the
          // timings above are what carries this now, and they were measured
          // through `optimizeFull` rather than per round. The dual-bound half of
          // the argument is retired rather than replaced: whether presolve pays
          // at the current tuning is open, and answering it means three campaigns
          // like any other tuning question.
          //
          // Turning it off also removes a failure path for free. HiGHS can fail
          // inside *presolve* on a model it reads and solves perfectly well
          // without it, throwing "HiGHS error -1" out of `Highs_run` — not out
          // of the reader, so this is not the ingestion window of SPEC.md
          // section 3. Found on arena:2018 with the fuel tank doubled: identical
          // shape and identical matrix range to the instance beside it that
          // solves, so nothing about the model is out of range. HiGHS's own
          // option table carries a "Presolve error" status and "Presolve
          // returned status %d" for exactly this.
          //
          // WHY THIS MODEL TRIPS IT, MEASURED. Re-solving the exact rejected
          // model one option at a time says the trigger is not presolve alone:
          //
          //     baseline (as shipped)                  THREW
          //     presolve: off                          Optimal
          //     presolve: choose                       THREW
          //     primal_feasibility_tolerance 1e-7/1e-8 THREW
          //     mip_feasibility_tolerance: 1e-8        Optimal
          //     mip_feasibility_tolerance: 1e-6        Optimal
          //     dual_feasibility_tolerance: 1e-7       THREW
          //     mip_allow_restart: false               THREW
          //     random_seed: 1                         Optimal
          //     threads: 0 / parallel: on              THREW
          //     mip_max_nodes: 50                      THREW
          //
          // (That table was taken with presolve on as the baseline. The rows are
          // still what each knob does to the rejected model; the baseline itself
          // no longer ships.)
          //
          // It is `mip_feasibility_tolerance` at 1e-9 that puts presolve over the
          // edge, which is exactly the interaction ERGO-Code/HiGHS#1578 reports:
          // presolve calling a model infeasible that solves to optimality with
          // presolve off, once that tolerance is tightened. That issue's
          // threshold is 1e-7; `SOLVER_OPTIONS` pins two orders tighter. (#907,
          // #2171 and #2173 are the same shape without the tolerance angle.)
          //
          // That `random_seed: 1` also clears it says this is a knife-edge
          // numerical coincidence rather than anything structural about the
          // model — which is why the seed is not the fix. It would settle this
          // instance and silently pick a different one to fail on.
          //
          // WHY PRESOLVE, OF THE THREE KNOBS THAT WORK. It is the only one that
          // solves the model with every tolerance still at its pinned value.
          // `mip_feasibility_tolerance` buys the same result by weakening, on
          // every solve, the guard that keeps HiGHS's integer solutions on the
          // judge's packing scale: at 1e-8 a slot row may be violated by more
          // than the arena's packer admits, so `certifies` can start dropping
          // incumbents where today it never fires (SPEC.md section 3).
          //
          // WHY OFF, AND NOT SOMETHING GENTLER. `presolve_reduction_limit` and
          // `presolve_rule_off` exist in the wasm's option table, but neither is
          // in this package's typings, and both are instance-specific bisection
          // aids rather than settings. Of the three values the package does
          // expose — 'off' | 'choose' | 'on' — 'choose' still throws here
          // (measured, above). 'off' is the only remedy available.
          //
          // Presolve only reformulates; it cannot change the feasible set. So
          // falling back without it can turn a failure into an answer but never
          // a wrong answer into a right-looking one — and the answer is checked
          // by `certifies` and priced by the evaluator regardless.
          if (configured === 'off') {
            // Already the configured path, so there is no second thing to try.
            return { status: 'unknown', objective: 0, columnValues: new Float64Array(model.columnCount) };
          }
          try {
            return attempt(model, limits, 'off');
          } catch {
            // Both attempts failed. `unknown` is a status the caller already
            // handles — `solveWith` keeps the best plan it has judged so far —
            // whereas an exception here propagates out of `optimizeFull` and
            // surfaces as an app that cannot produce a plan at all.
            return { status: 'unknown', objective: 0, columnValues: new Float64Array(model.columnCount) };
          }
        }
      };
    })
    .catch((error: unknown) => {
      // What is cached is the promise, not the module — clearing it here is
      // what keeps a rejected load from staying cached and failing every later
      // solve in the session. See SPEC.md section 8.
      cached = null;
      throw error;
    });
  return cached;
}

// Shortest round-trippable form; the LP reader takes scientific notation.
function num(value: number): string {
  if (value >= INF) return '+inf';
  if (value <= -INF) return '-inf';
  return String(value);
}

function term(coefficient: number, column: number): string {
  return coefficient < 0 ? ` - ${num(-coefficient)} x${column}` : ` + ${num(coefficient)} x${column}`;
}

// CPLEX LP format. Wrapped every few terms because the format is line-oriented
// and readers have historically had opinions about very long lines.
const TERMS_PER_LINE = 8;

export function writeLp(model: MilpModel): string {
  const out: string[] = ['Maximize'];

  const objective: string[] = [];
  for (let j = 0; j < model.columnCount; j++) {
    if (model.objective[j] !== 0) objective.push(term(model.objective[j], j));
  }
  // An empty objective is legal but has no syntax; anchor it on a zero term.
  if (objective.length === 0) objective.push(' 0 x0');
  out.push(` obj:${objective[0]}`);
  for (let i = 1; i < objective.length; i += TERMS_PER_LINE) {
    out.push(objective.slice(i, i + TERMS_PER_LINE).join(''));
  }

  out.push('Subject To');
  for (let r = 0; r < model.rowCount; r++) {
    const start = model.offsets[r];
    const end = r + 1 < model.rowCount ? model.offsets[r + 1] : model.indices.length;
    if (end <= start) continue;
    const terms: string[] = [];
    for (let k = start; k < end; k++) terms.push(term(model.values[k], model.indices[k]));

    const lo = model.rowLower[r];
    const up = model.rowUpper[r];
    // Every row this model builds is one-sided or an equality; a genuinely
    // two-sided row is split so no reader has to support ranges.
    const relations: string[] =
      lo === up ? [`= ${num(lo)}`] : [...(up < INF ? [`<= ${num(up)}`] : []), ...(lo > -INF ? [`>= ${num(lo)}`] : [])];
    if (relations.length === 0) continue; // free row: carries no information

    relations.forEach((relation, i) => {
      out.push(` r${r}_${i}:${terms[0]}`);
      for (let k = 1; k < terms.length; k += TERMS_PER_LINE) {
        out.push(terms.slice(k, k + TERMS_PER_LINE).join(''));
      }
      out.push(` ${relation}`);
    });
  }

  out.push('Bounds');
  for (let j = 0; j < model.columnCount; j++) {
    const lo = model.columnLower[j];
    const up = model.columnUpper[j];
    if (lo === 0 && up >= INF) continue; // the format's default
    if (lo <= -INF && up >= INF) out.push(` x${j} free`);
    else out.push(` ${num(lo)} <= x${j} <= ${num(up)}`);
  }

  const integers: string[] = [];
  for (let j = 0; j < model.columnCount; j++) {
    if (model.columnIsInteger[j]) integers.push(`x${j}`);
  }
  if (integers.length > 0) {
    out.push('General');
    for (let i = 0; i < integers.length; i += 16) out.push(` ${integers.slice(i, i + 16).join(' ')}`);
  }

  out.push('End');
  return out.join('\n');
}

// Structurally what the `highs` package returns. Named here rather than
// imported because the package's own solution types are module-private.
export interface RawHighsSolution {
  Status: string;
  ObjectiveValue: number;
  // `Index` is declared but never read — see `readSolution` and SPEC.md
  // section 8 on why the name is the only reliable key. It is declared here
  // because an infeasible solve returns columns carrying no `Primal` at all,
  // and a type whose properties are all optional and all absent from that
  // shape is rejected as a weak type.
  Columns: Record<string, { Primal?: number; Index?: number }>;
}

export function readSolution(model: MilpModel, solution: RawHighsSolution): MilpSolution {
  // Keyed by *name*, deliberately — see SPEC.md section 8. A column absent
  // from the LP file (no objective, no bound, no coefficient anywhere) is
  // absent from the solution too, and its zero is already in place.
  const columnValues = new Float64Array(model.columnCount);
  let hasPrimal = false;
  for (const [name, column] of Object.entries(solution.Columns)) {
    if (typeof column.Primal !== 'number') continue;
    const j = Number(name.slice(1));
    if (!Number.isInteger(j) || j < 0 || j >= model.columnCount) continue;
    columnValues[j] = column.Primal;
    hasPrimal = true;
  }

  let status: MilpSolution['status'];
  if (solution.Status === 'Optimal' || solution.Status === 'Empty') status = 'optimal';
  else if (solution.Status === 'Infeasible' || solution.Status === 'Primal infeasible or unbounded') {
    status = 'infeasible';
  } else status = hasPrimal ? 'feasible' : 'unknown';

  return { status, objective: solution.ObjectiveValue, columnValues };
}
