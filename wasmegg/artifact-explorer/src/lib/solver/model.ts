// Preprocessing for the planner: restricted recipe DAG, normalized budgets,
// filtered and duplicate-merged option groups.
//
// This is the *problem model*, not a search: it turns a `PlanProblem` into the
// dense arrays the evaluator and any search over it need. It was shared by
// several candidates while the arena was a bake-off — they differed in what they
// searched, not in what the objective is — and it is kept separate from `oa.ts`
// for that reason. Nothing here imports the harness or the judge.

import type { LaunchOption, RecipeDAG } from '../types';
import type { PlanProblem } from './types';

const GROUP_CAP = 1e9;

export interface Group {
  fuel: number; // actualFuel / fuelCapacity (0 when fuelCapacity <= 0)
  time: number; // actualTime / timeCapacity
  timeSeconds: number; // raw actualTime, for the packer
  yieldByItem: number[]; // dense over Model.items
  legendaryByTarget: number[]; // dense over Model.targets
  cap: number; // defensive per-group count cap
  members: number[]; // original option indices, ascending; output lands on members[0]
}

export interface Model {
  // Sorted by node id, NOT in the order the caller listed them. See
  // `buildModel` for why, and `requestedOrder` for getting back.
  targets: string[];
  // `requestedOrder[t]` is where model target `t` sat in `problem.targets`.
  // Anything reported back per target has to be permuted through this, because
  // the plan seam promises that array parallel to the caller's list.
  requestedOrder: number[];
  craftables: string[]; // reachable non-leaf node ids
  items: string[]; // consumed item ids — one conservation row each
  consRows: number[][]; // items x craftables
  // Per craftable, its children as (item row, child craft column or -1).
  craftChildren: { itemIdx: number; childCraft: number }[][];
  baseB: number[]; // owned inventory per item
  Qs: number[]; // -log(1 - legendaryCraftProbability); +Infinity when prob is 1
  targetCraftIdx: number[]; // craft column per target; -1 when not craftable
  slots: number;
  timeCapacitySeconds: number;
  // Upper bound per craft column. Infinity where nothing bounds it. See
  // `craftUpperBounds` for the derivation and why it is a relaxation.
  craftCaps: number[];
  // Golden egg budget, dense over `craftables`. `craftBudgetCapacity` is
  // Infinity when there is no cap, or when no craftable carries a price — in
  // both cases `milp.ts` writes no row.
  craftPrices: number[];
  craftBudgetCapacity: number;
  groups: Group[];
}

type Entry = [string, number];

interface Candidate {
  fuel: number;
  time: number;
  timeSeconds: number;
  yieldEntries: Entry[]; // sorted by item id
  legendaryEntries: Entry[]; // sorted by target id
  cap: number;
  index: number; // original option index
}

function cmpEntries(a: Entry[], b: Entry[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i][0] !== b[i][0]) return a[i][0] < b[i][0] ? -1 : 1;
    if (a[i][1] !== b[i][1]) return a[i][1] - b[i][1];
  }
  return a.length - b.length;
}

// Canonical key order: field-by-field numeric comparison of the tuple
// (fuel, time, yield entries, legendary entries) — never via float formatting.
function cmpKey(a: Candidate, b: Candidate): number {
  if (a.fuel !== b.fuel) return a.fuel - b.fuel;
  if (a.time !== b.time) return a.time - b.time;
  return cmpEntries(a.yieldEntries, b.yieldEntries) || cmpEntries(a.legendaryEntries, b.legendaryEntries);
}

// How many times each craftable could conceivably be crafted, by interval
// propagation over the recipe DAG.
//
// WHY THIS EXISTS. The craft columns are the only continuous columns in the
// model with no bound of their own: the mission columns are capped by fuel and
// time in `buildModel`, `z` is capped at 0, and `c` was left at infinity. The
// conservation rows *do* bound the polytope, but only through a chain — the
// crafts of a tier are limited by its ingredients, which are limited by theirs,
// down to the drops — and reading a per-column bound off that chain is work the
// solver's presolve has to redo on every model. Handing it the bound directly
// was measured at 5-38% of the solve on production-scale instances; it was
// found because adding a *slack* golden egg row sped the solver up by that
// margin, the row being the only thing that had ever bounded these columns.
//
// WHY IT IS SOUND. For each item, the most that can ever exist is what the
// player owns plus what every mission could drop if it were launched the
// maximum number of times, plus everything that could be crafted of it. For
// each craftable, the most that can be crafted is the smallest, over its
// ingredients, of that supply divided by the recipe quantity. Every step
// ignores *aggregate competition* — each group is counted at `group.cap`, the
// most it could be launched with the whole tank and every slot to itself, and
// two parents drawing on one ingredient are each given all of it. Note that
// fuel, time and the slot count are not ignored: they are already inside
// `group.cap`. What is dropped is that the groups have to share them. Both
// approximations over-state supply, so the result is a relaxation of the
// feasible set and cannot cut off a feasible point.
//
// NOT FLOORED. `c` is continuous (SPEC.md section 2), so a fractional bound is
// reachable: with 5 of an ingredient and a recipe taking 2, the LP may sit at
// 2.5 crafts, and flooring to 2 would cut off the optimum. Integrality of the
// *mission* columns is what makes a plan realisable; the craft split is an LP
// relaxation throughout.
function craftUpperBounds(
  dag: RecipeDAG,
  targets: readonly string[],
  craftables: readonly string[],
  craftIndex: ReadonlyMap<string, number>,
  items: readonly string[],
  itemIndex: ReadonlyMap<string, number>,
  baseB: readonly number[],
  groups: readonly Group[]
): number[] {
  // The most of each item that missions could ever put on the table, plus what
  // is already owned. `grp.cap` is the whole-plan bound the fuel and time
  // budgets already imply for that group.
  const dropped = new Array<number>(items.length);
  for (let i = 0; i < items.length; i++) {
    let total = baseB[i];
    for (const grp of groups) {
      const y = grp.yieldByItem[i];
      if (y > 0) total += y * grp.cap;
    }
    dropped[i] = Number.isFinite(total) ? total : Infinity;
  }

  // Post-order, so every ingredient's bound is known before the node that
  // consumes it. Reverse first-visit order is NOT enough: with two targets
  // sharing an ingredient, the second target is discovered after the shared
  // node and would read a bound that had not been computed yet.
  const caps = new Array<number>(craftables.length).fill(Infinity);
  const seen = new Set<string>();
  const order: number[] = [];
  const visit = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const node = dag.get(id);
    if (node) for (const child of node.children) visit(child.nodeId);
    const idx = craftIndex.get(id);
    if (idx !== undefined) order.push(idx);
  };
  for (const t of targets) visit(t);

  for (const idx of order) {
    const node = dag.get(craftables[idx]);
    if (!node || node.children.length === 0) continue; // nothing to bound it by
    let bound = Infinity;
    for (const child of node.children) {
      if (!(child.quantity > 0)) continue;
      const itemIdx = itemIndex.get(child.nodeId);
      if (itemIdx === undefined) {
        // Not a tracked item, so nothing here limits it.
        bound = Infinity;
        break;
      }
      let supply = dropped[itemIdx];
      const producer = craftIndex.get(child.nodeId);
      // A craftable ingredient can also be crafted, so its own bound adds to
      // what could exist of it.
      if (producer !== undefined) supply += caps[producer];
      const limit = supply / child.quantity;
      if (limit < bound) bound = limit;
    }
    caps[idx] = Number.isFinite(bound) && bound >= 0 ? bound : Infinity;
  }
  return caps;
}

export function buildModel(problem: PlanProblem): Model {
  const dag: RecipeDAG = problem.dag;

  // Targets are sorted, so the model is a function of the target *set* rather
  // than of the order the caller happened to list them in.
  //
  // Reordering the caller's list used to permute the entire matrix, not just the
  // target columns: the downward closure below visits targets in order, so
  // `craftables` changed, `items` changed with it, and every conservation row and
  // craft column moved. The MILP is solved under a finite node budget
  // (`DEFAULT_TUNING.maxNodes`), so the branch-and-bound is truncated long
  // before it proves anything on any instance worth solving, and which
  // incumbent it happens to hold when it stops depends on that column order. The
  // result was a solver that returned a different — and sometimes worse — plan
  // for a relabeling of the same problem. That is the arena's B2-target-order,
  // which fired on 11 of 40 sweep instances at up to 0.1620 nats.
  //
  // Sorting here makes the whole model, and therefore the LP text and therefore
  // HiGHS's answer, byte-identical under any permutation of the target list, so
  // B2 is structurally inert rather than something the search has to be good
  // enough to hold. This is the same treatment `cmpKey` already gives the option
  // menu for B1 and B6 (SPEC.md section 1).
  const requested = [...problem.targets];
  const requestedOrder = requested
    .map((_, i) => i)
    // Ties broken by original position, so duplicate ids stay a bijection.
    .sort((a, b) => (requested[a] < requested[b] ? -1 : requested[a] > requested[b] ? 1 : a - b));
  const targets = requestedOrder.map(i => requested[i]);

  // Downward closure of the targets, in deterministic first-visit order.
  const orderIds: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    orderIds.push(id);
    const node = dag.get(id);
    if (!node) return;
    for (const child of node.children) visit(child.nodeId);
  };
  for (const t of targets) visit(t);

  const craftables: string[] = [];
  for (const id of orderIds) {
    const node = dag.get(id);
    if (node && !node.isLeaf) craftables.push(id);
  }
  const craftIndex = new Map(craftables.map((id, i) => [id, i]));

  // Consumed set: everything some reachable non-leaf node crafts from. Only
  // these get an LP row; drops of anything else are dead (the judge agrees).
  const items: string[] = [];
  const itemIndex = new Map<string, number>();
  for (const id of craftables) {
    for (const child of dag.get(id)!.children) {
      if (!itemIndex.has(child.nodeId)) {
        itemIndex.set(child.nodeId, items.length);
        items.push(child.nodeId);
      }
    }
  }

  // Built by walking the craftables once and posting each child into the row
  // `itemIndex` already names, rather than re-walking every craftable per item
  // and comparing ids — the latter is cubic in the DAG's size for no gain.
  const consRows = items.map(() => new Array<number>(craftables.length).fill(0));
  for (const id of craftables) {
    const j = craftIndex.get(id)!;
    for (const child of dag.get(id)!.children) {
      consRows[itemIndex.get(child.nodeId)!][j] += child.quantity;
    }
  }
  for (const [item, i] of itemIndex) {
    const producer = craftIndex.get(item);
    if (producer !== undefined) consRows[i][producer] -= 1;
  }

  const craftChildren = craftables.map(id =>
    dag
      .get(id)!
      .children.filter(child => child.quantity > 0)
      .map(child => ({
        itemIdx: itemIndex.get(child.nodeId)!,
        childCraft: craftIndex.get(child.nodeId) ?? -1,
      }))
  );

  const baseB = items.map(item => {
    const quantity = problem.baseYield.get(item) ?? 0;
    return Number.isFinite(quantity) && quantity >= 0 ? quantity : 0;
  });
  const Qs = targets.map(t => {
    const node = dag.get(t);
    return node ? -Math.log(1 - node.legendaryCraftProbability) : 0;
  });
  const targetCraftIdx = targets.map(t => craftIndex.get(t) ?? -1);

  // Golden egg prices, dense over the craft columns. A negative or non-finite
  // price is dropped rather than trusted: the same class of bug as a negative
  // fuel cost below, and with the same consequence — a craft that *earns*
  // budget — except that here the column is continuous, so nothing bounds how
  // far the solver would run with it.
  const budget = problem.craftBudget;
  const craftPrices = craftables.map(id => {
    const price = budget?.unitPrices.get(id) ?? 0;
    return Number.isFinite(price) && price > 0 ? price : 0;
  });
  const capped = budget !== undefined && Number.isFinite(budget.capacity) && budget.capacity >= 0;
  const craftBudgetCapacity = capped && craftPrices.some(p => p > 0) ? budget!.capacity : Infinity;

  // Normalized budgets: fuel budget 1, per-slot time budget 1. fuelCapacity <= 0
  // reads as "all fuel costs are 0".
  const fuelCap = problem.fuelCapacity;
  const timeCap = problem.timeCapacity;
  const slots = problem.slots;

  const candidates: Candidate[] = [];
  problem.options.forEach((opt: LaunchOption, index: number) => {
    // Two ways a malformed cost gets through the comparisons below, both ending
    // in a model that is wrong rather than one that fails loudly.
    //
    // Non-finite: `NaN > 1` is false, so the slot filter lets it through, and
    // `time > 0` is false, so `cap` falls back to GROUP_CAP. It reaches the slot
    // and fuel rows and is written into the LP text, where HiGHS rejects the
    // whole model.
    //
    // Negative: worse, because nothing rejects it. A negative `actualFuel` is a
    // negative coefficient in the fuel row, so launching the mission *buys* fuel
    // budget; a negative `actualTime` passes `time > 1` and `time > 0` alike and
    // then discounts a slot's load. Either one silently licenses a plan the
    // budgets were supposed to forbid.
    //
    // Same class of bug applies to quantities: a non-finite yield reaches the
    // LP matrix and HiGHS rejects the whole model, so we reject the option
    // instead wherever a quantity would actually be used below.
    if (
      !Number.isFinite(opt.actualFuel) ||
      !Number.isFinite(opt.actualTime) ||
      opt.actualFuel < 0 ||
      opt.actualTime < 0
    ) {
      return;
    }
    const fuel = fuelCap > 0 ? opt.actualFuel / fuelCap : 0;
    const time = timeCap > 0 ? opt.actualTime / timeCap : Infinity;
    if (time > 1) return; // can never pack into a slot

    const yieldEntries: Entry[] = [];
    for (const [item, qty] of opt.yieldVector) {
      if (qty > 0 && itemIndex.has(item)) {
        if (!Number.isFinite(qty)) return; // non-finite yield would reach the LP matrix
        yieldEntries.push([item, qty]);
      }
    }
    const legendaryEntries: Entry[] = [];
    for (const t of targets) {
      const qty = opt.legendaryYieldVector.get(t) ?? 0;
      if (qty > 0) {
        if (!Number.isFinite(qty)) return; // non-finite yield would reach the LP matrix
        legendaryEntries.push([t, qty]);
      }
    }
    if (yieldEntries.length === 0 && legendaryEntries.length === 0) return; // useless
    yieldEntries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    legendaryEntries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    const cap = Math.min(
      fuel > 0 ? Math.floor(1 / fuel) : GROUP_CAP,
      time > 0 ? Math.floor(slots / time) : GROUP_CAP,
      GROUP_CAP
    );
    if (cap < 1) return; // cannot be launched even once

    candidates.push({ fuel, time, timeSeconds: opt.actualTime, yieldEntries, legendaryEntries, cap, index });
  });

  // Merge exact duplicates into one group; see SPEC.md section 1 (B1, B6).
  candidates.sort((a, b) => cmpKey(a, b) || a.index - b.index);
  const groups: Group[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    if (i > 0 && cmpKey(candidates[i - 1], cand) === 0) {
      groups[groups.length - 1].members.push(cand.index);
      continue;
    }
    const yieldByItem = new Array<number>(items.length).fill(0);
    for (const [item, qty] of cand.yieldEntries) yieldByItem[itemIndex.get(item)!] = qty;
    const legendaryByTarget = targets.map(t => {
      const hit = cand.legendaryEntries.find(e => e[0] === t);
      return hit ? hit[1] : 0;
    });
    groups.push({
      fuel: cand.fuel,
      time: cand.time,
      timeSeconds: cand.timeSeconds,
      yieldByItem,
      legendaryByTarget,
      cap: cand.cap,
      members: [cand.index],
    });
  }
  for (const grp of groups) grp.members.sort((a, b) => a - b);

  return {
    targets,
    requestedOrder,
    craftables,
    items,
    consRows,
    craftChildren,
    baseB,
    Qs,
    targetCraftIdx,
    slots,
    timeCapacitySeconds: timeCap,
    craftCaps: craftUpperBounds(dag, targets, craftables, craftIndex, items, itemIndex, baseB, groups),
    craftPrices,
    craftBudgetCapacity,
    groups,
  };
}
