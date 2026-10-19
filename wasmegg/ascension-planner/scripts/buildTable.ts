/**
 * Builds the precomputed build table (src/buildTable/cell.ts) on the maxed account
 * (src/buildTable/maxedAccount.ts), in AutoAutoAP's generator layout, and packs it into the
 * `table.bin` their instant answer loads.
 *
 *   pnpm table:build
 *   node dist-scripts/buildTable.js --generate --out out/table-maxed [--from 120] [--to 339] [--jobs 7] [--verify] [--no-reuse]
 *   node dist-scripts/buildTable.js --generate --out out/verify --tes 120,250,339 --verify
 *   node dist-scripts/buildTable.js --pack --table out/table-maxed [--out FILE]   (writes FILE and FILE.gz)
 *
 * --generate writes, per start TE, `te-NNN.jsonl` (168 lines of {te, h, builds}, as AutoAutoAP's
 * `precompute.ts --generate` writes them) and `te-NNN.report.json` (where each hour's C1..R1 prefix
 * came from, timings, and with --verify any reuse that differs from a fresh build), plus `meta.json`
 * and `k3.json`. Finished TEs are skipped, top TE first.
 *
 * C1..R1 reuse (src/buildTable/prefixReuse.ts): each TE's three seed hours are built first; every
 * other hour then reuses its seed's prefix when no sale or boost boundary falls inside it.
 */
import { fork } from 'node:child_process';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { cteFromArtifacts } from 'lib/virtue';
import { equippedArtifactsToLibArtifacts } from '@/lib/artifacts/utils';
import { socketEarningsStones } from '@/auto/loadout';
import {
  buildsFrom,
  contextAt,
  EGG_ORDER,
  k3StateOf,
  paramsOf,
  prefixAt,
  REFERENCE_WEEK,
  startStateAt,
  variantsFrom,
  WEEK_HOURS,
  type BuildParams,
  type Prefix,
} from '@/buildTable/cell';
import { maxedBaseState, maxedContext } from '@/buildTable/maxedAccount';
import { allHours, hourStart, prefixSourceFor, SEED_HOURS, type EventClass, type PrefixSource } from '@/buildTable/prefixReuse';

/** Default range: AutoAutoAP's newest rebuilds stop at 339 and simulate the one ascension above live. */
const TABLE_FROM = 120;
const TABLE_TO = 339;

function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : dflt;
}
const has = (name: string) => process.argv.includes('--' + name);
const teFile = (dir: string, te: number, ext: string) => `${dir}/te-${String(te).padStart(3, '0')}.${ext}`;

// --- Worker side ----------------------------------------------------------------------------------

interface Task {
  id: number;
  te: number;
  h: number;
  /** The seed's prefix to reuse; absent = build the prefix fresh. */
  prefix?: Prefix;
  /** Send the fresh prefix back (seeds). */
  keepPrefix?: boolean;
  /** With `prefix`: also build fresh and compare. */
  verify?: boolean;
}

interface TaskResult {
  id: number;
  builds: BuildParams[];
  prefixSeconds: number;
  prefix?: Prefix;
  msPrefix: number;
  msRest: number;
  verify?: { prefixSame: boolean; buildsSame: boolean; freshBuilds?: BuildParams[]; freshPrefixSeconds: number };
}

function runTask(task: Task): TaskResult {
  const ctx = contextAt(maxedContext(), hourStart(task.h));
  const state = startStateAt(maxedBaseState(), task.te);
  const t0 = performance.now();
  const prefix = task.prefix ?? prefixAt(state, ctx);
  const t1 = performance.now();
  const builds = buildsFrom(prefix, ctx, task.te);
  const t2 = performance.now();
  const result: TaskResult = {
    id: task.id,
    builds,
    prefixSeconds: prefix.elapsedSeconds,
    msPrefix: task.prefix ? 0 : t1 - t0,
    msRest: t2 - t1,
  };
  if (task.keepPrefix) result.prefix = prefix;
  if (task.prefix && task.verify) {
    const fresh = prefixAt(state, ctx);
    const prefixSame = JSON.stringify(fresh) === JSON.stringify(task.prefix);
    const freshBuilds = prefixSame ? builds : buildsFrom(fresh, ctx, task.te);
    const buildsSame = JSON.stringify(freshBuilds) === JSON.stringify(builds);
    result.verify = {
      prefixSame,
      buildsSame,
      freshPrefixSeconds: fresh.elapsedSeconds,
      ...(buildsSame ? {} : { freshBuilds }),
    };
  }
  return result;
}

function workerMain(): void {
  process.on('message', (task: Task | { quit: true }) => {
    if ('quit' in task) return process.exit(0);
    process.send!(runTask(task));
  });
  process.send!({ ready: true });
}

// --- Generate ---------------------------------------------------------------------------------------

/** Code a cell depends on: a change here outside a commit is marked `-dirty` on the stamp. */
const SIM_PATHS = ['src/auto', 'src/engine', 'src/calculations', 'src/lib', 'src/buildTable', '../../lib'];

/** The commit the cells are built from, e.g. `2da01de4` (AutoAutoAP compares it with its own `SIM_VERSION`). */
function simVersion(): string {
  const hash = execSync('git rev-parse --short=8 HEAD', { encoding: 'utf8' }).trim();
  const dirty = execSync(`git status --porcelain -- ${SIM_PATHS.join(' ')}`, { encoding: 'utf8' }).trim();
  return dirty ? `${hash}-dirty` : hash;
}

/** Where AutoAutoAP measures a player's peak against the table's: TE 400 at the reference week's hour 0. */
const PEAK_TE = 400;

/** The research a build waits with, its delivery set, and the table's peak delivery rate there. */
function k3Record() {
  const ctx = contextAt(maxedContext(), REFERENCE_WEEK);
  const prefix = prefixAt(startStateAt(maxedBaseState(), PEAK_TE), ctx);
  const variants = variantsFrom(prefix, ctx, PEAK_TE);
  const { k3 } = k3StateOf(prefix, variants[0], ctx);
  const peak = Math.max(...variants.map(v => paramsOf(prefix, v, ctx).peakELR));
  return { research: k3.researchLevels, delivery: k3.artifactLoadout, peak };
}

function writeMeta(out: string, from: number, to: number): void {
  const context = maxedContext();
  const earnings = socketEarningsStones(context.loadoutInputs!.earnings, context.loadoutInputs!.stones);
  const before = existsSync(`${out}/meta.json`) ? JSON.parse(readFileSync(`${out}/meta.json`, 'utf8')) : null;
  const version = simVersion();
  if (before && before.simVersion !== version && !has('allow-sim-change'))
    throw new Error(`${out} was built by ${before.simVersion}, this is ${version}. Use a new --out or --allow-sim-change.`);
  if (!existsSync(`${out}/k3.json`)) writeFileSync(`${out}/k3.json`, JSON.stringify(k3Record(), null, 1));
  writeFileSync(
    `${out}/meta.json`,
    JSON.stringify(
      {
        version: 1,
        referenceWeek: REFERENCE_WEEK,
        reference: true,
        cteBonus: Number(cteFromArtifacts(equippedArtifactsToLibArtifacts(earnings)).toFixed(2)),
        deliveryScore: null,
        delivery: context.loadoutInputs!.delivery,
        earnings,
        eggOrder: EGG_ORDER,
        gear: null,
        from: Math.min(from, before?.from ?? from),
        to: Math.max(to, before?.to ?? to),
        builtAt: new Date().toISOString(),
        simVersion: version,
        builder: 'wasmegg/ascension-planner scripts/buildTable.ts',
      },
      null,
      1
    )
  );
}

interface HourReport {
  h: number;
  source: PrefixSource;
  prefixSeconds: number;
  msPrefix: number;
  msRest: number;
  verify?: TaskResult['verify'];
}

/** One start TE in flight: seeds first, then the other hours. */
class TeJob {
  seeds: Partial<Record<EventClass, TaskResult>> = {};
  results = new Map<number, HourReport & { builds: BuildParams[] }>();
  constructor(readonly te: number) {}
  get done() {
    return this.results.size === WEEK_HOURS;
  }
}

async function generate(): Promise<void> {
  const out = arg('out');
  if (!out) throw new Error('--generate needs --out DIR');
  mkdirSync(out, { recursive: true });
  const from = Number(arg('from', String(TABLE_FROM)));
  const to = Number(arg('to', String(TABLE_TO)));
  const jobs = Math.max(1, Number(arg('jobs', '7')));
  const reuse = !has('no-reuse');
  const verify = has('verify');
  // --tes 120,250,489: only these start TEs (a sample, e.g. for --verify), instead of --from..--to.
  const candidates =
    arg('tes')?.split(',').map(Number) ?? Array.from({ length: to - from + 1 }, (_, i) => to - i);
  // An empty entry (`--tes 120,,140`, or `seq -s,`'s trailing comma) reads as 0: refuse it rather
  // than spend hours building a TE-0 farm.
  const bad = candidates.filter(te => !Number.isInteger(te) || te < 1 || te > 489);
  if (bad.length) throw new Error(`start TEs must be whole numbers 1-489, got ${bad.join(', ')}`);
  writeMeta(out, Math.min(...candidates), Math.max(...candidates));
  const pendingTEs = candidates.sort((a, b) => b - a).filter(te => !existsSync(teFile(out, te, 'jsonl')));
  console.log(`${pendingTEs.length} start TEs to build, ${jobs} processes, reuse ${reuse ? 'on' : 'off'}${verify ? ', verifying' : ''}`);
  if (!pendingTEs.length) return;

  let nextId = 0;
  const queue: Task[] = [];
  const callbacks = new Map<number, (r: TaskResult) => void>();
  const t0 = Date.now();
  let cellsDone = 0;
  const totalCells = pendingTEs.length * WEEK_HOURS;

  const finishTE = (job: TeJob) => {
    const hours = [...job.results.values()].sort((a, b) => a.h - b.h);
    const lines = hours.map(r => JSON.stringify({ te: job.te, h: r.h, builds: r.builds })).join('\n') + '\n';
    const report = {
      te: job.te,
      seedHours: SEED_HOURS,
      seedPrefixSeconds: Object.fromEntries(Object.entries(job.seeds).map(([k, v]) => [k, v!.prefixSeconds])),
      reused: hours.filter(r => r.source.kind === 'reuse').length,
      fresh: hours.filter(r => r.source.kind !== 'reuse').length,
      verifyMismatches: hours.filter(r => r.verify && !r.verify.buildsSame).map(r => r.h),
      prefixMismatches: hours.filter(r => r.verify && !r.verify.prefixSame).map(r => r.h),
      hours: hours.map(({ builds: _b, ...rest }) => rest),
    };
    writeFileSync(teFile(out, job.te, 'report.json.tmp'), JSON.stringify(report, null, 1));
    renameSync(teFile(out, job.te, 'report.json.tmp'), teFile(out, job.te, 'report.json'));
    writeFileSync(teFile(out, job.te, 'jsonl.tmp'), lines);
    renameSync(teFile(out, job.te, 'jsonl.tmp'), teFile(out, job.te, 'jsonl'));
    const verifyNote = verify
      ? `, verify: ${report.verifyMismatches.length} cell / ${report.prefixMismatches.length} prefix mismatches`
      : '';
    console.log(`TE ${job.te} done: ${report.reused} reused, ${report.fresh} fresh${verifyNote}`);
  };

  const record = (job: TeJob, h: number, source: PrefixSource, r: TaskResult) => {
    job.results.set(h, {
      h,
      source,
      builds: r.builds,
      prefixSeconds: r.prefixSeconds,
      msPrefix: r.msPrefix,
      msRest: r.msRest,
      ...(r.verify ? { verify: r.verify } : {}),
    });
    cellsDone++;
    if (cellsDone % 24 === 0 || job.done) {
      const perCell = (Date.now() - t0) / cellsDone;
      console.log(`  ${cellsDone}/${totalCells} cells, ${(perCell / 1000).toFixed(2)} s/cell wall, about ${((perCell * (totalCells - cellsDone)) / 60000).toFixed(0)} min left`);
    }
    if (job.done) finishTE(job);
  };

  const enqueue = (task: Omit<Task, 'id'>, cb: (r: TaskResult) => void) => {
    const id = nextId++;
    callbacks.set(id, cb);
    queue.push({ ...task, id });
  };

  const startTE = (te: number) => {
    const job = new TeJob(te);
    if (!reuse) {
      for (const h of allHours()) enqueue({ te, h }, r => record(job, h, { kind: 'fresh', reason: 'crosses' }, r));
      return;
    }
    const classes = Object.keys(SEED_HOURS) as EventClass[];
    for (const cls of classes) {
      const h = SEED_HOURS[cls];
      enqueue({ te, h, keepPrefix: true }, r => {
        job.seeds[cls] = r;
        record(job, h, { kind: 'seed' }, { ...r, prefix: undefined });
        if (classes.every(c => job.seeds[c])) {
          const seedSeconds = Object.fromEntries(classes.map(c => [c, job.seeds[c]!.prefixSeconds])) as Record<EventClass, number>;
          for (const hh of allHours()) {
            const source = prefixSourceFor(hh, seedSeconds);
            if (source.kind === 'seed') continue;
            const seedPrefix = source.kind === 'reuse' ? job.seeds[classes.find(c => SEED_HOURS[c] === source.seedHour)!]!.prefix : undefined;
            enqueue({ te, h: hh, prefix: seedPrefix, verify }, rr => record(job, hh, source, rr));
          }
        }
      });
    }
  };

  // Hours of TEs already started go first; the next TE starts only when nothing else is queued.
  const nextTask = (): Task | undefined => {
    if (!queue.length && pendingTEs.length) startTE(pendingTEs.shift()!);
    return queue.shift();
  };

  const childArgs = process.argv.slice(2).filter(a => a !== '--generate');
  let idle = 0;
  await new Promise<void>((resolve, reject) => {
    const workers = Array.from({ length: jobs }, () => fork(process.argv[1], [...childArgs, '--worker']));
    const feed = (child: ReturnType<typeof fork>) => {
      const task = nextTask();
      if (task) {
        (child as unknown as { busy: boolean }).busy = true;
        child.send(task);
      } else {
        (child as unknown as { busy: boolean }).busy = false;
        idle++;
        // Seeds still running can unlock more hours: wait for them before stopping.
        if (workers.every(w => !(w as unknown as { busy: boolean }).busy) && !pendingTEs.length) {
          workers.forEach(w => w.send({ quit: true }));
          resolve();
        }
      }
    };
    for (const child of workers) {
      child.on('message', (m: { ready?: boolean } | TaskResult) => {
        if ('ready' in m) return feed(child);
        const r = m as TaskResult;
        const cb = callbacks.get(r.id)!;
        callbacks.delete(r.id);
        cb(r);
        // A finished seed may have queued hours: wake idle workers.
        for (const w of workers) if (w !== child && !(w as unknown as { busy: boolean }).busy && queue.length) feed(w);
        feed(child);
      });
      child.on('exit', code => (code ? reject(new Error(`worker exited with code ${code}`)) : undefined));
    }
  });
  void idle;
  console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

// --- Pack -------------------------------------------------------------------------------------------

/** Numbers per build slot in table.bin: [sales + 8 if tier 13 (0 = empty), waitStart, saleEnd, peakELR, delivered x 5]. */
const FIELDS = 9;

/**
 * AutoAutoAP's table file (their src/search/precomputedTable.ts `packTable`, byte for byte): a
 * little-endian uint32 header length, the header as UTF-8 JSON, padding to 8 bytes, then float64s
 * for each start TE `from..to`, each of the 168 hours, `slots` builds.
 */
function packTable(header: Record<string, unknown> & { from: number; to: number }, cells: Cell[]): Uint8Array {
  const slots = Math.max(1, ...cells.map(c => c.builds.length));
  const json = new TextEncoder().encode(JSON.stringify({ ...header, slots }));
  const start = Math.ceil((4 + json.length) / 8) * 8;
  const count = (header.to - header.from + 1) * WEEK_HOURS * slots * FIELDS;
  const bytes = new Uint8Array(start + count * 8);
  new DataView(bytes.buffer).setUint32(0, json.length, true);
  bytes.set(json, 4);
  const body = new Float64Array(bytes.buffer, start, count);
  for (const c of cells) {
    c.builds.forEach((b, i) => {
      const at = (((c.te - header.from) * WEEK_HOURS + c.h) * slots + i) * FIELDS;
      body[at] = b.sales + (b.tier13 ? 8 : 0);
      body[at + 1] = b.waitStart;
      body[at + 2] = b.saleEnd;
      body[at + 3] = b.peakELR;
      for (let e = 0; e < EGG_ORDER.length; e++) body[at + 4 + e] = b.delivered[e];
    });
  }
  return bytes;
}

/** The packed file read back the way their `readTable` reads it: every cell must come back exact. */
function checkPacked(bytes: Uint8Array, cells: Cell[]): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = view.getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + len)));
  const start = Math.ceil((4 + len) / 8) * 8;
  const expected = start + (header.to - header.from + 1) * WEEK_HOURS * header.slots * FIELDS * 8;
  if (bytes.byteLength !== expected) throw new Error(`packed ${bytes.byteLength} bytes, header says ${expected}`);
  const body = new Float64Array(bytes.buffer.slice(bytes.byteOffset + start, bytes.byteOffset + bytes.byteLength));
  for (const c of cells) {
    const key = (c.te - header.from) * WEEK_HOURS + c.h;
    const back: BuildParams[] = [];
    for (let i = 0; i < header.slots; i++) {
      const at = (key * header.slots + i) * FIELDS;
      const flags = body[at];
      if (!flags) continue;
      back.push({
        sales: flags % 8,
        tier13: flags >= 8,
        waitStart: body[at + 1],
        saleEnd: body[at + 2],
        peakELR: body[at + 3],
        delivered: Array.from(body.subarray(at + 4, at + 4 + EGG_ORDER.length)),
      });
    }
    if (JSON.stringify(back) !== JSON.stringify(c.builds)) throw new Error(`cell TE ${c.te} hour ${c.h} did not read back`);
  }
}

interface Cell {
  te: number;
  h: number;
  builds: BuildParams[];
}

function pack(): void {
  const dir = arg('table');
  const out = arg('out', `${dir}/table.bin`)!;
  if (!dir) throw new Error('--pack needs --table DIR');
  const meta = JSON.parse(readFileSync(`${dir}/meta.json`, 'utf8'));
  const tes = readdirSync(dir)
    .map(f => /^te-(\d+)\.jsonl$/.exec(f))
    .filter((m): m is RegExpExecArray => !!m)
    .map(m => Number(m[1]))
    .sort((a, b) => a - b);
  if (!tes.length) throw new Error(`nothing generated yet in ${dir}`);
  // A route climbs through every TE, so only a contiguous run is useful: the longest one ending at the top.
  let from = tes[tes.length - 1];
  while (tes.includes(from - 1)) from--;
  const to = tes[tes.length - 1];
  const cells: Cell[] = [];
  for (let te = from; te <= to; te++) {
    const lines = readFileSync(teFile(dir, te, 'jsonl'), 'utf8').split('\n').filter(Boolean);
    if (lines.length !== WEEK_HOURS) throw new Error(`TE ${te} has ${lines.length} hours, not ${WEEK_HOURS}`);
    for (const line of lines) cells.push(JSON.parse(line));
  }
  const bytes = packTable(
    {
      version: 1,
      referenceWeek: meta.referenceWeek,
      cteBonus: meta.cteBonus,
      deliveryScore: meta.deliveryScore?.score ?? 1,
      from,
      to,
      builtAt: meta.builtAt,
      simVersion: meta.simVersion,
      k3: JSON.parse(readFileSync(`${dir}/k3.json`, 'utf8')),
    },
    cells
  );
  checkPacked(bytes, cells);
  writeFileSync(out, bytes);
  writeFileSync(`${out}.gz`, gzipSync(bytes, { level: 9 }));
  console.log(`packed start TEs ${from}-${to} (${cells.length} cells) into ${out}: ${(bytes.length / 1e6).toFixed(1)} MB, read back exact`);
}

// ------------------------------------------------------------------------------------------------------

if (has('worker')) workerMain();
else if (has('generate')) generate().catch(e => (console.error(e), process.exit(1)));
else if (has('pack')) pack();
else {
  console.log('usage: --generate --out DIR [--from TE] [--to TE] [--tes A,B] [--jobs N] [--verify] [--no-reuse] | --pack --table DIR [--out FILE]');
  process.exit(1);
}
