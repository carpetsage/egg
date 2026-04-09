/**
 * Plan CRUD handlers for the egg cloud storage worker.
 *
 * KV key scheme:
 *   plans:{eid_hash}:index          → JSON: PlanIndexEntry[]
 *   plans:{eid_hash}:{plan_id}      → gzipped plan binary (ArrayBuffer)
 */

import type { Env, PlanIndexEntry } from './types';
import { validateEidHash } from './auth';

const INDEX_KEY_TTL = undefined; // No expiry — plans live forever

function planDataKey(eidHash: string, planId: string): string {
  return `plans:${eidHash}:${planId}`;
}

function planIndexKey(eidHash: string): string {
  return `plans:${eidHash}:index`;
}

async function readIndex(env: Env, eidHash: string): Promise<PlanIndexEntry[]> {
  const raw = await env.WASMEGG_DATA.get(planIndexKey(eidHash));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PlanIndexEntry[];
  } catch {
    return [];
  }
}

async function writeIndex(env: Env, eidHash: string, index: PlanIndexEntry[]): Promise<void> {
  await env.WASMEGG_DATA.put(planIndexKey(eidHash), JSON.stringify(index));
}

/**
 * GET /v1/plans/:eid_hash
 * Returns the plan index (lightweight manifest) — no auth required.
 */
export async function handleListPlans(eidHash: string, env: Env): Promise<Response> {
  const index = await readIndex(env, eidHash);
  return Response.json(index);
}

/**
 * GET /v1/plans/:eid_hash/:plan_id
 * Returns the raw gzipped plan binary — no auth required.
 * Client decompresses with DecompressionStream.
 */
export async function handleGetPlan(
  eidHash: string,
  planId: string,
  env: Env
): Promise<Response> {
  const data = await env.WASMEGG_DATA.get(planDataKey(eidHash, planId), 'arrayBuffer');
  if (!data) {
    return new Response('Plan not found', { status: 404 });
  }
  return new Response(data, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'gzip',
    },
  });
}

/**
 * PUT /v1/plans/:eid_hash/:plan_id
 * Uploads a gzip-compressed plan. Requires X-EID header for consistency validation.
 *
 * Request headers:
 *   X-EID: <raw player EID>
 *   X-Plan-Name: <plan name>
 *   X-Plan-Timestamp: <unix ms timestamp as string>
 * Request body: gzipped JSON binary
 */
export async function handleUploadPlan(
  eidHash: string,
  planId: string,
  request: Request,
  env: Env
): Promise<Response> {
  if (!(await validateEidHash(request, eidHash))) {
    return new Response('EID hash mismatch', { status: 403 });
  }

  const name = request.headers.get('X-Plan-Name');
  const timestampStr = request.headers.get('X-Plan-Timestamp');
  if (!name || !timestampStr) {
    return new Response('Missing X-Plan-Name or X-Plan-Timestamp headers', { status: 400 });
  }
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return new Response('Invalid X-Plan-Timestamp', { status: 400 });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) {
    return new Response('Empty body', { status: 400 });
  }

  // Store the compressed plan data
  await env.WASMEGG_DATA.put(planDataKey(eidHash, planId), body, { expirationTtl: INDEX_KEY_TTL });

  // Upsert the index entry
  const index = await readIndex(env, eidHash);
  const existingIdx = index.findIndex(e => e.id === planId);
  const entry: PlanIndexEntry = { id: planId, name, timestamp, size: body.byteLength };
  if (existingIdx >= 0) {
    index[existingIdx] = entry;
  } else {
    index.push(entry);
  }
  // Keep index sorted by timestamp descending (newest first)
  index.sort((a, b) => b.timestamp - a.timestamp);
  await writeIndex(env, eidHash, index);

  return new Response(null, { status: 204 });
}

/**
 * PATCH /v1/plans/:eid_hash/:plan_id
 * Touch a plan — updates lastAccessed in the index without modifying plan data.
 * No auth required (it's only a read-activity signal).
 */
export async function handleTouchPlan(
  eidHash: string,
  planId: string,
  env: Env
): Promise<Response> {
  const index = await readIndex(env, eidHash);
  const entry = index.find(e => e.id === planId);
  if (!entry) {
    return new Response('Plan not found', { status: 404 });
  }
  entry.lastAccessed = Date.now();
  await writeIndex(env, eidHash, index);
  return new Response(null, { status: 204 });
}

/**
 * DELETE /v1/plans/:eid_hash/:plan_id
 * Deletes a plan and removes it from the index. Requires X-EID header.
 */
export async function handleDeletePlan(
  eidHash: string,
  planId: string,
  request: Request,
  env: Env
): Promise<Response> {
  if (!(await validateEidHash(request, eidHash))) {
    return new Response('EID hash mismatch', { status: 403 });
  }

  await env.WASMEGG_DATA.delete(planDataKey(eidHash, planId));

  const index = await readIndex(env, eidHash);
  const filtered = index.filter(e => e.id !== planId);
  await writeIndex(env, eidHash, filtered);

  return new Response(null, { status: 204 });
}
