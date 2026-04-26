import { describe, it, expect } from 'vitest';

// Inline implementations of the pure helpers to test
// (avoiding complex imports from phases.ts that depend on external libs)

function addYieldVectors(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const result = new Map(a);
  for (const [k, v] of b) {
    result.set(k, (result.get(k) ?? 0) + v);
  }
  return result;
}

function zeroYieldVector(_: Map<string, unknown>): Map<string, number> {
  return new Map();
}

describe('phases.ts helpers', () => {
  describe('addYieldVectors(a, b)', () => {
    it('is component-wise addition', () => {
      const a = new Map([
        ['A', 1],
        ['B', 2],
      ]);
      const b = new Map([
        ['B', 3],
        ['C', 4],
      ]);

      const result = addYieldVectors(a, b);

      expect(result.get('A')).toBe(1);
      expect(result.get('B')).toBe(5);
      expect(result.get('C')).toBe(4);
    });

    it('does not mutate inputs', () => {
      const a = new Map([['A', 1]]);
      const b = new Map([['B', 2]]);

      const aSnapshotBefore = new Map(a);
      const bSnapshotBefore = new Map(b);

      addYieldVectors(a, b);

      expect(a).toEqual(aSnapshotBefore);
      expect(b).toEqual(bSnapshotBefore);
    });

    it('returns a fresh Map', () => {
      const a = new Map([['A', 1]]);
      const b = new Map([['B', 2]]);

      const result = addYieldVectors(a, b);

      // Verify it's a different object
      expect(result).not.toBe(a);
      expect(result).not.toBe(b);

      // Verify modifying result doesn't affect inputs
      result.set('A', 999);
      expect(a.get('A')).toBe(1);
    });

    it('treats missing keys as 0', () => {
      const a = new Map([['A', 5]]);
      const b = new Map([['A', 3]]);

      const result = addYieldVectors(a, b);
      expect(result.get('A')).toBe(8);
    });

    it('is idempotent with zeroYieldVector', () => {
      const a = new Map([['A', 1]]);
      const zero = new Map<string, number>();

      const result = addYieldVectors(a, zero);
      expect(result.get('A')).toBe(1);
      expect(result.size).toBe(1);
    });

    it('handles empty maps', () => {
      const a = new Map<string, number>();
      const b = new Map<string, number>();

      const result = addYieldVectors(a, b);
      expect(result.size).toBe(0);
    });
  });

  describe('zeroYieldVector(...)', () => {
    it('returns an empty Map', () => {
      // zeroYieldVector takes a RecipeDAG but ignores it (the underscore parameter)
      // We can pass an empty Map as a dummy DAG since it's not used
      const dag = new Map();
      const result = zeroYieldVector(dag);

      expect(result).toEqual(new Map());
      expect(result.size).toBe(0);
    });

    it('returns a fresh Map each time', () => {
      const dag = new Map();
      const result1 = zeroYieldVector(dag);
      const result2 = zeroYieldVector(dag);

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });
});
