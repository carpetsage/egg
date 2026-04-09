/**
 * Shared types for the egg cloud storage worker.
 */

export interface Env {
  WASMEGG_DATA: KVNamespace;
}

/** Entry in the per-user plan index stored at plans:{eid_hash}:index */
export interface PlanIndexEntry {
  id: string;
  name: string;
  timestamp: number;
  /** Compressed byte size of the plan value in KV */
  size: number;
  /** Unix ms timestamp of the last time the plan was opened/accessed. */
  lastAccessed?: number;
}

/** JSON body expected when uploading a plan */
export interface UploadPlanMeta {
  name: string;
  timestamp: number;
}
