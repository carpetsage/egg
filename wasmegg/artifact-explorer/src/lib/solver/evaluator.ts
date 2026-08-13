// Judge-equivalent evaluator: the value in nats of an integer allocation over
// option groups, mirroring `src/oracle/evaluate.ts` numerically without importing it.

import type { Model } from './model';
import { gPrime, goldenSectionArgmax, logHit } from '../concave';
import { simplexMax } from './simplex';

export interface EvalResult {
  logJoint: number; // nats; -Infinity when any score is <= 0
  scores: number[]; // per target; +Infinity for a prob-1 craft
}

function maxWeightedCraft(model: Model, b: number[], idx: number, c0: number): number {
  const c = new Array<number>(model.craftables.length).fill(0);
  c[idx] = c0;
  return simplexMax(model.consRows, b, c).objective;
}

// Decided combinatorially rather than by the LP: the float LP answers "0 or
// positive?" with ~1e-30 crafts, which score as -70 nats where the judge says -Infinity.
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
  gapTol: number; // in nats
  maxIters: number;
}

// The judge's constants; the default so parity and the reported numbers hold.
export const EXACT_PRECISION: EvalPrecision = { gapTol: 1e-12, maxIters: 2000 };
// DEVIATION from SPEC section 2 (which fixes gap 1e-12 / 2000 iterations). Steering
// only ranks incumbents; the plan returned is always re-scored at EXACT_PRECISION.
export const STEERING_PRECISION: EvalPrecision = { gapTol: 1e-7, maxIters: 600 };

interface Inventory {
  b: number[];
  lambdas: number[];
}

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

function evaluateAt(model: Model, b: number[], lambdas: readonly number[], precision: EvalPrecision): EvalResult {
  const Qs = model.Qs;
  const nTargets = model.targets.length;
  const scores = new Array<number>(nTargets).fill(0);
  const fwIdx: number[] = [];
  for (let t = 0; t < nTargets; t++) {
    const idx = model.targetCraftIdx[t];
    if (idx < 0 || !craftAvailable(model, b, idx)) {
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
