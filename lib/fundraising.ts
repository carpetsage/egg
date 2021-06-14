import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from './utils';

const DONATION_PAGE_VISITED_KEY = 'donationPageVisited';

export function getDonationPageVisited(): boolean {
  const persisted = getLocalStorageNoPrefix(DONATION_PAGE_VISITED_KEY);
  if (persisted === 'true') {
    // Boolean is legacy behavior, convert to timestamp.
    setLocalStorageNoPrefix(DONATION_PAGE_VISITED_KEY, Date.now());
  }
  return persisted !== undefined;
}

export function setDonationPageVisited(): void {
  setLocalStorageNoPrefix(DONATION_PAGE_VISITED_KEY, Date.now());
}
