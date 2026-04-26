import { describe, it, expect } from 'vitest';
import { poissonAtLeast } from './objective';

describe('objective.ts', () => {
  describe('poissonAtLeast(lambda, k)', () => {
    it('returns 1 when k <= 0 regardless of lambda', () => {
      expect(poissonAtLeast(0, 0)).toBe(1);
      expect(poissonAtLeast(0, -1)).toBe(1);
      expect(poissonAtLeast(10, -5)).toBe(1);
      expect(poissonAtLeast(-5, 0)).toBe(1);
      expect(poissonAtLeast(-1, -10)).toBe(1);
    });

    it('returns 0 when lambda <= 0 and k >= 1', () => {
      expect(poissonAtLeast(0, 1)).toBe(0);
      expect(poissonAtLeast(0, 100)).toBe(0);
      expect(poissonAtLeast(-1, 1)).toBe(0);
      expect(poissonAtLeast(-100, 50)).toBe(0);
    });

    it('returns 1 - e^-1 ≈ 0.6321 for lambda=1, k=1 (within 1e-9)', () => {
      const result = poissonAtLeast(1, 1);
      const expected = 1 - Math.exp(-1);
      expect(Math.abs(result - expected)).toBeLessThan(1e-9);
    });

    it('returns correct value for lambda=5, k=3 (within 1e-9)', () => {
      // P(X >= 3) = 1 - P(X=0) - P(X=1) - P(X=2)
      // = 1 - e^-5 - 5e^-5 - 12.5e^-5
      const expected = 1 - Math.exp(-5) - 5 * Math.exp(-5) - 12.5 * Math.exp(-5);
      const result = poissonAtLeast(5, 3);
      expect(Math.abs(result - expected)).toBeLessThan(1e-9);
    });

    it('returns >= 1 - 1e-300 for lambda=1000, k=1', () => {
      const result = poissonAtLeast(1000, 1);
      expect(result).toBeGreaterThanOrEqual(1 - 1e-300);
    });

    it('is monotone non-decreasing in lambda for fixed k', () => {
      const k = 3;
      const lambdas = [0.1, 1, 5, 20, 100];
      const results = lambdas.map(l => poissonAtLeast(l, k));

      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeGreaterThanOrEqual(results[i - 1]);
      }
    });

    it('is monotone non-increasing in k for fixed lambda', () => {
      const lambda = 5;
      const ks = [1, 2, 3, 4, 5, 10];
      const results = ks.map(k => poissonAtLeast(lambda, k));

      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeLessThanOrEqual(results[i - 1]);
      }
    });
  });
});
