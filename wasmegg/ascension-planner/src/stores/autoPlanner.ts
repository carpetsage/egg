import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AscensionSummary } from '@/auto/types';
import type { Action } from '@/types/actions/meta';

export interface ChainedAscension {
  index: number;
  result1: { summary: AscensionSummary; actions: Action[] };
  result2: { summary: AscensionSummary; actions: Action[] };
  result3?: { summary: AscensionSummary; actions: Action[] }; // "Continue current" option (A1 only)
  result3SkippedReason?: string;
  goal: {
    type: 'te' | 'date';
    te: number | null;
    date: string;
    time: string;
  };
  initialParams?: {
    startDate: string;
    startTime: string;
    teEarned: Record<string, number>;
  }
}

export const useAutoPlannerStore = defineStore('autoPlanner', () => {
  const ascensionChain = ref<ChainedAscension[]>([]);
  const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const startDate = ref('');
  const startTime = ref('');
  const targetTE = ref<string>('');
  const targetEndDate = ref('');
  const targetEndTime = ref('');
  const nextGoals = ref<Record<number, { te: number | null, date: string, time: string }>>({
    0: { te: 490, date: '', time: '' }
  });

  const a1ForceMode = ref<'continue' | 'prestige' | null>(null);

  function setPlan(data: {
    ascensionChain: ChainedAscension[];
    timezone: string;
    startDate: string;
    startTime: string;
    targetTE: string;
    targetEndDate?: string;
    targetEndTime?: string;
    nextGoals: Record<number, { te: number | null, date: string, time: string }>;
    a1ForceMode?: 'continue' | 'prestige' | null;
  }) {
    ascensionChain.value = data.ascensionChain;
    timezone.value = data.timezone;
    startDate.value = data.startDate;
    startTime.value = data.startTime;
    targetTE.value = data.targetTE || '';
    targetEndDate.value = data.targetEndDate || '';
    targetEndTime.value = data.targetEndTime || '';
    nextGoals.value = data.nextGoals;
    a1ForceMode.value = data.a1ForceMode || null;
  }

  function clear() {
    ascensionChain.value = [];
    targetTE.value = '';
    targetEndDate.value = '';
    targetEndTime.value = '';
    nextGoals.value = { 0: { te: 490, date: '', time: '' } };
    a1ForceMode.value = null;
  }

  return {
    ascensionChain,
    timezone,
    startDate,
    startTime,
    targetTE,
    targetEndDate,
    targetEndTime,
    nextGoals,
    a1ForceMode,
    setPlan,
    clear,
  };
});
