import dayjs from 'dayjs';
import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from 'lib';

const FIRST_RECORDED_VISIT_LOCALSTORAGE_KEY = 'firstRecordedVisit';
const LAST_RECORDED_VISIT_LOCALSTORAGE_KEY = 'lastRecordedVisit';
const DAYS_VISITED_LOCALSTORAGE_KEY = 'daysVisited';
const DAYS_VISITED_STREAK_LOCALSTORAGE_KEY = 'dayVisitedStreak';

export function recordVisit(): { daysVisited: number; daysVisitedStreak: number } {
  const now = dayjs();
  const firstRecorded = getNumber(FIRST_RECORDED_VISIT_LOCALSTORAGE_KEY);
  const lastRecorded = getNumber(LAST_RECORDED_VISIT_LOCALSTORAGE_KEY);
  let daysVisited = getNumber(DAYS_VISITED_LOCALSTORAGE_KEY) || 0;
  let daysVisitedStreak = getNumber(DAYS_VISITED_STREAK_LOCALSTORAGE_KEY) || 0;
  if (firstRecorded === undefined) {
    setNumber(FIRST_RECORDED_VISIT_LOCALSTORAGE_KEY, now.valueOf());
  }
  setNumber(LAST_RECORDED_VISIT_LOCALSTORAGE_KEY, now.valueOf());
  if (lastRecorded === undefined) {
    daysVisited++;
    setNumber(DAYS_VISITED_LOCALSTORAGE_KEY, daysVisited);
    daysVisitedStreak = 1;
    setNumber(DAYS_VISITED_STREAK_LOCALSTORAGE_KEY, daysVisitedStreak);
  } else {
    const lastRecordedDate = dayjs(lastRecorded).startOf('day');
    const currentDate = now.startOf('day');
    if (!lastRecordedDate.isSame(currentDate)) {
      daysVisited++;
      setNumber(DAYS_VISITED_LOCALSTORAGE_KEY, daysVisited);
      if (currentDate.diff(lastRecordedDate, 'day') === 1) {
        daysVisitedStreak++;
      } else {
        daysVisitedStreak = 1;
      }
      setNumber(DAYS_VISITED_STREAK_LOCALSTORAGE_KEY, daysVisitedStreak);
    }
  }
  if (daysVisitedStreak === 0) {
    daysVisitedStreak = 1;
  }
  return {
    daysVisited,
    daysVisitedStreak,
  };
}

function getNumber(key: string): number | undefined {
  const s = getLocalStorageNoPrefix(key);
  if (s === undefined) {
    return undefined;
  }
  try {
    const x = JSON.parse(s);
    if (!Number.isFinite(x)) {
      throw new Error('not a number');
    }
    return x;
  } catch (err) {
    console.warn(`invalid ${key}: ${s}`);
    return undefined;
  }
}

function setNumber(key: string, x: number): void {
  setLocalStorageNoPrefix(key, x);
}
