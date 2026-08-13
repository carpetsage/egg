// Judge-equivalent evaluator: the value in nats of an integer allocation over
// option groups, re-derived from the objective (SPEC.md section 2) to mirror
// `src/oracle/evaluate.ts` numerically without importing it.
//
// Single target: one craft LP, s_T = Q_T * craft_T + lambda_T.
// Multiple targets: away-step Frank-Wolfe on sum_T g(s_T), g(s) = log(1-e^-s),
// over the craft-conservation polytope, with the judge's scheme and constants
// (centroid seed, capped gradient, golden-section line search, 1e-12 gap).

import type { Model } from './model';
import { simplexMax } from './simplex';

export interface EvalResult {
  logJoint: number; // sum_T log(1 - exp(-s_T)) in nats; -Infinity when any s_T <= 0
  scores: number[]; // s_T per target (may be +Infinity for a prob-1 craft)
}

// g(s) = log(1 - exp(-s)), computed as log(-expm1(-s)).
//
// The form matters. Evaluating `1 - exp(-s)` directly cancels in the s ~ 1e-13
// regime the arena scores in, so the accurate expm1 form is the one the judge
// computes and the one this has to match.
export function logHit(s: number): number {
  return s > 0 ? Math.log(-Math.expm1(-s)) : -Infinity;
}

// g'(s); grows like 1/s as s -> 0, capped to keep linearizations finite.
const GPRIME_CAP = 1e12;
function gPrime(s: number): number {
  return s <= 0 ? GPRIME_CAP : Math.min(1 / Math.expm1(s), GPRIME_CAP);
}

const GOLDEN = (Math.sqrt(5) - 1) / 2;

// argmax of a unimodal (concave) f over [0, 1].
function goldenSectionArgmax(f: (x: number) => number, iters: number): number {
  let a = 0;
  let b = 1;
  let c = b - GOLDEN * (b - a);
  let d = a + GOLDEN * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let i = 0; i < iters; i++) {
    if (fc >= fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - GOLDEN * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + GOLDEN * (b - a);
      fd = f(d);
    }
  }
  return (a + b) / 2;
}

// Max craft_idx over the conservation polytope at inventory b, weighted by c0.
function maxWeightedCraft(model: Model, b: number[], idx: number, c0: number): number {
  const c = new Array<number>(model.craftables.length).fill(0);
  c[idx] = c0;
  return simplexMax(model.consRows, b, c).objective;
}

// Exact structural reachability of a positive craft at inventory b: craft_p
// can exceed 0 iff every child is either in stock or itself positively
// craftable (an epsilon craft cascades down the DAG). Decided combinatorially
// because the float LP answers "0 or positive?" with rounding noise (~1e-30
// crafts), which reads as a -70-nat probability where the judge's exact
// arithmetic says -Infinity.
function craftAvailable(model: Model, b: readonly number[], root: number): boolean {
  const memo = new Array<number>(model.craftables.length).fill(-1);
  const visit = (p: number): boolean => {
    if (memo[p] >= 0) return memo[p] === 1;
    memo[p] = 0; // cycle guard; the recipe graph is acyclic
    let ok = true;
    for (const child of model.craftChildren[p]) {
      if (!(b[child.itemIdx] > 0) && !(child.childCraft >= 0 && visit(child.childCraft))) {
        ok = false;
        break;
      }
    }
    memo[p] = ok ? 1 : 0;
    return ok;
  };
  return visit(root);
}

// Away-step Frank-Wolfe on the exact joint objective over the craft polytope,
// for the finite-Q craftable targets. Mirrors the judge's scheme: seeded at the
// centroid of the per-target max-craft vertices, FW-vs-away by gradient dot
// product, 100-iteration golden-section line search, gap tolerance 1e-12,
// at most 2000 iterations, active-set tolerance 1e-9.
function optimizeJointCrafts(
  model: Model,
  b: number[],
  idxs: number[],
  Qs: number[],
  lambdas: number[],
  gapTol: number,
  maxIters: number
): number[] {
  const n = idxs.length;

  interface ActiveVertex {
    crafts: number[];
    weight: number;
  }
  const solveWeighted = (weights: number[]): number[] => {
    const c = new Array<number>(model.craftables.length).fill(0);
    for (let i = 0; i < n; i++) c[idxs[i]] = weights[i] * Qs[i];
    const { primal } = simplexMax(model.consRows, b, c);
    return idxs.map(idx => primal[idx]);
  };

  const active: ActiveVertex[] = [];
  for (let i = 0; i < n; i++) {
    const weights = new Array<number>(n).fill(0);
    weights[i] = 1;
    active.push({ crafts: solveWeighted(weights), weight: 1 / n });
  }
  const crafts = new Array<number>(n).fill(0);
  const recomputeCrafts = () => {
    crafts.fill(0);
    for (const av of active) {
      for (let i = 0; i < n; i++) crafts[i] += av.weight * av.crafts[i];
    }
  };
  recomputeCrafts();

  const VERTEX_TOL = 1e-9;
  const sameVertex = (a: number[], v: number[]) => a.every((ai, i) => Math.abs(ai - v[i]) < VERTEX_TOL);
  const dot = (u: number[], v: number[]) => u.reduce((s, x, i) => s + x * v[i], 0);

  for (let iter = 0; iter < maxIters; iter++) {
    const scores = crafts.map((craft, i) => Qs[i] * craft + lambdas[i]);
    const grad = scores.map((s, i) => gPrime(s) * Qs[i]);
    const c = new Array<number>(model.craftables.length).fill(0);
    for (let i = 0; i < n; i++) c[idxs[i]] = grad[i];
    const { primal } = simplexMax(model.consRows, b, c);
    const fwVertex = idxs.map(idx => primal[idx]);

    const gDotX = dot(grad, crafts);
    const gap = dot(grad, fwVertex) - gDotX;
    if (gap < gapTol) break;

    let awayIdx = 0;
    let awayDotVal = Infinity;
    for (let k = 0; k < active.length; k++) {
      const v = dot(grad, active[k].crafts);
      if (v < awayDotVal) {
        awayDotVal = v;
        awayIdx = k;
      }
    }

    const fwDot = gap;
    const awayDot = gDotX - awayDotVal;
    const away = active[awayIdx];
    const useFw = fwDot >= awayDot;
    const dir = useFw ? fwVertex.map((v, i) => v - crafts[i]) : crafts.map((cx, i) => cx - away.crafts[i]);
    const gammaMax = useFw ? 1 : away.weight / (1 - away.weight);

    const phi = (u: number) => {
      const gamma = u * gammaMax;
      let total = 0;
      for (let i = 0; i < n; i++) {
        total += logHit(Qs[i] * (crafts[i] + gamma * dir[i]) + lambdas[i]);
      }
      return total;
    };
    const gamma = goldenSectionArgmax(phi, 100) * gammaMax;

    if (useFw) {
      for (const av of active) av.weight *= 1 - gamma;
      const hit = active.find(av => sameVertex(av.crafts, fwVertex));
      if (hit) hit.weight += gamma;
      else active.push({ crafts: fwVertex, weight: gamma });
    } else {
      for (const av of active) av.weight *= 1 + gamma;
      away.weight -= gamma;
    }
    for (let k = active.length - 1; k >= 0; k--) {
      if (active[k].weight <= VERTEX_TOL) active.splice(k, 1);
    }
    recomputeCrafts();
  }

  return crafts.map((craft, i) => Qs[i] * craft + lambdas[i]);
}

export interface EvalPrecision {
  gapTol: number; // FW duality-gap tolerance in nats
  maxIters: number;
}

// The judge's constants; the default so parity and the reported numbers hold.
export const EXACT_PRECISION: EvalPrecision = { gapTol: 1e-12, maxIters: 2000 };
// DEVIATION from SPEC section 2 (which fixes gap 1e-12 / 2000 iterations).
// Steering evaluations run at 1e-7 instead: `solveWith` scores an incumbent
// only to rank it against the current best, and those comparisons are
// separated by millinats, so the extra five decades decide nothing. The plan
// actually returned is always re-scored at EXACT_PRECISION — that is the
// number `reported` carries and the one C2/C3 check.
export const STEERING_PRECISION: EvalPrecision = { gapTol: 1e-7, maxIters: 600 };

interface Inventory {
  b: number[]; // per consumed item
  lambdas: number[]; // direct legendary rate per target
}

// Drops and direct legendary rates implied by an integer allocation. Split out
// of `evaluateCounts`.
function inventoryOf(model: Model, counts: readonly number[]): Inventory {
  const nTargets = model.targets.length;
  const b = model.baseB.slice();
  const lambdas = new Array<number>(nTargets).fill(0);
  for (let g = 0; g < model.groups.length; g++) {
    const n = counts[g];
    if (!(n > 0)) continue;
    const grp = model.groups[g];
    for (let i = 0; i < b.length; i++) b[i] += n * grp.yieldByItem[i];
    for (let t = 0; t < nTargets; t++) lambdas[t] += n * grp.legendaryByTarget[t];
  }
  return { b, lambdas };
}

export function evaluateCounts(
  model: Model,
  counts: readonly number[],
  precision: EvalPrecision = EXACT_PRECISION
): EvalResult {
  const { b, lambdas } = inventoryOf(model, counts);
  return evaluateAt(model, b, lambdas, precision);
}

// Value of a given inventory.
function evaluateAt(
  model: Model,
  b: number[],
  lambdas: readonly number[],
  precision: EvalPrecision = EXACT_PRECISION
): EvalResult {
  const Qs = model.Qs;
  const nTargets = model.targets.length;
  const scores = new Array<number>(nTargets).fill(0);
  // Split the targets: Q = +Infinity (craft probability 1) is handled
  // explicitly so Infinity never enters LP arithmetic, non-craftable targets
  // score their direct drops alone, and the rest go through the LP / FW path.
  const fwIdx: number[] = [];
  for (let t = 0; t < nTargets; t++) {
    const idx = model.targetCraftIdx[t];
    if (idx < 0 || !craftAvailable(model, b, idx)) {
      // Not craftable at all, or no positive craft exists at this inventory:
      // only the direct drops score.
      scores[t] = lambdas[t];
    } else if (Qs[t] === Infinity) {
      // Any craft_T > 0 gives p_T = 1; an infinitesimal craft consumes an
      // infinitesimal inventory, so it never competes with other targets.
      scores[t] = Infinity;
    } else {
      fwIdx.push(t);
    }
  }

  if (fwIdx.length === 1) {
    const t = fwIdx[0];
    scores[t] = maxWeightedCraft(model, b, model.targetCraftIdx[t], Qs[t]) + lambdas[t];
  } else if (fwIdx.length > 1) {
    const joint = optimizeJointCrafts(
      model,
      b,
      fwIdx.map(t => model.targetCraftIdx[t]),
      fwIdx.map(t => Qs[t]),
      fwIdx.map(t => lambdas[t]),
      precision.gapTol,
      precision.maxIters
    );
    fwIdx.forEach((t, i) => {
      scores[t] = joint[i];
    });
  }

  let logJoint = 0;
  for (const s of scores) logJoint += logHit(s);
  return { logJoint, scores };
}
