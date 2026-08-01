/**
 * Event-related utility functions.
 */

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';

const nextPacificTimeCache = new Map<string, { from: number; result: number }>();

/**
 * Calculates the Unix timestamp (in seconds) of the next occurrence of a specific weekday
 * and hour (0-23) in Pacific Time.
 *
 * The underlying search (`computeNextPacificTime`) is a brute-force hour-by-hour
 * `Intl.DateTimeFormat` walk — DST-safe but expensive (up to ~200 Intl calls). Callers that step
 * through simulated time in small increments (e.g. milestone-chain simulations re-deriving
 * sale/boost state at every purchase) can call this thousands of times in a row asking for the
 * "same" boundary, so the last result per (day, hour) pair is cached and reused whenever the new
 * query is still within the same window — this is always correct, not an approximation: if
 * `result` is the smallest matching timestamp > `from`, and the new query's `from` is >= that same
 * `from` and still < `result`, there cannot be an earlier matching timestamp being missed.
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
    const cached = nextPacificTimeCache.get(cacheKey);
    if (cached && fromTimestampSeconds >= cached.from && fromTimestampSeconds < cached.result) {
        return cached.result;
    }

    const result = computeNextPacificTime(targetDayOfWeek, targetHour, fromTimestampSeconds);
    nextPacificTimeCache.set(cacheKey, { from: fromTimestampSeconds, result });
    return result;
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
