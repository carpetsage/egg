// Regression guard for `pack-feasibility.ts`, the arena's fixed goalpost: C1
// fails a plan on its verdict and every k-opt move filters on it.
//
// This file was deleted once as "dev scaffolding whose job is done". It was not:
// the goalpost is the one piece of the harness that can fail a candidate
// outright, and with no tests on it a blind spot reached a sweep and reported
// two feasible production plans as C1 contract failures. It stays.
//
// Two bugs are pinned here, both found from a sweep rather than by inspection:
//
//   * the memo keyed infeasible states on slot loads rounded to whole seconds,
//     so distinct states collided ([0, 1.075, 2.15] and [0, 1, 2] became one
//     key) and a packable plan came back `infeasible`;
//   * the search enumerated how many missions of each duration go in each slot,
//     so its branching factor was the *count*. A real plan of 901 missions,
//     544 of them sharing one duration, exhausted the whole node budget on that
//     first duration and returned `undecided` — which C1 gates on identically to
//     `infeasible`.

import { describe, expect, it } from 'vitest';
import { packFeasible } from './pack-feasibility';

const SLOTS = 3;

// The definition, not another heuristic: assign every individual mission to some
// slot, exhaustively. Exponential, so it is only ever used on tiny multisets.
function brutePacks(durations: number[], counts: number[], capacity: number, slots: number): boolean {
  const items: number[] = [];
  for (let j = 0; j < durations.length; j++) for (let k = 0; k < counts[j]; k++) items.push(durations[j]);
  items.sort((a, b) => b - a);
  const loads = new Array<number>(slots).fill(0);
  const go = (i: number): boolean => {
    if (i === items.length) return true;
    for (let s = 0; s < slots; s++) {
      if (loads[s] + items[i] > capacity + 1e-9) continue;
      if (s > 0 && loads[s] === loads[s - 1]) continue; // slots are interchangeable
      loads[s] += items[i];
      if (go(i + 1)) {
        loads[s] -= items[i];
        return true;
      }
      loads[s] -= items[i];
    }
    return false;
  };
  return go(0);
}

describe('packFeasible', () => {
  it('packs the instance the rounded memo key rejected', () => {
    // Three 0.806s, two 0.64s and two 1.203s do fit three slots of 2.157:
    // 1.203+0.64, 1.203+0.64, 0.806+0.806 — and the last 0.806 goes with a
    // 1.203 (2.009) or alongside the pair (1.612). The rounded key said
    // `infeasible`.
    expect(packFeasible([0.806, 0.64, 1.203], [3, 2, 2], 2.157, SLOTS)).toBe('packs');
  });

  it('still rejects what genuinely does not fit', () => {
    expect(packFeasible([1.075], [3], 1.075, SLOTS)).toBe('packs');
    expect(packFeasible([1.075], [4], 1.075, SLOTS)).toBe('infeasible');
  });

  it('decides the by-inspection cases without searching', () => {
    // No horizon: only zero-length work fits.
    expect(packFeasible([1], [1], 0, SLOTS)).toBe('infeasible');
    expect(packFeasible([0], [5], 0, SLOTS)).toBe('packs');
    // A mission longer than a whole slot is fatal on its own.
    expect(packFeasible([2.5], [1], 2, SLOTS)).toBe('infeasible');
    // Zero-length missions are free everywhere and never consume load.
    expect(packFeasible([0, 1], [100, 3], 1, SLOTS)).toBe('packs');
  });

  it('reports `undecided` rather than guessing when the node budget runs out', () => {
    expect(packFeasible([0.806, 0.64, 1.203], [3, 2, 2], 2.157, SLOTS, 1)).toBe('undecided');
  });
});

// arena:2006. The plan is 901 missions filling 5,960,448s of a 5,961,600s
// horizon — 1152s of slack, a near-exact partition. The witness:
//
//   slot 0: 408*3600 + 18*10368 + 20736 + 62208 + 248832 = 1,987,200  (exact)
//   slot 1: 68*3600 + 168*10368                          = 1,986,624
//   slot 2: 68*3600 + 168*10368                          = 1,986,624
//
// The old search never found it, and `undecided` is a C1 hard failure, so the
// harness reported a feasible plan as a broken one.
describe('the plan a real sweep could not decide', () => {
  const DURATIONS = [3600, 10368, 20736, 62208, 248832];
  const COUNTS = [544, 354, 1, 1, 1];
  const CAPACITY = 1987200;

  it('packs, well inside the node budget', () => {
    expect(packFeasible(DURATIONS, COUNTS, CAPACITY, SLOTS)).toBe('packs');
    // Decided with an order of magnitude to spare, so this is not a fixture that
    // only passes because the default budget was raised to suit it.
    expect(packFeasible(DURATIONS, COUNTS, CAPACITY, SLOTS, 50_000)).toBe('packs');
  });

  it('rejects the same plan with one mission too many', () => {
    // Both are ruled out by the volume bound alone — 5960448s of 5961600s leaves
    // 1152s, and the shorter mission is 3600s — so this pins the cheap path and
    // nothing more. It is here because a plan this close to the horizon must
    // come back `infeasible` rather than `undecided`, not because it exercises
    // the search; the families below are what test the search's infeasible side.
    expect(packFeasible(DURATIONS, [545, 354, 1, 1, 1], CAPACITY, SLOTS)).toBe('infeasible');
    expect(packFeasible(DURATIONS, [544, 355, 1, 1, 1], CAPACITY, SLOTS)).toBe('infeasible');
  });
});

// The second plan a real sweep could not decide, and a different reason.
//
// arena:2025, verbatim from the sweep: 961 missions filling 4146408s of 4147200s
// — 99.98% of the horizon, 792 seconds of slack in the whole plan. It came back
// `undecided` at the default budget, and it is packable. Two things were wrong,
// and this instance needs both fixed:
//
//   - 17856s arrives TWICE, as 27 and as 6, because `budgetsOf` emits one group
//     per launch option and two options can share a duration. Interchangeable
//     missions enumerated as two independent groups.
//   - The arithmetic level went to the wrong group. Longest-first put the single
//     1800s mission last and left `fill` enumerating 920 missions of 2700s: the
//     shortcut fires on a count of 1 while the count of 920 pays full price.
//     The largest count is only the shortest duration by luck, and here it isn't.
describe('the near-exact plan, where the duration order runs out of luck', () => {
  // Verbatim from the sweep's allocation, duplicate duration and all.
  const DURATIONS = [1800, 2700, 17856, 17856, 107136, 214272];
  const COUNTS = [1, 920, 27, 6, 4, 3];
  const CAPACITY = 1382400;

  it('packs, well inside the node budget', () => {
    expect(packFeasible(DURATIONS, COUNTS, CAPACITY, SLOTS)).toBe('packs');
    // Two orders of magnitude below the default, so this is not passing on
    // budget. Before the fix it was `undecided` at ten times the default.
    expect(packFeasible(DURATIONS, COUNTS, CAPACITY, SLOTS, 5_000)).toBe('packs');
  });

  // No "one mission too many" case here, deliberately. At 792s of slack every
  // such variant overshoots `slots * capacity`, so the volume bound returns
  // `infeasible` before the search runs at all — it would pass with or without
  // the ordering fix and pin nothing. The infeasible direction on instances the
  // volume bound cannot see is what the two integrality families and the
  // brute-force differential below are for.

  it('is indifferent to how the caller splits equal durations', () => {
    // The same 33 missions of 17856s, listed as one group and as two. A judge
    // whose verdict depends on the caller's grouping is reading the wrong thing.
    const merged = packFeasible([1800, 2700, 17856, 107136, 214272], [1, 920, 33, 4, 3], CAPACITY, SLOTS);
    expect(merged).toBe(packFeasible(DURATIONS, COUNTS, CAPACITY, SLOTS));
    expect(merged).toBe('packs');
  });
});

// The third plan a real sweep could not decide, and the case the exhaustive
// search structurally cannot help with.
//
// arena:3038, verbatim from the sweep: 1165 missions filling 3887928s of a
// 3888000s horizon (3 slots of 1296000s) — 99.998% full, 72s of slack in the
// whole plan. Unlike arena:2025 this is not a duration-ordering problem: at
// this little slack the residual-volume bound prunes almost nothing at any
// level, so the exact search has to enumerate its way to the one near-exact
// partition and burns the whole default budget doing it, coming back
// `undecided`. The fix is the completion heuristic in `pack-feasibility.ts`:
// best-fit-decreasing on the flattened missions finds a witness in one pass.
describe('the near-exact plan the search alone cannot decide in budget', () => {
  // Verbatim from the sweep's allocation, duplicate-free this time but not
  // tidied otherwise.
  const DURATIONS = [1800, 5400, 37584, 150336, 300672];
  const COUNTS = [839, 322, 1, 2, 1];
  const CAPACITY = 1296000;

  it('packs, well inside the node budget', () => {
    expect(packFeasible(DURATIONS, COUNTS, CAPACITY, SLOTS)).toBe('packs');
    // Two orders of magnitude below the default: the heuristic witnesses this
    // in about as many node-charges as there are missions (1165), so a budget
    // this size is margin, not a fixture tuned to just clear the bar. Before
    // the fix this instance was `undecided` at the full default budget.
    expect(packFeasible(DURATIONS, COUNTS, CAPACITY, SLOTS, 2_000)).toBe('packs');
  });

  // No "one mission too many" case here either, for the same reason as
  // arena:2025: at 72s of slack, adding any listed mission overshoots
  // `slots * capacity` and the volume bound alone returns `infeasible`
  // without exercising the fix. See the differential family below for
  // coverage of near-exact instances that are genuinely infeasible.
});

// The shortcut that makes the above tractable: n identical missions of length d
// fit the room left over exactly when sum_k floor(room_k / d) >= n. That is
// exact rather than a bound, because identical items are interchangeable and
// each slot's count is independent — so it has to be right in BOTH directions.
// These two families pin both, over instances the volume bound cannot see.
describe('per-slot integrality, where the volume bound is blind', () => {
  it('rules out one mission more than the slots can hold, and admits exactly that many', () => {
    let checked = 0;
    const wrong: string[] = [];
    for (let capacity = 3; capacity <= 120; capacity++) {
      for (let d = 1; d <= capacity; d++) {
        const fits = SLOTS * Math.floor(capacity / d);
        // Only cases the volume bound would NOT catch: otherwise this tests a
        // prefilter rather than the decision.
        if ((fits + 1) * d > SLOTS * capacity) continue;
        checked++;
        const over = packFeasible([d], [fits + 1], capacity, SLOTS);
        if (over !== 'infeasible') wrong.push(`cap=${capacity} d=${d} n=${fits + 1} -> ${over}`);
        const exact = packFeasible([d], [fits], capacity, SLOTS);
        if (exact !== 'packs') wrong.push(`cap=${capacity} d=${d} n=${fits} -> ${exact}`);
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  it('measures the room actually left after a larger mission, not the whole horizon', () => {
    let checked = 0;
    const wrong: string[] = [];
    for (let capacity = 10; capacity <= 120; capacity += 3) {
      for (let big = Math.ceil(capacity / 2); big <= capacity; big += 7) {
        for (let d = 1; d <= Math.floor(capacity / 2); d++) {
          const room = [capacity - big, capacity, capacity];
          const fits = room.reduce((a, r) => a + Math.floor(r / d), 0);
          if (big + (fits + 1) * d > SLOTS * capacity) continue;
          checked++;
          const over = packFeasible([big, d], [1, fits + 1], capacity, SLOTS);
          if (over !== 'infeasible') wrong.push(`cap=${capacity} big=${big} d=${d} n=${fits + 1} -> ${over}`);
          const exact = packFeasible([big, d], [1, fits], capacity, SLOTS);
          if (exact !== 'packs') wrong.push(`cap=${capacity} big=${big} d=${d} n=${fits} -> ${exact}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(wrong.slice(0, 10)).toEqual([]);
  });
});

// Differential against the definition, on instances every cheap prefilter lets
// through and which are at least 80% full — so the verdict comes from the search
// rather than from the volume or half-capacity bounds.
describe('agrees with brute force on tight instances', () => {
  it('matches on 20k multisets that survive every prefilter', () => {
    let a = 777;
    const rnd = () => {
      a = (a * 1103515245 + 12345) & 0x7fffffff;
      return a / 0x7fffffff;
    };
    const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

    let tested = 0;
    let infeasible = 0;
    let undecided = 0;
    const wrong: string[] = [];
    for (let attempts = 0; attempts < 2_000_000 && tested < 20_000; attempts++) {
      const durations: number[] = [];
      const counts: number[] = [];
      for (let j = 0, D = ri(1, 4); j < D; j++) {
        durations.push(rnd() < 0.5 ? ri(1, 9) : ri(1, 9) + Math.round(rnd() * 4) / 4);
        counts.push(ri(1, 7));
      }
      const capacity = ri(3, 14);

      let total = 0;
      let oversized = 0;
      let tooLong = false;
      for (let j = 0; j < durations.length; j++) {
        if (durations[j] > capacity + 1e-9) tooLong = true;
        total += counts[j] * durations[j];
        if (durations[j] > capacity / 2 + 1e-9) oversized += counts[j];
      }
      if (tooLong || oversized > SLOTS || total > SLOTS * capacity + 1e-9) continue;
      if (total < 0.8 * SLOTS * capacity) continue;

      tested++;
      const got = packFeasible(durations, counts, capacity, SLOTS, 1_000_000);
      if (got === 'undecided') {
        undecided++;
        continue;
      }
      const want = brutePacks(durations, counts, capacity, SLOTS);
      if ((got === 'packs') !== want) {
        wrong.push(`d=${JSON.stringify(durations)} c=${JSON.stringify(counts)} cap=${capacity} got=${got}`);
      }
      if (got === 'infeasible') infeasible++;
    }

    expect(tested).toBe(20_000);
    // Both verdicts have to be well represented, or agreement is cheap: a packer
    // that always said `packs` would match a sample that was never infeasible.
    expect(infeasible).toBeGreaterThan(1000);
    expect(undecided).toBe(0);
    expect(wrong.slice(0, 10)).toEqual([]);
  }, 120_000);
});

// The differential above samples durations and counts independently, which
// rarely lands on the near-exact regime (arena:3038 is 99.998% full) — a
// random multiset that happens to be 80%+ full is usually not *close* to the
// horizon the way a real near-full plan is. This family builds instances the
// other way around: start from an actual packing (so feasibility is known by
// construction, not by inspection of a hand-picked fixture — the mistake this
// file's history already made once, where a fixture asserted infeasible
// actually packed) and then perturb toward infeasible by merging two items
// from different slots into one. The merge keeps total volume unchanged, so
// the volume bound alone cannot decide the perturbed instance either way;
// whether it is actually infeasible is decided by brute force below, not
// assumed by the perturbation.
describe('agrees with brute force on near-exact instances built from a known packing', () => {
  it('matches on 5k near-exact multisets, feasible by construction and perturbed toward infeasible', () => {
    let a = 424242;
    const rnd = () => {
      a = (a * 1103515245 + 12345) & 0x7fffffff;
      return a / 0x7fffffff;
    };
    const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

    let tested = 0;
    let infeasible = 0;
    let undecided = 0;
    let perturbedInfeasible = 0;
    const wrong: string[] = [];

    for (let attempts = 0; attempts < 200_000 && tested < 5_000; attempts++) {
      const capacity = ri(20, 80);
      // Give each slot a target load within a small slack of `capacity`, then
      // split that target into 1-4 positive pieces. The split is itself a
      // witness packing, so the unperturbed multiset below is feasible by
      // construction.
      const slack = ri(0, 3);
      const slotItems: number[][] = [];
      for (let s = 0; s < SLOTS; s++) {
        const target = capacity - ri(0, slack);
        const pieceCount = ri(1, 4);
        const pieces: number[] = [];
        let left = target;
        for (let p = 0; p < pieceCount - 1; p++) {
          const piece = left <= 0 ? 0 : ri(0, Math.floor(left / 2));
          pieces.push(piece);
          left -= piece;
        }
        pieces.push(Math.max(0, left));
        slotItems.push(pieces.filter(x => x > 0));
      }

      let items = slotItems[0].concat(slotItems[1], slotItems[2]);
      let perturbed = false;
      // Perturb toward infeasible about half the time: merge one item from
      // slot 0's pieces with one from slot 1's into a single atomic mission.
      // The merged item now has to fit one slot on its own — exactly the
      // shape the per-slot integrality shortcut and the residual-volume bound
      // have to get right together, and the case the search alone struggles
      // with at high fill.
      if (rnd() < 0.5 && slotItems[0].length > 0 && slotItems[1].length > 0) {
        const i0 = ri(0, slotItems[0].length - 1);
        const i1 = ri(0, slotItems[1].length - 1);
        const merged = slotItems[0][i0] + slotItems[1][i1];
        items = slotItems[0]
          .filter((_, i) => i !== i0)
          .concat(slotItems[1].filter((_, i) => i !== i1), slotItems[2], [merged]);
        perturbed = true;
      }

      if (items.length === 0 || items.length > 14) continue; // keep brute force cheap
      if (items.some(d => d > capacity + 1e-9)) continue; // a lone oversized item is by-inspection, not search

      const byDuration = new Map<number, number>();
      for (const d of items) byDuration.set(d, (byDuration.get(d) ?? 0) + 1);
      const durations = [...byDuration.keys()];
      const counts = durations.map(d => byDuration.get(d)!);

      const total = items.reduce((sum, d) => sum + d, 0);
      if (total > SLOTS * capacity + 1e-9) continue; // volume bound alone decides; not the point of this family
      if (total < 0.9 * SLOTS * capacity) continue; // stay in the near-exact regime

      tested++;
      const got = packFeasible(durations, counts, capacity, SLOTS, 1_000_000);
      if (got === 'undecided') {
        undecided++;
        continue;
      }
      const want = brutePacks(durations, counts, capacity, SLOTS);
      if ((got === 'packs') !== want) {
        wrong.push(
          `perturbed=${perturbed} d=${JSON.stringify(durations)} c=${JSON.stringify(counts)} cap=${capacity} got=${got} want=${want}`
        );
      }
      if (got === 'infeasible') {
        infeasible++;
        if (perturbed) perturbedInfeasible++;
      }
    }

    expect(tested).toBeGreaterThan(1000);
    // The merge has to actually land on infeasible sometimes, or the perturbed
    // half of this family is exercising nothing.
    expect(perturbedInfeasible).toBeGreaterThan(20);
    expect(undecided).toBe(0);
    expect(wrong.slice(0, 10)).toEqual([]);
  }, 60_000);
});
