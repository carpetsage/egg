/**
 * @module initLoadPlan
 * @description Mode E: Load Saved Plan
 *
 * Contract:
 * - All stores hydrated from the plan's serialized state
 * - No backup fetch needed
 * - Not reconciling
 * - Actions loaded from plan
 * - activePlanId set to the plan's ID
 */

import { resetAllStores } from './reset';
import { useActionsStore } from '@/stores/actions';
import type { PlanData } from '@/lib/storage/db';

export async function initLoadPlan(plan: PlanData): Promise<void> {
  // 1. Clean slate — prevents stale state from previous modes
  //    (e.g. isReconciling=true, reconcileFarmState still set)
  await resetAllStores();

  // 2. Load the plan — importPlan internally calls importPlanLogic which:
  //    - Hydrates initialStateStore, virtueStore, fuelTankStore, truthEggsStore, notesStore
  //    - Sets actions from the plan
  //    - Computes initial snapshot from hydrated stores
  //    - Recalculates (or skips if pre-calculated)
  const actionsStore = useActionsStore();
  actionsStore.activePlanId = plan.id;
  await actionsStore.importPlan(JSON.stringify(plan.data));
}
