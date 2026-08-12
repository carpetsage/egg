// The mission-plan pipeline: option filtering, objective evaluation, and the
// assembly of a renderable solution around whatever plan the planner returned.
//
// The planner itself is not here. It is a mixed-integer program handed to HiGHS
// (`./solver/`), the same module the invariant arena enters as its one candidate
// (`src/oracle/arena/solvers/highs/index.ts` is a shim around it) — so the
// planner users run and the planner the harness measures are one code path, and
// a change to it is proved before it ships. See OPTIMIZER.md for the objective
// and ARENA.md for what "proved" means.
//
// What lives here is everything either side of the search: `buildEvalContext`
// compiles the tangent-epigraph LP and the yield structure the objective is
// defined over, and `assembleFullSolution` turns an allocation into the numbers
// the UI renders, via the exact objective and the craft-split refinement. The
// MILP never grades itself — nothing it reports about its own plan reaches the
// screen.

import type { CraftBudget, LaunchOption, LaunchSolution, OptimizerSolution, RecipeDAG, SlotSummary } from './types';
import { ei } from 'lib';
import { alphaToProb, compileJointInnerLp, JointInnerLp, refineJointCraftSplit } from './value-function';
import { packWitness } from './packing';
import { loadHighs } from './solver/highs';
import { solveWith } from './solver/oa';
import type { PlanProblem } from './solver/types';

// Three mission slots, as the game gives.
export const NUM_SLOTS = 3;
// Anything under this is zero: durations, fuel, score differences.
const ZERO_TOL = 1e-9;

export interface OptimizeArgs {
  options: LaunchOption[];
  recipeDag: RecipeDAG;
  desiredArtifactNodeIds: string[];
  fuelCapacity: number;
  timeCapacity: number;
  maximumCost: number | undefined;
  baseYield: Map<string, number>;
  // Golden egg cap on the plan's crafts, or absent for no cap. It has to reach
  // both the MILP and the inner LPs: the MILP decides which ingredients get
  // gathered, but the craft counts that are priced and displayed come out of
  // `assembleFullSolution` below, so a cap the inner LPs did not see would not
  // bind on the number the card shows.
  craftBudget?: CraftBudget;
}

type EvalFn = (multipliers: ReadonlyArray<readonly [number, number]>) => number;

interface EvalContext {
  options: LaunchOption[];
  recipeDag: RecipeDAG;
  targets: string[];
  baseYield: Map<string, number>;
  QByTarget: Map<string, number>;
  innerLp: JointInnerLp;
  evalScoreAt: EvalFn; // returns the tangent-approximated F, not a probability
  baseScore: number;
  craftBudget?: CraftBudget;
}

function buildEvalContext(
  options: LaunchOption[],
  recipeDag: RecipeDAG,
  desiredArtifactNodeIds: string[],
  baseYield: Map<string, number>,
  craftBudget?: CraftBudget
): EvalContext {
  const targets = desiredArtifactNodeIds;
  const QByTarget = new Map<string, number>();
  for (const t of targets) {
    const pCraft = recipeDag.get(t)?.legendaryCraftProbability ?? 0;
    QByTarget.set(t, pCraft <= 0 ? 0 : pCraft >= 1 ? 1e6 : -Math.log(1 - pCraft));
  }

  const innerLp = compileJointInnerLp(recipeDag, targets, QByTarget, craftBudget);

  // Preindexed to constraint rows: yields to nodes without a conservation row
  // cannot affect the score.
  const nRows = innerLp.constraintNodes.length;
  const rowIdxByNode = new Map<string, number>();
  for (let i = 0; i < nRows; i++) {
    rowIdxByNode.set(innerLp.constraintNodes[i], i);
  }
  const bBase = new Float64Array(nRows);
  for (const [k, v] of baseYield) {
    const row = rowIdxByNode.get(k);
    if (row !== undefined && v > 0) {
      bBase[row] = v;
    }
  }

  const optYieldRows: Int32Array[] = new Array(options.length);
  const optYieldRates: Float64Array[] = new Array(options.length);
  // Per-target legendary rate, in `targets` order; never pooled into a scalar.
  const optLegRates: Float64Array[] = new Array(options.length);
  for (let i = 0; i < options.length; i++) {
    const rows: number[] = [];
    const rates: number[] = [];
    for (const [n, r] of options[i].yieldVector) {
      const row = rowIdxByNode.get(n);
      if (row !== undefined) {
        rows.push(row);
        rates.push(r);
      }
    }
    optYieldRows[i] = new Int32Array(rows);
    optYieldRates[i] = new Float64Array(rates);
    const legRates = new Float64Array(targets.length);
    for (let ti = 0; ti < targets.length; ti++) {
      legRates[ti] = options[i].legendaryYieldVector.get(targets[ti]) ?? 0;
    }
    optLegRates[i] = legRates;
  }

  const bEval = new Float64Array(nRows);
  const lambdaEval = new Float64Array(targets.length);

  const MAX_EVAL_CACHE = 200_000;
  const evalCache = new Map<string, number>();
  const keyPairs: [number, number][] = [];

  const evalScoreAt: EvalFn = multipliers => {
    // The sort is load-bearing: callers pass the same allocation in different
    // orders, and an unsorted key would miss the cache on every one of them.
    keyPairs.length = 0;
    for (const [idx, k] of multipliers) {
      if (k <= 0) continue;
      keyPairs.push([idx, k]);
    }
    keyPairs.sort((a, b) => a[0] - b[0]);
    let key = '';
    for (const [idx, k] of keyPairs) {
      key += idx + ':' + k + ',';
    }
    const cached = evalCache.get(key);
    if (cached !== undefined) return cached;

    bEval.set(bBase);
    lambdaEval.fill(0);
    for (const [idx, k] of keyPairs) {
      const rows = optYieldRows[idx];
      const rates = optYieldRates[idx];
      for (let j = 0; j < rows.length; j++) {
        bEval[rows[j]] += k * rates[j];
      }
      const legRates = optLegRates[idx];
      for (let ti = 0; ti < legRates.length; ti++) {
        lambdaEval[ti] += k * legRates[ti];
      }
    }
    const score = innerLp.solveScore(bEval, lambdaEval);
    if (evalCache.size >= MAX_EVAL_CACHE) evalCache.clear();
    evalCache.set(key, score);
    return score;
  };

  const baseScore = innerLp.solveScore(bBase, new Float64Array(targets.length));

  return { options, recipeDag, targets, baseYield, QByTarget, innerLp, evalScoreAt, baseScore, craftBudget };
}

// Per-slot occupancy of a chosen allocation.
//
// The MILP places missions in slots itself — that is what makes its plans packed
// by construction rather than packed by repair — but the seam it returns through
// carries only totals. Repacking here is cheap and keeps this function honest
// about what it reports: if the exact packer cannot place the plan, the makespan
// shown is a best-fit estimate rather than a claim.
function slotsOfAllocation(options: LaunchOption[], alloc: Map<number, number>, capacity: number): SlotSummary[] {
  const idx = [...alloc.keys()].filter(i => (alloc.get(i) ?? 0) > 0);
  if (idx.length === 0) return [];

  const durations = idx.map(i => options[i].actualTime);
  const counts = idx.map(i => alloc.get(i) ?? 0);
  const witness = packWitness(durations, counts, capacity);

  const load = new Array<number>(NUM_SLOTS).fill(0);
  const rawLoad = new Array<number>(NUM_SLOTS).fill(0);
  const count = new Array<number>(NUM_SLOTS).fill(0);

  const place = (j: number, slot: number) => {
    load[slot] += durations[j];
    rawLoad[slot] += options[idx[j]].rawTime;
    count[slot] += 1;
  };

  if (witness) {
    for (let j = 0; j < idx.length; j++) for (const slot of witness[j]) place(j, slot);
  } else {
    // No witness (provably unpackable, or the node budget ran out). Longest
    // first into the emptiest slot, so the summary at least describes a real
    // arrangement of these missions even where it overfills.
    const order = idx.map((_, j) => j).sort((a, b) => durations[b] - durations[a]);
    for (const j of order) {
      for (let k = 0; k < counts[j]; k++) {
        let slot = 0;
        for (let b = 1; b < NUM_SLOTS; b++) if (load[b] < load[slot]) slot = b;
        place(j, slot);
      }
    }
  }

  return load.map((seconds, b) => ({
    loadSeconds: seconds,
    rawLoadSeconds: rawLoad[b],
    missionCount: count[b],
  }));
}

// The whole plan, start to finish.
//
// Async because the solver is a WebAssembly module that has to be fetched and
// instantiated once; every call after the first resolves off a cached promise.
export async function optimizeFull(args: OptimizeArgs): Promise<OptimizerSolution> {
  const {
    options,
    recipeDag,
    desiredArtifactNodeIds,
    fuelCapacity: rawR,
    timeCapacity: rawS,
    maximumCost,
    baseYield,
    craftBudget,
  } = args;

  // An empty input field upstream arrives as NaN; clamp before it reaches the
  // model, where a NaN budget would make every row unsatisfiable.
  const R = Number.isFinite(rawR) && rawR > 0 ? rawR : 0;
  const S = Number.isFinite(rawS) && rawS > 0 ? rawS : 0;

  // Missions that cannot be launched even once are dropped before indices are
  // assigned, so an allocation index means the same thing here and inside the
  // solver. A mission is unlaunchable if it cannot fit a single slot, if one
  // copy alone would overrun the fuel tank, or if its ship costs more gems than
  // the player is willing to spend.
  //
  // Fuel is bounded from above only. A zero-fuel mission is legitimate — it is
  // pure time — and the fuel row it lands in normalises by `fuelCapacity`, so
  // when that clamps to 0 every mission's fuel coefficient becomes 0 and the
  // row stops constraining anything; `actualFuel <= R` is what still holds a
  // NaN fuel budget to the zero-fuel missions.
  const feasibleOptions = options.filter(
    o =>
      ZERO_TOL < o.actualTime &&
      o.actualTime <= S &&
      o.actualFuel <= R &&
      (maximumCost === undefined || o.cost <= maximumCost)
  );

  const ctx = buildEvalContext(feasibleOptions, recipeDag, desiredArtifactNodeIds, baseYield, craftBudget);

  const problem: PlanProblem = {
    options: feasibleOptions,
    dag: recipeDag,
    targets: desiredArtifactNodeIds,
    fuelCapacity: R,
    timeCapacity: S,
    slots: NUM_SLOTS,
    baseYield,
    craftBudget,
  };

  const solve = await loadHighs();
  const { allocation } = solveWith(problem, solve);

  const alloc = new Map<number, number>();
  for (let i = 0; i < allocation.length; i++) {
    if (allocation[i] > 0) alloc.set(i, allocation[i]);
  }

  return assembleFullSolution(
    ctx,
    alloc,
    slotsOfAllocation(feasibleOptions, alloc, S),
    baseYield,
    desiredArtifactNodeIds,
    recipeDag
  );
}

function assembleFullSolution(
  ctx: EvalContext,
  bestAlloc: Map<number, number>,
  bestSlots: SlotSummary[],
  baseYield: Map<string, number>,
  desiredArtifactNodeIds: string[],
  recipeDag: RecipeDAG
): OptimizerSolution {
  const { finalYieldVector, totalLegendary, fuelUsed, fuelByEgg, choiceHistory } = assembleSolution(
    baseYield,
    bestAlloc,
    ctx.options
  );

  // wall-clock is the busiest slot's makespan; running time its raw flight time
  const busiest = bestSlots.reduce<SlotSummary | null>(
    (best, s) => (best === null || s.loadSeconds > best.loadSeconds ? s : best),
    null
  );
  const makespan = busiest?.loadSeconds ?? 0;
  const running = busiest?.rawLoadSeconds ?? 0;

  // The tangent-LP split is only a seed: reported numbers must come off the
  // exact objective, never the search's envelope. See OPTIMIZER.md.
  const seedSolve = ctx.innerLp.solve(finalYieldVector, totalLegendary);
  const finalSolve = refineJointCraftSplit(
    recipeDag,
    desiredArtifactNodeIds,
    ctx.QByTarget,
    finalYieldVector,
    totalLegendary,
    seedSolve,
    ctx.craftBudget
  );
  const perTarget = desiredArtifactNodeIds.map(t => {
    const craftCount =
      finalSolve.craftByTarget.get(t) ?? (recipeDag.get(t)?.isLeaf ? (finalYieldVector.get(t) ?? 0) : 0);
    const p = alphaToProb(craftCount, totalLegendary, [t], recipeDag);
    return { nodeId: t, expectedCrafts: craftCount, ...p };
  });
  const primary = perTarget[0] ?? {
    bestProbability: 0,
    craftProbability: 0,
    dropProbability: 0,
    expectedCrafts: 0,
  };

  // No targets yields 0, not the empty product's 1: nothing was asked for, so
  // nothing is achieved.
  let jointProbability = perTarget.length > 0 ? 1 : 0;
  for (const t of perTarget) jointProbability *= t.bestProbability;

  return {
    bestProbability: primary.bestProbability,
    craftProbability: primary.craftProbability,
    dropProbability: primary.dropProbability,
    expectedCrafts: primary.expectedCrafts,
    fuelUsed: fuelUsed,
    fuelByEgg: fuelByEgg,
    timeUnitsUsed: Math.round(makespan),
    runningTimeSeconds: Math.round(running),
    slots: bestSlots.length > 0 ? bestSlots : undefined,
    choiceHistory: choiceHistory,
    expectedDrops: [], // populated by index.ts
    finalYieldVector: finalYieldVector,
    baseYield: new Map(baseYield),
    recipeDag: recipeDag,
    craftPrimal: finalSolve.primalByNode,
    perTarget: perTarget,
    jointProbability,
  };
}

function assembleSolution(baseYield: Map<string, number>, bestAlloc: Map<number, number>, options: LaunchOption[]) {
  const choiceHistory: LaunchSolution[] = [];
  let fuelUsed = 0;
  const finalYieldVector = new Map<string, number>(baseYield);
  const totalLegendary = new Map<string, number>();
  const fuelByEgg = new Map<ei.Egg, number>();
  for (const [idx, k] of bestAlloc) {
    if (k <= 0) continue;
    const opt = options[idx];
    fuelUsed += k * opt.actualFuel;
    for (const [n, r] of opt.yieldVector) {
      finalYieldVector.set(n, (finalYieldVector.get(n) ?? 0) + k * r);
    }
    for (const [n, r] of opt.legendaryYieldVector) {
      totalLegendary.set(n, (totalLegendary.get(n) ?? 0) + k * r);
    }
    for (const [egg, rate] of opt.fuelByEgg) {
      fuelByEgg.set(egg, (fuelByEgg.get(egg) ?? 0) + k * rate);
    }
    choiceHistory.push({
      ship: opt.ship,
      actualFuel: opt.actualFuel,
      actualFuelByEgg: opt.fuelByEgg,
      actualTime: opt.actualTime,
      target: opt.target ?? '',
      targetAfxId: opt.targetAfxId,
      numShipsLaunched: k,
      supplyVector: opt.supplyVector,
      legendarySupplyVector: opt.legendaryYieldVector,
    });
  }
  return { finalYieldVector, totalLegendary, fuelUsed, fuelByEgg, choiceHistory };
}
