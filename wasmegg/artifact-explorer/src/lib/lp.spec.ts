import { describe, it, expect } from 'vitest';
import { solveLp } from './lp';

const PREC = 9;

describe('solveLp', () => {
  // ── LP-1: trivial 1-variable ──────────────────────────────────────────────
  it('LP-1: max x s.t. x≤5 → optimal at x=5', () => {
    const r = solveLp(new Float64Array([1]), [new Float64Array([1])], new Float64Array([5]));
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(5, PREC);
    expect(r.primal[0]).toBeCloseTo(5, PREC);
    expect(r.duals[0]).toBeCloseTo(1, PREC);
  });

  // ── LP-2: two independent constraints ────────────────────────────────────
  it('LP-2: max x+y s.t. x≤3, y≤4 → obj=7, primal=[3,4], duals=[1,1]', () => {
    const r = solveLp(
      new Float64Array([1, 1]),
      [new Float64Array([1, 0]), new Float64Array([0, 1])],
      new Float64Array([3, 4])
    );
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(7, PREC);
    expect(r.primal[0]).toBeCloseTo(3, PREC);
    expect(r.primal[1]).toBeCloseTo(4, PREC);
    expect(r.duals[0]).toBeCloseTo(1, PREC);
    expect(r.duals[1]).toBeCloseTo(1, PREC);
  });

  // ── LP-3: non-trivial vertex requiring multiple pivots ───────────────────
  // max 5x+4y s.t. 6x+4y≤24, x+2y≤6
  // Analytical: x=3, y=1.5, obj=21, duals=[0.75, 0.5]
  it('LP-3: classic 2D LP → obj=21, primal=[3,1.5], duals=[0.75,0.5]', () => {
    const r = solveLp(
      new Float64Array([5, 4]),
      [new Float64Array([6, 4]), new Float64Array([1, 2])],
      new Float64Array([24, 6])
    );
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(21, PREC);
    expect(r.primal[0]).toBeCloseTo(3, PREC);
    expect(r.primal[1]).toBeCloseTo(1.5, PREC);
    expect(r.duals[0]).toBeCloseTo(0.75, PREC);
    expect(r.duals[1]).toBeCloseTo(0.5, PREC);
  });

  // ── LP-4: non-binding middle constraint has dual=0 ───────────────────────
  // max x+2y s.t. x+y≤4, x≤2, y≤3
  // Analytical: x=1, y=3, obj=7, duals=[1,0,1]
  // (x≤2 is slack at x=1 → dual must be 0 by complementary slackness)
  it('LP-4: slack constraint → dual=0; binding constraints → dual>0', () => {
    const r = solveLp(
      new Float64Array([1, 2]),
      [new Float64Array([1, 1]), new Float64Array([1, 0]), new Float64Array([0, 1])],
      new Float64Array([4, 2, 3])
    );
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(7, PREC);
    expect(r.primal[0]).toBeCloseTo(1, PREC);
    expect(r.primal[1]).toBeCloseTo(3, PREC);
    expect(r.duals[0]).toBeCloseTo(1, PREC);
    expect(r.duals[1]).toBeCloseTo(0, PREC);
    expect(r.duals[2]).toBeCloseTo(1, PREC);
  });

  // ── LP-5: redundant upper bound → second dual=0 ──────────────────────────
  it('LP-5: redundant constraint (x≤10 when optimal x=5) has dual=0', () => {
    const r = solveLp(new Float64Array([1]), [new Float64Array([1]), new Float64Array([1])], new Float64Array([5, 10]));
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(5, PREC);
    expect(r.duals[0]).toBeCloseTo(1, PREC);
    expect(r.duals[1]).toBeCloseTo(0, PREC);
  });

  // ── LP-6: zero-RHS forces primal to 0 ────────────────────────────────────
  // max x s.t. x≤0 → x=0, obj=0; dual=1 (1 unit of extra slack → obj +1)
  it('LP-6: zero-RHS constraint → primal=0, obj=0, dual=1', () => {
    const r = solveLp(new Float64Array([1]), [new Float64Array([1])], new Float64Array([0]));
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(0, PREC);
    expect(r.primal[0]).toBeCloseTo(0, PREC);
    expect(r.duals[0]).toBeCloseTo(1, PREC);
  });

  // ── LP-7: flat objective ──────────────────────────────────────────────────
  it('LP-7: zero objective coefficient → obj=0, status=optimal', () => {
    const r = solveLp(new Float64Array([0]), [new Float64Array([1])], new Float64Array([5]));
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(0, PREC);
  });

  // ── LP-8: negative b triggers infeasible early return ────────────────────
  it('LP-8: negative RHS → status=infeasible', () => {
    const r = solveLp(new Float64Array([1, 1]), [new Float64Array([1, 0])], new Float64Array([-1]));
    expect(r.status).toBe('infeasible');
    expect(r.objective).toBe(0);
  });

  // ── LP-9: unbounded ───────────────────────────────────────────────────────
  // max x s.t. y≤1 — no constraint on x at all
  it('LP-9: no upper bound on entering variable → status=unbounded', () => {
    const r = solveLp(new Float64Array([1, 0]), [new Float64Array([0, 1])], new Float64Array([1]));
    expect(r.status).toBe('unbounded');
    expect(r.objective).toBe(Infinity);
  });
});
