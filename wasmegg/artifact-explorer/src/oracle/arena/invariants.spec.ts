// Arena runner.
//
//   pnpm arena                          smoke: 4 instances, whole roster
//   ARENA=sweep pnpm arena              40 instances, cheap checks
//   ARENA=deep pnpm arena               + D1/D2 local optimality
//   SOLVER=highs ARENA=sweep pnpm arena
//   ARENA_INSTANCES=80 ARENA_SEED_BASE=9000 ARENA=sweep pnpm arena
//
// Gating. C0-contract, C1-feasibility and C1-inconclusive hard-fail: a solver
// that returns a wrong-shaped or infeasible plan is broken outright, and that is
// not a matter of degree. A plan the harness's own packer cannot decide within
// its node budget gates too — the budget exists to make that not happen, so
// hitting it means the goalpost moved rather than that the plan is fine. It
// carries a separate id only so the scorecard can tell the two apart; see
// `checkC1Feasibility`. Everything else is reported, because the arena exists to measure
// how close candidates get, and a suite that goes red for every entry measures
// nothing. `ARENA_GATE=all` promotes the rest to failures once a candidate is
// good enough to hold them.
//
// Opt-in, via `ARENA`. Every tier here is minutes at best — the smoke tier alone
// is 12 minutes on the development container, and the `it` below carries an
// hour-long timeout to let a sweep finish. `pnpm test` is the suite people run
// before a commit, so this file stays out of it unless asked for by name, the
// same way `RUN_ORACLE=1` gates the deep oracle campaign. `pnpm arena` sets the
// variable; the independence guard (`independence.spec.ts`) is static and fast,
// so it keeps running in the default suite.

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { CHEAP_CHECKS, DEEP_CHECKS, type Check } from './invariants';
import { selectedSolvers } from './registry';
import { describeInstance, generateInstance } from './instances';
import { formatComparison, formatScorecard, sweep, writeResults, type SweepResult } from './scorecard';

const REQUESTED = process.env.ARENA !== undefined;
const MODE = process.env.ARENA || 'smoke';
const DEEP = MODE === 'deep';
// Validated rather than coerced: `Number('x')` is NaN, `Array.from({length: NaN})`
// is empty, and a sweep over zero instances asserts nothing while reporting a
// clean run. A typo in the environment must fail loudly, not silently pass —
// which is why `min` exists rather than one shared "non-negative" rule: `0` is a
// legal seed base and an illegal instance count, and rejecting NaN while letting
// `ARENA_INSTANCES=0` through leaves exactly the silent clean run this guard is
// here to prevent.
const intEnv = (name: string, fallback: number, min: number): number => {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) {
    throw new Error(`${name} must be an integer >= ${min}, got ${JSON.stringify(raw)}`);
  }
  return n;
};

const COUNT = intEnv('ARENA_INSTANCES', MODE === 'smoke' ? 4 : 40, 1);
const SEED_BASE = intEnv('ARENA_SEED_BASE', 2000, 0);
const GATE_ALL = process.env.ARENA_GATE === 'all';
const RESULT_DIR = resolve(__dirname, 'results');

// Non-negotiable: the plan has to be a plan, and the judge has to be able to say so.
const HARD_FAIL = new Set(['C0-contract', 'C1-feasibility', 'C1-inconclusive']);

const seeds = Array.from({ length: COUNT }, (_, i) => SEED_BASE + i);
const checks: Check[] = DEEP ? [...CHEAP_CHECKS, ...DEEP_CHECKS] : CHEAP_CHECKS;

describe.skipIf(!REQUESTED)(`arena (${MODE}, ${COUNT} instances)`, () => {
  const solvers = selectedSolvers();
  const results: SweepResult[] = [];

  for (const solver of solvers) {
    it(`${solver.id} holds the invariants`, () => {
      const r = sweep(solver, seeds, checks, inst => {
        if (inst.violations.length > 0) {
          console.log(`  ${describeInstance(generateInstance(inst.seed))} -> ${inst.violations.length} violation(s)`);
          for (const v of inst.violations.slice(0, 6)) {
            console.log(`      ${v.invariant}  ${v.detail}`);
          }
          if (inst.violations.length > 6) {
            console.log(`      ... and ${inst.violations.length - 6} more`);
          }
        }
      });
      results.push(r);
      console.log(formatScorecard(r));
      console.log(`    results written to ${writeResults(RESULT_DIR, r)}`);

      const failing = r.instances
        .flatMap(i => i.violations)
        .filter(v => GATE_ALL || HARD_FAIL.has(v.invariant) || v.invariant.endsWith('-threw'));
      expect(failing.map(v => `${v.invariant} ${v.instance}: ${v.detail}`)).toEqual([]);
    }, 3_600_000);
  }

  it('reports head-to-head plan quality', () => {
    if (results.length < 2) {
      console.log('\n(only one solver ran; nothing to compare)');
      return;
    }
    for (let i = 1; i < results.length; i++) {
      console.log(formatComparison(results[0], results[i]));
    }
  });
});
