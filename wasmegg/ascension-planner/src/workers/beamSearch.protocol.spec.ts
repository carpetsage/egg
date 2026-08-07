import { describe, expect, test } from 'vitest';
import { sanitizeLongsForWorker } from './beamSearch.protocol';

/** Minimal stand-in for a protobufjs Long instance — same shape ('long'@5's Long class produces:
 *  own enumerable `low`/`high`/`unsigned`, plus prototype methods) without depending on the 'long'
 *  package directly (not a direct dependency of this workspace — see beamSearch.protocol.ts's doc
 *  comment on isLongLike for why). */
class FakeLong {
  constructor(
    public low: number,
    public high: number,
    public unsigned: boolean
  ) {}
  toNumber(): number {
    const TWO_PWR_32_DBL = 4294967296;
    return this.unsigned
      ? (this.high >>> 0) * TWO_PWR_32_DBL + (this.low >>> 0)
      : this.high * TWO_PWR_32_DBL + (this.low >>> 0);
  }
}

describe('structuredClone + Long (documents the Phase B risk this module exists to fix)', () => {
  test('structuredClone does not throw on a Long-shaped instance, but silently strips its prototype', () => {
    const long = new FakeLong(123, 0, true);
    const cloned = structuredClone({ itemId: long }) as { itemId: unknown };

    // The data survives...
    expect(cloned.itemId).toEqual({ low: 123, high: 0, unsigned: true });
    // ...but the class is gone, along with every method on it. Any code downstream expecting a real
    // Long (e.g. calling .toNumber(), or using it as a Map key alongside other real Long instances)
    // would silently misbehave rather than error loudly.
    expect(cloned.itemId).not.toBeInstanceOf(FakeLong);
    expect((cloned.itemId as { toNumber?: unknown }).toNumber).toBeUndefined();
  });
});

describe('sanitizeLongsForWorker', () => {
  test('converts a Long-shaped value to a plain number', () => {
    expect(sanitizeLongsForWorker(new FakeLong(123, 0, true))).toBe(123);
  });

  test('converts an unsigned Long-shaped value using unsigned semantics', () => {
    // high=1, low=0, unsigned -> 1 * 2^32
    expect(sanitizeLongsForWorker(new FakeLong(0, 1, true))).toBe(4294967296);
  });

  test('recurses through nested objects and arrays, leaving ordinary values untouched', () => {
    const input = {
      artifactsDb: {
        itemSequence: new FakeLong(42, 0, false),
        virtueAfxDb: {
          inventoryItems: [
            { itemId: new FakeLong(7, 0, true), artifact: { spec: { name: 5, level: 4 } }, quantity: 1 },
            { itemId: new FakeLong(8, 0, true), artifact: { spec: { name: 6, level: 4 } }, quantity: 20 },
          ],
        },
      },
      game: { permitLevel: 1, soulEggs: new FakeLong(0, 0, false) },
      nullField: null,
      stringField: 'curiosity',
    };

    const out = sanitizeLongsForWorker(input);

    expect(out.artifactsDb.itemSequence).toBe(42);
    expect(out.artifactsDb.virtueAfxDb.inventoryItems[0].itemId).toBe(7);
    expect(out.artifactsDb.virtueAfxDb.inventoryItems[1].itemId).toBe(8);
    expect(out.artifactsDb.virtueAfxDb.inventoryItems[0].artifact.spec.name).toBe(5);
    expect(out.game.permitLevel).toBe(1);
    expect(out.game.soulEggs).toBe(0);
    expect(out.nullField).toBeNull();
    expect(out.stringField).toBe('curiosity');
  });

  test('the sanitized output survives structuredClone with real numbers intact (the actual fix)', () => {
    const sanitized = sanitizeLongsForWorker({ itemId: new FakeLong(123, 0, true) });
    const cloned = structuredClone(sanitized);
    expect(cloned.itemId).toBe(123);
  });

  test('is a deep clone: mutating the output does not affect the input', () => {
    const input = { nested: { value: 1 } };
    const out = sanitizeLongsForWorker(input);
    out.nested.value = 2;
    expect(input.nested.value).toBe(1);
  });

  test('leaves values with no Longs anywhere unchanged in shape', () => {
    const input = { a: 1, b: 'x', c: [1, 2, 3], d: null, e: undefined };
    expect(sanitizeLongsForWorker(input)).toEqual(input);
  });
});
