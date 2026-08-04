// Small tableau simplex: max c·x s.t. Ax <= b, x >= 0, with b >= 0 so the
// slack basis is feasible from the start. Bland's rule to avoid cycling.
// https://www.youtube.com/watch?v=9YKLXFqCy6E gives a decent baseline overview

// Sorry for all the dense math. :(
// Standard libraries had unaccetpable runtime characteristics where
// this can make some simplifying assumptions

// 'iteration-limit' means the pivot loop hit MAX_ITER without reaching a
// certified-optimal basis. primal/duals then describe the last basis visited:
// primal-feasible, but neither optimal nor a valid dual certificate. Callers
// must not treat it as 'optimal'.
export type LpStatus = 'optimal' | 'infeasible' | 'unbounded' | 'iteration-limit';

export interface LpResult {
  status: LpStatus;
  objective: number;
  primal: Float64Array;
  duals: Float64Array; // one per constraint row
}

const EPS = 1e-9;

// This sits at the bottom of the optimizer's search loops and gets called
// many times per run, so everything below is reused across calls and
// a solve allocates nothing in steady state.
// Size is expanded on-demand so first runs pay a slight overhead
let scratchT = new Float64Array(0);
let scratchBasis = new Int32Array(0);
let scratchPivIdx = new Int32Array(0);

// The result is shared: primal/duals are views into one buffer and only
// valid until the next solveLp call. Updates need to be careful about
// the shared memory.
let scratchOut = new Float64Array(0);
const reusedResult: LpResult = {
  status: 'optimal',
  objective: 0,
  primal: new Float64Array(0),
  duals: new Float64Array(0),
};

function makeResult(status: LpStatus, objective: number, n: number, m: number): LpResult {
  if (scratchOut.length < n + m) scratchOut = new Float64Array(n + m);
  reusedResult.status = status;
  reusedResult.objective = objective;
  reusedResult.primal = scratchOut.subarray(0, n);
  reusedResult.duals = scratchOut.subarray(n, n + m);
  return reusedResult;
}

// Prototype tableaus [-c | A I | 0] keyed by A. Callers solve the same
// (c, A) many times with only b changing, so the tableau init reduces to a
// copy plus the RHS column. Assumes c and A are never mutated after the
// first solve.
//
// The prototype holds the *equilibrated* problem. Our rows span fuel budgets
// (~1e9..1e18) down to craft-conservation rows (~1); against an absolute EPS
// the entering-variable test then misreads a genuinely improving column as
// non-negative and the solve stops early claiming optimality. Two-sided
// equilibration puts every |entry| in (0, 1] so the absolute EPS behaves like
// a relative one. Both scalings depend only on (c, A), so they are computed
// once here and applied per call as an O(m) scaling of b plus an O(n+m)
// unscaling of the result:
//
//   r_i = max_j |A[i][j]|            row i  ->  A[i][:]/r_i,  b_i -> b_i/r_i
//   s_j = max_i |A[i][j]|/r_i        col j  ->  A[:][j]/s_j,  c_j -> c_j/s_j
//
// Row scaling divides both sides of an inequality by a positive number, so the
// feasible set and the optimal x are untouched; the dual of row i comes back as
// y_i = y_scaled_i / r_i. Column scaling is the substitution x'_j = s_j x_j,
// which leaves A x and c·x pointwise unchanged, so x_j = x_scaled_j / s_j and
// the duals are unaffected. The objective value is invariant under both and is
// returned as the solver computed it.
interface ProtoEntry {
  c: Float64Array;
  n: number;
  m: number;
  proto: Float64Array;
  rowScale: Float64Array; // r_i, length m
  colScale: Float64Array; // s_j, length n
}
const protoCache = new WeakMap<Float64Array[], ProtoEntry>();

export function solveLp(c: Float64Array, A: Float64Array[], b: Float64Array): LpResult {
  const n = c.length; // # decision variables
  const m = A.length; // # constraints
  const W = n + m + 1; // width: decision vars | slacks | RHS

  for (let i = 0; i < m; i++) {
    if (b[i] < -EPS) {
      // would need a phase-1 solve; we never build such problems
      const r = makeResult('infeasible', 0, n, m);
      r.primal.fill(0);
      r.duals.fill(0);
      return r;
    }
  }

  // row-major (m+1) x W tableau, row 0 = objective
  const cells = (m + 1) * W;
  let entry = protoCache.get(A);
  if (!entry || entry.c !== c || entry.n !== n || entry.m !== m) {
    const proto = new Float64Array(cells);
    const rowScale = new Float64Array(m);
    const colScale = new Float64Array(n);

    for (let i = 0; i < m; i++) {
      const Ai = A[i];
      let r = 0;
      for (let j = 0; j < n; j++) {
        const v = Math.abs(Ai[j]);
        if (v > r) r = v;
      }
      // an all-zero row imposes nothing; leave it alone rather than divide by 0
      rowScale[i] = r > 0 && Number.isFinite(r) ? r : 1;
    }
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let i = 0; i < m; i++) {
        const v = Math.abs(A[i][j]) / rowScale[i];
        if (v > s) s = v;
      }
      colScale[j] = s > 0 && Number.isFinite(s) ? s : 1;
    }

    for (let j = 0; j < n; j++) {
      proto[j] = -c[j] / colScale[j];
    }
    for (let i = 0; i < m; i++) {
      const off = (i + 1) * W;
      const Ai = A[i];
      const ri = rowScale[i];
      for (let j = 0; j < n; j++) {
        proto[off + j] = Ai[j] / (ri * colScale[j]);
      }
      // the slack keeps a unit coefficient, i.e. it is the rescaled slack
      // s'_i = s_i / r_i, nonnegative exactly when s_i is
      proto[off + n + i] = 1;
    }
    entry = { c, n, m, proto, rowScale, colScale };
    protoCache.set(A, entry);
  }
  const rowScale = entry.rowScale;
  const colScale = entry.colScale;

  if (scratchT.length < cells) {
    scratchT = new Float64Array(cells);
  }
  const T = scratchT;
  T.set(entry.proto);
  for (let i = 0; i < m; i++) {
    T[(i + 1) * W + W - 1] = Math.max(0, b[i]) / rowScale[i];
  }

  if (scratchBasis.length < m) {
    scratchBasis = new Int32Array(m);
  }
  const basis = scratchBasis;
  for (let i = 0; i < m; i++) {
    basis[i] = n + i;
  }

  // Determined by trial-and-error. Further refinement may lead to better performance
  // Within a few per-mil to HiGHS solver
  const MAX_ITER = 50 * (n + m + 1);

  // distinguishes "no improving column exists" from "ran out of pivots";
  // only the former certifies optimality
  let converged = false;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    // entering variable: lowest-index column with negative reduced cost (Bland)
    let pivCol = -1;
    for (let j = 0; j < n + m; j++) {
      if (T[j] < -EPS) {
        pivCol = j;
        break;
      }
    }
    if (pivCol === -1) {
      converged = true;
      break;
    }

    // min-ratio test, ties broken by lowest basis index
    let pivRow = -1;
    let bestRatio = Infinity;
    for (let i = 0; i < m; i++) {
      const off = (i + 1) * W;
      const a = T[off + pivCol];
      if (a > EPS) {
        const ratio = T[off + W - 1] / a;
        if (ratio < bestRatio - EPS) {
          bestRatio = ratio;
          pivRow = i;
        } else if (ratio < bestRatio + EPS && pivRow >= 0 && basis[i] < basis[pivRow]) {
          pivRow = i;
        }
      }
    }
    if (pivRow === -1) {
      const r = makeResult('unbounded', Infinity, n, m);
      r.primal.fill(0);
      r.duals.fill(0);
      return r;
    }

    // normalize the pivot row and record its nonzero columns; the
    // elimination below only needs to touch those (constraint rows are
    // sparse, and stay so over our handful of pivots)
    const pOff = (pivRow + 1) * W;
    const pivVal = T[pOff + pivCol];
    if (scratchPivIdx.length < W) {
      scratchPivIdx = new Int32Array(W);
    }
    const pivIdx = scratchPivIdx;
    let nnz = 0;
    for (let j = 0; j < W; j++) {
      T[pOff + j] /= pivVal;
      if (T[pOff + j] !== 0) {
        pivIdx[nnz++] = j;
      }
    }
    for (let i = 0; i <= m; i++) {
      if (i === pivRow + 1) continue;
      const off = i * W;
      const factor = T[off + pivCol];
      if (Math.abs(factor) < EPS) continue;
      for (let k = 0; k < nnz; k++) {
        const j = pivIdx[k];
        T[off + j] -= factor * T[pOff + j];
      }
    }
    basis[pivRow] = pivCol;
  }

  // the objective is invariant under both scalings, so it needs no correction
  const res = makeResult(converged ? 'optimal' : 'iteration-limit', T[W - 1], n, m);
  const primal = res.primal;
  primal.fill(0);
  for (let i = 0; i < m; i++) {
    const v = basis[i];
    if (v < n) {
      primal[v] = T[(i + 1) * W + W - 1];
    }
  }
  for (let j = 0; j < n; j++) {
    primal[j] /= colScale[j];
  }
  const duals = res.duals;
  for (let i = 0; i < m; i++) {
    duals[i] = T[n + i] / rowScale[i];
  }
  return res;
}
