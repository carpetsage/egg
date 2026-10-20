/**
 * The fastest route to a target TE, or the highest TE by a date, from a precomputed table: every
 * stop at every TE, any number of ascensions, in a second or two. Ported from AutoAutoAP
 * (github.com/william-egginc/AutoAutoAP, branch ascension-chain-search, src/search/routeFinder.ts)
 * without its "works inside my hours" filter, the player's own first ascension (continue / build-up)
 * or the background wide polish: here every ascension, the first included, is a fresh build from
 * the table.
 *
 * HOW. The state between ascensions is (TE, time, egg counts). An ascension that starts later never
 * ends sooner, and more eggs never make one slower, so an arrival that is no later with at least the
 * counts of another beats it outright. The search is one pass per number of ascensions, keeping at
 * each TE the arrivals nothing beats: the fastest route of every length comes out of the same pass.
 *
 * ON THE HOUR. Each ascension starts at the next whole hour, where the table was simulated, so its
 * time is the simulator's. Inside the weekly Research Sale a start is also priced from its own hour's
 * cell moved by the seconds it is late (`startInSale`), which is exact there, so a route does not
 * wait a week for want of an hour.
 */
import { getNextSaleEnd, isResearchSaleActive } from '@/lib/events';
import { countTEThresholdsPassed } from '@/lib/truthEggs';
import {
  bestTailTo,
  canonicalDelivered,
  lastWaitEgg,
  pacificHourOfWeek,
  rebase,
  sweepTails,
  type BuildParams,
  type TailSweep,
} from './precomputedLeg';

/** The table as the finder reads it: the builds for a start TE at a Pacific hour of the week. */
export type BuildLookup = (te: number, hour: number) => BuildParams[] | null;

export interface RouteLeg {
  /** TE the ascension starts at, and the stop it ascends at. */
  from: number;
  to: number;
  /** TE it actually ends at (above `to` when the build's sale wait overshoots). */
  endTE: number;
  /** Unix seconds. */
  start: number;
  end: number;
  sales: number;
  tier13: boolean;
  /** The first leg only: continuing the ascension in progress instead of prestiging. */
  continued?: boolean;
  /** Its prestige waited for a blocked date or hour to pass (`FindOptions.avoid`); the eggs laid
   *  meanwhile are counted in its start (`holdArrival`). */
  held?: boolean;
}

export interface Route {
  /** Stops, ending at the target (or, by a date, the highest TE reached). */
  chain: number[];
  legs: RouteLeg[];
  /** Unix second the last stop is reached. */
  end: number;
  seconds: number;
}

export interface FindOptions {
  /** The TE the plan starts from and the unix second it starts. */
  startTE: number;
  start: number;
  /** Eggs delivered per egg at the start (EGG_ORDER); the table's canonical share of `startTE` if
   *  left out. */
  startDelivered?: number[];
  /** The ascension in progress, as a build (lib/instantSearch/currentAscension.ts): then the first
   *  leg to each stop is whichever ends sooner of continuing it (from `start`) and prestiging
   *  (`firstLegOptions`). Without it, the first leg is always a prestige. */
  cont?: BuildParams | null;
  /** The egg the farm in progress is on (EGG_ORDER index): a first prestige that waits credits its
   *  laying there. */
  contEgg?: number;
  /** The target TE (490 for By a date). */
  final: number;
  /** Most ascensions to consider. */
  maxAscensions: number;
  /** Also find the highest TE reachable by this unix second. */
  deadline?: number;
  /** Times no prestige may start in (dates to avoid, blocked hours), sorted and merged
   *  (`mergeBlocked`). A prestige that would start in one waits for the first whole hour after it, as
   *  AutoAutoAP's "works inside my hours" holds a prestige, and the farm lays on meanwhile
   *  (`holdArrival`). Continuing needs no prestige, so it is never held; nor is reaching the last stop. */
  avoid?: Blocked;
  /** Told after each number of ascensions is done, for a progress line. */
  onProgress?: (done: number, of: number) => void;
}

/** [start, end) unix-second spans, sorted, none touching another. */
export type Blocked = [number, number][];

/** Spans sorted and joined where they touch or overlap. */
export function mergeBlocked(spans: Blocked): Blocked {
  const out: Blocked = [];
  for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** The first moment at or after `t` outside every blocked span (by halving: blocked hours over a
 *  plan's years are a few thousand spans). Spans never touch, so one step out is enough. */
export function nextAllowed(t: number, blocked: Blocked | undefined): number {
  if (!blocked?.length) return t;
  let lo = 0;
  let hi = blocked.length - 1;
  let at = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (blocked[mid][0] <= t) {
      at = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return at >= 0 && t < blocked[at][1] ? blocked[at][1] : t;
}

/** The farm a stop is reached on: the egg it lays (EGG_ORDER index) and its rate, eggs per second. */
export interface Farm {
  egg: number;
  rate: number;
}

/** The farm a tail leaves laying: the last egg its waits raised (`lastWaitEgg`), at the build's rate. */
function farmAfter(b: BuildParams, end: ArrayLike<number>): Farm {
  return { egg: lastWaitEgg(b.delivered, Array.from(end)), rate: b.peakELR };
}

const teOf = (delivered: number[]) => delivered.reduce((n, d) => n + countTEThresholdsPassed(d), 0);

/**
 * An arrival at a stop reached at `reached`, as the next prestige finds it. When that prestige must
 * wait for a blocked span (`prestigeAt` later than the next whole hour), the farm lays on at its rate
 * on the egg it is on, and those eggs carry into the next ascension (`rebase`): the arrival is then
 * at the prestige moment, with the extra eggs and the TE they make. The usual wait for the next whole
 * hour is not credited, so with nothing blocked every answer is as before (and as AutoAutoAP's).
 * No silo cap: the player is assumed to keep the farm running.
 */
export function holdArrival(
  reached: number,
  delivered: number[],
  farm: Farm | null,
  avoid: Blocked | undefined
): { held: boolean; at: number; delivered: number[]; te: number } {
  const at = prestigeAt(reached, avoid);
  const hold = at - nextHour(reached);
  if (!(hold > 0)) return { held: false, at, delivered, te: teOf(delivered) };
  const eggs = [...delivered];
  if (farm && farm.rate > 0) eggs[farm.egg] += farm.rate * hold;
  return { held: true, at, delivered: eggs, te: teOf(eggs) };
}

/** When a prestige ready at `t` starts: the next whole hour, or the first whole hour after the
 *  blocked span it falls in. */
function prestigeAt(t: number, blocked: Blocked | undefined): number {
  let at = nextHour(t);
  // Rounding up to the hour can land in a span that starts within the hour: go again until it doesn't.
  for (;;) {
    const next = nextHour(nextAllowed(at, blocked));
    if (next === at) return at;
    at = next;
  }
}

export interface FoundRoutes {
  /** The fastest to `final` overall, and for each number of ascensions (index = ascensions). */
  best: Route | null;
  byAscensions: (Route | null)[];
  /** With `deadline`: the route to the highest TE in time, overall and for each count. */
  byDate: Route | null;
  byDateByAscensions: (Route | null)[];
  /** Routes the search weighed: every arrival offered after each ascension, kept or beaten. */
  checked: number;
}

/** The next whole hour at or after `t`. Pacific hours begin on UTC hour boundaries. */
export function nextHour(t: number): number {
  return Math.ceil(t / 3600) * 3600;
}

/** Purchases must end this long before the sale does to count as inside it. */
const SALE_MARGIN = 60;

/**
 * Inside the Research Sale, a start priced from its own hour's cell, moved the seconds it is late,
 * for each build whose purchases still finish before this sale ends. Exact: such a build lies wholly
 * inside one sale window, where nothing depends on the clock but the sale's end.
 */
function startInSale(table: BuildLookup, te: number, t: number): { lateBy: number; builds: BuildParams[] } | null {
  const cell = Math.floor(t / 3600) * 3600;
  const lateBy = t - cell;
  if (!(lateBy > 0) || !isResearchSaleActive(cell) || !isResearchSaleActive(t)) return null;
  const left = getNextSaleEnd(t) - t;
  // A sale lasts a day; anything longer means the end found was the next week's.
  if (!(left > 0 && left <= 86400)) return null;
  const builds = (table(te, pacificHourOfWeek(cell)) ?? []).filter(b => b.waitStart <= left - SALE_MARGIN);
  return builds.length ? { lateBy, builds } : null;
}

/** One ascension from `te` at `t` to `target`: from the next whole hour's cell, or from this hour's
 *  inside the sale, whichever ends sooner. */
function priceLeg(
  table: BuildLookup,
  te: number,
  t: number,
  delivered: number[],
  target: number,
  avoid?: Blocked
): { start: number; end: number; endTE: number; delivered: number[]; build: BuildParams } | null {
  const options: { start: number; lateBy: number; builds: BuildParams[] }[] = [];
  const at = prestigeAt(t, avoid);
  const raw = table(te, pacificHourOfWeek(at));
  if (raw?.length) options.push({ start: at, lateBy: 0, builds: raw });
  const late = at !== t && nextAllowed(t, avoid) === t ? startInSale(table, te, t) : null;
  if (late) options.push({ start: t, ...late });
  let best: ReturnType<typeof priceLeg> = null;
  for (const o of options) {
    const tail = bestTailTo(
      o.builds.map(b => rebase(b, te, delivered)),
      target,
      o.lateBy
    );
    if (tail && (!best || o.start + tail.seconds < best.end))
      best = { start: o.start, end: o.start + tail.seconds, endTE: tail.endTE, delivered: tail.delivered, build: tail.build };
  }
  return best;
}

interface Label {
  id: number;
  /** When the next prestige can start: the stop's reaching, or after a hold the prestige moment. */
  time: number;
  /** Eggs delivered per egg then: the next build is moved onto these (`rebase`). */
  delivered: number[];
  prev: Label | null;
  leg: RouteLeg | null;
  /** The next prestige waited for a blocked span (`holdArrival`): its leg is marked held. */
  heldNext?: boolean;
}

/**
 * Where a stop reached at `end` leaves the route for its next ascension (`holdArrival`): as reached,
 * or, when the next prestige must wait, at the prestige moment with the farm's extra eggs (and the
 * TE they make, which can be more). Null when the wait itself reaches the target: the direct leg to
 * it covers that. With a wait that adds TE, `terminal` is the stop as reached, for By a date to end
 * on (the held arrival is filed at the higher TE and its leg still says what was reached when).
 */
function settleArrival(
  endTE: number,
  end: number,
  eggs: number[],
  farm: Farm,
  top: number,
  avoid: Blocked | undefined
): { te: number; time: number; delivered: number[]; heldNext: boolean; terminal: boolean } | null {
  const reached = Math.min(endTE, top);
  if (reached >= top || !avoid?.length) return { te: reached, time: end, delivered: eggs, heldNext: false, terminal: false };
  const h = holdArrival(end, eggs, farm, avoid);
  if (!h.held) return { te: reached, time: end, delivered: eggs, heldNext: false, terminal: false };
  if (h.te >= top) return null;
  return { te: h.te, time: h.at, delivered: h.delivered, heldNext: true, terminal: h.te > reached };
}

/** The build that reaches `target` soonest (least time, the first of equals). */
function fastest(sweeps: TailSweep[], builds: BuildParams[], target: number) {
  let best: { sweep: TailSweep; build: BuildParams; i: number } | null = null;
  for (let j = 0; j < sweeps.length; j++) {
    const sw = sweeps[j];
    const i = target - sw.from;
    if (i < 0 || i >= sw.seconds.length) continue;
    const sec = sw.seconds[i];
    if (Number.isNaN(sec)) continue;
    if (!best || sec < best.sweep.seconds[best.i]) best = { sweep: sw, build: builds[j], i };
  }
  return best;
}

/**
 * Differences too small to matter between two arrivals: a minute, and a few tens of seconds' eggs at
 * peak delivery. Without the slack, near-copies that differ by a few billion eggs each "beat" one
 * another and nothing is ever discarded.
 */
const TIME_SLACK = 60;
const EGG_SLACK = 1e14;

function dominates(a: { time: number; delivered: number[] }, b: { time: number; delivered: number[] }): boolean {
  if (a.time > b.time + TIME_SLACK) return false;
  for (let i = 0; i < a.delivered.length; i++) if (a.delivered[i] < b.delivered[i] - EGG_SLACK) return false;
  return true;
}

/** Arrivals kept per (TE, ascensions). */
const KEEP = 6;

/**
 * The highest stop worth ascending at on the way to a later target. Past about TE 340 a build already
 * reaches the full laying rate, so another ascension there only adds a prestige and a rebuild
 * (AutoAutoAP measured no fastest route with a stop above 338 over 650 routes). A route can still END
 * above it.
 */
const USEFUL_STOP_MAX = 360;

type Kept<T> = T & { time: number; delivered: number[] };

/** Add to an earliest-first list, keeping only the unbeaten and at most KEEP. */
function keepUnbeaten<T>(list: Kept<T>[] | undefined, item: Kept<T>): Kept<T>[] {
  if (!list) return [item];
  if (list.some(l => dominates(l, item))) return list;
  const kept = list.filter(l => !dominates(item, l));
  let at = kept.findIndex(l => l.time > item.time);
  if (at < 0) at = kept.length;
  kept.splice(at, 0, item);
  if (kept.length > KEEP) kept.length = KEEP;
  return kept;
}

/**
 * Sweeps kept across a search's steps (the same counts at the same TE and hour come back at other
 * numbers of ascensions), held to a memory budget, least recently used out first.
 */
class SweepCache {
  private map = new Map<string, TailSweep>();
  private bytes = 0;
  constructor(private readonly maxBytes = 512 * 1024 * 1024) {}
  get(key: string): TailSweep | undefined {
    const sw = this.map.get(key);
    if (sw) {
      this.map.delete(key);
      this.map.set(key, sw);
    }
    return sw;
  }
  set(key: string, sweep: TailSweep): void {
    const old = this.map.get(key);
    if (old) {
      this.bytes -= old.bytes;
      this.map.delete(key);
    }
    this.map.set(key, sweep);
    this.bytes += sweep.bytes;
    for (const [k, sw] of this.map) {
      if (this.bytes <= this.maxBytes || k === key) break;
      this.map.delete(k);
      this.bytes -= sw.bytes;
    }
  }
}

interface Arrival {
  id: number;
  te: number;
  time: number;
  delivered: number[];
  /** The stop it ascended at (absent at the start). */
  stop?: number;
  /** Its prestige already waited for a blocked span (`settleArrival`). */
  held?: boolean;
}

interface Candidate {
  from: number;
  te: number;
  time: number;
  delivered: number[];
  leg: RouteLeg;
  heldNext?: boolean;
}

/**
 * Carry each arrival one ascension further: every stop above it, from the table's builds for its TE
 * and start hour moved onto its egg counts, keeping per end TE only what nothing beats.
 */
function expandArrivals(
  table: BuildLookup,
  top: number,
  keepHighEnds: boolean,
  items: Arrival[],
  cache: SweepCache,
  avoid?: Blocked
): { candidates: Candidate[]; terminals: Candidate[] } {
  const lists = new Map<number, Candidate[]>();
  const terminals: Candidate[] = [];
  const beaten = (te: number, time: number, eggs: number[]): boolean => {
    const list = lists.get(te);
    if (!list) return false;
    for (const l of list) {
      if (l.time > time + TIME_SLACK) continue;
      let all = true;
      for (let e = 0; e < 5; e++) {
        if (l.delivered[e] < eggs[e] - EGG_SLACK) {
          all = false;
          break;
        }
      }
      if (all) return true;
    }
    return false;
  };
  const sweepOf = (b: BuildParams, key: string, lateBy: number, lowest: number): TailSweep => {
    let sw = cache.get(key);
    if (!sw) {
      sw = sweepTails(b, top, lateBy, lowest);
      cache.set(key, sw);
    }
    return sw;
  };
  const scratch = [0, 0, 0, 0, 0];

  for (const item of items) {
    if (item.stop !== undefined && item.stop > USEFUL_STOP_MAX) continue;
    const te = item.te;
    const startAt = prestigeAt(item.time, avoid);
    // Held here only at the plan start; later holds were settled on arrival (`settleArrival`).
    const held = item.held || startAt !== nextHour(item.time);
    const raw = table(te, pacificHourOfWeek(startAt)) ?? [];
    // At once inside the sale, unless that moment is an avoided one.
    const late =
      startAt !== item.time && nextAllowed(item.time, avoid) === item.time ? startInSale(table, te, item.time) : null;
    if (!raw.length && !late) continue;
    const builds = raw.map(b => rebase(b, te, item.delivered));
    const countsKey = `${te}|${startAt}|${item.delivered.join(',')}|`;
    const sweeps = builds.map((b, j) => sweepOf(b, countsKey + j, 0, te + 1));
    const lateBuilds = late ? late.builds.map(b => rebase(b, te, item.delivered)) : [];
    const lateKey = `${te}|${item.time}|${item.delivered.join(',')}|late|`;
    const lateSweeps = lateBuilds.map((b, j) => sweepOf(b, lateKey + j, late!.lateBy, te + 1));
    for (let target = te + 1; target <= top; target++) {
      // A stop above the cap that is not the target leads nowhere (it is never continued from).
      if (target > USEFUL_STOP_MAX && target < top && !keepHighEnds) continue;
      const onHour = fastest(sweeps, builds, target);
      const early = late ? fastest(lateSweeps, lateBuilds, target) : null;
      const takeEarly =
        !!early && (!onHour || item.time + early.sweep.seconds[early.i] < startAt + onHour.sweep.seconds[onHour.i]);
      const pick = takeEarly ? early : onHour;
      if (!pick) continue;
      const { sweep, build, i } = pick;
      const legStart = takeEarly ? item.time : startAt;
      const end = legStart + sweep.seconds[i];
      const endTE = sweep.endTE[i];
      sweep.deliveredInto(i, scratch);
      const leg: RouteLeg = {
        from: te,
        to: target,
        endTE,
        start: legStart,
        end,
        sales: build.sales,
        tier13: build.tier13,
        ...(held && !takeEarly ? { held: true } : {}),
      };
      const settled = settleArrival(endTE, end, scratch.slice(), farmAfter(build, scratch), top, avoid);
      if (!settled) continue;
      if (settled.terminal)
        terminals.push({ from: item.id, te: Math.min(endTE, top), time: end, delivered: scratch.slice(), leg });
      if (beaten(settled.te, settled.time, settled.delivered)) continue;
      lists.set(
        settled.te,
        keepUnbeaten(lists.get(settled.te), {
          from: item.id,
          te: settled.te,
          time: settled.time,
          delivered: settled.delivered,
          leg,
          ...(settled.heldNext ? { heldNext: true } : {}),
        })
      );
    }
  }
  return { candidates: [...lists.keys()].sort((a, b) => a - b).flatMap(te => lists.get(te)!), terminals };
}

/** Continue is not a candidate past this on the way to a later stop (AutoAutoAP's
 *  CONTINUE_MAX_SECONDS): a year on one farm is not a plan. Continuing to where the route ends is
 *  always kept, however long, so the 1-ascension row says what not prestiging at all would take. */
export const CONTINUE_MAX_SECONDS = 183 * 86400;

/** The first ascension to one stop: where it ends, when, and whether it continued or prestiged. */
export interface FirstLeg {
  /** The TE it starts at: the start TE, or more when a waiting first prestige's eggs made more. */
  from: number;
  to: number;
  endTE: number;
  start: number;
  end: number;
  /** Eggs delivered per egg when it ends (EGG_ORDER). */
  delivered: number[];
  continued: boolean;
  sales: number;
  tier13: boolean;
  held?: boolean;
  /** The farm it leaves laying (`farmAfter`). */
  farm: Farm;
}

/**
 * The first ascension to every stop above `startTE`, both ways (after AutoAutoAP's `firstLegOptions`):
 * continuing the one in progress, from `start`, and a fresh build from the table moved onto the real
 * egg counts, on the next whole hour (or at once inside the sale, whichever ends sooner).
 *
 * Both are kept, because they count differently: prestiging now ends the ascension in progress, so
 * it is an ascension of its own (`findRoutes` files a prestige-first route one count higher), where
 * continuing it to the stop is that same ascension.
 */
export function firstLegOptions(table: BuildLookup, o: FindOptions & { cont: BuildParams }): FirstLeg[] {
  const te = o.startTE;
  const delivered = o.startDelivered ?? canonicalDelivered(te);
  // A first prestige that waits: the farm in progress lays on meanwhile (`holdArrival`), so the fresh
  // build starts from those eggs, at the TE they make.
  const farm = o.contEgg !== undefined ? { egg: o.contEgg, rate: o.cont.peakELR } : null;
  const hold = holdArrival(o.start, delivered, farm, o.avoid);
  const freshAt = hold.at;
  const held = hold.held;
  const freshTE = held ? Math.max(te, hold.te) : te;
  const freshEggs = held ? hold.delivered : delivered;
  const fresh = (table(freshTE, pacificHourOfWeek(freshAt)) ?? []).map(b => rebase(b, freshTE, freshEggs));
  const freshSweeps = fresh.map(b => sweepTails(b, o.final, 0, freshTE + 1));
  const late =
    freshAt !== o.start && nextAllowed(o.start, o.avoid) === o.start ? startInSale(table, te, o.start) : null;
  const lateFresh = late ? late.builds.map(b => rebase(b, te, delivered)) : [];
  const lateSweeps = lateFresh.map(b => sweepTails(b, o.final, late!.lateBy, te + 1));
  const contSweep = sweepTails(o.cont, o.final, 0, te + 1);

  const out: FirstLeg[] = [];
  for (let target = te + 1; target <= o.final; target++) {
    const options: FirstLeg[] = [];
    const add = (sw: TailSweep, i: number, start: number, continued: boolean, b: BuildParams, from: number) => {
      const eggs = [0, 0, 0, 0, 0];
      sw.deliveredInto(i, eggs);
      options.push({
        from,
        to: target,
        endTE: sw.endTE[i],
        start,
        end: start + sw.seconds[i],
        delivered: eggs,
        continued,
        sales: b.sales,
        tier13: b.tier13,
        ...(held && !continued && start === freshAt ? { held: true } : {}),
        farm: farmAfter(b, eggs),
      });
    };
    const onHour = fastest(freshSweeps, fresh, target);
    if (onHour) add(onHour.sweep, onHour.i, freshAt, false, onHour.build, freshTE);
    const now = late ? fastest(lateSweeps, lateFresh, target) : null;
    if (now) add(now.sweep, now.i, o.start, false, now.build, te);
    // The sooner prestige: on the hour, or at once inside the sale.
    const f = options.reduce<FirstLeg | null>((a, x) => (!a || x.end < a.end ? x : a), null);
    const ci = target - contSweep.from;
    const contSeconds = ci >= 0 && ci < contSweep.seconds.length ? contSweep.seconds[ci] : NaN;
    let c: FirstLeg | null = null;
    // Where the route can end: the target, or by a date anything reached in time.
    const routeEnd = target === o.final || (o.deadline !== undefined && o.start + contSeconds <= o.deadline);
    if (contSeconds <= CONTINUE_MAX_SECONDS || (routeEnd && Number.isFinite(contSeconds))) {
      const before = options.length;
      add(contSweep, ci, o.start, true, o.cont, te);
      c = options[before];
    }
    if (f) out.push(f);
    if (c) out.push(c);
  }
  return out;
}

/**
 * The fastest route to `final` with each number of ascensions, and the fastest overall; with a
 * deadline, also the highest TE reached in time for each count and overall.
 */
export function findRoutes(table: BuildLookup, o: FindOptions): FoundRoutes {
  const K = o.maxAscensions;
  const top = o.final;
  const keepHighEnds = o.deadline !== undefined;
  const cache = new SweepCache();
  let nextId = 0;
  const byId = new Map<number, Label>();
  const label = (l: Omit<Label, 'id'>): Label => {
    const made = { ...l, id: nextId++ };
    byId.set(made.id, made);
    return made;
  };
  // arrivals[k].get(te): the arrivals at TE `te` after k ascensions, earliest first.
  const arrivals: Map<number, Label[]>[] = Array.from({ length: K + 1 }, () => new Map());
  arrivals[0].set(o.startTE, [
    label({ time: o.start, delivered: o.startDelivered ?? canonicalDelivered(o.startTE), prev: null, leg: null }),
  ]);
  let checked = 0;
  const relax = (k: number, te: number, l: Omit<Label, 'id'>) => {
    checked++;
    const list = arrivals[k].get(te);
    if (list?.some(x => dominates(x, l))) return;
    arrivals[k].set(te, keepUnbeaten(list, label(l)));
  };
  // By a date: stops reached before a wait that added TE, ends only (`settleArrival`).
  const terminals: Label[][] = Array.from({ length: K + 1 }, () => []);

  for (let k = 0; k < K; k++) {
    o.onProgress?.(k, K);
    if (k === 0 && o.cont) {
      const start = arrivals[0].get(o.startTE)![0];
      // The ascension in progress is the first: continuing it to a stop is one ascension; prestiging it
      // now ends it, and the fresh build to the stop is a second.
      for (const f of firstLegOptions(table, { ...o, cont: o.cont })) {
        const k1 = f.continued ? 1 : 2;
        if (k1 > K) continue;
        const leg = firstLeg(f);
        const settled = settleArrival(f.endTE, f.end, f.delivered, f.farm, top, o.avoid);
        if (!settled) continue;
        if (settled.terminal && keepHighEnds) {
          checked++;
          terminals[k1].push(label({ time: f.end, delivered: f.delivered, prev: start, leg }));
        }
        relax(k1, settled.te, {
          time: settled.time,
          delivered: settled.delivered,
          prev: start,
          leg,
          ...(settled.heldNext ? { heldNext: true } : {}),
        });
      }
      continue;
    }
    const items: Arrival[] = [];
    for (const te of [...arrivals[k].keys()].filter(te => te < top).sort((a, b) => a - b))
      for (const l of arrivals[k].get(te)!)
        items.push({
          id: l.id,
          te,
          time: l.time,
          delivered: l.delivered,
          ...(l.leg ? { stop: l.leg.to } : {}),
          ...(l.heldNext ? { held: true } : {}),
        });
    if (!items.length) break;
    const { candidates, terminals: ends } = expandArrivals(table, top, keepHighEnds, items, cache, o.avoid);
    for (const c of candidates)
      relax(k + 1, c.te, {
        time: c.time,
        delivered: c.delivered,
        prev: byId.get(c.from) ?? null,
        leg: c.leg,
        ...(c.heldNext ? { heldNext: true } : {}),
      });
    if (keepHighEnds) {
      checked += ends.length;
      for (const c of ends)
        terminals[k + 1].push(label({ time: c.time, delivered: c.delivered, prev: byId.get(c.from) ?? null, leg: c.leg }));
    }
  }
  o.onProgress?.(K, K);

  // A route ends when its last stop is reached (`leg.end`), not when a held prestige after it could start.
  const routeTo = (last: Label): Route => {
    const legs: RouteLeg[] = [];
    for (let l: Label | null = last; l?.leg; l = l.prev) legs.unshift(l.leg);
    const end = last.leg!.end;
    return { chain: legs.map(l => l.to), legs, end, seconds: end - o.start };
  };
  const byAscensions = Array.from({ length: K + 1 }, (_, k) => {
    const last = k ? arrivals[k].get(top)?.[0] : undefined;
    return last ? routeTo(last) : null;
  });
  const best = byAscensions.reduce<Route | null>((a, r) => (r && (!a || r.end < a.end) ? r : a), null);

  let byDate: Route | null = null;
  const byDateByAscensions: (Route | null)[] = Array.from({ length: K + 1 }, () => null);
  if (o.deadline !== undefined) {
    let overall: { te: number; end: number; label: Label } | null = null;
    for (let k = 1; k <= K; k++) {
      // Each arrival as reached: its leg's TE and time (a held arrival is filed by what its wait made).
      let mine: { te: number; end: number; label: Label } | null = null;
      for (const l of [...[...arrivals[k].values()].flat(), ...terminals[k]]) {
        const te = Math.min(l.leg!.endTE, top);
        const end = l.leg!.end;
        if (end > o.deadline) continue;
        if (!mine || te > mine.te || (te === mine.te && end < mine.end)) mine = { te, end, label: l };
      }
      if (!mine) continue;
      byDateByAscensions[k] = routeTo(mine.label);
      if (!overall || mine.te > overall.te || (mine.te === overall.te && mine.end < overall.end)) overall = mine;
    }
    byDate = overall ? routeTo(overall.label) : null;
  }
  return { best, byAscensions, byDate, byDateByAscensions, checked };
}

function firstLeg(f: FirstLeg): RouteLeg {
  return {
    from: f.from,
    to: f.to,
    endTE: f.endTE,
    start: f.start,
    end: f.end,
    sales: f.sales,
    tier13: f.tier13,
    ...(f.continued ? { continued: true } : {}),
    ...(f.held ? { held: true } : {}),
  };
}

/** `chain` priced the way `findRoutes` prices a route: its first leg from `firstLegs` when there is an
 *  ascension in progress, then each stop on the hour (or late inside the sale). Null when a stop is
 *  not above the TE reached by then. */
function priceChain(
  table: BuildLookup,
  o: FindOptions,
  chain: number[],
  firstLegs: FirstLeg[] | null,
  firstContinued: boolean
): Route | null {
  const legs: RouteLeg[] = [];
  let t = o.start;
  let te = o.startTE;
  let eggs = o.startDelivered ?? canonicalDelivered(o.startTE);
  /** The farm the last stop was reached on, for a held prestige's eggs. */
  let farm: Farm | null = null;
  for (const [i, target] of chain.entries()) {
    // After a stop, a prestige that must wait credits the farm's laying (`settleArrival`).
    let heldNext = false;
    if (i > 0 && farm) {
      const h = holdArrival(t, eggs, farm, o.avoid);
      if (h.held) {
        t = h.at;
        eggs = h.delivered;
        te = Math.max(te, h.te);
        heldNext = true;
      }
    }
    if (target <= te) return null;
    if (i === 0 && firstLegs) {
      // The same kind of first step as the route being priced: a prestige-first and a continue-first
      // route are different numbers of ascensions.
      const f = firstLegs.find(x => x.to === target && x.continued === firstContinued);
      if (!f) return null;
      legs.push(firstLeg(f));
      t = f.end;
      te = f.endTE;
      eggs = f.delivered;
      farm = f.farm;
      continue;
    }
    const p = priceLeg(table, te, t, eggs, target, o.avoid);
    if (!p) return null;
    legs.push({
      from: te,
      to: target,
      endTE: p.endTE,
      start: p.start,
      end: p.end,
      sales: p.build.sales,
      tier13: p.build.tier13,
      ...(heldNext || p.start > nextHour(t) ? { held: true } : {}),
    });
    t = p.end;
    te = p.endTE;
    eggs = p.delivered;
    farm = farmAfter(p.build, p.delivered);
  }
  return { chain: [...chain], legs, end: t, seconds: t - o.start };
}

/**
 * A local search around one route: each stop before the last moved by up to 2 TE, then each pair of
 * neighbouring stops by one together, keeping any route `ok` accepts that ends sooner, until nothing
 * improves. The finder can prune a route that a later, better-aligned start makes faster; this finds
 * such a neighbour in milliseconds, and never returns anything slower.
 */
function polishRoute(
  table: BuildLookup,
  o: FindOptions,
  firstLegs: FirstLeg[] | null,
  route: Route,
  ok: (r: Route) => boolean
): Route {
  let best = route;
  const continued = route.legs[0]?.continued === true;
  const tryChain = (c: number[]): boolean => {
    const r = priceChain(table, o, c, firstLegs, continued);
    if (!r || !ok(r) || !(r.end < best.end - 60)) return false;
    best = r;
    return true;
  };
  for (let round = 0; round < 20; round++) {
    let improved = false;
    for (let i = 0; i < best.chain.length - 1; i++) {
      for (let d = -2; d <= 2; d++) {
        if (!d) continue;
        const c = [...best.chain];
        c[i] += d;
        if (tryChain(c)) improved = true;
      }
    }
    for (let i = 0; i + 1 < best.chain.length - 1; i++) {
      for (const [a, b] of [
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ]) {
        const c = [...best.chain];
        c[i] += a;
        c[i + 1] += b;
        if (tryChain(c)) improved = true;
      }
    }
    if (!improved) break;
  }
  return best;
}

/** The last TE a route reaches. */
export function lastTE(r: Route): number {
  return r.legs[r.legs.length - 1]?.endTE ?? 0;
}

/** `findRoutes`' answer with each route polished, and the overall picks made again from them. */
export function polishFound(table: BuildLookup, o: FindOptions, found: FoundRoutes): FoundRoutes {
  const firstLegs = o.cont ? firstLegOptions(table, { ...o, cont: o.cont }) : null;
  const byAscensions = found.byAscensions.map(r => (r ? polishRoute(table, o, firstLegs, r, () => true) : r));
  const best = byAscensions.reduce<Route | null>((a, r) => (r && (!a || r.end < a.end) ? r : a), null);
  if (o.deadline === undefined) return { ...found, best, byAscensions };
  const deadline = o.deadline;
  const byDateByAscensions = found.byDateByAscensions.map(r =>
    r ? polishRoute(table, o, firstLegs, r, c => c.end <= deadline && lastTE(c) >= lastTE(r)) : r
  );
  const byDate = byDateByAscensions.reduce<Route | null>(
    (a, r) => (r && (!a || lastTE(r) > lastTE(a) || (lastTE(r) === lastTE(a) && r.end < a.end)) ? r : a),
    null
  );
  return { ...found, best, byAscensions, byDate, byDateByAscensions };
}
