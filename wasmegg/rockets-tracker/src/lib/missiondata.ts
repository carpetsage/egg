import { ei, getLocalStorageNoPrefix, setLocalStorageNoPrefix } from 'lib';
import { sha256 } from 'js-sha256';
import { ref } from 'vue';

const MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY = 'reportMissionData';
const LAST_REPORT_TIME_LOCALSTORAGE_KEY = 'lastMissionDataReportTime';
const REPORT_MISSIONDATA_API_URL = 'https://eggincdatacollection.azurewebsites.net/api/SubmitEid';
// trunk-ignore(gitleaks/generic-api-key)
const FUNCTIONKEY = 'YdJDtLIvK1YrbC6RCO2XKm3FoIDH3pzV2jXVyBlI6sGqAzFu_SeZCQ==';

type MissionDataPreferences = { [playerId: string]: boolean };
type MissionDataSubmissions = { [playerId: string]: number };

export function getMissionDataPreferences() {
  const encoded = getLocalStorageNoPrefix(MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY) || '{}';
  try {
    const preferences: MissionDataPreferences = {};
    for (const [key, val] of Object.entries(JSON.parse(encoded))) {
      if (typeof val === 'boolean') {
        preferences[key] = val;
      }
    }
    return preferences;
  } catch (e) {
    console.error(`error loading mission data preferences from localStorage: ${e}`);
    return {};
  }
}
export function getMissionDataPreference(playerId: string) {
  return getMissionDataPreferences()[playerId];
}

export function recordMissionDataPreference(playerId: string, optin: boolean) {
  const missionDataPref = ref(getMissionDataPreferences());
  missionDataPref.value[playerId] = optin;
  setLocalStorageNoPrefix(MISSIONDATA_OPT_IN_LOCALSTORAGE_KEY, JSON.stringify(missionDataPref.value));
}

export function getMissionDataSubmitTimes() {
  const encoded = getLocalStorageNoPrefix(LAST_REPORT_TIME_LOCALSTORAGE_KEY) || '{}';
  try {
    const submissionTimes: MissionDataSubmissions = {};
    for (const [key, val] of Object.entries(JSON.parse(encoded))) {
      if (typeof val === 'number') {
        if (val === undefined || isNaN(Number(val))) {
          submissionTimes[key] = 0;
        }
        submissionTimes[key] = val;
      }
    }
    return submissionTimes;
  } catch (e) {
    console.error(`error loading mission data preferences from localStorage: ${e}`);
    return {};
  }
}
export function getMissionDataSubmitTime(playerId: string) {
  return getMissionDataSubmitTimes()[playerId] || 0;
}

export function recordMissionDataSubmitTime(playerId: string) {
  const missionDataSubmitTimes = ref(getMissionDataSubmitTimes());
  missionDataSubmitTimes.value[playerId] = Date.now();
  setLocalStorageNoPrefix(LAST_REPORT_TIME_LOCALSTORAGE_KEY, JSON.stringify(missionDataSubmitTimes.value));
}

export async function reportMissionData(backup: ei.IBackup) {
  const playerId = backup.eiUserId!;
  const lastSubmit = getMissionDataSubmitTime(playerId) || 0;
  // only submit if it's been 24+ hours since last time
  if (!getMissionDataPreference(playerId) || Date.now() - lastSubmit < 86400000) {
    return;
  }

  try {
    recordMissionDataSubmitTime(playerId);
    await fetch(REPORT_MISSIONDATA_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'x-functions-key': FUNCTIONKEY,
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eid: playerId,
      }),
    });
  } catch (err) {
    console.error(err);
  }
}
