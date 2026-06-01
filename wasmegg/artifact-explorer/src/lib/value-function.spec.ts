import { describe, it, expect } from 'vitest';
import { compileInnerLp, alphaToProb } from './value-function';
import type { RecipeDAG, DAGNode } from './types';

const PREC = 9;

// ── DAG construction helpers ─────────────────────────────────────────────────

function node(id: string, is_leaf: boolean, children: [string, number][] = [], pCraft = 0): DAGNode {
  return {
    id,
    is_leaf,
    children: children.map(([node_id, quantity]) => ({ node_id, quantity })),
    legendaryCraftProbability: pCraft,
  };
}

function dag(...nodes: DAGNode[]): RecipeDAG {
  return new Map(nodes.map(n => [n.id, n]));
}

// ── compileInnerLp + solve ───────────────────────────────────────────────────

describe('compileInnerLp + solve: alpha computation', () => {
  // VF-1/2: leaf root → trivial LP, alpha = inventory[root]
  it('VF-1: leaf root with inventory → alpha = inventory quantity', () => {
    const d = dag(node('A', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['A', 7]])).alpha).toBeCloseTo(7, PREC);
  });

  it('VF-2: leaf root, empty inventory → alpha=0', () => {
    const d = dag(node('A', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map()).alpha).toBeCloseTo(0, PREC);
  });

  // VF-3: empty desired list → trivial LP, alpha=0
  it('VF-3: empty desired_artifact_node_ids → alpha=0', () => {
    const d = dag(node('A', true));
    const lp = compileInnerLp(d, []);
    expect(lp.solve(new Map([['A', 10]])).alpha).toBeCloseTo(0, PREC);
  });

  // VF-4: linear chain A←B (qty=1)
  // constraint: 1·p_A ≤ inventory[B]  →  alpha = inventory[B]
  it('VF-4: linear chain A←B qty=1, inv={B:10} → alpha=10', () => {
    const d = dag(node('A', false, [['B', 1]]), node('B', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['B', 10]])).alpha).toBeCloseTo(10, PREC);
  });

  // VF-5: linear chain A←B qty=2 — LP relaxation is fractional
  // constraint: 2·p_A ≤ inventory[B]=5  →  alpha=2.5
  it('VF-5: A←B qty=2, inv={B:5} → alpha=2.5 (fractional LP relaxation)', () => {
    const d = dag(node('A', false, [['B', 2]]), node('B', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['B', 5]])).alpha).toBeCloseTo(2.5, PREC);
  });

  // VF-6: two-level chain A←B←C, each qty=1
  // constraints: p_A≤p_B, 1·p_B≤inventory[C]  →  alpha=inventory[C]
  it('VF-6: A←B←C chain qty=1 each, inv={C:8} → alpha=8', () => {
    const d = dag(node('A', false, [['B', 1]]), node('B', false, [['C', 1]]), node('C', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['C', 8]])).alpha).toBeCloseTo(8, PREC);
  });

  // VF-7: diamond dependency — the critical LP test
  // A←{B:1, C:1}; B←{D:1}; C←{D:1}; D is leaf
  //
  // LP constraints:
  //   p_A ≤ p_B          (B consumed by A)
  //   p_A ≤ p_C          (C consumed by A)
  //   p_B + p_C ≤ inv[D] (D shared between B and C)
  //
  // Symmetric optimum: p_A=p_B=p_C → 2·p_A ≤ inv[D] → alpha = inv[D]/2
  //
  // A naive tree recursion would see D=6 for B independently and D=6 for C
  // independently, compute alpha=6 — this test rejects that wrong answer.
  it('VF-7: diamond dependency inv={D:6} → alpha=3 (LP correct, tree-recursion wrong)', () => {
    const d = dag(
      node('A', false, [
        ['B', 1],
        ['C', 1],
      ]),
      node('B', false, [['D', 1]]),
      node('C', false, [['D', 1]]),
      node('D', true)
    );
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['D', 6]])).alpha).toBeCloseTo(3, PREC);
  });

  it('VF-8: diamond dependency inv={D:4} → alpha=2', () => {
    const d = dag(
      node('A', false, [
        ['B', 1],
        ['C', 1],
      ]),
      node('B', false, [['D', 1]]),
      node('C', false, [['D', 1]]),
      node('D', true)
    );
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['D', 4]])).alpha).toBeCloseTo(2, PREC);
  });

  // VF-9 encodes the additive interpretation: direct root drops add to
  // LP-crafted count rather than substituting for them. Characterization
  // test — change in formula will fire here.
  //
  // VF-9: direct root items in inventory add to crafted count
  // alpha = LP_obj (crafted from B) + inventory[A] (direct drops)
  it('VF-9: direct root inv + crafted: inv={B:3, A:2} → alpha=5', () => {
    const d = dag(node('A', false, [['B', 1]]), node('B', true));
    const lp = compileInnerLp(d, ['A']);
    expect(
      lp.solve(
        new Map([
          ['B', 3],
          ['A', 2],
        ])
      ).alpha
    ).toBeCloseTo(5, PREC);
  });

  // VF-9b: pure-drops case — LP yields 0 crafts (no B in inventory),
  // direct root drops should still produce alpha=4 under the additive rule.
  it('VF-9b: inv={A:4} with no B → alpha=4 (direct drops with zero crafting)', () => {
    const d = dag(node('A', false, [['B', 1]]), node('B', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['A', 4]])).alpha).toBeCloseTo(4, PREC);
  });

  // VF-10: zero-RHS constraint forces alpha=0
  it('VF-10: inv={B:0} → alpha=0', () => {
    const d = dag(node('A', false, [['B', 1]]), node('B', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['B', 0]])).alpha).toBeCloseTo(0, PREC);
  });

  // VF-11: shadow price on ingredient — for A←B chain, dual[B] = 1
  it('VF-11: linear chain shadow price duals[B]=1 (each extra B → alpha +1)', () => {
    const d = dag(node('A', false, [['B', 1]]), node('B', true));
    const lp = compileInnerLp(d, ['A']);
    const result = lp.solve(new Map([['B', 10]]));
    expect(result.duals.get('B')).toBeCloseTo(1, PREC);
  });

  // VF-12: diamond shadow price — D is split between B and C, dual[D]=0.5
  it('VF-12: diamond shadow price duals[D]=0.5 (D shared across 2 branches)', () => {
    const d = dag(
      node('A', false, [
        ['B', 1],
        ['C', 1],
      ]),
      node('B', false, [['D', 1]]),
      node('C', false, [['D', 1]]),
      node('D', true)
    );
    const lp = compileInnerLp(d, ['A']);
    const result = lp.solve(new Map([['D', 6]]));
    expect(result.duals.get('D')).toBeCloseTo(0.5, PREC);
  });

  // VF-13: solving one compiled LP repeatedly with different inventories must
  // return independent results. The shared bScratch buffer is fully overwritten
  // on each solve(), so call order must not leak state between evaluations — this
  // is the reuse path the outer search relies on millions of times.
  it('VF-13: repeated solve() calls on one compiled LP are independent', () => {
    const d = dag(node('A', false, [['B', 1]]), node('B', true));
    const lp = compileInnerLp(d, ['A']);
    const r1 = lp.solve(new Map([['B', 3]]));
    const r2 = lp.solve(new Map([['B', 7]]));
    expect(r1.alpha).toBeCloseTo(3, PREC);
    expect(r2.alpha).toBeCloseTo(7, PREC);
  });
});

// ── alphaToProb ──────────────────────────────────────────────────────────────

describe('alphaToProb: probability mapping', () => {
  function makedag(pCraft: number) {
    return dag(node('A', false, [], pCraft));
  }

  // AP-1: alpha=0 → no crafting possible regardless of pCraft
  it('AP-1: alpha=0 → craft_probability=0, best=drop only', () => {
    const r = alphaToProb(0, new Map(), ['A'], makedag(0.5));
    expect(r.craft_probability).toBeCloseTo(0, PREC);
    expect(r.drop_probability).toBeCloseTo(0, PREC);
    expect(r.best_probability).toBeCloseTo(0, PREC);
  });

  // AP-2: craft = 1 − (1−p)^alpha with p=0.5, alpha=4 → 1−0.0625=0.9375
  it('AP-2: pCraft=0.5, alpha=4 → craft=0.9375', () => {
    const r = alphaToProb(4, new Map(), ['A'], makedag(0.5));
    expect(r.craft_probability).toBeCloseTo(0.9375, PREC);
    expect(r.drop_probability).toBeCloseTo(0, PREC);
    expect(r.best_probability).toBeCloseTo(0.9375, PREC);
  });

  // AP-3: p=0.5, alpha=2 → craft=0.75
  it('AP-3: pCraft=0.5, alpha=2 → craft=0.75', () => {
    const r = alphaToProb(2, new Map(), ['A'], makedag(0.5));
    expect(r.craft_probability).toBeCloseTo(0.75, PREC);
  });

  // AP-4: pCraft=0, legendary drop only → craft=0, drop=1−e^{−1}
  it('AP-4: pCraft=0, legendary lambda=1 → craft=0, drop=1−e^{−1}', () => {
    const r = alphaToProb(1, new Map([['A', 1]]), ['A'], makedag(0));
    expect(r.craft_probability).toBeCloseTo(0, PREC);
    expect(r.drop_probability).toBeCloseTo(1 - Math.exp(-1), PREC);
    expect(r.best_probability).toBeCloseTo(1 - Math.exp(-1), PREC);
  });

  // AP-5: pCraft=1 → craft_probability=1 by boundary check
  it('AP-5: pCraft=1.0 → craft_probability=1', () => {
    const r = alphaToProb(2, new Map(), ['A'], makedag(1.0));
    expect(r.craft_probability).toBeCloseTo(1, PREC);
    expect(r.best_probability).toBeCloseTo(1, PREC);
  });

  // AP-6: alpha=0, legendary drop only
  it('AP-6: alpha=0, lambda=2 → craft=0, drop=1−e^{−2}', () => {
    const r = alphaToProb(0, new Map([['A', 2]]), ['A'], makedag(0));
    expect(r.craft_probability).toBeCloseTo(0, PREC);
    expect(r.drop_probability).toBeCloseTo(1 - Math.exp(-2), PREC);
  });

  // AP-7: inclusion-exclusion: best = 1 − (1−craft)(1−drop)
  it('AP-7: both craft and drop paths → best = 1−(1−craft)(1−drop)', () => {
    // pCraft=0.5, alpha=4 → craft=0.9375
    // lambda=1 → drop=1−e^{-1}≈0.63212
    const craft = 0.9375;
    const drop = 1 - Math.exp(-1);
    const expectedBest = 1 - (1 - craft) * (1 - drop);
    const r = alphaToProb(4, new Map([['A', 1]]), ['A'], makedag(0.5));
    expect(r.craft_probability).toBeCloseTo(craft, PREC);
    expect(r.drop_probability).toBeCloseTo(drop, PREC);
    expect(r.best_probability).toBeCloseTo(expectedBest, PREC);
  });

  // AP-8: empty desired list → all zero
  it('AP-8: desired_artifact_node_ids=[] → all probabilities=0', () => {
    const r = alphaToProb(10, new Map([['A', 5]]), [], makedag(0.9));
    expect(r.craft_probability).toBe(0);
    expect(r.drop_probability).toBe(0);
    expect(r.best_probability).toBe(0);
  });
});
