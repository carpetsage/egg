import { ei, getLocalStorage, setLocalStorage } from 'lib';

const MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY = 'reportMissionData';
const LAST_REPORT_TIME_LOCALSTORAGE_KEY = 'lastMissionDataReportTime';
const REPORT_MISSIONDATA_API_URL = 'https://eggincdatacollection.azurewebsites.net/api/SubmitEid';
const FUNCTIONKEY = 'YdJDtLIvK1YrbC6RCO2XKm3FoIDH3pzV2jXVyBlI6sGqAzFu_SeZCQ==';

export function getMissionDataPreference(): boolean | null {
  const recorded = getLocalStorage(MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY);
  if (recorded === undefined) {
    return null;
  }
  return recorded === 'true';
}

export function recordMissionDataPreference(optin: boolean): void {
  setLocalStorage(MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY, optin);
}

export function getMissionDataSubmitTime(): number {
  const time = getLocalStorage(LAST_REPORT_TIME_LOCALSTORAGE_KEY);
  if (time === undefined || isNaN(Number(time))) {
    return 0;
  }
  return Number(time);
}
export function recordMissionDataSubmitTime(): void {
  setLocalStorage(LAST_REPORT_TIME_LOCALSTORAGE_KEY , Date.now());
}

export async function reportMissionData(backup: ei.IBackup): Promise<void> {
  const lastSubmit = getMissionDataSubmitTime();
  console.log(Date.now() - lastSubmit);
  // only submit if it's been 24+ hours since last time
  if (getLocalStorage(MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY) !== 'true' || Date.now() - lastSubmit < 86400000) {
    console.log(Date.now() - lastSubmit);
    return;
  }

  const userId = backup.eiUserId!;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 10000);
  try {
    await fetch(REPORT_MISSIONDATA_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        "x-functions-key": FUNCTIONKEY,
        'Accept' : '*/*',
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        'eid': userId
      }),
      signal: controller.signal,
    });
   recordMissionDataSubmitTime();
  } catch (err) {
    console.error(err);
  }
}
 