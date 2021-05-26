import { ei } from '../proto';
import { decodeMessage } from './decode';
import { encodeMessage } from './encode';
import { APP_VERSION, APP_BUILD, CLIENT_VERSION, PLATFORM, PLATFORM_STRING } from './version';

export * from './decode';
export * from './encode';
export * from './version';

const API_ROOT =
  import.meta.env.DEV && import.meta.env.VITE_APP_MOCK
    ? '/api'
    : 'https://wasmegg.zw.workers.dev/?url=https://afx-2-dot-auxbrainhome.appspot.com';
const TIMEOUT = 5000;

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
    if (e.name === 'AbortError') {
      throw new Error(`POST ${url} data=${encodedPayload}: timeout after ${TIMEOUT}ms.`);
    } else {
      throw new Error(`POST ${url} data=${encodedPayload}: ${e}`);
    }
  }
}

/**
 * @param userId
 * @returns
 * @throws
 */
export async function requestFirstContact(userId: string): Promise<ei.IEggIncFirstContactResponse> {
  const requestPayload: ei.IEggIncFirstContactRequest = {
    rinfo: basicRequestInfo(''),
    eiUserId: userId,
    clientVersion: CLIENT_VERSION,
    platform: PLATFORM,
  };
  const encodedRequestPayload = encodeMessage(ei.EggIncFirstContactRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/first_contact', encodedRequestPayload);
  return decodeMessage(
    ei.EggIncFirstContactResponse,
    encodedResponsePayload,
    true
  ) as ei.IEggIncFirstContactResponse;
}

/**
 * @param contractId
 * @param coopCode
 * @returns
 * @throws
 */
export async function requestCoopStatus(
  contractId: string,
  coopCode: string
): Promise<ei.IContractCoopStatusResponse> {
  const userId = '';
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

export function basicRequestInfo(userId: string): ei.IBasicRequestInfo {
  return {
    eiUserId: userId,
    clientVersion: CLIENT_VERSION,
    version: APP_VERSION,
    build: APP_BUILD,
    platform: PLATFORM_STRING,
  };
}
