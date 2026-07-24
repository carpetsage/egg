// Reproduction tool for oracle findings. Not part of any test tier: it only
// runs when ORACLE_REPRO is set, and exists to dump the EXACT optimizeFull
// inputs behind a finding (the generated option subset, budgets, and owned
// inventory) plus the solver's plan and the oracle's plan.
//
//   ORACLE_REPRO=random-single:1234 pnpm repro
//
// Note: a finding is defined by these inputs, not by the target/budget
// alone. The production UI enumerates a full option pool from the player's
// own config, so running the same target in the UI is a different problem
// instance and will legitimately produce a different plan.

import { describe, test } from 'vitest';
import { optimizeFull } from '../lib/optimizer-core';
import { bruteForceBest } from './enumerate';
import { evaluateAllocation, OracleInstance } from './evaluate';
import { FAMILIES, Family, generateInstance } from './generate';

const SPEC = process.env.ORACLE_REPRO ?? '';
const SHIPS_PER_BATCH = 3; // verified by the probe in optimizer-oracle.spec.ts

function fmtAlloc(inst: OracleInstance, alloc: number[]): string {
  const parts: string[] = [];
  alloc.forEach((k, i) => {
    if (k > 0) {
      parts.push(`${k} batches of ${inst.options[i].id}`);
    }
  });
  return parts.length ? parts.join(', ') : '(launch nothing)';
}

describe.skipIf(!SPEC)('oracle repro', () => {
  test(`repro ${SPEC}`, () => {
    const [family, seedStr] = SPEC.split(':');
    if (!FAMILIES.includes(family as Family) || !/^\d+$/.test(seedStr ?? '')) {
      throw new Error(`ORACLE_REPRO must be <family>:<seed>, e.g. random-single:1234`);
    }
    const inst = generateInstance(family as Family, Number(seedStr));
    if (!inst) {
      throw new Error(`${SPEC} generates no instance (rejected as oversized or decision-free)`);
    }

    console.log(`\n=== instance ${SPEC} ===`);
    console.log(`targets: ${inst.targets.join(', ')}`);
    console.log(`fuelCapacity: ${inst.fuelCapacity}`);
    console.log(`timeCapacity: ${inst.timeCapacity} s`);
    console.log(`baseYield: ${JSON.stringify([...inst.baseYield])}`);
    console.log('options (the ONLY missions the solver was offered):');
    for (const o of inst.options) {
      console.log(
        `  ${o.id}: fuel/batch=${o.actualFuel}, time/batch=${o.actualTime}s, ` +
          `yield=${JSON.stringify([...o.yieldVector])}, legendary=${JSON.stringify([...o.legendaryYieldVector])}`
      );
    }

    const sol = optimizeFull({
      options: inst.options,
      recipeDag: inst.dag,
      desiredArtifactNodeIds: inst.targets,
      fuelCapacity: inst.fuelCapacity,
      timeCapacity: inst.timeCapacity,
      baseYield: inst.baseYield,
    });
    const alloc = new Array<number>(inst.options.length).fill(0);
    for (const h of sol.choiceHistory) {
      const i = inst.options.findIndex(
        o => o.actualFuel === h.actualFuel && o.actualTime === h.actualTime && o.targetAfxId === h.targetAfxId
      );
      if (i === -1) {
        throw new Error(
          `choiceHistory entry (fuel=${h.actualFuel}, time=${h.actualTime}, target=${h.targetAfxId}) matches no input option`
        );
      }
      const batches = h.numShipsLaunched / SHIPS_PER_BATCH;
      if (!Number.isInteger(batches) || batches < 0) {
        throw new Error(`ship count ${h.numShipsLaunched} is not a whole number of ${SHIPS_PER_BATCH}-ship batches`);
      }
      alloc[i] += batches;
    }
    const planEval = evaluateAllocation(inst, alloc);
    const fuelUsed = alloc.reduce((t, k, i) => t + k * inst.options[i].actualFuel, 0);
    const timeUsed = alloc.reduce((t, k, i) => t + k * inst.options[i].actualTime, 0);

    console.log(`\nsolver plan: ${fmtAlloc(inst, alloc)}`);
    console.log(`  reported bestProbability: ${sol.bestProbability}`);
    console.log(`  independent evaluation:   ${planEval.probability}`);
    console.log(
      `  uses fuel ${fuelUsed}/${inst.fuelCapacity} (${((100 * fuelUsed) / Math.max(1, inst.fuelCapacity)).toFixed(1)}%), ` +
        `time ${timeUsed}/${inst.timeCapacity} (${((100 * timeUsed) / Math.max(1, inst.timeCapacity)).toFixed(1)}%)`
    );

    const oracle = bruteForceBest(inst);
    console.log(`\noracle plan: ${fmtAlloc(inst, oracle.bestAllocation)}`);
    console.log(`  probability: ${oracle.bestProbability}`);
    console.log(`  gap vs solver plan: ${(oracle.bestProbability - planEval.probability).toExponential(3)}`);
    console.log(`  (negative gap means the solver plan is infeasible and priced on overspent budget)`);
  }, 300_000);
});
