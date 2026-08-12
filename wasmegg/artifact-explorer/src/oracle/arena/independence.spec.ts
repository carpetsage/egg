// The arena is only worth running if the harness and the candidates cannot see
// each other. That is a property of the import graph, so it is asserted here
// rather than left to review.
//
// Three directions, and they fail for different reasons:
//
//   harness -> solver   would mean the harness is testing one specific
//                       implementation again, which is the thing this branch
//                       exists to undo
//   solver -> judge     would let a candidate read or tune against the scoring
//                       code and the feasibility rule it is being graded by
//   src/lib -> arena    would make the shipped app depend on its own test
//                       harness, which is how the planner ended up living under
//                       `src/oracle/` in the first place
//
// Specifiers are resolved to real files rather than substring-matched, so a
// renamed module cannot quietly fall out of the guard, and an entry naming a
// module that no longer exists fails loudly instead of matching nothing.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ARENA = __dirname;
const SRC = resolve(ARENA, '../..');
const LIB = join(SRC, 'lib');
const ORACLE = join(SRC, 'oracle');
const SOLVERS = join(ARENA, 'solvers');

function readSource(rel: string): string {
  return readFileSync(resolve(ARENA, rel), 'utf8');
}

function importsOf(source: string): string[] {
  const out: string[] = [];
  const re = /(?:^|\n)\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  const bare = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
  while ((m = bare.exec(source)) !== null) out.push(m[1]);
  // A dynamic import and a re-export move the same bindings a static import
  // does. This file itself reaches `./registry` through the first form, so a
  // candidate could reach the judge the same way and leave the guard green.
  const dynamic = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynamic.exec(source)) !== null) out.push(m[1]);
  const reexport = /(?:^|\n)\s*export\s[^;]*?from\s+['"]([^'"]+)['"]/g;
  while ((m = reexport.exec(source)) !== null) out.push(m[1]);
  return out;
}

// Type-only imports move no code and cannot change behaviour, so they are not
// a coupling. This strips the two statement forms that are erased wholesale —
// `import type { X } from ...` and `export type { X } from ...`; the second is
// how `contract.ts` re-exports the plan types it no longer defines. An inline
// `import { type X }` is still reported as a value import, which errs towards
// flagging a coupling that is not one rather than missing one that is.
function valueImportsOf(source: string): string[] {
  const withoutTypeImports = source
    .replace(/(?:^|\n)\s*import\s+type\s[^;]*?;/g, '\n')
    .replace(/(?:^|\n)\s*export\s+type\s[^;]*?from\s+['"][^'"]+['"]\s*;/g, '\n');
  return importsOf(withoutTypeImports);
}

// Comments move no code either. Crude — a `//` inside a string literal takes
// the rest of the line with it — which for the one thing this is used for
// (looking for a solver id in executable code) can only over-strip, never
// under-strip.
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

// Resolve an import specifier the way the bundler does, to an absolute file
// under `src/`. Returns null for bare package specifiers (`lib`, `highs`,
// `vitest`), which are outside this app and outside this guard.
//
// Substring matching is what let the old list rot: `'/lp'` and `'lib/lp'` were
// two spellings of one module and `'optimizer.worker'` never appeared in any
// specifier at all, so both an alias and a typo scored the same — zero matches,
// silently.
function resolveSpec(fromFile: string, spec: string): string | null {
  const bare = spec.split('?')[0];
  let base: string;
  if (bare.startsWith('@/')) base = join(SRC, bare.slice(2));
  else if (bare.startsWith('./') || bare.startsWith('../')) base = resolve(dirname(fromFile), bare);
  else return null;
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts'), `${base}.vue`, `${base}.json`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function within(root: string, file: string): boolean {
  const rel = relative(root, file);
  return rel !== '' && !rel.startsWith('..') && !rel.startsWith(sep);
}

function libModules(): string[] {
  return walk(LIB)
    .filter(p => !p.endsWith('.spec.ts'))
    .map(p => relative(LIB, p).split(sep).join('/'))
    .sort();
}

// Files that make up the fixed part of the arena: the problem, the rules, the
// judge and the scoreboard.
const HARNESS_FILES = [
  'contract.ts',
  'harness.ts',
  'instances.ts',
  'invariants.ts',
  'pack-feasibility.ts',
  'scorecard.ts',
];

// Every module under `src/lib`, split in two. The split is exhaustive by test
// (`the src/lib classification is exhaustive` below), so adding a module to
// `src/lib` without deciding which side it falls on fails rather than defaulting
// to "allowed" — which is what the previous free-text list did.

// The planner and everything downstream of it. The harness must not run any of
// this: it is the thing being measured.
const IMPLEMENTATION = [
  'lp.ts', // the incumbent's LP
  'optimizer-client.ts', // worker-backed entry point to the planner
  'optimizer-core.ts', // the plan pipeline; calls the planner
  // Prices a finished plan, and derives the golden egg cap's per-craft prices
  // from the same curve. The cap is part of a problem statement, but the arena
  // states none with one, and everything else here reads a plan — so the module
  // sits downstream.
  'optimizer-cost.ts',
  'optimizer-tree.ts', // craft-tree assembly from a plan
  'optimizer-views.ts', // render models built from a plan
  'optimizer-worker-protocol.ts',
  'optimizer.worker.ts',
  'packing.ts', // the app's packer — the arena has its own, on purpose
  'solver/evaluator.ts', // objective evaluation; the judge is re-derived, not shared
  'solver/highs.ts',
  'solver/milp.ts',
  'solver/model.ts',
  'solver/oa.ts',
  'solver/simplex.ts',
  'solver/types.ts',
  'value-function.ts',
];

// Game data, problem construction and pure types. The harness needs these to
// state a problem at all — `buildRecipeDag` and `enumerateLaunchOptions` are
// what turn a generated instance into a `PlanProblem` — and none of them decide
// anything about a plan.
const PROBLEM_SURFACE = [
  'artifacts.ts',
  'filter.ts',
  'index.ts',
  'loot-json.ts',
  'loot.ts',
  'missions.ts',
  'phases.ts',
  'spec-helpers.ts',
  'tank-ids.ts',
  'types.ts',
];

// The entries allowed to import production code, because they *are* production
// code: each is a shim around `src/lib/solver/`, so the planner users run and
// the planner the harness measures are one module. `highs` enters it at the
// shipped tuning; a second entry may enter the same module at a different one,
// which is how a tuning gets A/B'd against the incumbent over the same
// instances and the same judge.
//
// The exception stays narrow in the two ways that matter. Only into
// `src/lib/solver/` — not the rest of `src/lib` — and only for a file that does
// no solving of its own, which `the shim entries are shims and nothing more`
// below enforces on every entry in this list. A candidate proposing a *method*
// rather than a tuning still re-derives its own machinery; being listed here is
// a statement that the file adds nothing to what already ships.
const SHIM_ENTRIES = [join(SOLVERS, 'highs', 'index.ts')];
const SHIMS_MAY_IMPORT = join(LIB, 'solver');

describe('arena independence', () => {
  it('the src/lib classification is exhaustive and has no dead entries', () => {
    // (a) nothing listed that does not exist, and (b) nothing existing that is
    // not listed. Together these are what keep the guard honest as `src/lib`
    // changes: a new module is a test failure until someone decides which side
    // of the line it is on.
    const classified = [...IMPLEMENTATION, ...PROBLEM_SURFACE].sort();
    expect(new Set(classified).size).toBe(classified.length);
    expect(classified).toEqual(libModules());
    // The planner specifically must be on the forbidden side, whatever else moves.
    expect(IMPLEMENTATION).toContain('optimizer-core.ts');
    expect(IMPLEMENTATION.filter(m => m.startsWith('solver/')).length).toBeGreaterThan(0);
  });

  it('the harness imports no solver implementation', () => {
    const forbidden = new Set(IMPLEMENTATION.map(m => join(LIB, m)));
    const offenders: string[] = [];
    for (const file of HARNESS_FILES) {
      const from = resolve(ARENA, file);
      for (const spec of valueImportsOf(readSource(file))) {
        const target = resolveSpec(from, spec);
        if (target !== null && forbidden.has(target)) offenders.push(`${file} imports ${spec}`);
        if (spec.includes('/solvers/') || spec.includes('./solvers') || spec.includes('registry')) {
          offenders.push(`${file} imports ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the harness names no solver', () => {
    // `registry.ts` is the only file allowed to know which candidates exist.
    //
    // Code only. A comment is allowed to cite `src/lib/solver/SPEC.md` as the
    // document an invariant was argued in — prose about where a rule came from
    // is not the harness branching on which candidate it is grading, which is
    // the thing this forbids.
    const offenders: string[] = [];
    for (const file of HARNESS_FILES) {
      const src = stripComments(readSource(file));
      if (/\bhighs\b/.test(src)) offenders.push(`${file} mentions a solver id`);
    }
    expect(offenders).toEqual([]);
  });

  it('no solver imports the judge, the feasibility rule or the checks', () => {
    const forbidden = ['evaluate', 'pack-feasibility', 'invariants', 'scorecard', 'harness', 'instances'];
    const offenders: string[] = [];
    for (const path of walk(SOLVERS)) {
      for (const spec of valueImportsOf(readFileSync(path, 'utf8'))) {
        if (forbidden.some(bad => spec.includes(bad))) {
          offenders.push(`${path.slice(ARENA.length + 1)} imports ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('candidates re-derive everything: no value import from src/lib', () => {
    // Types move no code, so `import type { LaunchOption } from ...` is fine
    // and is how a candidate reads the problem at all. What is excluded is
    // running any of the incumbent's machinery — its LP, its tangent grid, its
    // packer, its search. A candidate that called into those would be measuring
    // the incumbent's method wearing a different hat.
    //
    // A named list of exceptions, and it is the whole point of the current
    // arrangement rather than a hole in it: the files in `SHIM_ENTRIES` exist to
    // enter the *shipped* planner, so they reach into `src/lib/solver/`
    // deliberately. Everything else under `solvers/` — including any future
    // candidate, and including a shim's own reach outside `src/lib/solver/` —
    // is still forbidden.
    const offenders: string[] = [];
    for (const path of walk(SOLVERS)) {
      const rel = path.slice(SOLVERS.length + 1);
      for (const spec of valueImportsOf(readFileSync(path, 'utf8'))) {
        const target = resolveSpec(path, spec);
        if (target === null || !within(LIB, target)) continue;
        if (SHIM_ENTRIES.includes(path) && within(SHIMS_MAY_IMPORT, target)) continue;
        offenders.push(`${rel} imports ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the shim entries are shims and nothing more', () => {
    // The exception above is only safe while the files it exempts contain no
    // solving of their own — otherwise "the shipped planner" would quietly
    // become "the shipped planner plus whatever this file does on top", and the
    // arena would stop measuring what ships. A shim is an import list and a
    // registration; this pins that, on every exempted file rather than on the
    // first one, so adding an entry to the list cannot smuggle logic in with it.
    for (const entry of SHIM_ENTRIES) {
      expect(existsSync(entry), `${entry} is listed as a shim but does not exist`).toBe(true);
      const code = readFileSync(entry, 'utf8')
        .split('\n')
        .filter(line => !/^\s*(\/\/|$)/.test(line))
        .join('\n');
      expect(code.length, entry).toBeLessThan(700);
      expect(/\bfor\s*\(|\bwhile\s*\(|\bfunction\b/.test(code), entry).toBe(false);
      // It must go through the same entry points `optimizer-core.ts` does.
      expect(code, entry).toContain("from '@/lib/solver/oa'");
      expect(code, entry).toContain("from '@/lib/solver/highs'");
    }
  });

  it('production never imports the arena', () => {
    // The inversion this file exists to protect. `src/lib` is what ships; the
    // arena is a test harness that grades it. A production module importing
    // anything under `src/oracle/` — even a type — would make the shipped app a
    // dependent of its own test rig, which is exactly the state the solver's
    // move out of `solvers/highs/` corrected.
    //
    // Specs under `src/lib` are exempt: they are tests, and generating a problem
    // from `arena/instances` is a legitimate thing for one to do.
    const offenders: string[] = [];
    for (const path of walk(LIB)) {
      if (path.endsWith('.spec.ts')) continue;
      for (const spec of importsOf(readFileSync(path, 'utf8'))) {
        const target = resolveSpec(path, spec);
        if (target !== null && within(ORACLE, target)) {
          offenders.push(`${relative(SRC, path)} imports ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the feasibility rule stands alone', () => {
    // It is the goalpost for C1 and for every k-opt move, so it must not be
    // reachable from anything a candidate can change.
    expect(importsOf(readSource('pack-feasibility.ts'))).toEqual([]);
  });

  it('every registered solver has a distinct id', () => {
    // Imported lazily so this file stays runnable if a candidate fails to load.
    return import('./registry').then(({ SOLVERS: registered }) => {
      const ids = registered.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every(id => /^[a-z0-9-]+$/.test(id))).toBe(true);
    });
  });
});
