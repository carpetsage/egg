import { downloadFile } from '@/utils/export';
import type { Action } from '@/types/actions/meta';
import type { AscensionSummary } from './types';

export interface ExportedPlan {
  version: 1;
  exportedAt: string;        // ISO timestamp
  startTime: number;
  timezone: string;
  initialState: {
    epicResearchLevels: Record<string, number>;
    colleggtibleTiers: Record<string, number>;
    artifactLoadout: any[];
    soulEggs: number;
    isUltra: boolean;
    initialTankLevel: number;
    initialFuelAmounts: Record<string, number>;
    initialEggsDelivered: Record<string, number>;
    initialTeEarned: Record<string, number>;
  };
  ascensions: {
    index: number;
    targetTE: number;
    result1: { summary: AscensionSummary; actions: Action[] };
    result2: { summary: AscensionSummary; actions: Action[] };
    goal: {
      type: 'te' | 'date';
      te: number | null;
      date: string;
      time: string;
    };
  }[];
}

/**
 * Triggers a browser download of the ascension plan as a JSON file.
 */
export function triggerPlanExport(plan: ExportedPlan) {
  const dateStr = new Date().toISOString().split('T')[0];
  const x = plan.ascensions.length;
  const startTE = plan.ascensions[0]?.result1.summary.startTE ?? 0;
  const endTE = plan.ascensions[x - 1]?.result1.summary.endTE ?? 0;
  
  const filename = `Auto_AP_${dateStr}_${x}-ascensions_${startTE}_to_${endTE}.json`;
  const content = JSON.stringify(plan);
  downloadFile(filename, content, 'application/json');
}
