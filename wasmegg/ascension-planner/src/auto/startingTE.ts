import { useTruthEggsStore } from '@/stores/truthEggs';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';
import { useActionsStore } from '@/stores/actions';
import { countTEThresholdsPassed } from '@/lib/truthEggs';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import { computeSnapshot } from '@/engine/compute';
import type { VirtueEgg } from '@/types';

/**
 * Sets the Auto Planner's starting TE for one egg (eggs delivered to that threshold's minimum) and
 * carries it into the initial state, the virtue store and the initial snapshot.
 */
export async function setAutoStartingTE(egg: VirtueEgg, count: number): Promise<void> {
  const truthEggsStore = useTruthEggsStore();
  const initialStateStore = useInitialStateStore();
  const virtueStore = useVirtueStore();
  const actionsStore = useActionsStore();

  truthEggsStore.setTEEarnedWithSync(egg, count);
  initialStateStore.setInitialEggsDelivered(egg, truthEggsStore.eggsDelivered[egg]);
  initialStateStore.setInitialTeEarned(egg, truthEggsStore.teEarned[egg]);

  const theoreticalTE = countTEThresholdsPassed(truthEggsStore.eggsDelivered[egg]);
  initialStateStore.setInitialTePending(egg, Math.max(0, theoreticalTE - truthEggsStore.teEarned[egg]));

  virtueStore.setInitialTE(truthEggsStore.totalTE);
  virtueStore.setTE(truthEggsStore.totalTE);

  const baseState = createBaseEngineState(null);
  const initialSnapshot = computeSnapshot(baseState, getSimulationContext());
  await actionsStore.setInitialSnapshot(initialSnapshot);
}
