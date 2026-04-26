import { describe, it, expect } from 'vitest';
import { SoftMinWeights, AccumulateYield, InterpolateYield, DotYieldGrad, GoldenSectionSearch } from './frank-wolfe';

describe('frank-wolfe.ts helpers', () => {
  describe('SoftMinWeights(values, alpha)', () => {
    it('produces weights that sum to 1, are positive, and weight smallest input highest', () => {
      const weights = SoftMinWeights([3, 1, 2], 1);

      // Sum to 1
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-12);

      // All positive
      weights.forEach(w => expect(w).toBeGreaterThan(0));

      // Smallest input (1 at index 1) has largest weight
      expect(weights[1]).toBeGreaterThan(weights[0]);
      expect(weights[1]).toBeGreaterThan(weights[2]);
    });

    it('matches hand-computed softmin formula to 1e-12', () => {
      const values = [3, 1, 2];
      const alpha = 1;
      const weights = SoftMinWeights(values, alpha);

      // Manual calculation: exp(-alpha * x_i) / sum(exp(-alpha * x_j))
      const exps = values.map(v => Math.exp(-alpha * v));
      const sumExp = exps.reduce((a, b) => a + b, 0);
      const expected = exps.map(e => e / sumExp);

      for (let i = 0; i < weights.length; i++) {
        expect(Math.abs(weights[i] - expected[i])).toBeLessThan(1e-12);
      }
    });

    it('returns empty array for empty input', () => {
      const weights = SoftMinWeights([], 1);
      expect(weights).toEqual([]);
    });

    it('returns [1] for single-element input', () => {
      const weights = SoftMinWeights([5], 1);
      expect(weights).toEqual([1]);
    });

    it('concentrates weight on min as alpha increases', () => {
      const values = [3, 1, 2];
      const weightsSmallAlpha = SoftMinWeights(values, 0.1);
      const weightsLargeAlpha = SoftMinWeights(values, 100);

      // With very large alpha, weight[1] (min) should approach 1
      expect(weightsLargeAlpha[1]).toBeGreaterThan(weightsSmallAlpha[1]);
      expect(weightsLargeAlpha[1]).toBeGreaterThan(0.99);
    });
  });

  describe('AccumulateYield(allocation, options, baseYield)', () => {
    it('is linear per key', () => {
      const options = [
        {
          yield_vector: new Map([
            ['A', 2],
            ['B', 3],
          ]),
          actual_fuel: 1,
          actual_time: 1,
        },
        {
          yield_vector: new Map([
            ['A', 1],
            ['C', 4],
          ]),
          actual_fuel: 1,
          actual_time: 1,
        },
      ] as any;

      const alloc1 = new Float64Array([1, 0]);
      const alloc2 = new Float64Array([0, 1]);
      const allocSum = new Float64Array([1, 1]);

      const y1 = AccumulateYield(alloc1, options);
      const y2 = AccumulateYield(alloc2, options);
      const ySum = AccumulateYield(allocSum, options);

      const yExpected = new Map([
        ['A', 3],
        ['B', 3],
        ['C', 4],
      ]);

      expect(ySum.get('A')).toBe(yExpected.get('A'));
      expect(ySum.get('B')).toBe(yExpected.get('B'));
      expect(ySum.get('C')).toBe(yExpected.get('C'));
    });

    it('adds baseYield once and only once', () => {
      const options = [
        {
          yield_vector: new Map([['A', 10]]),
          actual_fuel: 1,
          actual_time: 1,
        },
      ] as any;

      const baseYield = new Map([['A', 5]]);
      const alloc = new Float64Array([2]);

      const result = AccumulateYield(alloc, options, baseYield);

      // baseYield is added once (5), then option yields (2 * 10 = 20)
      expect(result.get('A')).toBe(25);
    });

    it('zero allocation returns clone of baseYield', () => {
      const options = [
        {
          yield_vector: new Map([['A', 10]]),
          actual_fuel: 1,
          actual_time: 1,
        },
      ] as any;

      const baseYield = new Map([
        ['B', 7],
        ['C', 3],
      ]);
      const alloc = new Float64Array([0]);

      const result = AccumulateYield(alloc, options, baseYield);

      expect(result.get('B')).toBe(7);
      expect(result.get('C')).toBe(3);

      // Verify it's a clone, not the same object
      result.set('B', 999);
      expect(baseYield.get('B')).toBe(7);
    });
  });

  describe('InterpolateYield(yA, yB, gamma)', () => {
    it('returns yA when gamma=0', () => {
      const yA = new Map([
        ['A', 1],
        ['B', 2],
      ]);
      const yB = new Map([
        ['B', 10],
        ['C', 20],
      ]);

      const result = InterpolateYield(yA, yB, 0);

      expect(result.get('A')).toBe(1);
      expect(result.get('B')).toBe(2);
      expect(result.get('C')).toBe(0); // Missing key in yA, defaults to 0
    });

    it('returns yB when gamma=1', () => {
      const yA = new Map([
        ['A', 1],
        ['B', 2],
      ]);
      const yB = new Map([
        ['B', 10],
        ['C', 20],
      ]);

      const result = InterpolateYield(yA, yB, 1);

      expect(result.get('A')).toBe(0); // Missing key in yB, defaults to 0
      expect(result.get('B')).toBe(10);
      expect(result.get('C')).toBe(20);
    });

    it('returns average when gamma=0.5', () => {
      const yA = new Map([['A', 4]]);
      const yB = new Map([['A', 6]]);

      const result = InterpolateYield(yA, yB, 0.5);

      expect(result.get('A')).toBe(5);
    });
  });

  describe('DotYieldGrad(yieldVector, grad)', () => {
    it('computes dot product correctly', () => {
      const yieldVector = new Map([
        ['A', 2],
        ['B', 3],
      ]);
      const grad = new Map([
        ['A', 5],
        ['B', 4],
      ]);

      const result = DotYieldGrad(yieldVector, grad);

      // 2*5 + 3*4 = 10 + 12 = 22
      expect(result).toBe(22);
    });

    it('treats missing keys as 0', () => {
      const yieldVector = new Map([['A', 2]]);
      const grad = new Map([
        ['A', 5],
        ['B', 10],
      ]);

      const result = DotYieldGrad(yieldVector, grad);

      // 2*5 + 0*10 = 10
      expect(result).toBe(10);
    });

    it('is commutative with same key sets', () => {
      const y1 = new Map([
        ['A', 2],
        ['B', 3],
      ]);
      const g1 = new Map([
        ['A', 5],
        ['B', 4],
      ]);

      const y2 = new Map([
        ['A', 5],
        ['B', 4],
      ]);
      const g2 = new Map([
        ['A', 2],
        ['B', 3],
      ]);

      // dot(y1, g1) should equal dot(y2, g2)
      expect(DotYieldGrad(y1, g1)).toBe(DotYieldGrad(y2, g2));
    });
  });

  describe('GoldenSectionSearch(f, tol)', () => {
    it('finds maximum of f(x) = -(x-0.3)^2 at x ≈ 0.3', () => {
      const f = (x: number) => -Math.pow(x - 0.3, 2);
      const result = GoldenSectionSearch(f, 1e-6);

      expect(Math.abs(result - 0.3)).toBeLessThan(1e-3);
    });

    it('returns ~0 for strictly decreasing f', () => {
      const f = (x: number) => -x;
      const result = GoldenSectionSearch(f, 1e-6);

      expect(result).toBeLessThan(0.1);
    });

    it('returns ~1 for strictly increasing f', () => {
      const f = (x: number) => x;
      const result = GoldenSectionSearch(f, 1e-6);

      expect(result).toBeGreaterThan(0.9);
    });
  });
});
