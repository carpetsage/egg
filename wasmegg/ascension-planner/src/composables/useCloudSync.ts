/**
 * @module useCloudSync
 * @description Composable for cloud sync of ascension plans.
 *
 * Handles bidirectional sync between local IndexedDB and the egg-cloud-storage
 * Cloudflare Worker. The composable is stateless across component instances —
 * shared refs are module-level.
 *
 * Sync strategy: last-write-wins based on plan `timestamp`. Only plans where
 * the user has explicitly enabled cloud sync are uploaded or retained in cloud.
 */

import { ref, computed } from 'vue';
import { useActionsStore } from '@/stores/actions';
import { cloudEidHash } from '@/lib/storage/db';
import { createCloudSyncService, CloudSyncService, type CloudPlanEntry } from '@/lib/storage/cloud';
import { loadLibraryPlans, savePlanToLibrary, type PlanData } from '@/lib/storage/db';
import { CLOUD_WORKER_URL } from '@/lib/cloudConfig';

// ── Module-level shared state ────────────────────────────────────────────────

const isSyncing = ref(false);
const syncError = ref<string | null>(null);
const _storedSyncTime = localStorage.getItem('ascension_cloud_last_sync');
const lastSyncTime = ref<number | null>(_storedSyncTime ? parseInt(_storedSyncTime, 10) : null);
/** Plan IDs confirmed present in cloud after the last list operation. */
const cloudPlanIds = ref<Set<string>>(new Set());

let _service: CloudSyncService | null = null;
let _eid = '';
let _eidHash = '';

/** Whether cloud sync is configured (worker URL is set). */
const isAvailable = computed(() => !!CLOUD_WORKER_URL);

// ── Internal helpers ─────────────────────────────────────────────────────────

async function getService(eid: string): Promise<CloudSyncService | null> {
  if (!eid) return null;
  // Re-create service if EID changed (e.g. different player loaded)
  if (!_service || eid !== _eid) {
    _eid = eid;
    _eidHash = await cloudEidHash(eid);
    _service = createCloudSyncService({ eid, eidHash: _eidHash });
  }
  return _service;
}

function wrapSync<T>(fn: () => Promise<T>): Promise<T> {
  const actionsStore = useActionsStore();
  isSyncing.value = true;
  syncError.value = null;
  actionsStore.setCloudSyncing(true);
  actionsStore.setCloudSyncError(null);

  return fn()
    .then(result => {
      isSyncing.value = false;
      actionsStore.setCloudSyncing(false);
      lastSyncTime.value = Date.now();
      localStorage.setItem('ascension_cloud_last_sync', String(lastSyncTime.value));
      return result;
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      isSyncing.value = false;
      syncError.value = message;
      actionsStore.setCloudSyncing(false);
      actionsStore.setCloudSyncError(message);
      throw err;
    });
}

// ── Public composable ────────────────────────────────────────────────────────

export function useCloudSync() {
  /**
   * Upload a single plan to the cloud. Fire-and-forget safe.
   */
  async function uploadPlan(eid: string, plan: PlanData): Promise<void> {
    const svc = await getService(eid);
    if (!svc) return;
    await svc.uploadPlan(plan.id, plan.name, plan.timestamp, plan.data, plan.cloudSyncEnabled);
    cloudPlanIds.value = new Set([...cloudPlanIds.value, plan.id]);
  }

  /**
   * Touch a plan in cloud storage to update its lastAccessed timestamp.
   * Should be called when a plan is loaded locally. Fire-and-forget safe.
   */
  async function touchPlan(eid: string, planId: string): Promise<void> {
    const svc = await getService(eid);
    if (!svc) return;
    await svc.touchPlan(planId).catch(() => {
      // Ignore — plan may not be in cloud yet
    });
  }

  /**
   * Delete a plan from the cloud. Called when deleting a local plan.
   */
  async function deletePlanFromCloud(eid: string, planId: string): Promise<void> {
    const svc = await getService(eid);
    if (!svc) return;
    await svc.deletePlan(planId).catch(() => {
      // Ignore 404s — plan may never have been synced
    });
    const next = new Set(cloudPlanIds.value);
    next.delete(planId);
    cloudPlanIds.value = next;
  }

  /**
   * Toggle cloud sync for a single plan.
   * - Enabling: sets flag locally and uploads to cloud immediately.
   * - Disabling: sets flag locally and optionally deletes from cloud.
   */
  async function toggleCloudSync(
    eid: string,
    partitionHash: string,
    plan: PlanData,
    enabled: boolean,
    deleteFromCloudIfDisabled = false
  ): Promise<void> {
    const svc = await getService(eid);
    if (!svc) return;

    // Update local record
    const updated: PlanData = { ...plan, cloudSyncEnabled: enabled };
    await savePlanToLibrary(partitionHash, updated);

    if (enabled) {
      await svc.uploadPlan(plan.id, plan.name, plan.timestamp, plan.data, true);
      cloudPlanIds.value = new Set([...cloudPlanIds.value, plan.id]);
    } else if (deleteFromCloudIfDisabled) {
      await svc.deletePlan(plan.id).catch(() => {
        // Ignore 404s
      });
      const next = new Set(cloudPlanIds.value);
      next.delete(plan.id);
      cloudPlanIds.value = next;
    }
  }

  /**
   * Push all local plans to the cloud (one-time migration / overwrite).
   */
  async function pushAllToCloud(eid: string, partitionHash: string): Promise<{ pushed: number }> {
    return wrapSync(async () => {
      const svc = await getService(eid);
      if (!svc) throw new Error('Cloud sync not configured');

      const localPlans = await loadLibraryPlans(partitionHash);
      let pushed = 0;
      for (const plan of localPlans) {
        await svc.uploadPlan(plan.id, plan.name, plan.timestamp, plan.data, plan.cloudSyncEnabled);
        pushed++;
      }
      cloudPlanIds.value = new Set(localPlans.map(p => p.id));
      return { pushed };
    });
  }

  /**
   * Bidirectional sync: last-write-wins by timestamp.
   * - Plans with cloudSyncEnabled=true are uploaded / retained in cloud.
   * - Plans with cloudSyncEnabled=false are deleted from cloud.
   * - Cloud-only plans are downloaded and marked sync-enabled.
   */
  async function syncAll(
    eid: string,
    partitionHash: string
  ): Promise<{ downloaded: number; uploaded: number; deleted: number; skipped: number }> {
    return wrapSync(async () => {
      const svc = await getService(eid);
      if (!svc) throw new Error('Cloud sync not configured');

      const [cloudIndex, localPlans] = await Promise.all([svc.listPlans(), loadLibraryPlans(partitionHash)]);

      const localById = new Map<string, PlanData>(localPlans.map(p => [p.id, p]));
      const cloudById = new Map<string, CloudPlanEntry>(cloudIndex.map(e => [e.id, e]));

      let downloaded = 0;
      let uploaded = 0;
      let deleted = 0;
      let skipped = 0;

      // 1. Cloud entries: download missing or newer; delete from cloud if local disabled
      for (const cloudEntry of cloudIndex) {
        const local = localById.get(cloudEntry.id);
        if (!local) {
          // Missing locally — download and mark sync-enabled
          const data = await svc.downloadPlan(cloudEntry.id);
          const newPlan: PlanData = {
            id: cloudEntry.id,
            name: cloudEntry.name,
            timestamp: cloudEntry.timestamp,
            data,
            cloudSyncEnabled: true,
          };
          await savePlanToLibrary(partitionHash, newPlan);
          downloaded++;
        } else if (local.cloudSyncEnabled === true) {
          if (cloudEntry.timestamp > local.timestamp) {
            // Cloud is newer — overwrite local
            const data = await svc.downloadPlan(cloudEntry.id);
            const updatedPlan: PlanData = {
              id: cloudEntry.id,
              name: cloudEntry.name,
              timestamp: cloudEntry.timestamp,
              data,
              cloudSyncEnabled: true,
            };
            await savePlanToLibrary(partitionHash, updatedPlan);
            downloaded++;
          } else {
            skipped++;
          }
        } else {
          // Local plan explicitly disabled — delete from cloud
          await svc.deletePlan(cloudEntry.id).catch(() => {});
          deleted++;
        }
      }

      // 2. Local plans that are enabled but missing or newer in cloud
      for (const localPlan of localPlans) {
        if (localPlan.cloudSyncEnabled !== true) continue;

        if (!cloudById.has(localPlan.id)) {
          await svc.uploadPlan(localPlan.id, localPlan.name, localPlan.timestamp, localPlan.data, true);
          uploaded++;
        } else {
          const cloudEntry = cloudById.get(localPlan.id)!;
          if (localPlan.timestamp > cloudEntry.timestamp) {
            // Local is newer — upload
            await svc.uploadPlan(localPlan.id, localPlan.name, localPlan.timestamp, localPlan.data, true);
            uploaded++;
          }
          // Otherwise already handled above (skipped or downloaded)
        }
      }

      // Update known cloud plan IDs
      const allCloudIds = new Set(cloudIndex.map(e => e.id));
      for (const localPlan of localPlans) {
        if (localPlan.cloudSyncEnabled === true) {
          allCloudIds.add(localPlan.id);
        }
      }
      for (const removedId of [...allCloudIds]) {
        if (localById.has(removedId) && localById.get(removedId)!.cloudSyncEnabled !== true) {
          allCloudIds.delete(removedId);
        }
      }
      cloudPlanIds.value = allCloudIds;

      return { downloaded, uploaded, deleted, skipped };
    });
  }

  return {
    isAvailable,
    isSyncing,
    syncError,
    lastSyncTime,
    cloudPlanIds,
    uploadPlan,
    touchPlan,
    deletePlanFromCloud,
    toggleCloudSync,
    syncAll,
    pushAllToCloud,
  };
}
