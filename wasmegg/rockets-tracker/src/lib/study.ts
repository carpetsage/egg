import { ei, getLocalStorage, setLocalStorage } from 'lib';

const LEGENDARIES_STUDY_OPT_IN_LOCALSTORAGE_KEY = 'reportLegendaries';
const REPORT_LEGENDARIES_API_URL = 'https://legendary-study-3-0.vercel.app/submitEID';

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
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 10000);
  try {
    await fetch(REPORT_LEGENDARIES_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        EID: userId
      }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error(err);
  }
}
