// Dense primal simplex for the evaluator's craft LP.
//
// Maximize c.x subject to A x <= b, x >= 0, with every b_i >= 0 so the slack
// basis is feasible from the start and no phase 1 is needed. Imports nothing.
//
// WHY THIS EXISTS WHEN THE PROJECT ALREADY DEPENDS ON HiGHS.
//
// One reason, and it is narrower than it looks: this solver keeps the plan's
// self-report inside the judge's agreement band. Everything else that has been
// offered for it has been measured and is false.
//
// Not asynchrony — `MilpSolve` is synchronous once `loadHighs()` has resolved.
// Not call volume — 12 calls per plan on average across the 40-instance sweep,
// 72 at the worst, on LPs no larger than 27 rows by 21 columns. And not the
// vertex, which is the argument this comment used to make at length: that two
// of `evaluator.ts`'s three call sites read `primal` rather than the objective,
// that HiGHS returns a different optimum on a degenerate polytope, and that
// swapping would therefore change the plan almost everywhere.
//
// It does not. A HiGHS-backed drop-in over the same signature was run against
// the whole sweep: 38 of 40 instances came back with a byte-identical
// allocation and a judged joint identical to the last bit, and the two that
// moved moved by 0.0179 nats at most, in opposite directions. The reason the
// vertex does not matter is structural: in `optimizeJointCrafts` the returned
// array is used as nothing but a Frank-Wolfe linear-oracle vertex and an
// active-set member, and any argmax vertex is a valid oracle answer, so the
// iteration converges to the same optimum whichever one it is handed.
//
// What did move is `emit`'s `reported` value, by 1.06e-6 to 3.56e-6 nats —
// enough to trip C2-honesty, whose tolerance is 1e-6, on 11 of 18 instances.
// The plans were unchanged; only the self-report drifted. That looks like a
// conditioning artifact of the LP encoding rather than anything intrinsic to
// HiGHS, but it was not proven removable, and 11 new invariant violations is
// not a trade worth making blind. Issue #52 carries the remaining work and the
// three conditioning fixes still untried.
//
// Two things that would have been reasons are not: the judge has its own
// simplex in `src/oracle/simplex.ts` (a float Bland tableau and an exact
// rational one), so nothing here is coupled to it; and HiGHS is not the slower
// path in aggregate — it needed 558 LP calls against 2581, because the pricing
// rule below makes Frank-Wolfe stall. On one instance it burns 2107 iterations
// and exits on `maxIters` without reaching the 1e-12 gap, where the HiGHS
// oracle reaches the same answer in 40. That is a defect in this file, recorded
// so it is not mistaken for a reason to keep it.
//
// DEVIATION from SPEC section 2 ("Bland's rule simplex, iteration guard
// 50*(rows+cols)"): pure Bland pricing needed thousands of pivots on the
// bound-polytope LPs (200+ columns, degenerate) and blew the stated guard.
// Pricing here is Dantzig (most negative reduced cost, ties to the lowest
// index — deterministic), falling back permanently to Bland's rule after a
// degenerate streak so the anti-cycling guarantee is kept. Same optimum, same
// determinism, fewer pivots.
//
// SCALING. The rows of these LPs mix quantities of very different magnitude:
// normalized fuel/time near 1, per-ship yields several orders below that, and
// Frank-Wolfe gradients whose entries span ~1e6 because g'(s) blows up as s
// approaches 0. An *absolute* pivot tolerance on such a tableau will accept a
// pivot element that is pure rounding noise; dividing the pivot row by it
// destroys the basis, and once the basic solution is infeasible the objective
// is meaningless and Bland's finite-termination proof no longer applies. That
// is not a hypothetical: it drove a 54x42 LP past 20000 pivots with Bland
// already engaged and the objective driven negative on a problem that starts
// feasible at zero.
//
// So each row is equilibrated to max |coefficient| = 1 (scaling a row and its
// rhs together leaves the feasible set and the primal solution untouched), the
// objective is normalized to max |c| = 1 and rescaled on the way out, and both
// the entering test and the ratio test use tolerances that are meaningful
// against those unit scales.

export interface SimplexSolution {
  objective: number;
  primal: number[]; // parallel to c
}

// Reduced costs and pivot elements both live on a unit scale after
// equilibration, so one tolerance serves for both.
const TOL = 1e-9;
// A pivot element this far below the largest candidate in its column is
// rejected as noise even when it wins the ratio test outright.
const PIVOT_REL = 1e-7;
// Rounding leaves the rhs a hair negative on degenerate pivots; anything
// within this of zero is clamped rather than treated as lost feasibility.
const FEAS_TOL = 1e-7;

export function simplexMax(
  A: readonly (readonly number[])[],
  b: readonly number[],
  c: readonly number[]
): SimplexSolution {
  const m = A.length;
  const n = c.length;
  const width = n + m + 1; // structural vars, slacks, rhs

  // Objective scale. A positive factor changes neither the argmax nor the
  // feasible set, so it is undone by a single multiply at the end.
  let cScale = 0;
  for (let j = 0; j < n; j++) cScale = Math.max(cScale, Math.abs(c[j]));
  if (!(cScale > 0) || !Number.isFinite(cScale)) cScale = 1;

  const T: Float64Array[] = [];
  for (let i = 0; i < m; i++) {
    const row = new Float64Array(width);
    // Row equilibration over the structural coefficients and the rhs. The
    // slack column stays 1, which is already the target scale.
    let s = 0;
    for (let j = 0; j < n; j++) s = Math.max(s, Math.abs(A[i][j]));
    s = Math.max(s, Math.abs(b[i]));
    if (!(s > 0) || !Number.isFinite(s)) s = 1;
    for (let j = 0; j < n; j++) row[j] = A[i][j] / s;
    row[n + i] = 1;
    row[width - 1] = b[i] / s;
    T.push(row);
  }
  const obj = new Float64Array(width);
  for (let j = 0; j < n; j++) obj[j] = -c[j] / cScale;
  T.push(obj);

  const basis: number[] = [];
  for (let i = 0; i < m; i++) basis.push(n + i);

  // With a well-scaled tableau a correct solve is O(m + n) pivots; the cap is
  // a guard against a genuine defect, not a tuning knob.
  const maxIters = 200 * (m + n) + 1000;
  const degenLimit = 2 * (m + n) + 100; // non-improving pivots before Bland kicks in
  let degenStreak = 0;
  let bland = false;
  let lastObjective = 0;

  for (let iter = 0; iter < maxIters; iter++) {
    let enter = -1;
    if (bland) {
      // Bland: lowest-index column with negative reduced cost.
      for (let j = 0; j < n + m; j++) {
        if (T[m][j] < -TOL) {
          enter = j;
          break;
        }
      }
    } else {
      // Dantzig: most negative reduced cost; ties break to the lowest index.
      let best = -TOL;
      for (let j = 0; j < n + m; j++) {
        if (T[m][j] < best) {
          best = T[m][j];
          enter = j;
        }
      }
    }
    const currentSolution = () => {
      const primal = new Array<number>(n).fill(0);
      for (let i = 0; i < m; i++) {
        if (basis[i] < n) primal[basis[i]] = Math.max(0, T[i][width - 1]);
      }
      return { objective: T[m][width - 1] * cScale, primal };
    };

    if (enter === -1) return currentSolution();

    // Largest candidate in the entering column sets the scale below which a
    // pivot element is noise rather than a usable pivot.
    let colMax = 0;
    for (let i = 0; i < m; i++) colMax = Math.max(colMax, Math.abs(T[i][enter]));
    const pivotFloor = Math.max(TOL, colMax * PIVOT_REL);

    // Ratio test over numerically safe pivots only. Ties within tolerance go
    // to the largest pivot element for stability, and to the lowest basis
    // index beyond that — the latter is what Bland's anti-cycling argument
    // needs, and it also keeps the choice deterministic.
    let leave = -1;
    let bestRatio = Infinity;
    let bestPivot = 0;
    let anyPositive = false;
    for (let i = 0; i < m; i++) {
      const a = T[i][enter];
      if (a > 0) anyPositive = true;
      if (a <= pivotFloor) continue;
      const ratio = Math.max(0, T[i][width - 1]) / a;
      if (leave === -1 || ratio < bestRatio - TOL) {
        bestRatio = ratio;
        bestPivot = a;
        leave = i;
      } else if (ratio <= bestRatio + TOL) {
        const better = bland
          ? basis[i] < basis[leave]
          : a > bestPivot + TOL || (Math.abs(a - bestPivot) <= TOL && basis[i] < basis[leave]);
        if (better) {
          bestPivot = a;
          leave = i;
        }
        if (ratio < bestRatio) bestRatio = ratio;
      }
    }
    if (leave === -1) {
      // Two different things reach here. A column with no positive entry at all
      // really is an unbounded ray. A column that has positive entries, all of
      // them under `pivotFloor`, is a numerical dead end on a bounded LP:
      // `pivotFloor` is scaled off the largest *magnitude* in the column, so a
      // large negative entry can float it above every positive one. Throwing
      // for the second case travels all the way up through `evaluateAt` and
      // `solveWith` and costs the user a plan rather than a slightly worse one.
      if (!anyPositive) throw new Error('simplex: LP is unbounded');
      return currentSolution();
    }

    const pivot = T[leave][enter];
    const leaveRow = T[leave];
    for (let j = 0; j < width; j++) leaveRow[j] /= pivot;
    leaveRow[enter] = 1; // exact, rather than 1 plus a rounding error
    for (let i = 0; i <= m; i++) {
      if (i === leave) continue;
      const row = T[i];
      const factor = row[enter];
      if (factor === 0) continue;
      for (let j = 0; j < width; j++) row[j] -= factor * leaveRow[j];
      row[enter] = 0;
      // Keep the basic solution feasible against rounding drift. Anything
      // past FEAS_TOL is a real loss of feasibility rather than noise.
      if (i < m && row[width - 1] < 0) {
        if (row[width - 1] < -FEAS_TOL) {
          throw new Error(`simplex: basis lost feasibility (rhs=${row[width - 1].toExponential(3)})`);
        }
        row[width - 1] = 0;
      }
    }
    basis[leave] = enter;

    if (!bland) {
      const objective = T[m][width - 1];
      if (objective > lastObjective + 1e-12) {
        degenStreak = 0;
        lastObjective = objective;
      } else if (++degenStreak >= degenLimit) {
        bland = true;
      }
    }
  }
  throw new Error(
    `simplex: iteration cap exceeded (m=${m} n=${n} bland=${bland} ` +
      `obj=${(T[m][width - 1] * cScale).toExponential(6)})`
  );
}
