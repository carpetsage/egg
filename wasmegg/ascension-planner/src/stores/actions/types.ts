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
  isReconciling: boolean;
  reconciledBackupTime: number;
  showIncompleteOnly: boolean;
  // ID of the library plan currently being edited, or null if it's a new draft
  activePlanId: string | null;
  // JSON string of the actions when last saved/loaded to track "dirty" state
  lastSavedActionsJson: string;
  // Monotonically increasing counter to trigger refreshes of the plan library UI
  libraryUpdateTick: number;
}
