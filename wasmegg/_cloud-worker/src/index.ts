/**
 * egg-cloud-storage Cloudflare Worker
 *
 * Routes:
 *   GET    /v1/plans/:eid_hash              → list plan index for a user
 *   GET    /v1/plans/:eid_hash/:plan_id     → download a single plan (gzipped binary)
 *   PUT    /v1/plans/:eid_hash/:plan_id     → upload / overwrite a plan
 *   DELETE /v1/plans/:eid_hash/:plan_id     → delete a plan
 *
 *   GET    /v1/settings/:eid_hash/:tool     → get settings for a tool
 *   PUT    /v1/settings/:eid_hash/:tool     → save settings for a tool
 */

import type { Env } from './types';
import {
  handleListPlans,
  handleGetPlan,
  handleUploadPlan,
  handleDeletePlan,
  handleTouchPlan,
} from './plans';
import { handleGetSettings, handlePutSettings } from './settings';

// ── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'https://wasmegg-carpet.netlify.app',
  'https://wasmegg.netlify.app',
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Allow any localhost port for development
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin) ? origin! : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, X-EID, X-Plan-Name, X-Plan-Timestamp',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function addCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    headers.set(k, v);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// ── Router ──────────────────────────────────────────────────────────────────

const PLAN_LIST_RE = /^\/v1\/plans\/([a-f0-9]{16})$/;
const PLAN_ITEM_RE = /^\/v1\/plans\/([a-f0-9]{16})\/([a-zA-Z0-9_-]+)$/;
const SETTINGS_RE = /^\/v1\/settings\/([a-f0-9]{16})\/([a-z0-9_-]+)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    let response: Response;

    // ── /v1/plans/:eid_hash ──────────────────────────────────────────────
    const planListMatch = path.match(PLAN_LIST_RE);
    if (planListMatch) {
      const [, eidHash] = planListMatch;
      if (method === 'GET') {
        response = await handleListPlans(eidHash, env);
      } else {
        response = new Response('Method Not Allowed', { status: 405 });
      }
      return addCors(response, origin);
    }

    // ── /v1/plans/:eid_hash/:plan_id ─────────────────────────────────────
    const planItemMatch = path.match(PLAN_ITEM_RE);
    if (planItemMatch) {
      const [, eidHash, planId] = planItemMatch;
      if (method === 'GET') {
        response = await handleGetPlan(eidHash, planId, env);
      } else if (method === 'PUT') {
        response = await handleUploadPlan(eidHash, planId, request, env);
      } else if (method === 'PATCH') {
        response = await handleTouchPlan(eidHash, planId, env);
      } else if (method === 'DELETE') {
        response = await handleDeletePlan(eidHash, planId, request, env);
      } else {
        response = new Response('Method Not Allowed', { status: 405 });
      }
      return addCors(response, origin);
    }

    // ── /v1/settings/:eid_hash/:tool ─────────────────────────────────────
    const settingsMatch = path.match(SETTINGS_RE);
    if (settingsMatch) {
      const [, eidHash, tool] = settingsMatch;
      if (method === 'GET') {
        response = await handleGetSettings(eidHash, tool, env);
      } else if (method === 'PUT') {
        response = await handlePutSettings(eidHash, tool, request, env);
      } else {
        response = new Response('Method Not Allowed', { status: 405 });
      }
      return addCors(response, origin);
    }

    // ── Root / info ───────────────────────────────────────────────────────
    if (path === '/' || path === '') {
      response = new Response(
        JSON.stringify({ service: 'egg-cloud-storage', version: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      return addCors(response, origin);
    }

    response = new Response('Not Found', { status: 404 });
    return addCors(response, origin);
  },
};
