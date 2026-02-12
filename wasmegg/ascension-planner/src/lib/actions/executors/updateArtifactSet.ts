import type { ActionExecutor } from '../executor';
import type { UpdateArtifactSetPayload } from '@/types';
import { useInitialStateStore } from '@/stores/initialState';
import { summarizeLoadout } from '@/lib/artifacts';

/**
 * Executor for updating an artifact set.
 */
export const updateArtifactSetExecutor: ActionExecutor<'update_artifact_set'> = {
    execute(payload) {
        const initialStateStore = useInitialStateStore();
        initialStateStore.updateArtifactSet(payload.setName, payload.newLoadout.map(slot => ({
            artifactId: slot.artifactId,
            stones: [...slot.stones],
        })));
        return 0; // Free action
    },

    getDisplayName(payload) {
        const name = payload.setName === 'earnings' ? 'Earnings' : 'ELR';
        return `Update ${name} Set`;
    },

    getEffectDescription(payload) {
        return summarizeLoadout(payload.newLoadout.map(slot => ({
            artifactId: slot.artifactId,
            stones: [...slot.stones],
        })));
    },
};
