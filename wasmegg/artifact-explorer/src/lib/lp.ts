// ============================================================
// Tiny revised-tableau simplex for the artifact-explorer optimizer.
//
// Solves   max c·x   subject to   A x ≤ b ,   x ≥ 0
// with b ≥ 0 (caller's responsibility — every constraint we build
// for the inner crafting LP and the Step-2 joint LP has a non-negative
// RHS so a slack basis is feasible at iteration 0).
//
// Bland's rule is used for both entering and leaving variables to
// prevent cycling under degeneracy. Sized for problems up to a few
// hundred variables × ~30 constraints — well within the regime
// where a textbook tableau simplex resolves in microseconds.
// ============================================================

export type LpStatus = 'optimal' | 'infeasible' | 'unbounded';

export interface LpResult {
  status: LpStatus;
  objective: number;
  /** Primal solution x*. Length = number of decision variables. */
  primal: Float64Array;
  /** Shadow prices (duals) — one per row of A. */
  duals: Float64Array;
}

const EPS = 1e-9;

export function solveLp(c: Float64Array, A: Float64Array[], b: Float64Array): LpResult {
  const n = c.length; // # decision variables
  const m = A.length; // # constraints
  const W = n + m + 1; // width: decision vars | slacks | RHS

  for (let i = 0; i < m; i++) {
    if (b[i] < -EPS) {
      // Caller invariant violated — would need Phase 1. Bail with infeasible.
      return {
        status: 'infeasible',
        objective: 0,
        primal: new Float64Array(n),
        duals: new Float64Array(m),
      };
    }
  }

  const T: Float64Array[] = new Array(m + 1);
  for (let i = 0; i <= m; i++) T[i] = new Float64Array(W);

  // Objective row: -c on decision vars (we maximise → minimise -c, then read max from RHS slot)
  for (let j = 0; j < n; j++) T[0][j] = -c[j];

  // Constraint rows: [A | I | b]
  for (let i = 0; i < m; i++) {
    const row = T[i + 1];
    const Ai = A[i];
    for (let j = 0; j < n; j++) row[j] = Ai[j];
    row[n + i] = 1;
    row[W - 1] = Math.max(0, b[i]);
  }

  // Initial basis: the m slack variables.
  const basis = new Int32Array(m);
  for (let i = 0; i < m; i++) basis[i] = n + i;

  const MAX_ITER = 50 * (n + m + 1);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Bland: lowest-index column with strictly negative reduced cost.
    let pivCol = -1;
    for (let j = 0; j < n + m; j++) {
      if (T[0][j] < -EPS) {
        pivCol = j;
        break;
      }
    }
    if (pivCol === -1) break; // optimal

    // Min-ratio test, lowest-basis-index tie-break (Bland).
    let pivRow = -1;
    let bestRatio = Infinity;
    for (let i = 0; i < m; i++) {
      const a = T[i + 1][pivCol];
      if (a > EPS) {
        const ratio = T[i + 1][W - 1] / a;
        if (ratio < bestRatio - EPS) {
          bestRatio = ratio;
          pivRow = i;
        } else if (ratio < bestRatio + EPS && pivRow >= 0 && basis[i] < basis[pivRow]) {
          pivRow = i;
        }
      }
    }
    if (pivRow === -1) {
      return {
        status: 'unbounded',
        objective: Infinity,
        primal: new Float64Array(n),
        duals: new Float64Array(m),
      };
    }

    // Pivot on (pivRow+1, pivCol).
    const pivRowArr = T[pivRow + 1];
    const pivVal = pivRowArr[pivCol];
    for (let j = 0; j < W; j++) pivRowArr[j] /= pivVal;
    for (let i = 0; i <= m; i++) {
      if (i === pivRow + 1) continue;
      const factor = T[i][pivCol];
      if (Math.abs(factor) < EPS) continue;
      const row = T[i];
      for (let j = 0; j < W; j++) row[j] -= factor * pivRowArr[j];
    }
    basis[pivRow] = pivCol;
  }

  const primal = new Float64Array(n);
  for (let i = 0; i < m; i++) {
    const v = basis[i];
    if (v < n) primal[v] = T[i + 1][W - 1];
  }
  const duals = new Float64Array(m);
  for (let i = 0; i < m; i++) duals[i] = T[0][n + i];
  const objective = T[0][W - 1];
  return { status: 'optimal', objective, primal, duals };
}
