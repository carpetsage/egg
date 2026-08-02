/**
 * Event-related utility functions.
 */

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';

// Per (day, hour) key: every occurrence discovered so far, sorted ascending, with NO gaps between
// `minSafeFrom` and the list's last entry (each entry was found as "the next occurrence after the
// previous one", so nothing in between was skipped). `minSafeFrom` is the earliest `from` this list
// is proven complete for — the `from` of whichever query first created the entry. See the
// correctness note on `getNextPacificTime` below for why a single growing list (rather than
// remembering just the last query) is both correct and dramatically more cache-effective.
const nextPacificTimeCache = new Map<string, { minSafeFrom: number; occurrences: number[] }>();

/**
 * Calculates the Unix timestamp (in seconds) of the next occurrence of a specific weekday
 * and hour (0-23) in Pacific Time.
 *
 * The underlying search (`computeNextPacificTime`) is a brute-force hour-by-hour
 * `Intl.DateTimeFormat` walk — DST-safe but expensive (up to ~200 Intl calls). Callers can query
 * many DISTINCT, overlapping `from` timestamps in a row (e.g. a milestone chain enumerating every
 * boost cycle within a purchase's wait, then evaluating dozens of candidate researches at that same
 * point in time, each re-deriving the same boundary) — remembering only the single most recent
 * query would mean almost every one of those calls misses and re-walks from scratch, even though
 * they're all asking about the same neighborhood of time. Instead, every occurrence ever discovered
 * for a given (day, hour) key is kept in a sorted, gapless list and reused via binary search — so
 * once ANY caller has walked out to some point, every other caller asking about anything before
 * that point gets an instant answer, no matter how many distinct callers or how far the walk needs
 * to reach (this is what makes waits spanning months or years of boost cycles tractable).
 *
 * Correctness: `minSafeFrom` records the earliest `from` the list is proven complete for (the
 * `from` of whichever query first built it) — each entry after that was found as "the next
 * occurrence after the previous one," so there are no gaps between `minSafeFrom` and the list's
 * last entry. A query is only ever answered from the list if its `from` is `>= minSafeFrom`; a
 * query earlier than that can't be answered from what we currently know (there might be an
 * undiscovered occurrence in between), so it always falls back to a fresh brute-force search and
 * starts a new list from there — same safety property the single-entry cache had, just applied to
 * a growing collection of proven points instead of one.
 *
 * @param targetDayOfWeek - 0 (Sunday) to 6 (Saturday)
 * @param targetHour - 0 to 23
 * @param fromTimestampSeconds - Current simulation time (Unix timestamp in seconds)
 * @returns The next occurrence timestamp in seconds
 */
export function getNextPacificTime(targetDayOfWeek: number, targetHour: number, fromTimestampSeconds: number): number {
  // 8.64e12 is the approximate max safe Unix timestamp in seconds for JavaScript Date (8.64e15 ms)
  if (!Number.isFinite(fromTimestampSeconds) || fromTimestampSeconds > 8.64e12 || fromTimestampSeconds < 0) {
    return fromTimestampSeconds;
  }

  const cacheKey = `${targetDayOfWeek}:${targetHour}`;
  const entry = nextPacificTimeCache.get(cacheKey);

  if (!entry || fromTimestampSeconds < entry.minSafeFrom) {
    // Nothing cached yet for this key, or this query reaches earlier than anything we've proven
    // complete — start (or restart) the list here. Discards any previously-discovered later
    // occurrences for simplicity; this path is rare (query order is overwhelmingly
    // forward-advancing in practice) and still always correct, just not maximally reused.
    const first = computeNextPacificTime(targetDayOfWeek, targetHour, fromTimestampSeconds);
    nextPacificTimeCache.set(cacheKey, { minSafeFrom: fromTimestampSeconds, occurrences: [first] });
    return first;
  }

  const idx = upperBound(entry.occurrences, fromTimestampSeconds);
  if (idx < entry.occurrences.length) {
    return entry.occurrences[idx];
  }

  // Beyond what's been discovered so far for this key. If the gap is small, extend the list
  // forward one weekly step at a time (cheap, and grows the cache for future reuse). But if
  // `fromTimestampSeconds` lands FAR beyond the list's current end — a purchase with a legitimately
  // huge wait (a low-earnings candidate can have a finite but astronomically large `timeToBuySeconds`)
  // can easily land a query centuries away — walking there one week at a time would take as many
  // brute-force computations as weeks in the gap, unlike `computeNextPacificTime` itself, which is
  // O(1) in how far `from` is (a fixed ~200-hour scan) regardless. So beyond a bounded number of
  // incremental steps, jump straight there with one direct call instead, same "start a fresh list"
  // approach as the `minSafeFrom` reset case above.
  const MAX_INCREMENTAL_STEPS = 104; // ~2 years of weekly steps
  const WEEK_SECONDS = 7 * 86400;
  const lastKnown = entry.occurrences[entry.occurrences.length - 1];
  if (fromTimestampSeconds - lastKnown > MAX_INCREMENTAL_STEPS * WEEK_SECONDS) {
    const result = computeNextPacificTime(targetDayOfWeek, targetHour, fromTimestampSeconds);
    nextPacificTimeCache.set(cacheKey, { minSafeFrom: fromTimestampSeconds, occurrences: [result] });
    return result;
  }

  let searchFrom = lastKnown;
  let result: number;
  do {
    result = computeNextPacificTime(targetDayOfWeek, targetHour, searchFrom);
    entry.occurrences.push(result);
    searchFrom = result;
  } while (result <= fromTimestampSeconds);

  return result;
}

/** Index of the first element strictly greater than `value` in an ascending-sorted array. */
function upperBound(sortedArr: number[], value: number): number {
  let lo = 0;
  let hi = sortedArr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedArr[mid] <= value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function computeNextPacificTime(targetDayOfWeek: number, targetHour: number, fromTimestampSeconds: number): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: PACIFIC_TIMEZONE,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
    });

    const getPTInfo = (ts: number) => {
        const d = new Date(ts * 1000);
        const parts = formatter.formatToParts(d);
        const find = (type: string) => parts.find(p => p.type === type)?.value || '';

        const weekdayMap: Record<string, number> = {
            Sun: 0,
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6,
        };

        const wStr = find('weekday').slice(0, 3);
        const h = parseInt(find('hour'));
        const m = parseInt(find('minute'));
        const wd = weekdayMap[wStr] ?? -1;

        return { wd, h, m };
    };

    // Start checking hour-by-hour into the future.
    // We align to the next hour boundary to avoid matching "Now" if it's already the target time.
    let testTS = fromTimestampSeconds + 1;
    const initial = getPTInfo(testTS);

    // Align to minute 0 of the next hour
    testTS += (60 - initial.m) * 60;
    testTS = Math.floor(testTS / 60) * 60;

    // Search up to 8 days (192 hours)
    for (let i = 0; i < 200; i++) {
        const info = getPTInfo(testTS);
        if (info.wd === targetDayOfWeek && info.h === targetHour) {
            return testTS;
        }
        testTS += 3600;
    }

    // Fallback
    return fromTimestampSeconds + 604800;
}

/**
 * Returns the Unix timestamp (in seconds) of the next Research Sale start (Friday 9 AM PT).
 */
export function getNextSaleStart(timestampSeconds: number): number {
  return getNextPacificTime(5, 9, timestampSeconds);
}

/**
 * Returns the Unix timestamp (in seconds) of the next Research Sale end (Saturday 9 AM PT).
 */
export function getNextSaleEnd(timestampSeconds: number): number {
  return getNextPacificTime(6, 9, timestampSeconds);
}

/**
 * Returns true if a Research Sale is active at the given timestamp.
 */
export function isResearchSaleActive(timestampSeconds: number): boolean {
  // If the next end is sooner than the next start, we are currently in a sale.
  return getNextSaleEnd(timestampSeconds) < getNextSaleStart(timestampSeconds);
}

/**
 * Returns the Unix timestamp (in seconds) of the end of the `saleCount`-th Research Sale after
 * `ascensionStartTime` — i.e. the standard "build phase end" boundary for a C3 variant that plans
 * to ride out `saleCount` weekly sales before moving on. `saleCount === 1` is just `getNextSaleEnd`;
 * each additional sale chains onto the previous one's end (`+ 1` second to search strictly after it,
 * matching `useAscensionGenerator.ts`'s existing `buildPhaseEnd2 = getNextSaleEnd(buildPhaseEnd1 + 1)`
 * pattern this generalizes).
 */
export function getBuildPhaseEndForSaleCount(ascensionStartTime: number, saleCount: number): number {
  let end = getNextSaleEnd(ascensionStartTime);
  for (let i = 1; i < saleCount; i++) end = getNextSaleEnd(end + 1);
  return end;
}

/**
 * Returns the Unix timestamp (in seconds) of the next Earnings Boost start (Monday 9 AM PT).
 */
export function getNextEarningsBoostStart(timestampSeconds: number): number {
  return getNextPacificTime(1, 9, timestampSeconds);
}

/**
 * Returns the Unix timestamp (in seconds) of the next Earnings Boost end (Tuesday 9 AM PT).
 */
export function getNextEarningsBoostEnd(timestampSeconds: number): number {
  return getNextPacificTime(2, 9, timestampSeconds);
}

/**
 * Returns true if an Earnings Boost is active at the given timestamp.
 */
export function isEarningsBoostActive(timestampSeconds: number): boolean {
  // If the next end is sooner than the next start, we are currently in an earnings boost.
  return getNextEarningsBoostEnd(timestampSeconds) < getNextEarningsBoostStart(timestampSeconds);
}

/**
 * Calculates the Unix timestamp (in seconds) of the next occurrence of a specific hour and minute
 * in a specific timezone.
 *
 * @param targetHour - 0 to 23
 * @param targetMinute - 0 to 59
 * @param fromTimestampSeconds - Current simulation time (Unix timestamp in seconds)
 * @param timezone - IANA timezone identifier
 * @returns The next occurrence timestamp in seconds
 */
export function getNextTimeInTimezone(
  targetHour: number,
  targetMinute: number,
  fromTimestampSeconds: number,
  timezone: string
): number {
  const d = new Date(fromTimestampSeconds * 1000);
  // Get the date string in YYYY-MM-DD format for the given timezone
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d).replace(/\//g, '-');

  let targetTS = getLocalTimestampInTimezone(dateStr, `${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}`, timezone);

  // If the target time is in the past (or now), move to the next day
  if (targetTS <= fromTimestampSeconds) {
    const nextDay = new Date((targetTS + 86400 + 3600) * 1000); // Add 24+1 hours to be safe then get date
    const nextDayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(nextDay).replace(/\//g, '-');
    targetTS = getLocalTimestampInTimezone(nextDayStr, `${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}`, timezone);
  }

  return targetTS;
}

/**
 * Parses a YYYY-MM-DD and HH:MM string in a specific IANA timezone to a Unix timestamp.
 */
export function getLocalTimestampInTimezone(dateStr: string, timeStr: string, timezone: string): number {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);

    const guessUTC = Date.UTC(y, m - 1, d, h, min, 0);
    const offset = getTimezoneOffsetAt(timezone, Math.floor(guessUTC / 1000));
    return Math.floor((guessUTC - offset * 1000) / 1000);
}

/**
 * Calculates the offset in seconds (Wall Clock - UTC) for a timezone at a specific UTC timestamp.
 */
export function getTimezoneOffsetAt(timezone: string, timestampSeconds: number): number {
    const d = new Date(timestampSeconds * 1000);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value);

    const wallClockUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return Math.floor((wallClockUTC - timestampSeconds * 1000) / 1000);
}
