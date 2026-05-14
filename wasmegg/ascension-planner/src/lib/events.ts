/**
 * Event-related utility functions.
 */

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';

/**
 * Calculates the Unix timestamp (in seconds) of the next occurrence of a specific weekday
 * and hour (0-23) in Pacific Time.
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
