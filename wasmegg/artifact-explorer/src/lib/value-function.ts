// ============================================================
// Inner value function for the artifact-explorer optimizer.
//
// Multi-sink, weighted objective:
//
//   max  Σ_T w_T · p_T
//   s.t. (recipe conservation for every consumed node)
//
// where T ranges over the desired target artifacts (sinks) and w_T is a
// per-target weight (the outer search passes Q_T = −log(1 − p_legendary_T);
// callers that just want craftable counts pass nothing and every weight
// defaults to 1).
//
// Every node that is consumed by some parent gets a conservation row —
// targets are NOT special-cased out of the constraint matrix. Two
// consequences:
//   • A *final* target (no parents) has no row, so its direct drops are
//     inert: a dropped non-legendary copy of the goal is not a craft and
//     must not inflate the craft value. (Its legendary drops still flow
//     through the separate Poisson term in `alphaToProb`.)
//   • A target that is also an *ingredient* of another target keeps its
//     row, so the shared good is conserved and its direct drops correctly
//     feed the parent's crafting. No node deletion is required anywhere.
//
// `compileInnerLp` builds the structure once and exposes `.solve(inventory)`
// so the constraint matrix is reused across the millions of evaluations the
// outer search performs.
//
// `alphaToProb` maps one target's craftable count + legendary-drop rate into
// that target's probability triple.
// ============================================================

import type { RecipeDAG } from './types';
import { solveLp } from './lp';

export interface AlphaResult {
  /**
   * Craftable count of the primary target (targets[0]); 0 when it is a leaf.
   * Back-compat scalar for single-target callers.
   */
  alpha: number;
  /** Weighted objective value Σ_T w_T · p_T at the optimum — the quantity the outer search scores. */
  score: number;
  /** Per-target craftable count p_T (craftable targets only). */
  craftByTarget: Map<string, number>;
  /** Shadow price per constraint-node id. Empty if no craftable target. */
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
  /** Primary target (targets[0]); kept for back-compat with single-root callers. */
  readonly root: string;
  /** All requested targets (sinks), in order; targets[0] is primary. */
  readonly targets: readonly string[];
  /** Objective weight per craftable target node (defaults to 1 when unspecified). */
  readonly weightByTarget: ReadonlyMap<string, number>;

  solve(inventory: Map<string, number>): AlphaResult;
}

/**
 * Build the inner LP once for a given recipe DAG and a set of desired targets.
 * `weights` supplies the per-target objective weight Q_T; any target without an
 * entry (or all targets, when `weights` is omitted) defaults to weight 1.
 */
export function compileInnerLp(
  recipe_dag: RecipeDAG,
  desired_artifact_node_ids: string[],
  weights?: Map<string, number>
): InnerLp {
  if (desired_artifact_node_ids.length === 0) {
    return makeTrivialLp('', [], new Map());
  }
  const targets = desired_artifact_node_ids;
  const primary = targets[0];

  // Non-leaf nodes become decision variables p_n.
  const nonLeafNodes: string[] = [];
  const varIndex = new Map<string, number>();
  for (const [id, node] of recipe_dag) {
    if (!node.is_leaf) {
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
    // No craftable target → nothing to optimise; fall back to the holdings of
    // the primary target (drops-only), matching the leaf-root degenerate case.
    return makeTrivialLp(primary, targets, weightByTarget);
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

  // Constraint per node that is consumed by at least one parent:
  //   Σ_parents q · p_parent − [p_n if non-leaf] ≤ inventory[n]
  // Targets are no longer excluded — only "has no parent" excludes a node.
  const constraintNodes: string[] = [];
  for (const id of recipe_dag.keys()) {
    const parents = parentsOf.get(id);
    if (!parents || parents.length === 0) continue;
    constraintNodes.push(id);
  }

  const nVars = nonLeafNodes.length;
  const nCons = constraintNodes.length;

  const c = new Float64Array(nVars);
  for (const [t, w] of weightByTarget) c[varIndex.get(t)!] = w; // maximise Σ_T w_T · p_T

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
      for (const t of weightByTarget.keys()) craftByTarget.set(t, r.primal[varIndex.get(t)!]);
      const alpha = craftByTarget.get(primary) ?? 0;
      const duals = new Map<string, number>();
      for (let i = 0; i < nCons; i++) duals.set(constraintNodes[i], r.duals[i]);
      const primalByNode = new Map<string, number>();
      for (let i = 0; i < nonLeafNodes.length; i++) {
        if (r.primal[i] > 1e-9) primalByNode.set(nonLeafNodes[i], r.primal[i]);
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

// ------------------------------------------------------------
// α* → probability mapping (per target)
// ------------------------------------------------------------

export interface ProbabilityFields {
  best_probability: number;
  craft_probability: number;
  drop_probability: number;
}

/**
 * Map one target's craftable count α plus its aggregate legendary-drop rate
 * into that target's probability fields.
 *
 *   craft_probability = 1 − exp(α · ln(1 − p_legendary_per_craft))
 *   drop_probability  = 1 − exp(−Σ legendary_yield[target])
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
