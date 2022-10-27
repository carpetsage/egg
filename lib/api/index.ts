import { sha256 } from 'js-sha256';

import { ei } from '../proto';
import { decodeMessage } from './decode';
import { encodeMessage } from './encode';
import { APP_VERSION, APP_BUILD, CLIENT_VERSION, PLATFORM, PLATFORM_STRING } from './version';

export * from './decode';
export * from './encode';
export * from './utils';
export * from './version';

const API_ROOT =
  import.meta.env.DEV && import.meta.env.VITE_APP_MOCK
    ? '/api'
    : 'https://egg-forwarder.carpet.workers.dev/?url=https://www.auxbrain.com';

const TIMEOUT = 5000;

// A valid userId donated by a volunteer.
const defaultUserId = atob('RUk1NDc5OTE2NjQyNzYyNzUy');

/**
 * Makes an API request.
 * @param endpoint - Path of API endpoint, e.g. /ei/coop_status.
 * @param encodedPayload - base64-encoded request payload.
 * @returns base64-encoded response payload.
 * @throws Throws an error on network failure (including timeout) or non-2XX response.
 */
export async function request(endpoint: string, encodedPayload: string): Promise<string> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), TIMEOUT);
  const url = API_ROOT + endpoint;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodedPayload}`,
      signal: controller.signal,
    });
    const text = await resp.text();
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return text;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`POST ${url} data=${encodedPayload}: timeout after ${TIMEOUT}ms.`);
    } else if (e instanceof TypeError) {
      throw new TypeError(
        `POST ${url} data=${encodedPayload}: ${e} ` +
          `(please check any ad/content blocking solution you might be using, e.g. uBlock, Brave, Pi-hole, NextDNS, etc.)`
      );
    } else {
      throw new Error(`POST ${url} data=${encodedPayload}: ${e}`);
    }
  }
}

/**
 * @param [userId]
 * @returns
 * @throws
 */
export async function requestConfig(userId?: string): Promise<ei.IConfigResponse> {
  // A valid userId is required for a complete response.
  userId = userId ?? defaultUserId;
  const requestPayload: ei.IConfigRequest = {
    rinfo: basicRequestInfo(userId),
  };
  const encodedRequestPayload = encodeMessage(ei.ConfigRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/get_config', encodedRequestPayload);
  return decodeMessage(ei.ConfigResponse, encodedResponsePayload, true) as ei.IConfigResponse;
}

/**
 * @param userId
 * @returns
 * @throws
 */
export async function requestFirstContact(userId: string): Promise<ei.IEggIncFirstContactResponse> {
  userId = processUserId(userId);
  const requestPayload: ei.IEggIncFirstContactRequest = {
    rinfo: basicRequestInfo(''),
    eiUserId: userId,
    deviceId: 'wasmegg', // This is actually bot_name for /ei/bot_first_contact, operating on an honor system.
    clientVersion: CLIENT_VERSION,
    platform: PLATFORM,
  };
  const encodedRequestPayload = encodeMessage(ei.EggIncFirstContactRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/bot_first_contact', encodedRequestPayload);
  return decodeMessage(
    ei.EggIncFirstContactResponse,
    encodedResponsePayload,
    false
  ) as ei.IEggIncFirstContactResponse;
}

/**
 * @param contractId
 * @param coopCode
 * @param [userId]
 * @returns
 * @throws
 */
export async function requestCoopStatus(
  contractId: string,
  coopCode: string,
  userId?: string
): Promise<ei.IContractCoopStatusResponse> {
  // A valid userId is now required.
  userId = userId ?? defaultUserId;
  const requestPayload: ei.IContractCoopStatusRequest = {
    rinfo: basicRequestInfo(userId),
    contractIdentifier: contractId,
    coopIdentifier: coopCode,
    userId,
    clientVersion: CLIENT_VERSION,
  };
  const encodedRequestPayload = encodeMessage(ei.ContractCoopStatusRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/coop_status', encodedRequestPayload);
  const status = decodeMessage(
    ei.ContractCoopStatusResponse,
    encodedResponsePayload,
    true
  ) as ei.IContractCoopStatusResponse;
  if (!status.localTimestamp) {
    status.localTimestamp = Date.now() / 1000;
  }
  return status;
}

/**
 * @param contractId
 * @param coopCode
 * @param league - 0 for elite, 1 for standard.
 * @returns
 * @throws
 */
export async function requestQueryCoop(
  contractId: string,
  coopCode: string,
  league: number
): Promise<ei.IQueryCoopResponse> {
  const requestPayload: ei.IQueryCoopRequest = {
    rinfo: basicRequestInfo(''),
    contractIdentifier: contractId,
    coopIdentifier: coopCode,
    league,
    clientVersion: CLIENT_VERSION,
  };
  const encodedRequestPayload = encodeMessage(ei.QueryCoopRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/query_coop', encodedRequestPayload);
  return decodeMessage(
    ei.QueryCoopResponse,
    encodedResponsePayload,
    false
  ) as ei.IQueryCoopResponse;
}

/**
 * @param userId
 * @param missionId
 * @returns
 * @throws
 */
export async function requestAfxCompleteMission(
  userId: string,
  missionId: string
): Promise<ei.ICompleteMissionResponse> {
  userId = processUserId(userId);
  return decodeCompleteMissionResponse(await requestAfxCompleteMissionRaw(userId, missionId));
}

export async function requestAfxCompleteMissionRaw(
  userId: string,
  missionId: string
): Promise<string> {
  userId = processUserId(userId);
  const requestPayload: ei.IMissionRequest = {
    eiUserId: userId,
    info: {
      identifier: missionId,
    },
    rinfo: basicRequestInfo(userId),
  };
  const encodedRequestPayload = encodeMessage(ei.MissionRequest, requestPayload);
  return await request('/ei_afx/complete_mission', encodedRequestPayload);
}

export function decodeCompleteMissionResponse(payload: string): ei.ICompleteMissionResponse {
  return decodeMessage(ei.CompleteMissionResponse, payload, true) as ei.ICompleteMissionResponse;
}

export function basicRequestInfo(userId: string): ei.IBasicRequestInfo {
  return {
    eiUserId: userId,
    clientVersion: CLIENT_VERSION,
    version: APP_VERSION,
    build: APP_BUILD,
    platform: PLATFORM_STRING,
  };
}

const userIdSha256Blacklist = [
  'bba75a6d240f86d6a43d76e8e231d7b5f9a83c3078b2c7998290aad1660a50f9',
  '773b99e5d2076c6597655cca7b37124061822eff9b5b4b0f53f985eaa8476f5b',
];

// Enforces a blacklist, but allow 'mk2!EI...' as the super user bypass.
function processUserId(userId: string): string {
  if (userId.startsWith('mk2!')) {
    return userId.slice(4);
  }
  if (userIdSha256Blacklist.includes(sha256(userId))) {
    throw new Error(`${userId}: this ID has been blacklisted`);
  }
  return userId;
}
