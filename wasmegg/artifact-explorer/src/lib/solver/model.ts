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
  targets: string[];
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
  groups: Group[];
  groupOfOption: number[]; // original option index -> group index, -1 if dropped
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

export function buildModel(problem: PlanProblem): Model {
  const dag: RecipeDAG = problem.dag;
  const targets = [...problem.targets];

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

  const consRows = items.map(item => {
    const row = new Array<number>(craftables.length).fill(0);
    for (const id of craftables) {
      const j = craftIndex.get(id)!;
      for (const child of dag.get(id)!.children) {
        if (child.nodeId === item) row[j] += child.quantity;
      }
    }
    const producer = craftIndex.get(item);
    if (producer !== undefined) row[producer] -= 1;
    return row;
  });

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
  const groupOfOption = new Array<number>(problem.options.length).fill(-1);
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    if (i > 0 && cmpKey(candidates[i - 1], cand) === 0) {
      groups[groups.length - 1].members.push(cand.index);
      groupOfOption[cand.index] = groups.length - 1;
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
    groupOfOption[cand.index] = groups.length - 1;
  }
  for (const grp of groups) grp.members.sort((a, b) => a - b);

  return {
    targets,
    craftables,
    items,
    consRows,
    craftChildren,
    baseB,
    Qs,
    targetCraftIdx,
    slots,
    timeCapacitySeconds: timeCap,
    groups,
    groupOfOption,
  };
}
