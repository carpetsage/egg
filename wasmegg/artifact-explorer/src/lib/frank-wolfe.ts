// ============================================================
// Path of Virtue Optimizer — Frank-Wolfe Optimizer
// ============================================================
//
// Replaces the dual-constraint DP with a continuous relaxation solved
// via Frank-Wolfe, followed by greedy integer rounding.
//
// All functions are pure except OptimizeFrankWolfe (mutates internal
// working state but does not mutate its inputs).

import type { LaunchOption, DAGNode, RecipeDAG, OptimizerSolution, LaunchSolution } from './types';
import { poissonAtLeast } from './objective';
import { localSearch } from './brute-force';

// ============================================================
// Supporting Types
// ============================================================

/** Fractional allocation: how many times each option is executed (continuous). */
type Allocation = Float64Array;

/** Configuration for the Frank-Wolfe solver. */
export interface FrankWolfeConfig {
  options: LaunchOption[];
  dag: RecipeDAG;
  desiredArtifactNodeIds: string[];
  fuelCapacity: number;
  totalTimeUnits: number;
  maxIter: number; // maximum Frank-Wolfe iterations
  tol: number; // convergence tolerance on the Frank-Wolfe gap
  /** Player's existing inventory counts per DAG node — added as a constant offset to every yield evaluation. */
  baseYield?: Map<string, number>;
}

// ============================================================
// Max Craft Count
// ============================================================

/**
 * Bottom-up O(nodes) computation of the maximum number of copies of
 * targetNode that can be assembled from the accumulated yield vector.
 *
 * supply(node) = directDrop(node) + hardMin_i(supply(child_i) / qty_i)
 *
 * Caveat: if a component is reachable via multiple DAG paths its supply
 * is counted once per path (not globally deducted), so results may be
 * optimistic when components are shared across branches.
 */
export function MaxCraftCountDirect(targetNode: DAGNode, dag: RecipeDAG, yieldVector: Map<string, number>): number {
  const memo = new Map<string, number>();

  function supply(nodeId: string, isRoot: boolean = true): number {
    if (memo.has(nodeId)) return memo.get(nodeId)!;
    const node = dag.get(nodeId);
    if (!node) return 0;

    const lambda = yieldVector.get(nodeId) ?? 0;
    if (node.is_leaf) {
      memo.set(nodeId, lambda);
      return lambda;
    }

    let craftSupply = Infinity;
    for (const childRef of node.children) {
      craftSupply = Math.min(craftSupply, supply(childRef.node_id, false) / Math.max(childRef.quantity, 1));
    }
    if (!isFinite(craftSupply)) craftSupply = 0;

    const total = (isRoot ? 0 : lambda) + Math.max(0, craftSupply);
    memo.set(nodeId, total);
    return total;
  }

  return supply(targetNode.id);
}

// ============================================================
// Soft Minimum Weights
// ============================================================

/**
 * Gradient weights of the soft minimum: d(softMin)/d(x_i) = exp(-alpha*x_i) / sum_j exp(-alpha*x_j).
 *
 * Returns a weight vector that sums to 1, concentrating weight on the
 * smallest values (bottleneck children) while still assigning nonzero
 * weight to all children. Used by BackpropCraftGradient to distribute
 * gradient across all children rather than only the current bottleneck.
 */
export function SoftMinWeights(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [1];

  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp(-alpha * (v - maxVal)));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sumExp);
}

// ============================================================
// Objective Function
// ============================================================

/**
 * Joint probability of crafting at least one legendary copy of every
 * desired artifact, given the accumulated yield vector.
 *
 * Currently computes the craft channel only:
 *   P(craft legendary) = poissonAtLeast(craftCount * p_legendary_craft, 1)
 *   where craftCount = MaxCraftCountDirect(artifact, dag, yieldVector).
 *
 * A direct-drop channel is planned but not yet implemented; the
 * legendary_yield_vector field on LaunchOption is scaffolding for it.
 * Joint probability is the product over all desired artifacts.
 */
export function Objective(yieldVector: Map<string, number>, desiredArtifactNodeIds: string[], dag: RecipeDAG): number {
  let joint = 1.0;

  for (const nodeId of desiredArtifactNodeIds) {
    const node = dag.get(nodeId);
    if (!node) return 0;

    const craftCount = MaxCraftCountDirect(node, dag, yieldVector);
    const legendaryCraftLambda = craftCount * node.legendaryCraftProbability;
    const pCraft = poissonAtLeast(legendaryCraftLambda, 1);

    joint *= pCraft;
    if (joint === 0) return 0;
  }

  return joint;
}

// ============================================================
// Yield Vector Utilities
// ============================================================

/**
 * Computes the accumulated yield vector for a given fractional allocation.
 * y = baseYield + sum_i c[i] * options[i].yieldVector
 *
 * baseYield represents the player's existing inventory and is included as a
 * constant offset so every objective evaluation sees inventory + mission yield.
 */
export function AccumulateYield(
  allocation: Allocation,
  options: LaunchOption[],
  baseYield?: Map<string, number>
): Map<string, number> {
  const y = new Map<string, number>(baseYield);
  for (let i = 0; i < options.length; i++) {
    const count = allocation[i];
    if (count === 0) continue;
    for (const [nodeId, rate] of options[i].yield_vector) {
      y.set(nodeId, (y.get(nodeId) ?? 0) + count * rate);
    }
  }
  return y;
}

/**
 * Interpolates between two yield vectors: (1-gamma)*yA + gamma*yB.
 */
export function InterpolateYield(yA: Map<string, number>, yB: Map<string, number>, gamma: number): Map<string, number> {
  const result = new Map<string, number>();
  const keys = new Set([...yA.keys(), ...yB.keys()]);
  for (const k of keys) {
    result.set(k, (1 - gamma) * (yA.get(k) ?? 0) + gamma * (yB.get(k) ?? 0));
  }
  return result;
}

/**
 * Dot product of a yield vector with a gradient map.
 * dot = sum_{nodeId} yieldVector[nodeId] * grad[nodeId]
 */
export function DotYieldGrad(yieldVector: Map<string, number>, grad: Map<string, number>): number {
  let sum = 0;
  for (const [k, v] of yieldVector) {
    sum += v * (grad.get(k) ?? 0);
  }
  return sum;
}

// ============================================================
// Gradient Computation
// ============================================================

export function ComputeGradient(
  yieldVector: Map<string, number>,
  desiredArtifactNodeIds: string[],
  dag: RecipeDAG,
  alpha: number = 1.0
): Map<string, number> {
  const grad = new Map<string, number>();

  // Per-artifact probabilities using craft channel only.
  const artifactProbs: number[] = [];
  for (const nodeId of desiredArtifactNodeIds) {
    const node = dag.get(nodeId);
    if (!node) {
      artifactProbs.push(0);
      continue;
    }
    const craftCount = MaxCraftCountDirect(node, dag, yieldVector); //, 1.0, new Map());
    const lcProbability: number = node.legendaryCraftProbability ?? 0;
    const legendaryCraftLambda = craftCount * lcProbability;
    artifactProbs.push(poissonAtLeast(legendaryCraftLambda, 1));
  }

  for (let ai = 0; ai < desiredArtifactNodeIds.length; ai++) {
    const nodeId = desiredArtifactNodeIds[ai];
    const node = dag.get(nodeId);
    if (!node) continue;

    // Product of all OTHER artifact probabilities — direct product,
    // no division, for numerical stability.
    let otherProb = 1.0;
    for (let j = 0; j < artifactProbs.length; j++) {
      if (j !== ai) otherProb *= artifactProbs[j];
    }
    if (otherProb === 0) continue;

    const craftCount = MaxCraftCountDirect(node, dag, yieldVector); //, 1.0, new Map());
    const lcProbability: number = node.legendaryCraftProbability ?? 0;
    const legendaryCraftLambda = craftCount * lcProbability;

    // d(joint)/d(craftCount) = otherProb * exp(-legendaryCraftLambda) * lcProbability
    const dJointDCraftCount = otherProb * Math.exp(-legendaryCraftLambda) * lcProbability;

    if (dJointDCraftCount === 0) continue;

    // ============================================================
    // BackpropCraftGradient
    // ============================================================

    /**
     * Backpropagates the gradient of the craft count through the DAG,
     * distributing gradient across all children via soft minimum weights
     * rather than concentrating it on the single bottleneck child.
     *
     * At each non-root craftable node, the incoming gradient is split
     * among children according to their soft minimum weights — children
     * closer to being the bottleneck receive proportionally more gradient,
     * but all children receive a nonzero signal. This allows the optimizer
     * to simultaneously reason about relieving the current bottleneck and
     * preventing other children from becoming the next bottleneck.
     *
     * The direct drop channel is not yet implemented, so the root's own yield entry is skipped here.
     *
     * @param dagNode      Current node in the backward pass
     * @param dag          Full recipe DAG
     * @param yieldVector  Accumulated expected drops per node
     * @param alpha        Soft minimum sharpness — must match the value
     *                     used in GetSupply for consistency
     * @param incomingGrad Gradient flowing into this node from above
     * @param isRoot       True only for the desired artifact node itself —
     *                     suppresses gradient accumulation at the root
     * @param grad         Gradient accumulator map (mutated in place)
     */
    function BackpropCraftGradient(
      dagNode: DAGNode,
      dag: RecipeDAG,
      yieldVector: Map<string, number>,
      alpha: number,
      incomingGrad: number,
      isRoot: boolean,
      grad: Map<string, number>
    ): void {
      if (incomingGrad === 0) return;

      // Accumulate gradient at this node for its own direct drop lambda,
      // except at the root where that lambda belongs to the direct drop channel.
      if (!isRoot) {
        grad.set(dagNode.id, (grad.get(dagNode.id) ?? 0) + incomingGrad);
      }

      if (dagNode.is_leaf) return;

      // Compute child supply ratios and soft minimum weights.
      // The weights determine how incomingGrad is distributed across children.
      const childRefs = dagNode.children;
      const ratios: number[] = [];
      const childNodes: (DAGNode | undefined)[] = [];

      for (const childRef of childRefs) {
        const childNode = dag.get(childRef.node_id);
        childNodes.push(childNode);
        if (!childNode) {
          ratios.push(Infinity);
          continue;
        }
        const childSupply = MaxCraftCountDirect(childNode, dag, yieldVector);
        ratios.push(childSupply / Math.max(childRef.quantity, 1));
      }

      const weights = SoftMinWeights(ratios, alpha);

      // Distribute incoming gradient to each child weighted by soft min weight.
      // d(softMin)/d(ratio_i) = weights[i]
      // d(ratio_i)/d(childSupply) = 1 / childRef.quantity
      // d(childSupply)/d(yieldVector) is handled by the recursive call.
      for (let i = 0; i < childRefs.length; i++) {
        const childNode = childNodes[i];
        if (!childNode) continue;

        const childGrad = (incomingGrad * weights[i]) / Math.max(childRefs[i].quantity, 1);
        if (childGrad === 0) continue;

        BackpropCraftGradient(childNode, dag, yieldVector, alpha, childGrad, false, grad);
      }
    }

    BackpropCraftGradient(node, dag, yieldVector, alpha, dJointDCraftCount, true, grad);
  }

  return grad;
}
// ============================================================
// Linear Minimization Oracle (LMO)
// ============================================================

/**
 * Solves the Frank-Wolfe linear subproblem: find c ≥ 0 maximizing ⟨grad, y⟩
 * (where y = Σᵢ cᵢ · yield_vectorᵢ) subject to Σᵢ aᵢ·cᵢ ≤ F and Σᵢ bᵢ·cᵢ ≤ T,
 * with aᵢ = optionᵢ.actual_fuel, bᵢ = optionᵢ.actual_time, F = fuelCapacity,
 * T = timeCapacity.
 *
 * The polytope has two inequality constraints (plus non-negativity), so by
 * the LP basic-feasible-solution theorem every vertex has at most TWO
 * non-zero coordinates. We enumerate all candidate vertices and pick the
 * best:
 *   - Single-option vertices: cᵢ = min(F/aᵢ, T/bᵢ); only one constraint binds.
 *   - Two-option vertices: cᵢ, cⱼ > 0 from the 2×2 system aᵢcᵢ + aⱼcⱼ = F,
 *     bᵢcᵢ + bⱼcⱼ = T; both constraints bind. Feasible iff cᵢ, cⱼ > 0,
 *     which geometrically requires the per-option ratios bᵢ/aᵢ and bⱼ/aⱼ
 *     to straddle the budget ratio T/F.
 *
 * The earlier single-option-only oracle was incorrect on exactly the
 * straddling case: it missed the two-option vertex that simultaneously
 * binds both constraints, returning a strictly suboptimal extreme point of
 * the score polytope and producing slow / non-monotone FW progress.
 *
 * Complexity: O(n²) per call (pair enumeration). Could be reduced to
 * O(n log n) by walking the upper envelope of the dual constraint lines,
 * but n is bounded by ~2000 LaunchOptions in practice (and shrinks once
 * non-positive-score options are filtered out), so the simpler enumeration
 * is fast enough.
 */
export function LinearMinimizationOracle(
  grad: Map<string, number>,
  options: LaunchOption[],
  fuelCapacity: number,
  timeCapacity: number,
  baseYield?: Map<string, number>
): { allocation: Allocation; yieldVector: Map<string, number> } {
  const n = options.length;
  const F = fuelCapacity;
  const T = timeCapacity;
  const allocation: Allocation = new Float64Array(n);

  // Filter to positive-score options with finite, well-defined costs. Options
  // with score ≤ 0 cannot increase the FW objective and never appear in the
  // LP basis. Options with both costs zero would make the LP unbounded; in
  // this codebase every real launch consumes time, so we treat that case as
  // skip rather than special-case the unbounded direction.
  const idx: number[] = [];
  const sArr: number[] = [];
  const aArr: number[] = [];
  const bArr: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = DotYieldGrad(options[i].yield_vector, grad);
    if (s <= 0) continue;
    const a = options[i].actual_fuel;
    const b = options[i].actual_time;
    if (a < 0 || b < 0) continue;
    if (a === 0 && b === 0) continue;
    idx.push(i);
    sArr.push(s);
    aArr.push(a);
    bArr.push(b);
  }

  let bestValue = 0;
  let bestI = -1;
  let bestJ = -1;
  let bestCi = 0;
  let bestCj = 0;

  // Single-option vertices.
  for (let p = 0; p < idx.length; p++) {
    const a = aArr[p];
    const b = bArr[p];
    const cap = Math.min(a > 0 ? F / a : Infinity, b > 0 ? T / b : Infinity);
    if (!isFinite(cap)) continue;
    const v = sArr[p] * cap;
    if (v > bestValue) {
      bestValue = v;
      bestI = p;
      bestJ = -1;
      bestCi = cap;
      bestCj = 0;
    }
  }

  // Two-option vertices. For each pair, solve the 2×2 system that binds both
  // constraints and accept the vertex iff both amounts are strictly positive.
  // Scale the determinant tolerance to the operand magnitudes so the parallel-
  // rows guard fires only on genuine degeneracy, not on small-but-distinct
  // ratios at large absolute fuel/time costs.
  const m = idx.length;
  for (let p = 0; p < m; p++) {
    const ap = aArr[p];
    const bp = bArr[p];
    const sp = sArr[p];
    for (let q = p + 1; q < m; q++) {
      const aq = aArr[q];
      const bq = bArr[q];
      const det = ap * bq - aq * bp;
      const detScale = Math.max(Math.abs(ap * bq), Math.abs(aq * bp));
      if (Math.abs(det) <= 1e-12 * detScale) continue;
      const cp = (F * bq - T * aq) / det;
      const cq = (T * ap - F * bp) / det;
      if (cp <= 0 || cq <= 0) continue;
      const v = sp * cp + sArr[q] * cq;
      if (v > bestValue) {
        bestValue = v;
        bestI = p;
        bestJ = q;
        bestCi = cp;
        bestCj = cq;
      }
    }
  }

  const yS = new Map<string, number>(baseYield);
  if (bestI >= 0 && bestCi > 0) {
    const optI = options[idx[bestI]];
    allocation[idx[bestI]] = bestCi;
    for (const [k, v] of optI.yield_vector) {
      yS.set(k, (yS.get(k) ?? 0) + bestCi * v);
    }
  }
  if (bestJ >= 0 && bestCj > 0) {
    const optJ = options[idx[bestJ]];
    allocation[idx[bestJ]] = bestCj;
    for (const [k, v] of optJ.yield_vector) {
      yS.set(k, (yS.get(k) ?? 0) + bestCj * v);
    }
  }

  return { allocation, yieldVector: yS };
}

// ============================================================
// Golden Section Line Search
// ============================================================

/**
 * Finds gamma in [0, 1] maximizing f(gamma) via golden section search.
 * Assumes f is unimodal on [0, 1].
 */
export function GoldenSectionSearch(f: (gamma: number) => number, tol: number): number {
  const phi = (Math.sqrt(5) - 1) / 2; // golden ratio conjugate ≈ 0.618
  let a = 0;
  let b = 1;
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  let fc = f(c);
  let fd = f(d);

  while (Math.abs(b - a) > tol) {
    if (fc < fd) {
      a = c;
      c = d;
      fc = fd;
      d = a + phi * (b - a);
      fd = f(d);
    } else {
      b = d;
      d = c;
      fd = fc;
      c = b - phi * (b - a);
      fc = f(c);
    }
  }

  return (a + b) / 2;
}

// ============================================================
// Frank-Wolfe Main Function
// ============================================================

/**
 * Solves the launch selection problem via Frank-Wolfe on the continuous
 * relaxation followed by greedy integer rounding with pairwise swap
 * post-processing.
 *
 * Returns an OptimizerSolution compatible with the existing interface.
 */
export function OptimizeFrankWolfe(config: FrankWolfeConfig): OptimizerSolution[] {
  const {
    options,
    dag,
    desiredArtifactNodeIds,
    fuelCapacity,
    totalTimeUnits: timeCapacity,
    maxIter,
    tol,
    baseYield,
  } = config;

  if (options.length === 0) {
    return [
      {
        best_probability: 0,
        craft_probability: 0,
        drop_probability: 0,
        fuel_used: 0,
        fuel_by_egg: new Map(),
        time_units_used: 0,
        choice_history: [],
        final_yield_vector: new Map(),
        expected_drops: [],
      },
    ];
  }

  // -----------------------------------------------------------------------
  // Initialization: seed the allocation with the single option that has
  // the highest objective per unit of combined resource cost.
  // -----------------------------------------------------------------------

  let c: Allocation = new Float64Array(options.length);
  let bestInitIdx = 0;
  let bestInitScore = -Infinity;

  for (const [i, option] of options.entries()) {
    const maxByFuel = option.actual_fuel > 0 ? Math.floor(fuelCapacity / option.actual_fuel) : timeCapacity;
    const maxByTime = option.actual_time > 0 ? Math.floor(timeCapacity / option.actual_time) : fuelCapacity;
    const maxCount = Math.min(maxByFuel, maxByTime);
    if (maxCount === 0) continue;

    const singleYield = new Map<string, number>(baseYield);
    for (const [k, v] of option.yield_vector) singleYield.set(k, (singleYield.get(k) ?? 0) + v * maxCount);
    const score = Objective(singleYield, desiredArtifactNodeIds, dag);

    if (score > bestInitScore) {
      bestInitScore = score;
      bestInitIdx = i;
    }
  }

  const initOption = options[bestInitIdx];
  const initMaxByFuel = initOption.actual_fuel > 0 ? Math.floor(fuelCapacity / initOption.actual_fuel) : timeCapacity;
  const initMaxByTime = initOption.actual_time > 0 ? Math.floor(timeCapacity / initOption.actual_time) : fuelCapacity;
  c[bestInitIdx] = Math.min(initMaxByFuel, initMaxByTime);

  let y = AccumulateYield(c, options, baseYield);
  let incumbentValue = Objective(y, desiredArtifactNodeIds, dag);
  let bestC = new Float64Array(c);
  let bestY = new Map(y);

  // -----------------------------------------------------------------------
  // Main Frank-Wolfe loop
  // -----------------------------------------------------------------------

  for (let t = 1; t <= maxIter; t++) {
    // Step 1: Gradient of objective w.r.t. yield vector
    const grad = ComputeGradient(y, desiredArtifactNodeIds, dag);

    // Step 2: Linear minimization oracle — find the Frank-Wolfe direction
    const { allocation: s, yieldVector: yS } = LinearMinimizationOracle(
      grad,
      options,
      fuelCapacity,
      timeCapacity,
      baseYield
    );

    // Step 3: Line search along (1-gamma)*y + gamma*yS
    const objectiveAtGamma = (gamma: number): number =>
      Objective(InterpolateYield(y, yS, gamma), desiredArtifactNodeIds, dag);
    const gammaStar = GoldenSectionSearch(objectiveAtGamma, tol / 10);
    if (gammaStar < 1e-12) break;

    // Step 4: Update allocation and yield
    const cNew = new Float64Array(options.length);
    for (let i = 0; i < options.length; i++) {
      cNew[i] = (1 - gammaStar) * c[i] + gammaStar * s[i];
    }
    const yNew = AccumulateYield(cNew, options, baseYield);

    const newValue = Objective(yNew, desiredArtifactNodeIds, dag);
    if (newValue > incumbentValue) {
      incumbentValue = newValue;
      bestC = new Float64Array(cNew);
      bestY = new Map(yNew);
    }

    // Step 5: Convergence — Frank-Wolfe gap
    // gap = <grad, s - c> (inner product of gradient with update direction)
    let fwGap = 0;
    for (let i = 0; i < options.length; i++) {
      const yDiff = new Map<string, number>();
      for (const [k, v] of options[i].yield_vector) {
        yDiff.set(k, v * (s[i] - c[i]));
      }
      fwGap += DotYieldGrad(yDiff, grad);
    }

    if (Math.abs(fwGap) < tol) break;
    c = cNew;
    y = yNew;
  }

  // -----------------------------------------------------------------------
  // Rounding: truncate fractional incumbent to integer launch counts,
  // then refine with the brute-force greedy + pairwise-swap search so we
  // don't leave budget on the floor from truncation.
  // -----------------------------------------------------------------------

  const truncated = new Int32Array(bestC);
  let fuelUsedTrunc = 0;
  let timeUsedTrunc = 0;
  for (let i = 0; i < options.length; i++) {
    fuelUsedTrunc += options[i].actual_fuel * truncated[i];
    timeUsedTrunc += options[i].actual_time * truncated[i];
  }
  const truncatedYield = AccumulateYield(new Float64Array(truncated), options, baseYield);

  const refined = localSearch(
    truncated,
    truncatedYield,
    fuelCapacity - fuelUsedTrunc,
    timeCapacity - timeUsedTrunc,
    options,
    dag,
    desiredArtifactNodeIds
  );

  const intAllocation = refined.allocation;
  const intYield = refined.yieldVector;
  const bestProbability = refined.prob;

  const choiceHistory: LaunchSolution[] = [];
  let fuelUsed = 0;
  let timeUsed = 0;
  for (let i = 0; i < options.length; i++) {
    const count = intAllocation[i];
    if (count === 0) continue;
    choiceHistory.push({
      ship: options[i].ship,
      actual_fuel: options[i].actual_fuel,
      actual_fuel_by_egg: options[i].fuel_by_egg,
      actual_time: options[i].actual_time,
      target: options[i].target ?? 'none',
      targetAfxId: options[i].targetAfxId,
      num_ships_launched: 3 * count,
      from_fw: truncated[i] > 0,
      supply_vector: options[i].supply_vector,
    });
    fuelUsed += options[i].actual_fuel * count;
    timeUsed += options[i].actual_time * count;
  }

  return [
    {
      best_probability: bestProbability,
      drop_probability: 0,
      craft_probability: 0,
      fuel_used: fuelUsed,
      fuel_by_egg: new Map(),
      time_units_used: timeUsed,
      choice_history: choiceHistory,
      final_yield_vector: intYield,
      fw_fractional: {
        yield_vector: bestY,
        probability: incumbentValue,
      },
      expected_drops: [],
    },
  ];
}
