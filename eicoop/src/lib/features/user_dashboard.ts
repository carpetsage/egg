import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from 'lib';

const USER_DASHBOARD_FEATURE_FIRST_SEEN_LOCALSTORAGE_KEY = 'userDashboardFeatureFirstSeen';
const USER_DASHBOARD_FEATURE_FIRST_USED_LOCALSTORAGE_KEY = 'userDashboardFeatureFirstUsed';

export function checkIfShouldOnboardUserDashboardFeature(): boolean {
  const firstSeenPersisted = getLocalStorageNoPrefix(USER_DASHBOARD_FEATURE_FIRST_SEEN_LOCALSTORAGE_KEY);
  const firstUsedPersisted = getLocalStorageNoPrefix(USER_DASHBOARD_FEATURE_FIRST_USED_LOCALSTORAGE_KEY);
  if (firstUsedPersisted !== undefined) {
    return false;
  }
  if (firstSeenPersisted === undefined) {
    setLocalStorageNoPrefix(USER_DASHBOARD_FEATURE_FIRST_SEEN_LOCALSTORAGE_KEY, Date.now());
    return true;
  }
  let firstSeen: unknown;
  try {
    firstSeen = JSON.parse(firstSeenPersisted);
  } catch {
    console.warn(`invalid ${USER_DASHBOARD_FEATURE_FIRST_SEEN_LOCALSTORAGE_KEY}: ${firstSeenPersisted}`);
    return false;
  }
  if (!isFiniteNumber(firstSeen)) {
    console.warn(`invalid ${USER_DASHBOARD_FEATURE_FIRST_SEEN_LOCALSTORAGE_KEY}: ${firstSeen}`);
    return false;
  }
  // Only do onboarding in the first two days.
  return Date.now() - firstSeen < 86400_000 * 2;
}

export function recordUserDashboardFeatureUsage(): void {
  const firstUsedPersisted = getLocalStorageNoPrefix(USER_DASHBOARD_FEATURE_FIRST_USED_LOCALSTORAGE_KEY);
  if (firstUsedPersisted === undefined) {
    setLocalStorageNoPrefix(USER_DASHBOARD_FEATURE_FIRST_USED_LOCALSTORAGE_KEY, Date.now());
  }
}

function isFiniteNumber(x: unknown): x is number {
  return Number.isFinite(x);
}
