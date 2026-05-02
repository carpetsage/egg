// ============================================================
// Inner value function α*(inventory) for the artifact-explorer
// optimizer.
//
// α*(inventory) = the maximum number of root artifacts the player
// can craft from a given yield/inventory bag, accounting for the
// full recipe DAG including diamond dependencies (shared
// ingredients with multiple consumers — bottom-up tree recursion
// is wrong for these; an LP is required).
//
// `compileInnerLp` builds the LP structure once and exposes
// `.solve(inventory)` so we can evaluate α* against many
// inventories without rebuilding the constraint matrix — important
// because the outer search calls α* on the order of millions of
// times.
//
// `alphaToProb` maps α* and the aggregate legendary-drop rate into
// the three probability fields the OptimizerSolution exposes.
// ============================================================

import type { RecipeDAG } from './types';
import { solveLp } from './lp';

export interface AlphaResult {
  alpha: number;
  /** Shadow price per constraint-node id. Empty if root is a leaf. */
  duals: Map<string, number>;
  /** LP-optimal crafted count per non-leaf node id. */
  primalByNode: Map<string, number>;
}

export interface InnerLp {
  /** ids of non-leaf nodes in canonical order; column index i ↔ p_n variable i. */
  readonly nonLeafNodes: readonly string[];
  /** ids of constraint nodes in canonical order; row index i ↔ constraint i. */
  readonly constraintNodes: readonly string[];
  /** Maps an id to its column index, or undefined if it's a leaf. */
  readonly varIndex: ReadonlyMap<string, number>;
  /** The desired root id this LP was compiled for. */
  readonly root: string;
  /** Coefficient on x_i in the joint-LP objective for action i (Δ_i[root]). */
  readonly objHasRootVar: boolean;

  solve(inventory: Map<string, number>): AlphaResult;
}

/**
 * Build the inner LP once for a given recipe DAG and desired root.
 * Currently supports a single root (per OQ4); the caller passes
 * `desired_artifact_node_ids[0]`.
 */
export function compileInnerLp(recipe_dag: RecipeDAG, desired_artifact_node_ids: string[]): InnerLp {
  if (desired_artifact_node_ids.length === 0) {
    return makeTrivialLp('');
  }
  const root = desired_artifact_node_ids[0];

  // Non-leaf nodes become decision variables p_n.
  const nonLeafNodes: string[] = [];
  const varIndex = new Map<string, number>();
  for (const [id, node] of recipe_dag) {
    if (!node.is_leaf) {
      varIndex.set(id, nonLeafNodes.length);
      nonLeafNodes.push(id);
    }
  }

  // Root must be craftable (non-leaf) for the LP to be meaningful.
  if (!varIndex.has(root)) {
    return makeTrivialLp(root);
  }

  // Build "parents-of" map: for each node, who consumes it and at what rate.
  const parentsOf = new Map<string, { parent: string; q: number }[]>();
  for (const [parentId, parentNode] of recipe_dag) {
    if (parentNode.is_leaf) continue;
    for (const child of parentNode.children) {
      let parents = parentsOf.get(child.node_id);
      if (!parents) {
        parents = [];
        parentsOf.set(child.node_id, parents);
      }
      parents.push({ parent: parentId, q: child.quantity });
    }
  }

  // Constraint per non-root node that is consumed by at least one parent:
  //   Σ_parents q · p_parent − [p_n if non-leaf] ≤ inventory[n]
  const constraintNodes: string[] = [];
  for (const id of recipe_dag.keys()) {
    if (id === root) continue;
    const parents = parentsOf.get(id);
    if (!parents || parents.length === 0) continue;
    constraintNodes.push(id);
  }

  const nVars = nonLeafNodes.length;
  const nCons = constraintNodes.length;

  const c = new Float64Array(nVars);
  c[varIndex.get(root)!] = 1; // maximise p_root

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
    root,
    objHasRootVar: true,

    solve(inventory: Map<string, number>): AlphaResult {
      for (let i = 0; i < nCons; i++) {
        const v = inventory.get(constraintNodes[i]);
        bScratch[i] = v !== undefined && v > 0 ? v : 0;
      }
      const r = solveLp(c, A, bScratch);
      if (r.status !== 'optimal') {
        return { alpha: 0, duals: new Map(), primalByNode: new Map() };
      }
      const rootDirect = inventory.get(root) ?? 0;
      const alpha = r.objective + (rootDirect > 0 ? rootDirect : 0);
      const duals = new Map<string, number>();
      for (let i = 0; i < nCons; i++) duals.set(constraintNodes[i], r.duals[i]);
      const primalByNode = new Map<string, number>();
      for (let i = 0; i < nonLeafNodes.length; i++) {
        if (r.primal[i] > 1e-9) primalByNode.set(nonLeafNodes[i], r.primal[i]);
      }
      return { alpha, duals, primalByNode };
    },
  };
}

function makeTrivialLp(root: string): InnerLp {
  return {
    nonLeafNodes: [],
    constraintNodes: [],
    varIndex: new Map(),
    root,
    objHasRootVar: false,
    solve(inventory: Map<string, number>): AlphaResult {
      const v = inventory.get(root) ?? 0;
      return { alpha: v > 0 ? v : 0, duals: new Map(), primalByNode: new Map() };
    },
  };
}

/**
 * Convenience wrapper that compiles + solves in one call. Use only
 * for one-shot evaluations; for repeated use, call `compileInnerLp`
 * once and reuse the returned `InnerLp.solve`.
 */
export function evaluateAlpha(
  inventory: Map<string, number>,
  recipe_dag: RecipeDAG,
  desired_artifact_node_ids: string[]
): AlphaResult {
  return compileInnerLp(recipe_dag, desired_artifact_node_ids).solve(inventory);
}

// ------------------------------------------------------------
// α* → probability mapping
// ------------------------------------------------------------

export interface ProbabilityFields {
  best_probability: number;
  craft_probability: number;
  drop_probability: number;
}

/**
 * Map α* (deterministic max craftable count) plus the aggregate
 * legendary-drop rate of the desired root into the three
 * probability fields the UI displays.
 *
 *   craft_probability = 1 − exp(α · ln(1 − p_legendary_per_craft))
 *   drop_probability  = 1 − exp(−Σ legendary_yield[root])
 *   best_probability  = 1 − (1 − craft)·(1 − drop)
 */
export function alphaToProb(
  alpha: number,
  legendary_yield: Map<string, number>,
  desired_artifact_node_ids: string[],
  recipe_dag: RecipeDAG
): ProbabilityFields {
  if (desired_artifact_node_ids.length === 0) {
    return { best_probability: 0, craft_probability: 0, drop_probability: 0 };
  }
  const root = desired_artifact_node_ids[0];
  const node = recipe_dag.get(root);
  const pCraft = node?.legendaryCraftProbability ?? 0;

  const a = alpha > 0 ? alpha : 0;
  let craft_probability = 0;
  if (pCraft > 0 && a > 0) {
    if (pCraft >= 1) craft_probability = 1;
    else craft_probability = 1 - Math.exp(a * Math.log(1 - pCraft));
  }

  const lambda = legendary_yield.get(root) ?? 0;
  const drop_probability = lambda > 0 ? 1 - Math.exp(-lambda) : 0;

  const best_probability = 1 - (1 - craft_probability) * (1 - drop_probability);

  return { best_probability, craft_probability, drop_probability };
}

// poissonAtLeast retained for parity with the deleted objective.ts —
// not currently used by the new pipeline but cheap to expose.
export function poissonAtLeast(lambda: number, k: number): number {
  if (k <= 0) return 1;
  if (lambda <= 0) return 0;
  // P(X ≥ k) = 1 − Σ_{i=0..k-1} exp(-λ) λ^i / i!
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term = (term * lambda) / i;
    cdf += term;
  }
  return Math.max(0, 1 - cdf);
}
