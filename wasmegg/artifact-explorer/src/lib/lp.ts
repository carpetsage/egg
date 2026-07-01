// Small tableau simplex: max c·x s.t. Ax <= b, x >= 0, with b >= 0 so the
// slack basis is feasible from the start. Bland's rule to avoid cycling.
// https://www.youtube.com/watch?v=9YKLXFqCy6E gives a decent baseline overview

// Sorry for all the dense math. :(
// Standard libraries had unaccetpable runtime characteristics where
// this can make some simplifying assumptions

export type LpStatus = 'optimal' | 'infeasible' | 'unbounded';

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
interface ProtoEntry {
  c: Float64Array;
  n: number;
  m: number;
  proto: Float64Array;
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
    for (let j = 0; j < n; j++) {
      proto[j] = -c[j];
    }
    for (let i = 0; i < m; i++) {
      const off = (i + 1) * W;
      const Ai = A[i];
      for (let j = 0; j < n; j++) {
        proto[off + j] = Ai[j];
      }
      proto[off + n + i] = 1;
    }
    entry = { c, n, m, proto };
    protoCache.set(A, entry);
  }

  if (scratchT.length < cells) {
    scratchT = new Float64Array(cells);
  }
  const T = scratchT;
  T.set(entry.proto);
  for (let i = 0; i < m; i++) {
    T[(i + 1) * W + W - 1] = Math.max(0, b[i]);
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

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // entering variable: lowest-index column with negative reduced cost (Bland)
    let pivCol = -1;
    for (let j = 0; j < n + m; j++) {
      if (T[j] < -EPS) {
        pivCol = j;
        break;
      }
    }
    if (pivCol === -1) break; // optimal

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

  const res = makeResult('optimal', T[W - 1], n, m);
  const primal = res.primal;
  primal.fill(0);
  for (let i = 0; i < m; i++) {
    const v = basis[i];
    if (v < n) {
      primal[v] = T[(i + 1) * W + W - 1];
    }
  }
  const duals = res.duals;
  for (let i = 0; i < m; i++) {
    duals[i] = T[n + i];
  }
  return res;
}
