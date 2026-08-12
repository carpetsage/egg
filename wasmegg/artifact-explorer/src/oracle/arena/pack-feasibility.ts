// Exact 3-slot packing feasibility, owned by the harness.
//
// `src/lib/packing.ts` already does this, and the harness deliberately does not
// use it. A candidate solver is allowed to replace anything under `src/lib`,
// including the packer; if the harness judged feasibility with the same code
// the candidate used to produce the plan, "is this plan feasible" would be
// asking the candidate to grade itself. This file is the fixed goalpost.
//
// It is a re-derivation, not a copy: the search here branches on how many
// missions of the current duration land in each slot (the same shape the
// problem has) and memoises on the canonical sorted load triple, but the
// pruning order, the budget accounting and the return contract are written
// against the definition below rather than against the other implementation.
//
// Definition: `counts[j]` missions each of length `durations[j]` are feasible
// iff they can be partitioned into `slots` groups whose summed length is at
// most `capacity` each.

const EPS = 1e-9;

export type PackVerdict = 'packs' | 'infeasible' | 'undecided';

export function packFeasible(
  durations: readonly number[],
  counts: readonly number[],
  capacity: number,
  slots: number,
  nodeBudget = 500_000
): PackVerdict {
  if (!(capacity > 0)) {
    // No horizon at all: only zero-length work fits.
    return durations.every((d, j) => !(counts[j] > 0) || d <= 0) ? 'packs' : 'infeasible';
  }

  // Split the input into what actually consumes slot load and what is decided
  // by inspection. Zero-length missions are free everywhere; anything longer
  // than a whole slot is fatal on its own.
  //
  // Equal durations are merged. The caller lists one group per *option*, and two
  // options routinely share a duration — arena:2025 arrives as 27 and 6 missions
  // of 17856s, listed apart. Missions of equal length are interchangeable, so
  // enumerating the two groups separately multiplies the search for nothing.
  const byDuration = new Map<number, number>();
  let totalLoad = 0;
  for (let j = 0; j < durations.length; j++) {
    const c = counts[j];
    if (!(c > 0)) continue;
    const d = durations[j];
    if (d <= 0) continue;
    if (d > capacity + EPS) return 'infeasible';
    totalLoad += c * d;
    byDuration.set(d, (byDuration.get(d) ?? 0) + c);
  }
  // Rebuilt as parallel arrays so the rest of the search keeps indexing by
  // group, exactly as it did when a group was an option.
  const active: number[] = [];
  const dur: number[] = [];
  const cnt: number[] = [];
  for (const [d, c] of byDuration) {
    active.push(dur.length);
    dur.push(d);
    cnt.push(c);
  }
  durations = dur;
  counts = cnt;

  // Volume bound, then the half-capacity bound: two missions longer than half a
  // slot cannot share one, so more than `slots` of them cannot be placed.
  if (totalLoad > slots * capacity + EPS) return 'infeasible';
  let oversized = 0;
  for (const j of active) {
    if (durations[j] > capacity / 2 + EPS) oversized += counts[j];
  }
  if (oversized > slots) return 'infeasible';
  if (active.length === 0) return 'packs';

  // Node budget shared between the completion heuristic below and the exact
  // search further down, so a caller-supplied `nodeBudget` genuinely bounds
  // total work rather than bounding the search while the heuristic runs for
  // free. `exhausted` is what the search checks at the end to distinguish
  // 'infeasible' from 'undecided'; the heuristic never sets a verdict off it
  // directly, since running out of budget mid-heuristic proves nothing about
  // the instance, only that this attempt at a witness was cut short.
  let nodes = 0;
  let exhausted = false;

  // Completion heuristic: try to witness 'packs' directly, before spending
  // any of the budget on search.
  //
  // Near-exact instances are exactly where the exhaustive search below
  // struggles: at 99.998% fill (arena:3038, 3887928s of 3888000s, 72s of
  // slack across the whole plan) the residual-volume bound prunes almost
  // nothing, so `place`/`fill` has to find the one near-exact partition by
  // enumeration and spends the entire node budget doing it. But near-exact is
  // also precisely the regime where a greedy fit tends to succeed: there is
  // almost no slack to misplace, so the handful of large missions and the
  // shape of the room they leave behind determine the outcome almost
  // uniquely, and a greedy placer finds the same shape a search would.
  //
  // A greedy completion that succeeds is a witness, not a heuristic verdict:
  // it produces actual slot loads that respect `capacity`, checked as they
  // are built, so 'packs' from this path is exactly as sound as 'packs' from
  // the exact search. Failure proves nothing — greedy can strand a later
  // item that a different placement order would have fit — so it always
  // falls through to the exact search unchanged.
  //
  // Grouped state (the `active`/`dur`/`cnt` arrays above) doesn't help a
  // greedy placer, since a group's whole count still has to land somewhere
  // eventually; this works on individual missions, flattened once and sorted
  // longest-first, matching the exact search's own longest-first rationale
  // (commit the least flexible items while slots are still empty).
  //
  // Charged against the shared node budget, one unit per mission placement
  // attempt, summed across every restart below — not O(1), since it scales
  // with mission count (arena:3038 is 1165 missions), but two orders of
  // magnitude cheaper per-item than a search node, and bounded by the same
  // budget a caller already sized for the search. On the budget-exhaustion
  // tests below (hand-built instances at nodeBudget=1) this charge matters:
  // it aborts the heuristic after one or two placements rather than quietly
  // solving a 7-mission instance for free, so `undecided` at a tiny budget
  // still means what the search's own accounting says it means.
  const items: number[] = [];
  for (const j of active) for (let k = 0; k < counts[j]; k++) items.push(durations[j]);

  const chargeNode = (): boolean => {
    if (exhausted) return false;
    if (++nodes > nodeBudget) {
      exhausted = true;
      return false;
    }
    return true;
  };

  // First/best-fit-decreasing: sorted longest-first, then either the first
  // slot with room (`bestFit` false) or the tightest-fitting slot (`bestFit`
  // true). `order` lets randomized restarts reuse the same placer on a
  // different item ordering.
  const greedyPack = (order: readonly number[], bestFit: boolean): boolean => {
    const loads = new Array<number>(slots).fill(0);
    for (const it of order) {
      if (!chargeNode()) return false;
      let choice = -1;
      let choiceRoom = Infinity;
      for (let s = 0; s < slots; s++) {
        const room = capacity - loads[s];
        if (room + EPS < it) continue;
        if (!bestFit) {
          choice = s;
          break;
        }
        if (room < choiceRoom) {
          choiceRoom = room;
          choice = s;
        }
      }
      if (choice < 0) return false;
      loads[choice] += it;
    }
    return true;
  };

  const descending = items.slice().sort((a, b) => b - a);
  if (greedyPack(descending, /* bestFit */ true)) return 'packs';
  if (exhausted) return 'undecided';
  if (greedyPack(descending, /* bestFit */ false)) return 'packs';
  if (exhausted) return 'undecided';

  // Randomized restarts: best-fit-decreasing is deterministic and can still
  // strand an item on an instance where a different tie-break would not.
  // Shuffling the placement order (not the item multiset — same items,
  // different order) gives best-fit other tie-breaks to try. Seeded and
  // fixed at three restarts so this is deterministic and its cost is
  // bounded, per the arena's reproducibility requirement.
  let seed = 0x2545f491;
  const nextRand = (): number => {
    // xorshift32; deterministic, no `Math.random`.
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed |= 0;
    return ((seed >>> 0) % 0x100000000) / 0x100000000;
  };
  for (let restart = 0; restart < 3; restart++) {
    const shuffled = descending.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const k = Math.floor(nextRand() * (i + 1));
      [shuffled[i], shuffled[k]] = [shuffled[k], shuffled[i]];
    }
    if (greedyPack(shuffled, /* bestFit */ true)) return 'packs';
    if (exhausted) return 'undecided';
  }

  // Longest first, except that the largest count is pinned last.
  //
  // Two orderings are wanted at once. Long missions have the fewest placements,
  // so committing them against empty slots is where the search prunes hardest;
  // and the last group is decided by arithmetic rather than enumerated (see
  // `place`), so the group whose count would cost the most to enumerate is the
  // one that belongs there.
  //
  // Sorting by duration alone gets the second only by luck — it holds when the
  // largest count is also the shortest duration, and arena:2025 is where that
  // luck runs out: 920 missions of 2700s alongside a single 1800s one, so
  // longest-first hands the arithmetic level to the count of 1 and makes `fill`
  // enumerate the 920. That instance is a packable plan the search could not
  // decide inside 500k nodes; with the largest count pinned last it is decided
  // immediately. Ties on count go to the shorter duration, which is the one that
  // divides the leftover room most finely.
  let last = 0;
  for (let j = 1; j < counts.length; j++) {
    if (counts[j] > counts[last] || (counts[j] === counts[last] && durations[j] < durations[last])) last = j;
  }
  active.sort((a, b) => (a === last ? 1 : b === last ? -1 : durations[b] - durations[a]));

  // Total length still unplaced at each level, for the residual volume bound.
  const remaining = new Array<number>(active.length + 1).fill(0);
  for (let t = active.length - 1; t >= 0; t--) {
    remaining[t] = remaining[t + 1] + counts[active[t]] * durations[active[t]];
  }

  // `nodes`/`exhausted` are declared above, shared with the completion
  // heuristic, so its work and the search's are charged against one budget.
  const seenInfeasible = new Set<string>();

  // `loads` is kept sorted ascending, which both breaks the slot-permutation
  // symmetry and makes the memo key canonical.
  const place = (t: number, loads: number[]): boolean => {
    if (t === active.length) return true;
    if (++nodes > nodeBudget) {
      exhausted = true;
      return false;
    }

    const j = active[t];
    const d = durations[j];

    // Residual volume bound: everything still unplaced, including this
    // duration, has to fit in the room that is left.
    let room = 0;
    for (const l of loads) room += capacity - l;
    if (remaining[t] > room + EPS) return false;

    // The last level is decided by arithmetic rather than by enumeration.
    //
    // `counts[j]` identical missions of length `d` fit the room left over
    // exactly when `sum_k floor(room_k / d) >= counts[j]`: identical missions
    // are interchangeable, and how many fit in one slot does not depend on what
    // went into the others. So this is exact, not a bound — it decides `packs`
    // and `infeasible` alike, and the volume bound above cannot see it, because
    // room that is not a whole multiple of `d` is room this duration cannot use.
    //
    // This is what makes real plans decidable. `fill` enumerates every
    // distribution of a duration's count across the slots, so its branching
    // factor is that count; a production plan of 901 missions with 544 sharing
    // one duration spent the entire node budget on that duration alone and came
    // back `undecided`, which C1 gates on exactly as it gates on `infeasible`.
    // The ordering above pins the largest count here, where it costs O(1).
    if (t === active.length - 1) {
      let fits = 0;
      for (const l of loads) fits += Math.floor((capacity - l + EPS) / d);
      return fits >= counts[j];
    }

    // Exact loads, not rounded ones. The memo records *infeasibility*, so two
    // distinct states sharing a key would report a packable plan as infeasible:
    // durations are mission seconds and routinely fractional, and [0, 1.075,
    // 2.15] and [0, 1, 2] are not the same state.
    const key = `${t}|${loads.join(',')}`;
    if (seenInfeasible.has(key)) return false;

    // Enumerate how many of this duration go into each slot. `fill` walks the
    // slots left to right; the last slot takes whatever is left over.
    const perSlot = new Array<number>(loads.length).fill(0);
    const fill = (s: number, left: number): boolean => {
      // Charged too, not just `place`. `fill` enumerates every distribution of
      // `counts[j]` across the slots before it recurses, which is the larger
      // half of the work; leaving it uncharged meant `nodeBudget` did not
      // actually bound the search.
      if (++nodes > nodeBudget) {
        exhausted = true;
        return false;
      }
      if (s === loads.length - 1) {
        if (loads[s] + left * d > capacity + EPS) return false;
        perSlot[s] = left;
        const next = loads.map((l, i) => l + perSlot[i] * d).sort((a, b) => a - b);
        const ok = place(t + 1, next);
        return exhausted ? false : ok;
      }
      const cap = Math.min(left, Math.floor((capacity - loads[s] + EPS) / d));
      // Descending: loading the emptiest slot heavily first tends to reach a
      // feasible completion sooner, and the whole search stops at the first one.
      for (let x = cap; x >= 0; x--) {
        perSlot[s] = x;
        if (fill(s + 1, left - x)) return true;
        if (exhausted) return false;
      }
      perSlot[s] = 0;
      return false;
    };

    if (fill(0, counts[j])) return true;
    if (exhausted) return false;

    seenInfeasible.add(key);
    return false;
  };

  const start = new Array<number>(slots).fill(0);
  const packs = place(0, start);
  if (exhausted) return 'undecided';
  return packs ? 'packs' : 'infeasible';
}
