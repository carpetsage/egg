/**
 * @module autoPlannerFormCache
 * @description localStorage-backed persistence for the Auto-AP input form (start
 * date/time/timezone, target TE(s), and per-egg starting TE inputs), so the form
 * survives a full page reload instead of resetting every time. Follows the same
 * bare localStorage pattern used elsewhere in this app (see useResearchViews.ts).
 */

import type { VirtueEgg } from '@/types';

const SCHEDULE_STORAGE_KEY = 'auto_planner_schedule_v1';
const TE_INPUTS_STORAGE_KEY = 'auto_planner_te_inputs_v1';

export interface AutoPlannerScheduleCache {
  timezone: string;
  startDate: string;
  startTime: string;
  targetTE: string;
}

export function loadAutoPlannerSchedule(): Partial<AutoPlannerScheduleCache> | null {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAutoPlannerSchedule(data: AutoPlannerScheduleCache): void {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota/privacy-mode errors — persistence is a nicety, not a requirement.
  }
}

export interface AutoPlannerTEInputsCache {
  teEarned: Partial<Record<VirtueEgg, number>>;
}

export function loadAutoPlannerTEInputs(): AutoPlannerTEInputsCache | null {
  try {
    const raw = localStorage.getItem(TE_INPUTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAutoPlannerTEInputs(data: AutoPlannerTEInputsCache): void {
  try {
    localStorage.setItem(TE_INPUTS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota/privacy-mode errors — persistence is a nicety, not a requirement.
  }
}
