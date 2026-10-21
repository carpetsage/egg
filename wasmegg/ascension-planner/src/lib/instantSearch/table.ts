/**
 * Reads the `table.bin` that scripts/buildTable.ts --pack and the Table Builder write
 * (src/buildTable/pack.ts), as AutoAutoAP's `readTable` does (src/search/precomputedTable.ts there).
 *
 * LAYOUT. A little-endian uint32 header length, the header as UTF-8 JSON, padding to 8 bytes, then
 * float64s: for each start TE `from..to`, each of the 168 Pacific hours, `slots` builds of nine
 * numbers: [sales + 8 if tier 13 (0 = empty), waitStart, saleEnd, peakELR, delivered x 5].
 */
import { EGG_ORDER, WEEK_HOURS, type BuildParams } from './precomputedLeg';

const FIELDS = 9;

export interface TableHeader {
  version: 1;
  /** Unix second of the Monday 00:00 Pacific every cell was simulated from. */
  referenceWeek: number;
  cteBonus: number;
  deliveryScore: number;
  from: number;
  to: number;
  slots: number;
  builtAt: string;
  /** The simulator commit the cells came from (scripts/simVersion.ts). */
  simVersion?: string;
  /** Built in silo mode (the auto-planner's defer for earnings). Only silo tables have it now;
   *  older ones may say `false`. */
  deferForEarnings?: boolean;
  /** Whether cells assume the video doubler; absent in tables from before it (built with it off). */
  doubleEarnings?: boolean;
  /** The gear the cells were simulated with (src/buildTable/header.ts `tableGear`); absent in tables
   *  from before it. */
  earnings?: string[];
  delivery?: string[];
  deliveryKey?: string;
  stones?: Record<string, number>;
}

export interface Table {
  header: TableHeader;
  /** The builds for a start TE at a Pacific hour, or null outside the table. */
  lookup(te: number, hour: number): BuildParams[] | null;
}

/**
 * Decoded cells kept. A cell is ~1.3 KB decoded and a 120–489 table has 62,160 of them; the bytes stay
 * in the ArrayBuffer, and decoding again is cheap next to the route arithmetic.
 */
const DECODED_CELLS = 4096;

/** A `Map` capped at `max` entries, dropping the least recently used. */
class LruCache<K, V> {
  private map = new Map<K, V>();
  constructor(private readonly max: number) {}
  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value as K);
  }
}

export function readTable(buffer: ArrayBuffer): Table {
  const view = new DataView(buffer);
  const len = buffer.byteLength >= 4 ? view.getUint32(0, true) : 0;
  let header: TableHeader;
  try {
    if (!len || 4 + len > buffer.byteLength) throw new Error('bad length');
    header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, len))) as TableHeader;
  } catch {
    throw new Error('that file is not a precomputed table');
  }
  if (header.version !== 1) throw new Error(`precomputed table version ${header.version} is not supported`);
  const start = Math.ceil((4 + len) / 8) * 8;
  // A file cut short would read its missing cells as empty, and the finder would quietly route
  // around them.
  const expected = start + (header.to - header.from + 1) * WEEK_HOURS * header.slots * FIELDS * 8;
  if (!(header.slots > 0) || buffer.byteLength !== expected)
    throw new Error(`the precomputed table is incomplete (${buffer.byteLength} of ${expected} bytes)`);
  const body = new Float64Array(buffer, start);
  const cache = new LruCache<number, BuildParams[]>(DECODED_CELLS);
  return {
    header,
    lookup(te, hour) {
      if (te < header.from || te > header.to || hour < 0 || hour >= WEEK_HOURS) return null;
      const key = (te - header.from) * WEEK_HOURS + hour;
      const hit = cache.get(key);
      if (hit) return hit;
      const builds: BuildParams[] = [];
      for (let i = 0; i < header.slots; i++) {
        const at = (key * header.slots + i) * FIELDS;
        const flags = body[at];
        if (!flags) continue;
        builds.push({
          sales: flags % 8,
          tier13: flags >= 8,
          waitStart: body[at + 1],
          saleEnd: body[at + 2],
          peakELR: body[at + 3],
          delivered: Array.from(body.subarray(at + 4, at + 4 + EGG_ORDER.length)),
        });
      }
      cache.set(key, builds);
      return builds;
    },
  };
}

/** The bytes of a table, gzipped or not (gzip's magic number decides), as an ArrayBuffer. */
export async function unpackTableBytes(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (head[0] !== 0x1f || head[1] !== 0x8b) return bytes;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
