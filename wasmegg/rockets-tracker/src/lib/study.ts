import { sha256 } from 'js-sha256';

import { ei, getLocalStorage, Inventory, setLocalStorage } from 'lib';
import { getCompletedExtendedHenerprises } from './missions';

const LEGENDARIES_STUDY_OPT_IN_LOCALSTORAGE_KEY = 'reportLegendaries';
const REPORT_LEGENDARIES_API_URL = import.meta.env.DEV
  ? 'http://localhost:8080/legendaries/register'
  : 'https://eiapi.tcl.sh/legendaries/register';

export function getLegendariesStudyPreference(): boolean | null {
  const recorded = getLocalStorage(LEGENDARIES_STUDY_OPT_IN_LOCALSTORAGE_KEY);
  if (recorded === undefined) {
    return null;
  }
  return recorded === 'true';
}

export function recordLegendariesStudyPreference(optin: boolean): void {
  setLocalStorage(LEGENDARIES_STUDY_OPT_IN_LOCALSTORAGE_KEY, optin);
}

export async function reportLegendaries(backup: ei.IBackup): Promise<void> {
  if (getLocalStorage(LEGENDARIES_STUDY_OPT_IN_LOCALSTORAGE_KEY) !== 'true') {
    return;
  }
  const userId = backup.eiUserId!;
  const userIdHash = sha256(userId);
  const inventory = new Inventory(backup.artifactsDb!);
  const legendaryIds = <string[]>[];
  for (const family of inventory.catalog) {
    for (const tier of family.tiers) {
      const count = tier.haveLegendary;
      for (let i = 0; i < count; i++) {
        legendaryIds.push(tier.id);
      }
    }
  }
  const completedExthenCount = getCompletedExtendedHenerprises(backup.artifactsDb!).length;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(REPORT_LEGENDARIES_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        user_id_hash: userIdHash,
        legendaries: JSON.stringify(legendaryIds),
        exthens: `${completedExthenCount}`,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error(err);
  }
}
