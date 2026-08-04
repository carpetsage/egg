// Inner crafting LPs over the recipe-conservation polytope. Every node consumed
// by some parent gets a conservation row; a final target has none, so dropped
// copies of it do not count as crafts. See OPTIMIZER.md.

import type { RecipeDAG } from './types';
import { solveLp } from './lp';

export interface AlphaResult {
  alpha: number; // craftable count of targets[0]; 0 when it's a leaf
  score: number; // weighted objective at the optimum
  craftByTarget: Map<string, number>;
  duals: Map<string, number>; // shadow price per constraint node
  primalByNode: Map<string, number>; // crafted count per non-leaf node
}

export interface InnerLp {
  readonly nonLeafNodes: readonly string[]; // decision variable order
  readonly constraintNodes: readonly string[]; // constraint row order
  readonly varIndex: ReadonlyMap<string, number>;
  readonly root: string;
  readonly targets: readonly string[];
  readonly weightByTarget: ReadonlyMap<string, number>;

  solve(inventory: Map<string, number>): AlphaResult;
}

// Targets absent from `weights` get weight 1.
export function compileInnerLp(
  recipeDag: RecipeDAG,
  desiredArtifactNodeIds: string[],
  weights?: Map<string, number>
): InnerLp {
  if (desiredArtifactNodeIds.length === 0) {
    return makeTrivialLp('', [], new Map());
  }
  const targets = desiredArtifactNodeIds;
  const primary = targets[0];

  const nonLeafNodes: string[] = [];
  const varIndex = new Map<string, number>();
  for (const [id, node] of recipeDag) {
    if (!node.isLeaf) {
      varIndex.set(id, nonLeafNodes.length);
      nonLeafNodes.push(id);
    }
  }

  // A leaf target contributes no objective term; its legendary chance is
  // drops-only.
  const weightByTarget = new Map<string, number>();
  for (const t of targets) {
    if (varIndex.has(t)) weightByTarget.set(t, weights?.get(t) ?? 1);
  }
  if (weightByTarget.size === 0) {
    // nothing craftable; fall back to holdings of the primary target
    return makeTrivialLp(primary, targets, weightByTarget);
  }

  const parentsOf = new Map<string, { parent: string; q: number }[]>();
  for (const [parentId, parentNode] of recipeDag) {
    if (parentNode.isLeaf) continue;
    for (const child of parentNode.children) {
      let parents = parentsOf.get(child.nodeId);
      if (!parents) {
        parents = [];
        parentsOf.set(child.nodeId, parents);
      }
      parents.push({ parent: parentId, q: child.quantity });
    }
  }

  // One constraint per consumed node:
  //   sum_parents q * p_parent - (p_n if non-leaf) <= inventory[n]
  const constraintNodes: string[] = [];
  for (const id of recipeDag.keys()) {
    const parents = parentsOf.get(id);
    if (!parents || parents.length === 0) continue;
    constraintNodes.push(id);
  }

  const nVars = nonLeafNodes.length;
  const nCons = constraintNodes.length;

  const c = new Float64Array(nVars);
  for (const [t, w] of weightByTarget) c[varIndex.get(t)!] = w;

  const A: Float64Array[] = new Array(nCons);
  for (let i = 0; i < nCons; i++) {
    const id = constraintNodes[i];
    const row = new Float64Array(nVars);
    const parents = parentsOf.get(id) ?? [];
    for (const { parent, q } of parents) {
      const idx = varIndex.get(parent);
      if (idx !== undefined) row[idx] += q;
    }
    if (varIndex.has(id)) row[varIndex.get(id)!] -= 1;
    A[i] = row;
  }

  const bScratch = new Float64Array(nCons);

  return {
    nonLeafNodes,
    constraintNodes,
    varIndex,
    root: primary,
    targets,
    weightByTarget,

    solve(inventory: Map<string, number>): AlphaResult {
      for (let i = 0; i < nCons; i++) {
        const v = inventory.get(constraintNodes[i]);
        bScratch[i] = v !== undefined && v > 0 ? v : 0;
      }
      const r = solveLp(c, A, bScratch);
      if (r.status !== 'optimal') {
        return { alpha: 0, score: 0, craftByTarget: new Map(), duals: new Map(), primalByNode: new Map() };
      }
      const craftByTarget = new Map<string, number>();
      for (const t of weightByTarget.keys()) {
        craftByTarget.set(t, r.primal[varIndex.get(t)!]);
      }
      const alpha = craftByTarget.get(primary) ?? 0;
      const duals = new Map<string, number>();
      for (let i = 0; i < nCons; i++) {
        duals.set(constraintNodes[i], r.duals[i]);
      }
      const primalByNode = new Map<string, number>();
      for (let i = 0; i < nonLeafNodes.length; i++) {
        if (r.primal[i] > 1e-9) {
          primalByNode.set(nonLeafNodes[i], r.primal[i]);
        }
      }
      return { alpha, score: r.objective, craftByTarget, duals, primalByNode };
    },
  };
}

function makeTrivialLp(primary: string, targets: readonly string[], weightByTarget: Map<string, number>): InnerLp {
  return {
    nonLeafNodes: [],
    constraintNodes: [],
    varIndex: new Map(),
    root: primary,
    targets,
    weightByTarget,
    solve(inventory: Map<string, number>): AlphaResult {
      const v = inventory.get(primary) ?? 0;
      return { alpha: v > 0 ? v : 0, score: 0, craftByTarget: new Map(), duals: new Map(), primalByNode: new Map() };
    },
  };
}

export interface ProbabilityFields {
  bestProbability: number;
  craftProbability: number;
  dropProbability: number;
}

//   craft = 1 - (1 - pCraft)^alpha
//   drop  = 1 - e^(-lambda)   (Poisson on direct legendary drops)
//   best  = 1 - (1 - craft)(1 - drop)
export function alphaToProb(
  alpha: number,
  legendaryYield: Map<string, number>,
  desiredArtifactNodeIds: string[],
  recipeDag: RecipeDAG
): ProbabilityFields {
  if (desiredArtifactNodeIds.length === 0) {
    return { bestProbability: 0, craftProbability: 0, dropProbability: 0 };
  }
  const root = desiredArtifactNodeIds[0];
  const node = recipeDag.get(root);
  const pCraft = node?.legendaryCraftProbability ?? 0;

  const a = alpha > 0 ? alpha : 0;
  let craftProbability = 0;
  if (pCraft > 0 && a > 0) {
    if (pCraft >= 1) craftProbability = 1;
    else craftProbability = 1 - Math.exp(a * Math.log(1 - pCraft));
  }

  const lambda = legendaryYield.get(root) ?? 0;
  const dropProbability = lambda > 0 ? 1 - Math.exp(-lambda) : 0;

  const bestProbability = 1 - (1 - craftProbability) * (1 - dropProbability);

  return { bestProbability, craftProbability: craftProbability, dropProbability };
}

// Tangent points for the epigraph relaxation of g(s) = log(1 - e^-s). The
// envelope OVER-estimates g: safe for search ranking only, never for reporting.
export const JOINT_TANGENT_BREAKPOINTS: readonly number[] = [
  1e-05,      1.8271e-05, 3.3383e-05, 6.09941e-05, 0.000111443, 0.000203617,
  0.000372029, 0.000679734, 0.00124194, 0.00226916, 0.00414598, 0.00757513,
  0.0138405,  0.0252881,  0.0462038,  0.0844191,  0.154242,    0.281816,
  0.514907,   0.940788,   1.71892,    3.14063,    5.73826,     10.4844,
  19.156,     35,
];

export interface Tangent {
  alpha: number;
  beta: number;
}

// beta_k = g'(s_k) = 1/(e^s_k - 1); alpha_k = g(s_k) - beta_k*s_k.
export const JOINT_TANGENTS: readonly Tangent[] = JOINT_TANGENT_BREAKPOINTS.map(s => {
  const beta = 1 / Math.expm1(s);
  const g = Math.log(-Math.expm1(-s));
  return { alpha: g - beta * s, beta };
});

// z_T can be negative (g(s) < 0 below s = ln 2) but lp.ts assumes x >= 0.
// Anyone building epigraph rows must subtract nTargets * this from the result.
export const EPIGRAPH_SHIFT = 50;

export function exactLogHitProbability(s: number): number {
  return s > 0 ? Math.log(-Math.expm1(-s)) : -Infinity;
}

export function tangentLogHitProbability(s: number): number {
  let best = Infinity;
  for (const t of JOINT_TANGENTS) {
    const v = t.alpha + t.beta * s;
    if (v < best) best = v;
  }
  return best;
}

export interface JointAlphaResult {
  craftByTarget: Map<string, number>; // absent for a leaf target, mirroring compileInnerLp
  primalByNode: Map<string, number>;
}

export interface JointInnerLp {
  readonly nonLeafNodes: readonly string[];
  readonly constraintNodes: readonly string[]; // conservation rows only, in b's row order
  readonly varIndex: ReadonlyMap<string, number>;
  readonly targets: readonly string[];

  // b is the inventory RHS (constraintNodes order), lambda the per-target
  // direct-legendary offset (targets order). Returns the tangent OVER-estimate
  // of sum_T g(Q_T*craft_T + lambda_T), for ranking only.
  solveScore(b: Float64Array, lambda: Float64Array): number;

  solve(inventory: Map<string, number>, lambda: Map<string, number>): JointAlphaResult;
}

// The craft-conservation LP with one epigraph variable z_T per target. lambda
// enters inside each tangent expression, never as one pooled scalar outside.
export function compileJointInnerLp(
  recipeDag: RecipeDAG,
  desiredArtifactNodeIds: string[],
  QByTarget: ReadonlyMap<string, number>
): JointInnerLp {
  const targets = desiredArtifactNodeIds;
  const nt = targets.length;

  const nonLeafNodes: string[] = [];
  const varIndex = new Map<string, number>();
  for (const [id, node] of recipeDag) {
    if (!node.isLeaf) {
      varIndex.set(id, nonLeafNodes.length);
      nonLeafNodes.push(id);
    }
  }

  const parentsOf = new Map<string, { parent: string; q: number }[]>();
  for (const [parentId, parentNode] of recipeDag) {
    if (parentNode.isLeaf) continue;
    for (const child of parentNode.children) {
      let parents = parentsOf.get(child.nodeId);
      if (!parents) {
        parents = [];
        parentsOf.set(child.nodeId, parents);
      }
      parents.push({ parent: parentId, q: child.quantity });
    }
  }

  const constraintNodes: string[] = [];
  for (const id of recipeDag.keys()) {
    const parents = parentsOf.get(id);
    if (!parents || parents.length === 0) continue;
    constraintNodes.push(id);
  }

  const nVars = nonLeafNodes.length;
  const nCons = constraintNodes.length;
  const totalVars = nVars + nt;
  const zBase = nVars;

  const c = new Float64Array(totalVars);
  for (let i = 0; i < nt; i++) c[zBase + i] = 1;

  const A: Float64Array[] = [];
  for (let i = 0; i < nCons; i++) {
    const id = constraintNodes[i];
    const row = new Float64Array(totalVars);
    const parents = parentsOf.get(id) ?? [];
    for (const { parent, q } of parents) {
      const idx = varIndex.get(parent);
      if (idx !== undefined) row[idx] += q;
    }
    if (varIndex.has(id)) row[varIndex.get(id)!] -= 1;
    A.push(row);
  }

  // One row per (target, tangent breakpoint): z_T - beta_k*Q_T*craft_T <=
  // alpha_k + EPIGRAPH_SHIFT + beta_k*lambda_T, the lambda term folded into b
  // at solve time.
  const rowTargetIdx: number[] = [];
  const rowTangentIdx: number[] = [];
  for (let ti = 0; ti < nt; ti++) {
    const t = targets[ti];
    const q = QByTarget.get(t) ?? 0;
    const pIdx = varIndex.get(t);
    for (let k = 0; k < JOINT_TANGENTS.length; k++) {
      const row = new Float64Array(totalVars);
      row[zBase + ti] = 1;
      if (pIdx !== undefined && q !== 0) row[pIdx] = -JOINT_TANGENTS[k].beta * q;
      A.push(row);
      rowTargetIdx.push(ti);
      rowTangentIdx.push(k);
    }
  }

  const nRows = A.length;
  const bScratch = new Float64Array(nRows);

  function fillEpigraphB(lambda: Float64Array) {
    for (let r = 0; r < rowTargetIdx.length; r++) {
      const ti = rowTargetIdx[r];
      const k = rowTangentIdx[r];
      bScratch[nCons + r] = JOINT_TANGENTS[k].alpha + EPIGRAPH_SHIFT + JOINT_TANGENTS[k].beta * lambda[ti];
    }
  }

  return {
    nonLeafNodes,
    constraintNodes,
    varIndex,
    targets,

    solveScore(b: Float64Array, lambda: Float64Array): number {
      for (let i = 0; i < nCons; i++) bScratch[i] = b[i] ?? 0;
      fillEpigraphB(lambda);
      const r = solveLp(c, A, bScratch);
      return r.status === 'optimal' ? r.objective - nt * EPIGRAPH_SHIFT : -Infinity;
    },

    solve(inventory: Map<string, number>, lambdaMap: Map<string, number>): JointAlphaResult {
      for (let i = 0; i < nCons; i++) {
        const v = inventory.get(constraintNodes[i]);
        bScratch[i] = v !== undefined && v > 0 ? v : 0;
      }
      const lambda = new Float64Array(nt);
      for (let i = 0; i < nt; i++) lambda[i] = lambdaMap.get(targets[i]) ?? 0;
      fillEpigraphB(lambda);
      const r = solveLp(c, A, bScratch);
      const craftByTarget = new Map<string, number>();
      const primalByNode = new Map<string, number>();
      if (r.status === 'optimal') {
        for (let ti = 0; ti < nt; ti++) {
          const idx = varIndex.get(targets[ti]);
          if (idx !== undefined) craftByTarget.set(targets[ti], r.primal[idx]);
        }
        for (let i = 0; i < nVars; i++) {
          if (r.primal[i] > 1e-9) primalByNode.set(nonLeafNodes[i], r.primal[i]);
        }
      }
      return { craftByTarget, primalByNode };
    },
  };
}

// argmax over t in [0, 1] of a concave function. Robust to phi returning
// -Infinity on part of the interval.
function goldenSectionArgmaxZeroToOne(phi: (t: number) => number, iters = 100): number {
  const GOLDEN = (Math.sqrt(5) - 1) / 2;
  let a = 0;
  let b = 1;
  let c = b - GOLDEN * (b - a);
  let d = a + GOLDEN * (b - a);
  let fc = phi(c);
  let fd = phi(d);
  for (let i = 0; i < iters; i++) {
    if (fc >= fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - GOLDEN * (b - a);
      fc = phi(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + GOLDEN * (b - a);
      fd = phi(d);
    }
  }
  return (a + b) / 2;
}

// Recover the per-target craft split maximizing the EXACT objective
// sum_T g(Q_T*craft_T + lambda_T) at a fixed inventory, by Frank-Wolfe with an
// exact line search. Runs once per returned solution, never in the search loop.
export function refineJointCraftSplit(
  recipeDag: RecipeDAG,
  targets: readonly string[],
  QByTarget: ReadonlyMap<string, number>,
  inventory: Map<string, number>,
  lambda: ReadonlyMap<string, number>,
  seed: JointAlphaResult
): JointAlphaResult {
  // A leaf or Q=0 target's score does not depend on the craft allocation, so
  // it sits out the split and its seed value is reported unchanged.
  const craftTargets = targets.filter(t => !(recipeDag.get(t)?.isLeaf ?? true) && (QByTarget.get(t) ?? 0) > 0);
  if (craftTargets.length === 0) {
    return { craftByTarget: new Map(seed.craftByTarget), primalByNode: new Map(seed.primalByNode) };
  }

  const Q = (t: string) => QByTarget.get(t) ?? 0;
  const lam = (t: string) => lambda.get(t) ?? 0;
  const G_PRIME_CAP = 1e12; // guards g'(s) -> Infinity as s -> 0
  const gPrime = (s: number) => (s <= 0 ? G_PRIME_CAP : Math.min(1 / Math.expm1(s), G_PRIME_CAP));
  const g = (s: number) => (s > 0 ? Math.log(-Math.expm1(-s)) : -Infinity);

  let currentPrimal = new Map(seed.primalByNode);
  let currentCraft = new Map<string, number>();
  for (const t of craftTargets) {
    currentCraft.set(t, seed.craftByTarget.get(t) ?? currentPrimal.get(t) ?? 0);
  }

  const TIGHT = 1e-11; // convergence when no target's score moves more than this
  const MAX_ITERS = 100;

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    // weight_T = g'(score_T)*Q_T; the Q_T factor is the chain rule and dropping
    // it linearizes against the wrong gradient when targets differ in Q.
    const weights = new Map<string, number>();
    for (const t of craftTargets) {
      const s = Q(t) * (currentCraft.get(t) ?? 0) + lam(t);
      weights.set(t, gPrime(s) * Q(t));
    }
    const lp = compileInnerLp(recipeDag, [...craftTargets], weights);
    const nonLeafNodes = lp.nonLeafNodes;
    const vertex = lp.solve(inventory);

    const s0 = craftTargets.map(t => Q(t) * (currentCraft.get(t) ?? 0) + lam(t));
    const s1 = craftTargets.map(t => Q(t) * (vertex.craftByTarget.get(t) ?? 0) + lam(t));
    const phi = (t: number) => {
      let sum = 0;
      for (let i = 0; i < craftTargets.length; i++) {
        const gv = g(s0[i] + t * (s1[i] - s0[i]));
        if (gv === -Infinity) return -Infinity;
        sum += gv;
      }
      return sum;
    };
    // Golden section only converges *toward* an endpoint, stopping a few ULPs
    // short, and endpoints are the common case. Probe them and prefer on ties.
    const tInterior = goldenSectionArgmaxZeroToOne(phi);
    const fInterior = phi(tInterior);
    let tStar = tInterior;
    if (phi(1) >= fInterior) tStar = 1;
    else if (phi(0) >= fInterior) tStar = 0;

    // At an endpoint take that endpoint verbatim: a + 1*(b - a) is not exactly
    // b in floating point.
    const lerp = (a: number, b: number) => (tStar === 1 ? b : tStar === 0 ? a : a + tStar * (b - a));
    let maxMove = 0;
    const newCraft = new Map<string, number>();
    for (let i = 0; i < craftTargets.length; i++) {
      const t = craftTargets[i];
      const c0 = currentCraft.get(t) ?? 0;
      const cNew = lerp(c0, vertex.craftByTarget.get(t) ?? 0);
      newCraft.set(t, cNew);
      maxMove = Math.max(maxMove, Math.abs(Q(t) * (cNew - c0)));
    }
    const newPrimal = new Map<string, number>();
    for (const node of nonLeafNodes) {
      const p0 = currentPrimal.get(node) ?? 0;
      const pNew = lerp(p0, vertex.primalByNode.get(node) ?? 0);
      if (pNew > 1e-9) newPrimal.set(node, pNew);
    }
    currentCraft = newCraft;
    currentPrimal = newPrimal;
    if (maxMove < TIGHT || tStar < 1e-12) break;
  }

  const craftByTarget = new Map(seed.craftByTarget);
  for (const t of craftTargets) craftByTarget.set(t, currentCraft.get(t) ?? 0);
  return { craftByTarget, primalByNode: currentPrimal };
}
