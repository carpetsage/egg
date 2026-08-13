// The mixed-integer program handed to HiGHS.
//
// Two models are built from the same core:
//
//   scaleLp(t)   continuous, maximize s_t alone. Gives theta_t.
//   oaMilp       integer, maximize sum_t z_t under a set of tangents of
//                g(s) = log(1 - e^-s), stated once by `oa.ts`.
//
// See SPEC.md sections 2-4 for the columns, rows, and scaling this builds.

import type { Model } from './model';
import { logHit } from '../concave';
import { INF, type MilpModel } from './types';

// See SPEC.md section 4 ("Two constants that are not the judge's") for why
// certainty is proxied rather than left as Infinity.
export const Q_CERTAIN_PROXY = 1e4;

// Fallback per-slot count bound for the degenerate case of a zero-duration
// option. Real missions take days, so this never binds in practice; it exists
// so no column is unbounded.
const MAX_PER_SLOT = 1e6;

// g'(s) = 1 / expm1(s), *uncapped* — deliberately not `concave.gPrime`. See
// SPEC.md section 4 ("Two constants that are not the judge's").
function slopeAt(s: number): number {
  return 1 / Math.expm1(s);
}

export interface Layout {
  slots: number;
  groups: number;
  crafts: number;
  targets: number;
  // n[g][k] — missions of group g launched into slot k. Integer in the MILP,
  // continuous in the scale LP.
  nBase: number;
  // N[g] — the same missions summed over slots, tied to n by one row each. See
  // SPEC.md section 2 for why this stays despite being modelling-redundant.
  // Measured on the widest instances: reading N instead of n in the rows that
  // don't care which slot takes the matrix from ~35k nonzeros to ~12k, and the
  // LP relaxation — not branching — is where this candidate's time goes.
  aBase: number;
  // c[p] — crafts of craftable p. Always continuous; see SPEC.md section 2.
  cBase: number;
  // sigma[t] — target t's score in units of theta_t.
  sBase: number;
  // z[t] — the outer-approximation stand-in for g(s_t). Absent in the scale LP.
  zBase: number;
  columnCount: number;
}

// The two models built here, named rather than spelled as flags. 'scale' is the
// continuous per-target relaxation, 'oa' the integer outer-approximation MILP —
// and the difference is not two independent switches: only the OA variant has
// the epigraph columns, and only the OA variant branches on mission counts. One
// discriminant makes the invalid pairings unstateable.
export type Variant = 'scale' | 'oa';

export function layoutOf(model: Model, variant: Variant): Layout {
  const withZ = variant === 'oa';
  const slots = model.slots;
  const groups = model.groups.length;
  const crafts = model.craftables.length;
  const targets = model.targets.length;
  const nBase = 0;
  const aBase = nBase + groups * slots;
  const cBase = aBase + groups;
  const sBase = cBase + crafts;
  const zBase = sBase + targets;
  return {
    slots,
    groups,
    crafts,
    targets,
    nBase,
    aBase,
    cBase,
    sBase,
    zBase: withZ ? zBase : -1,
    columnCount: withZ ? zBase + targets : zBase,
  };
}

export function nCol(layout: Layout, group: number, slot: number): number {
  return layout.nBase + group * layout.slots + slot;
}

// Effective craft rates: the judge's, with certainty proxied (see above).
export function effectiveQs(model: Model): number[] {
  return model.Qs.map(q => (Number.isFinite(q) ? q : Q_CERTAIN_PROXY));
}

// Smallest matrix entry a row is allowed to keep before it gets scaled up. See
// SPEC.md section 3 (row scaling and the ingestion window) for why this exists
// at all — `small_matrix_value`, and the `Highs_readModel`-before-options trap.
//
// The margin is not comfortable, and the fuel row is where it is thinnest, so
// here is the whole arithmetic with real numbers for why this constant lands
// on 1e-6 and not, say, 1e-7 or 1e-9.
//
// The tank capacity itself never reaches the matrix. `model.ts` divides every
// mission's `actualFuel` by `fuelCapacity`, so what the fuel row carries is a
// dimensionless ratio, and a 1e14 tank is not on its own a large coefficient —
// it is a large *denominator*. Both ends of the ratio are bounded:
//
//   upper  an option costing more than the whole tank is dropped by
//          `buildModel` (`cap = floor(1 / fuel)`, and `cap < 1` returns), so
//          every surviving coefficient is <= 1. Whatever the tank, this row
//          cannot approach `large_matrix_value` = 1e15.
//   lower  the smallest ratio the game admits is the cheapest launch over the
//          largest tank: 1.0e7 / 5.0e14 = 2.0e-8. (`fuelTankSizes` tops out at
//          5e14; 1e7 is the cheapest `actualFuel` in the enumerated menu across
//          the sweep.) A1-fuel doubles the tank, which halves it to 1e-8.
//
// 2e-8 is twenty times `small_matrix_value`. Twenty is not a margin, which is
// why this constant is 1e-6 and not 1e-9: at 1e-6 the row is rescaled while the
// filter is still two decades away. What the rescale then does with those
// numbers: `smallest = 2e-8 < 1e-6`, so `scale = min(1/2e-8, 1e12/largest)`,
// and since `largest <= 1` the headroom term is >= 1e12 while `1/smallest` is
// 5e7 — the cap cannot bind on this row, and the scale is exactly `1/smallest`.
// The smallest entry lands on 1 and the largest on at most 5e7, both sitting
// mid-window with eight decades of clearance below and seven above.
//
// Measured, forcing all 40 sweep instances to the largest tank: normalized fuel
// coefficients span [2.0e-8, 3.3e-1], and the smallest entry any fuel row
// actually hands HiGHS after scaling is 1.0e-5. Whole OA matrix over the same
// run: [1e-5, 1e12], against a window of roughly [1e-9, 1e15].
//
// So instead: scaling a row and its bounds by a positive constant leaves the
// feasible set exactly unchanged, so any row carrying an entry near the filter
// is scaled until its smallest entry is 1. Rows already clear of it are left
// alone — the slot rows in particular, whose units are chosen to line up with
// the judge's packing tolerance and would lose that if rescaled.
const SAFE_COEFFICIENT = 1e-6;

// The same filter at the other end, and the reason the scaling below is
// capped rather than always normalizing a row's smallest entry to 1. See
// SPEC.md section 3 for `large_matrix_value`, the rejection it causes, and the
// deep-cut slope-ratio example that makes the cap non-hypothetical.
const SAFE_LARGE_COEFFICIENT = 1e12;

function scaleBound(bound: number, scale: number): number {
  if (bound >= INF) return INF;
  if (bound <= -INF) return -INF;
  const scaled = bound * scale;
  if (scaled >= INF) return INF;
  if (scaled <= -INF) return -INF;
  return scaled;
}

// Accumulates rows in triplet form and freezes them into row-major CSR. One
// `Map` per row so a coefficient written twice (a craftable that is also one of
// its own ingredients' consumers, say) adds rather than overwrites.
class Rows {
  private readonly offsets: number[] = [];
  private readonly indices: number[] = [];
  private readonly values: number[] = [];
  private readonly lower: number[] = [];
  private readonly upper: number[] = [];
  private current: Map<number, number> | null = null;

  begin(): void {
    this.current = new Map();
  }

  add(column: number, coefficient: number): void {
    if (coefficient === 0) return;
    const row = this.current!;
    row.set(column, (row.get(column) ?? 0) + coefficient);
  }

  // Closes the row at `lo <= expr <= up`. A row that ended up empty is dropped:
  // HiGHS accepts it, but the LP-format writer has nothing to print for it.
  end(lo: number, up: number): void {
    const row = this.current!;
    this.current = null;

    // One pass over the entries: the coefficients are read out here and never
    // looked up again, so the magnitude scan and the emit below both work off
    // `entries` rather than going back to the `Map`.
    const entries: [number, number][] = [];
    let smallest = Infinity;
    let largest = 0;
    for (const [column, coefficient] of row) {
      if (coefficient === 0) continue;
      entries.push([column, coefficient]);
      const magnitude = Math.abs(coefficient);
      if (magnitude < smallest) smallest = magnitude;
      if (magnitude > largest) largest = magnitude;
    }
    if (entries.length === 0) return;
    entries.sort((a, b) => a[0] - b[0]);

    // Never scale down, and never past the top of the window: a row whose own
    // dynamic range is wider than the window cannot be made to fit, and the
    // least bad answer is to keep the large entries readable.
    const headroom = largest > 0 ? SAFE_LARGE_COEFFICIENT / largest : Infinity;
    const scale = smallest < SAFE_COEFFICIENT ? Math.max(1, Math.min(1 / smallest, headroom)) : 1;

    this.offsets.push(this.indices.length);
    for (const [column, coefficient] of entries) {
      this.indices.push(column);
      this.values.push(coefficient * scale);
    }
    this.lower.push(scaleBound(lo, scale));
    this.upper.push(scaleBound(up, scale));
  }

  freeze(): Pick<MilpModel, 'rowCount' | 'rowLower' | 'rowUpper' | 'offsets' | 'indices' | 'values'> {
    return {
      rowCount: this.offsets.length,
      rowLower: Float64Array.from(this.lower),
      rowUpper: Float64Array.from(this.upper),
      offsets: Int32Array.from(this.offsets),
      indices: Int32Array.from(this.indices),
      values: Float64Array.from(this.values),
    };
  }
}

// Per-slot count bound for a group: the most launches of it one slot can hold.
// `group.cap` is the whole-plan bound (fuel and total time); the slot bound is
// tighter and is what the column needs.
function perSlotCap(model: Model, group: number): number {
  const grp = model.groups[group];
  const byTime = grp.time > 0 ? Math.floor(1 / grp.time) : MAX_PER_SLOT;
  return Math.max(0, Math.min(grp.cap, byTime, MAX_PER_SLOT));
}

interface Core {
  layout: Layout;
  rows: Rows;
  columnLower: Float64Array;
  columnUpper: Float64Array;
  columnIsInteger: Uint8Array;
}

// Columns and the rows every variant shares: conservation, score definitions,
// the fuel budget, the three slot budgets, and the slot-ordering symmetry break.
function buildCore(model: Model, qs: readonly number[], theta: readonly number[], variant: Variant): Core {
  // The OA variant is the integer one; the scale LPs are a continuous
  // relaxation of the same columns.
  const withZ = variant === 'oa';
  const layout = layoutOf(model, variant);
  const columnLower = new Float64Array(layout.columnCount);
  const columnUpper = new Float64Array(layout.columnCount).fill(INF);
  const columnIsInteger = new Uint8Array(layout.columnCount);

  for (let g = 0; g < layout.groups; g++) {
    const cap = perSlotCap(model, g);
    for (let k = 0; k < layout.slots; k++) {
      const col = nCol(layout, g, k);
      columnUpper[col] = cap;
      columnIsInteger[col] = withZ ? 1 : 0;
    }
    // Integrality of the total follows from the parts, so this column stays
    // continuous rather than giving branch-and-bound a fourth thing to branch on
    // per group.
    columnUpper[layout.aBase + g] = model.groups[g].cap;
  }
  // Craft columns. `model.craftCaps` is a relaxation (see `craftUpperBounds`),
  // so this cannot cut off a feasible point — it only saves presolve from
  // re-deriving through the conservation chain what the recipe already implies.
  // Anything at or past INF stays unbounded rather than becoming a huge finite
  // bound, which would be a coefficient near the top of the ingestion window.
  for (let p = 0; p < layout.crafts; p++) {
    const cap = model.craftCaps[p];
    if (Number.isFinite(cap) && cap >= 0 && cap < INF) columnUpper[layout.cBase + p] = cap;
  }

  // g(s) <= 0 for every s, so z is bounded above by 0 before any cut is added.
  if (withZ) {
    for (let t = 0; t < layout.targets; t++) {
      columnLower[layout.zBase + t] = -INF;
      columnUpper[layout.zBase + t] = 0;
    }
  }

  const rows = new Rows();

  // Aggregation: N_g - sum_k n_{g,k} = 0.
  for (let g = 0; g < layout.groups; g++) {
    rows.begin();
    rows.add(layout.aBase + g, 1);
    for (let k = 0; k < layout.slots; k++) rows.add(nCol(layout, g, k), -1);
    rows.end(0, 0);
  }

  // Conservation, one row per consumed item:
  //   sum_p consRows[i][p] c_p  -  sum_g yield_g[i] N_g  <=  baseB[i]
  for (let i = 0; i < model.items.length; i++) {
    rows.begin();
    for (let p = 0; p < layout.crafts; p++) rows.add(layout.cBase + p, model.consRows[i][p]);
    for (let g = 0; g < layout.groups; g++) rows.add(layout.aBase + g, -model.groups[g].yieldByItem[i]);
    rows.end(-INF, model.baseB[i]);
  }

  // Score definition, one row per target:
  //   theta_t sigma_t  -  Q_t c_{target t}  -  sum_g leg_g[t] N_g  =  0
  for (let t = 0; t < layout.targets; t++) {
    rows.begin();
    rows.add(layout.sBase + t, theta[t]);
    const craft = model.targetCraftIdx[t];
    if (craft >= 0) rows.add(layout.cBase + craft, -qs[t]);
    for (let g = 0; g < layout.groups; g++) rows.add(layout.aBase + g, -model.groups[g].legendaryByTarget[t]);
    rows.end(0, 0);
  }

  // Fuel, over the whole plan. Costs are normalized so the tank is 1 — this is
  // the row `SAFE_COEFFICIENT` most often ends up rescaling, since normalizing
  // by a large tank is exactly what drives coefficients toward the filter.
  rows.begin();
  for (let g = 0; g < layout.groups; g++) rows.add(layout.aBase + g, model.groups[g].fuel);
  rows.end(-INF, 1);

  // Golden eggs, over the whole plan: sum_p price_p c_p <= capacity. Prices are
  // linear upper bounds on a curve that decreases in the craft index (see
  // `CraftBudget`), so this row can only under-spend the player's balance.
  //
  // Written in raw golden eggs rather than normalized, for the same reason the
  // slot rows are in raw seconds: prices are ~1e2-1e7 and capacities ~1e6-1e10,
  // which sits mid-window with room at both ends, and normalizing would put the
  // row's smallest entry near `SAFE_COEFFICIENT` for no gain.
  if (Number.isFinite(model.craftBudgetCapacity)) {
    rows.begin();
    for (let p = 0; p < layout.crafts; p++) rows.add(layout.cBase + p, model.craftPrices[p]);
    rows.end(-INF, model.craftBudgetCapacity);
  }

  // The packing constraint, stated exactly, in raw seconds rather than
  // normalized — not cosmetic, see SPEC.md section 3 ("`slot_k` is the packing
  // constraint, stated").
  for (let k = 0; k < layout.slots; k++) {
    rows.begin();
    for (let g = 0; g < layout.groups; g++) rows.add(nCol(layout, g, k), model.groups[g].timeSeconds);
    rows.end(-INF, model.timeCapacitySeconds);
  }

  // Slots are interchangeable, which would otherwise make the search explore
  // slots! relabellings of the same plan. Forcing loads non-increasing keeps one
  // representative of each.
  for (let k = 0; k + 1 < layout.slots; k++) {
    rows.begin();
    for (let g = 0; g < layout.groups; g++) {
      const seconds = model.groups[g].timeSeconds;
      rows.add(nCol(layout, g, k), seconds);
      rows.add(nCol(layout, g, k + 1), -seconds);
    }
    rows.end(0, INF);
  }

  return { layout, rows, columnLower, columnUpper, columnIsInteger };
}

// Closes a core over its frozen matrix, returning "the same model with this
// objective". The freeze copies the whole matrix into typed arrays, so it
// happens once per core and not once per model built from it — `scaleLps`
// builds one model per target off a single core.
//
// The fields are pulled into locals first so the returned closure captures only
// them. Capturing `core` would keep its `Rows` alive — the triplet `number[]`s
// that `freeze` has just copied into typed arrays — for as long as the finisher
// lives, which for `scaleLps` is every scale solve.
function finisher(core: Core): (objective: Float64Array) => MilpModel {
  const frozen = core.rows.freeze();
  const { columnLower, columnUpper, columnIsInteger } = core;
  const columnCount = core.layout.columnCount;
  return objective => ({
    columnCount,
    columnLower,
    columnUpper,
    columnIsInteger,
    objective,
    ...frozen,
  });
}

// Weight on the scale LP's single objective column. Not 1 — see SPEC.md
// section 4 ("The scale LP's objective weight") for why an unweighted raw
// score reads as "optimal" at zero under HiGHS's dual feasibility tolerance.
//
// Measured on seed 2028: pinning the counts to a known-good plan gives
// sigma = 1.28e-7; leaving them free gives a confidently optimal 0 — and a
// zero theta reads as "this target is unreachable", so the candidate returned
// an empty plan on an instance where the search this replaced scored 1.6e-14.
const SCALE_LP_OBJECTIVE = 1e9;

// Continuous relaxations maximizing one target's score on its own. theta is
// left at 1 so sigma_t *is* s_t and the answer reads straight off the column.
//
// Nothing but the single objective column depends on the target, so the core is
// built once and every LP is finished from it.
export function scaleLps(model: Model, qs: readonly number[]): (t: number) => MilpModel {
  const ones = new Array<number>(model.targets.length).fill(1);
  const core = buildCore(model, qs, ones, 'scale');
  const build = finisher(core);
  return t => {
    const objective = new Float64Array(core.layout.columnCount);
    objective[core.layout.sBase + t] = SCALE_LP_OBJECTIVE;
    return build(objective);
  };
}

// One tangent of g per (target, grid point), at s = theta_t * a and written in
// sigma:
//   z_t <= g(theta a) + theta g'(theta a) (sigma_t - a)
//
// Every target gets the same `grid`. It was once a flat list of arbitrary
// (target, point) pairs, back when `oa.ts` added cuts between solves; with the
// grid fixed up front the cross-product is this loop.
export function buildOaMilp(
  model: Model,
  qs: readonly number[],
  theta: readonly number[],
  grid: readonly number[]
): MilpModel {
  const core = buildCore(model, qs, theta, 'oa');
  const { layout, rows } = core;

  for (let t = 0; t < layout.targets; t++) {
    for (const at of grid) {
      const s = theta[t] * at;
      if (!(s > 0) || !Number.isFinite(s)) continue;
      const slope = theta[t] * slopeAt(s);
      const rhs = logHit(s) - slope * at;
      if (!Number.isFinite(slope) || !Number.isFinite(rhs)) continue;
      rows.begin();
      rows.add(layout.zBase + t, 1);
      rows.add(layout.sBase + t, -slope);
      rows.end(-INF, rhs);
    }
  }

  const objective = new Float64Array(layout.columnCount);
  for (let t = 0; t < layout.targets; t++) objective[layout.zBase + t] = 1;
  return finisher(core)(objective);
}

// Missions per group, summed back over the slots. HiGHS returns integers as
// floats a few ulps off, so this rounds; `oa.ts` re-checks both budgets against
// the rounded counts rather than trusting the model.
export function decodeCounts(model: Model, layout: Layout, columnValues: Float64Array): number[] {
  const counts = new Array<number>(model.groups.length).fill(0);
  for (let g = 0; g < layout.groups; g++) {
    let total = 0;
    for (let k = 0; k < layout.slots; k++) {
      const v = columnValues[nCol(layout, g, k)];
      if (Number.isFinite(v) && v > 0) total += Math.round(v);
    }
    counts[g] = Math.min(total, model.groups[g].cap);
  }
  return counts;
}
