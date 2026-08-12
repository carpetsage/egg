// Sweep driver and reporting.
//
// Two things get measured per solver, and they are not the same thing:
//
//   correctness  -- invariant violations, which need no reference answer
//   quality      -- the judged joint probability of the plan it returns on the
//                   unperturbed instance, which is only meaningful relative to
//                   another solver on the same instance
//
// Quality is reported in log10, because the values span 1e-1 to 1e-19 and an
// arithmetic mean of those is just the largest one.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { ArenaSolver } from './contract';
import { run } from './harness';
import { generateInstance, describeInstance, type ArenaInstance } from './instances';
import { runChecks, type Check, type Violation } from './invariants';

export interface InstanceResult {
  seed: number;
  label: string;
  targets: number;
  options: number;
  // Judged joint probability of the plan on the unperturbed instance.
  joint: number;
  // Wall clock of the single unperturbed solve, not of the whole check set.
  solveMs: number;
  checkMs: number;
  violations: Violation[];
}

export interface SweepResult {
  solverId: string;
  description: string;
  instances: InstanceResult[];
  totalMs: number;
}

export function sweep(
  solver: ArenaSolver,
  seeds: number[],
  checks: Check[],
  onInstance?: (r: InstanceResult) => void
): SweepResult {
  const instances: InstanceResult[] = [];
  const started = Date.now();
  for (const seed of seeds) {
    const inst = generateInstance(seed);
    let solved;
    try {
      solved = run(solver.plan, inst);
    } catch (err) {
      instances.push({
        seed,
        label: inst.label,
        targets: inst.targets.length,
        options: 0,
        joint: 0,
        solveMs: 0,
        checkMs: 0,
        violations: [
          {
            invariant: 'C0-contract',
            instance: inst.label,
            detail: `solver threw: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      });
      continue;
    }
    const t0 = Date.now();
    const violations = runChecks(solver.plan, inst, checks);
    const r: InstanceResult = {
      seed,
      label: inst.label,
      targets: inst.targets.length,
      options: solved.problem.options.length,
      joint: solved.joint,
      solveMs: solved.elapsedMs,
      checkMs: Date.now() - t0,
      violations,
    };
    instances.push(r);
    onInstance?.(r);
  }
  return { solverId: solver.id, description: solver.description, instances, totalMs: Date.now() - started };
}

// ---------------------------------------------------------------------------
// Reporting

const log10 = (p: number) => (p > 0 ? Math.log10(p) : -Infinity);

export interface InvariantTally {
  invariant: string;
  count: number;
  instances: number;
  // Largest finite magnitude seen, signed. Infinite gaps are counted
  // separately rather than folded in here: "this plan scores zero where a
  // strictly more constrained one scored something" is a different kind of
  // failure from "this plan is 1.1 nats worse", and averaging them together
  // would let one collapse hide every measurable regression behind it.
  worstNats: number;
  collapses: number; // a positive probability became exactly 0
  rescues: number; // exactly 0 became a positive probability
}

export function tally(r: SweepResult): InvariantTally[] {
  const byId = new Map<string, InvariantTally>();
  for (const inst of r.instances) {
    const seen = new Set<string>();
    for (const v of inst.violations) {
      const t = byId.get(v.invariant) ?? {
        invariant: v.invariant,
        count: 0,
        instances: 0,
        worstNats: 0,
        collapses: 0,
        rescues: 0,
      };
      t.count++;
      if (!seen.has(v.invariant)) {
        t.instances++;
        seen.add(v.invariant);
      }
      if (v.nats !== undefined) {
        if (v.nats === -Infinity) t.collapses++;
        else if (v.nats === Infinity) t.rescues++;
        else if (Number.isFinite(v.nats) && Math.abs(v.nats) > Math.abs(t.worstNats)) {
          t.worstNats = v.nats;
        }
      }
      byId.set(v.invariant, t);
    }
  }
  return [...byId.values()].sort((a, b) => b.count - a.count);
}

function pad(s: string | number, n: number, right = false): string {
  const str = String(s);
  return right ? str.padStart(n) : str.padEnd(n);
}

export function formatScorecard(r: SweepResult): string {
  const lines: string[] = [];
  const total = r.instances.reduce((a, i) => a + i.violations.length, 0);
  const clean = r.instances.filter(i => i.violations.length === 0).length;

  lines.push('');
  lines.push(`=== ${r.solverId} ===`);
  lines.push(`    ${r.description}`);
  lines.push(
    `    ${r.instances.length} instances, ${(r.totalMs / 1000).toFixed(1)}s total, ` +
      `${total} violation(s), ${clean}/${r.instances.length} instances clean`
  );

  const t = tally(r);
  if (t.length === 0) {
    lines.push('    no violations');
  } else {
    lines.push('');
    lines.push(
      `    ${pad('invariant', 22)}${pad('count', 7, true)}${pad('instances', 11, true)}${pad('worst finite', 16, true)}${pad('to/from zero', 16, true)}`
    );
    for (const row of t) {
      const worst = row.worstNats === 0 ? '-' : `${row.worstNats.toFixed(4)} nats`;
      // `p->0` is the plan collapsing to zero probability where a strictly
      // easier instance did not; `0->p` is the reverse, a harder instance
      // finding something the easier one missed entirely.
      const zeros =
        row.collapses === 0 && row.rescues === 0
          ? '-'
          : [row.collapses > 0 ? `${row.collapses}x p->0` : '', row.rescues > 0 ? `${row.rescues}x 0->p` : '']
              .filter(Boolean)
              .join(' ');
      lines.push(
        `    ${pad(row.invariant, 22)}${pad(row.count, 7, true)}${pad(row.instances, 11, true)}${pad(worst, 16, true)}${pad(zeros, 16, true)}`
      );
    }
  }

  const solveTimes = r.instances.map(i => i.solveMs).sort((a, b) => a - b);
  if (solveTimes.length > 0) {
    const q = (f: number) => solveTimes[Math.min(solveTimes.length - 1, Math.floor(f * solveTimes.length))];
    lines.push('');
    lines.push(
      `    solve latency: median ${q(0.5).toFixed(0)}ms, p90 ${q(0.9).toFixed(0)}ms, max ${solveTimes[solveTimes.length - 1].toFixed(0)}ms`
    );
  }

  const finite = r.instances.filter(i => i.joint > 0);
  const zero = r.instances.length - finite.length;
  if (finite.length > 0) {
    const meanLog = finite.reduce((a, i) => a + log10(i.joint), 0) / finite.length;
    lines.push(
      `    quality: mean log10(joint) ${meanLog.toFixed(3)} over ${finite.length} scoring instance(s)` +
        (zero > 0 ? `, ${zero} at exactly 0` : '')
    );
  }
  return lines.join('\n');
}

// Head-to-head on the unperturbed instance. Positive log10 delta means `b`
// found a better plan than `a` on that instance.
export function formatComparison(a: SweepResult, b: SweepResult): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(`=== ${b.solverId} vs ${a.solverId} (plan quality on the unperturbed instance) ===`);
  lines.push('');
  // Solver ids are free-form, so size the value columns to whichever is wider.
  const w = Math.max(16, a.solverId.length + 2, b.solverId.length + 2);
  lines.push(
    `    ${pad('instance', 12)}${pad('T', 4, true)}${pad('opts', 7, true)}${pad(a.solverId, w, true)}${pad(b.solverId, w, true)}${pad('delta log10', 14, true)}`
  );

  const bySeed = new Map(a.instances.map(i => [i.seed, i]));
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let sumDelta = 0;
  let counted = 0;
  for (const ib of b.instances) {
    const ia = bySeed.get(ib.seed);
    if (!ia) continue;
    const la = log10(ia.joint);
    const lb = log10(ib.joint);
    let delta: string;
    if (!Number.isFinite(la) && !Number.isFinite(lb)) {
      delta = 'both 0';
      ties++;
    } else if (!Number.isFinite(la)) {
      delta = '+inf';
      wins++;
    } else if (!Number.isFinite(lb)) {
      delta = '-inf';
      losses++;
    } else {
      const d = lb - la;
      delta = d.toFixed(4);
      sumDelta += d;
      counted++;
      if (d > 1e-9) wins++;
      else if (d < -1e-9) losses++;
      else ties++;
    }
    lines.push(
      `    ${pad(ib.label, 12)}${pad(ib.targets, 4, true)}${pad(ib.options, 7, true)}` +
        `${pad(ia.joint.toExponential(3), w, true)}${pad(ib.joint.toExponential(3), w, true)}${pad(delta, 14, true)}`
    );
  }
  lines.push('');
  lines.push(
    `    ${b.solverId} better on ${wins}, worse on ${losses}, tied on ${ties}` +
      (counted > 0 ? `; mean delta ${(sumDelta / counted).toFixed(4)} log10 over ${counted} comparable instance(s)` : '')
  );
  return lines.join('\n');
}

export function writeResults(dir: string, r: SweepResult): string {
  const path = resolve(dir, `${r.solverId}.json`);
  mkdirSync(dirname(path), { recursive: true });
  // JSON has no infinity, and `JSON.stringify` silently writes `null` for one.
  // A `p->0` collapse is the most severe violation the harness reports, so
  // losing it on the way to disk would be exactly the wrong thing to drop.
  writeFileSync(
    path,
    JSON.stringify(r, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 2)
  );
  return path;
}

export { describeInstance, generateInstance, type ArenaInstance };
