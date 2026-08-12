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
  const active: number[] = [];
  let totalLoad = 0;
  for (let j = 0; j < durations.length; j++) {
    const c = counts[j];
    if (!(c > 0)) continue;
    const d = durations[j];
    if (d <= 0) continue;
    if (d > capacity + EPS) return 'infeasible';
    totalLoad += c * d;
    active.push(j);
  }

  // Volume bound, then the half-capacity bound: two missions longer than half a
  // slot cannot share one, so more than `slots` of them cannot be placed.
  if (totalLoad > slots * capacity + EPS) return 'infeasible';
  let oversized = 0;
  for (const j of active) {
    if (durations[j] > capacity / 2 + EPS) oversized += counts[j];
  }
  if (oversized > slots) return 'infeasible';
  if (active.length === 0) return 'packs';

  // Longest first. Long missions have the fewest placements, so committing them
  // against empty slots is where the search prunes hardest.
  active.sort((a, b) => durations[b] - durations[a]);

  const seenInfeasible = new Set<string>();
  let nodes = 0;
  let exhausted = false;

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
    let residual = 0;
    for (let k = t; k < active.length; k++) residual += counts[active[k]] * durations[active[k]];
    let room = 0;
    for (const l of loads) room += capacity - l;
    if (residual > room + EPS) return false;

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
