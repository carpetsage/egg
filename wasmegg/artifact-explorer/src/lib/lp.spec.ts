import { describe, it, expect } from 'vitest';
import { solveLp } from './lp';

const PREC = 9;

describe('solveLp', () => {
  it('solves a trivial one-variable problem', () => {
    // max x s.t. x <= 5
    const r = solveLp(new Float64Array([1]), [new Float64Array([1])], new Float64Array([5]));
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(5, PREC);
    expect(r.primal[0]).toBeCloseTo(5, PREC);
    expect(r.duals[0]).toBeCloseTo(1, PREC);
  });

  it('solves two independent constraints', () => {
    // max x+y s.t. x <= 3, y <= 4
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

  it('finds a vertex that needs multiple pivots', () => {
    // max 5x+4y s.t. 6x+4y <= 24, x+2y <= 6
    // optimum is x=3, y=1.5, obj=21, duals=[0.75, 0.5]
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

  it('gives slack constraints a zero dual', () => {
    // max x+2y s.t. x+y <= 4, x <= 2, y <= 3
    // optimum x=1, y=3; the x <= 2 constraint is slack so its dual must be 0
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

  it('gives a redundant upper bound a zero dual', () => {
    // x <= 10 is redundant when x <= 5 binds
    const r = solveLp(new Float64Array([1]), [new Float64Array([1]), new Float64Array([1])], new Float64Array([5, 10]));
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(5, PREC);
    expect(r.duals[0]).toBeCloseTo(1, PREC);
    expect(r.duals[1]).toBeCloseTo(0, PREC);
  });

  it('handles a zero RHS', () => {
    // max x s.t. x <= 0
    const r = solveLp(new Float64Array([1]), [new Float64Array([1])], new Float64Array([0]));
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(0, PREC);
    expect(r.primal[0]).toBeCloseTo(0, PREC);
    expect(r.duals[0]).toBeCloseTo(1, PREC);
  });

  it('handles a zero objective', () => {
    const r = solveLp(new Float64Array([0]), [new Float64Array([1])], new Float64Array([5]));
    expect(r.status).toBe('optimal');
    expect(r.objective).toBeCloseTo(0, PREC);
  });

  it('reports infeasible on a negative RHS', () => {
    const r = solveLp(new Float64Array([1, 1]), [new Float64Array([1, 0])], new Float64Array([-1]));
    expect(r.status).toBe('infeasible');
    expect(r.objective).toBe(0);
  });

  it('reports unbounded when a variable has no upper bound', () => {
    // max x s.t. y <= 1; x is unconstrained
    const r = solveLp(new Float64Array([1, 0]), [new Float64Array([0, 1])], new Float64Array([1]));
    expect(r.status).toBe('unbounded');
    expect(r.objective).toBe(Infinity);
  });
});
