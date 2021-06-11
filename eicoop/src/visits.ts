import dayjs from 'dayjs';
import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from 'lib';

const FIRST_RECORDED_VISIT_LOCALSTORAGE_KEY = 'firstRecordedVisit';
const LAST_RECORDED_VISIT_LOCALSTORAGE_KEY = 'lastRecordedVisit';
const DAYS_VISITED_LOCALSTORAGE_KEY = 'daysVisited';

export function recordVisit(): void {
  const now = dayjs();
  const firstRecorded = getNumber(FIRST_RECORDED_VISIT_LOCALSTORAGE_KEY);
  const lastRecorded = getNumber(LAST_RECORDED_VISIT_LOCALSTORAGE_KEY);
  let daysVisited = getNumber(DAYS_VISITED_LOCALSTORAGE_KEY) || 0;
  if (firstRecorded === undefined) {
    setNumber(FIRST_RECORDED_VISIT_LOCALSTORAGE_KEY, now.valueOf());
  }
  setNumber(LAST_RECORDED_VISIT_LOCALSTORAGE_KEY, now.valueOf());
  if (lastRecorded === undefined) {
    daysVisited++;
    setNumber(DAYS_VISITED_LOCALSTORAGE_KEY, daysVisited);
  } else {
    const lastRecordedDate = dayjs(lastRecorded).format('YYYY-MM-DD');
    const currentDate = now.format('YYYY-MM-DD');
    if (lastRecordedDate !== currentDate) {
      daysVisited++;
      setNumber(DAYS_VISITED_LOCALSTORAGE_KEY, daysVisited);
    }
  }
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
