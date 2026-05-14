import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext } from '@/engine/types';
import type { VirtueEgg } from '@/types/actions/virtue';

export interface AscensionSummary {
  id: string;
  parentId: string | null;
  depth: number;                          // 0-indexed ascension number
  
  // Timing
  startTime: number;                      // Unix timestamp (seconds)
  endTime: number;                        // Unix timestamp (seconds)
  totalDurationSeconds: number;
  
  // Build phase info
  buildPhaseEndTime: number;              // When build phase ended (sale boundary)
  buildPhaseSaleCount: 1 | 2;             // Which sale boundary was used
  
  // Key metrics at END of ascension
  startTE: number;
  endTE: number;
  teGained: number;
  maxELR: number;                         // Peak ELR after K3 purchases (eggs/second)
  
  // SE tracking
  startSoulEggs: number;
  endSoulEggs: number;                    // After 13 shifts deducted (may be negative)
  startShiftCount: number;
  endShiftCount: number;                  // startShiftCount + 13
  totalShiftCost: number;                 // Sum of 13 shift costs
  
  // Per-egg summary
  eggsDelivered: Record<VirtueEgg, number>;
  teEarned: Record<VirtueEgg, number>;
  
  // Strategy label for display
  strategyLabel: string;                  // e.g., "1-sale build, 20 TE"
  
  // Max ELR milestone flag
  isMaxELRAscension: boolean;             // True if this is the ~300 TE collapse
  
  // Lazy reference to full plan
  fullPlanRef?: WeakRef<Action[]> | null;
}

export interface AutoPlanGoal {
  targetTE: number;
}

export interface AutoPlanInput {
  backup: any;
  goal: AutoPlanGoal;
  maxAscensions: number;
  startTime: number;
  timezone?: string;
}

export interface ShiftResult {
  actions: Action[];
  elapsedSeconds: number;
  endState: EngineState;
}

export interface BuildPhaseResult {
  actions: Action[];
  durationSeconds: number;
  endState: EngineState;
  maxELR: number;
}
