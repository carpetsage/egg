// Inner crafting LP: given an inventory, maximize sum over targets T of
// w_T * (crafts of T), subject to recipe conservation. Every node consumed by
// some parent gets a conservation row, targets included. A final target (no
// parents) has no row, so dropped copies of it don't count as crafts; a
// target that is also an ingredient keeps its row and its drops feed the
// parent recipe. compileInnerLp builds the matrix once; the outer search
// then scores millions of candidate inventories against it.

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
  // Hot-path variant: caller supplies b directly (one entry per
  // constraintNodes row) and gets back only the weighted objective, skipping
  // the per-call result Maps. 0 when the LP is not optimal.
  solveScore(b: Float64Array): number;
}

// `weights` is the per-target objective weight; targets without an entry get
// weight 1 (callers that just want craftable counts omit it entirely).
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

  // Non-leaf nodes become decision variables p_n.
  const nonLeafNodes: string[] = [];
  const varIndex = new Map<string, number>();
  for (const [id, node] of recipeDag) {
    if (!node.isLeaf) {
      varIndex.set(id, nonLeafNodes.length);
      nonLeafNodes.push(id);
    }
  }

  // Objective weight per craftable target. A leaf target can't be crafted, so it
  // contributes no objective term (its legendary chance is drops-only).
  const weightByTarget = new Map<string, number>();
  for (const t of targets) {
    if (varIndex.has(t)) weightByTarget.set(t, weights?.get(t) ?? 1);
  }
  if (weightByTarget.size === 0) {
    // nothing craftable; fall back to holdings of the primary target
    return makeTrivialLp(primary, targets, weightByTarget);
  }

  // for each node, who consumes it and at what rate
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

    solveScore(b: Float64Array): number {
      const r = solveLp(c, A, b);
      return r.status === 'optimal' ? r.objective : 0;
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
    solveScore(): number {
      return 0;
    },
  };
}

export interface ProbabilityFields {
  bestProbability: number;
  craftProbability: number;
  dropProbability: number;
}

// Map a target's craftable count plus its legendary-drop rate into
// probabilities:
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
