import type { Action, CalculationsSnapshot } from '@/types';

export interface ActionsState {
    actions: Action[];
    _initialSnapshot: CalculationsSnapshot | null;
    // ID of the group (header action) currently being edited, or null if editing current period
    editingGroupId: string | null;
    // IDs of groups that are currently expanded
    expandedGroupIds: Set<string>;
    isRecalculating: boolean;
    recalculationProgress: { current: number; total: number };
    batchMode: boolean;
    minBatchIndex: number;
}
