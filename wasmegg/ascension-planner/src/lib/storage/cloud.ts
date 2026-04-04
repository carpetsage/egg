/**
 * @module cloud
 * @description Cloud sync service for ascension plans via the egg-cloud-storage
 * Cloudflare Worker. Handles upload, download, list, and delete operations.
 *
 * Plans are gzip-compressed client-side before upload to reduce payload size.
 *
 * The worker URL is configured via the VITE_CLOUD_WORKER_URL environment variable.
 */

import { compress, decompress } from './compress';
import { CLOUD_WORKER_URL } from '@/lib/cloudConfig';

/** Entry in the cloud plan index (mirrors PlanIndexEntry on the worker). */
export interface CloudPlanEntry {
  id: string;
  name: string;
  timestamp: number;
  /** Compressed byte size stored in KV */
  size: number;
  /** Unix ms timestamp of the last time this plan was opened/accessed. */
  lastAccessed?: number;
}

export class CloudSyncError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'CloudSyncError';
  }
}

/**
 * Cloud sync client for a single user (identified by EID + eidHash).
 *
 * Create one instance per session; the same instance can be reused across
 * multiple save/sync operations.
 */
export class CloudSyncService {
  private readonly workerUrl: string;
  private readonly eid: string;
  private readonly eidHash: string;

  constructor(opts: { workerUrl: string; eid: string; eidHash: string }) {
    // Strip trailing slash for clean URL concatenation
    this.workerUrl = opts.workerUrl.replace(/\/$/, '');
    this.eid = opts.eid;
    this.eidHash = opts.eidHash;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private planListUrl(): string {
    return `${this.workerUrl}/v1/plans/${this.eidHash}`;
  }

  private planUrl(planId: string): string {
    return `${this.workerUrl}/v1/plans/${this.eidHash}/${planId}`;
  }

  private authHeaders(): Record<string, string> {
    return { 'X-EID': this.eid };
  }

  private async checkOk(response: Response, context: string): Promise<void> {
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new CloudSyncError(
        `${context}: HTTP ${response.status}${body ? ` — ${body}` : ''}`,
        response.status
      );
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Upload (create or overwrite) a plan in cloud storage.
   * The plan data is JSON-serialised and gzip-compressed before upload.
   */
  async uploadPlan(
    planId: string,
    name: string,
    timestamp: number,
    planData: object
  ): Promise<void> {
    const json = JSON.stringify(planData);
    const compressed = await compress(json);

    const response = await fetch(this.planUrl(planId), {
      method: 'PUT',
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/octet-stream',
        'X-Plan-Name': name,
        'X-Plan-Timestamp': String(timestamp),
      },
      body: compressed,
    });

    await this.checkOk(response, `uploadPlan(${planId})`);
  }

  /**
   * List all plans for this user from cloud storage.
   * Returns the lightweight index (no plan data).
   */
  async listPlans(): Promise<CloudPlanEntry[]> {
    const response = await fetch(this.planListUrl(), {
      method: 'GET',
    });
    await this.checkOk(response, 'listPlans');
    return response.json() as Promise<CloudPlanEntry[]>;
  }

  /**
   * Download and decompress a specific plan.
   * Returns the parsed plan data object.
   */
  async downloadPlan(planId: string): Promise<object> {
    const response = await fetch(this.planUrl(planId), {
      method: 'GET',
    });
    await this.checkOk(response, `downloadPlan(${planId})`);

    const compressed = await response.arrayBuffer();
    const json = await decompress(compressed);
    return JSON.parse(json);
  }

  /**
   * Touch a plan — updates lastAccessed in the cloud index without re-uploading data.
   * Fire-and-forget safe: silently ignores 404s (plan not yet synced).
   */
  async touchPlan(planId: string): Promise<void> {
    const response = await fetch(this.planUrl(planId), {
      method: 'PATCH',
    });
    // 404 just means the plan was never uploaded — ignore silently
    if (response.status === 404) return;
    await this.checkOk(response, `touchPlan(${planId})`);
  }

  /**
   * Delete a plan from cloud storage.
   */
  async deletePlan(planId: string): Promise<void> {
    const response = await fetch(this.planUrl(planId), {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    await this.checkOk(response, `deletePlan(${planId})`);
  }
}

/**
 * Build a CloudSyncService from the hardcoded worker URL.
 * Returns null if the URL is not configured (empty string).
 */
export function createCloudSyncService(opts: {
  eid: string;
  eidHash: string;
}): CloudSyncService | null {
  if (!CLOUD_WORKER_URL) return null;
  return new CloudSyncService({ workerUrl: CLOUD_WORKER_URL, ...opts });
}
