/**
 * User settings handlers — stub for future use.
 *
 * KV key scheme:
 *   settings:{eid_hash}:{tool_name}  → JSON blob
 *
 * Intended to store per-tool user preferences for wasmegg tools other than
 * the ascension planner (e.g., rockets-tracker layout, smart-assistant config).
 */

import type { Env } from './types';
import { validateEidHash } from './auth';

function settingsKey(eidHash: string, tool: string): string {
  return `settings:${eidHash}:${tool}`;
}

/**
 * GET /v1/settings/:eid_hash/:tool
 * Returns the stored settings JSON for a tool, or 404 if not set.
 */
export async function handleGetSettings(
  eidHash: string,
  tool: string,
  env: Env
): Promise<Response> {
  const raw = await env.WASMEGG_DATA.get(settingsKey(eidHash, tool));
  if (!raw) return new Response('Not found', { status: 404 });
  return new Response(raw, { headers: { 'Content-Type': 'application/json' } });
}

/**
 * PUT /v1/settings/:eid_hash/:tool
 * Stores settings JSON for a tool. Requires X-EID header.
 */
export async function handlePutSettings(
  eidHash: string,
  tool: string,
  request: Request,
  env: Env
): Promise<Response> {
  if (!(await validateEidHash(request, eidHash))) {
    return new Response('EID hash mismatch', { status: 403 });
  }

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    return new Response('Content-Type must be application/json', { status: 415 });
  }

  const body = await request.text();
  try {
    JSON.parse(body); // Validate it's actually JSON
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  await env.WASMEGG_DATA.put(settingsKey(eidHash, tool), body);
  return new Response(null, { status: 204 });
}
