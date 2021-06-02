import { getLocalStorage, setLocalStorage } from './utils';

const DONATION_PAGE_VISITED_KEY = 'donationPageVisited';

export function getDonationPageVisited(): boolean {
  return getLocalStorage(DONATION_PAGE_VISITED_KEY, '') !== undefined;
}

export function setDonationPageVisited(): void {
  setLocalStorage(DONATION_PAGE_VISITED_KEY, true, '');
}
