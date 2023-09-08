import { ei, getLocalStorage, getLocalStorageNoPrefix, setLocalStorage, setLocalStorageNoPrefix } from 'lib';
import { sha256 } from 'js-sha256';

const MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY = 'reportMissionData';
const LAST_REPORT_TIME_LOCALSTORAGE_KEY = 'lastMissionDataReportTime';
const REPORT_MISSIONDATA_API_URL = 'https://eggincdatacollection.azurewebsites.net/api/SubmitEid';
const FUNCTIONKEY = 'YdJDtLIvK1YrbC6RCO2XKm3FoIDH3pzV2jXVyBlI6sGqAzFu_SeZCQ==';

function formatKey(key: string, playerId: string) {
  return `${key}-${sha256(playerId)}`;
}
export function getMissionDataPreference(playerId: string): boolean | null {
  const recorded = getLocalStorageNoPrefix(formatKey(MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY,playerId));
  if (recorded === undefined) {
    return null;
  }
  return recorded === 'true';
}

export function recordMissionDataPreference(optin: boolean, playerId: string): void {
  setLocalStorageNoPrefix(formatKey(MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY,playerId), optin);
}

export function getMissionDataSubmitTime(playerId: string): number {
  const time = getLocalStorageNoPrefix(formatKey(LAST_REPORT_TIME_LOCALSTORAGE_KEY,playerId));
  if (time === undefined || isNaN(Number(time))) {
    return 0;
  }
  return Number(time);
}
export function recordMissionDataSubmitTime(playerId: string): void {
  setLocalStorageNoPrefix(formatKey(LAST_REPORT_TIME_LOCALSTORAGE_KEY,playerId) , Date.now());
}

export async function reportMissionData(backup: ei.IBackup): Promise<void> {
  const playerId = backup.eiUserId!;
  const lastSubmit = getMissionDataSubmitTime(playerId);
  // only submit if it's been 24+ hours since last time
  if (!getMissionDataPreference(playerId) || Date.now() - lastSubmit < 86400000) {
    console.log(Date.now() - lastSubmit);
    return;
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), 80000);
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
        'eid': playerId
      })
    });
   recordMissionDataSubmitTime(playerId);
  } catch (err) {
    console.error(err);
  }
}
