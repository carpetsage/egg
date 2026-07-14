import { formatNumber, formatDuration, formatUnixToDateInput, formatUnixToTimeInput } from '@/lib/format';
import { createEmptySnapshot } from '@/types';
import type { ExportedPlan } from './export';

function pickBest(a: any, idx: number, overrides: Record<number, string>): any {
  const override = overrides[idx];
  if (override === 'continue' && a.result3) return a.result3;
  if (override === '1-sale') return a.result1;
  if (override === '2-sale') return a.result2;
  const candidates = [a.result1, a.result2, ...(a.result3 ? [a.result3] : [])].filter(Boolean);
  return candidates.reduce((b: any, c: any) =>
    c.summary.totalDurationSeconds < b.summary.totalDurationSeconds ? c : b
  );
}

export function buildLibraryPlansFromExport(
  imported: ExportedPlan,
  namePrefix: string,
): { name: string; data: Record<string, unknown> }[] {
  const overrides: Record<number, string> = imported.planVariantOverrides ?? (
    imported.a1ForceMode === 'continue' ? { 0: 'continue' } : {}
  );

  return imported.ascensions.map((a, idx) => {
    const best = pickBest(a, idx, overrides);

    const state = JSON.parse(JSON.stringify(imported.initialState));

    if (idx > 0) {
      const prevBest = pickBest(imported.ascensions[idx - 1], idx - 1, overrides);
      state.initialTeEarned = { ...prevBest.summary.finalTE };
      state.initialEggsDelivered = { ...prevBest.summary.eggsDelivered };
      state.soulEggs = prevBest.summary.endSoulEggs;
      state.initialShiftCount = prevBest.summary.endShiftCount;
    }

    let finalActions = best.actions;
    if (finalActions.length === 0 || finalActions[0].type !== 'start_ascension') {
      const startAction = {
        id: 'start_' + Math.random().toString(36).substring(2, 9),
        index: 0,
        timestamp: best.summary.startTime * 1000,
        type: 'start_ascension',
        payload: { initialEgg: 'curiosity' },
        cost: 0, elrDelta: 0, offlineEarningsDelta: 0, eggValueDelta: 0,
        habCapacityDelta: 0, layRateDelta: 0, shippingCapacityDelta: 0,
        ihrDelta: 0, bankDelta: 0, populationDelta: 0, totalTimeSeconds: 0,
        endState: {
          ...createEmptySnapshot(),
          currentEgg: 'curiosity',
          eggsDelivered: { ...state.initialEggsDelivered },
          teEarned: { ...state.initialTeEarned },
        },
        dependsOn: [], dependents: [],
      };
      finalActions = [startAction, ...finalActions];
      finalActions.forEach((action: any, i: number) => { action.index = i; });
    }

    const summary = best.summary;
    const startStr = new Date(summary.startTime * 1000).toISOString().split('T')[0];
    const peakELR = formatNumber(summary.maxELR * 3600, 2);
    const duration = formatDuration(summary.totalDurationSeconds);
    const name = `${namePrefix} A${idx + 1} - ${peakELR}/hr from ${summary.startTE} to ${summary.endTE} - ${duration} - starting ${startStr}`;

    return {
      name,
      data: {
        version: 1,
        actions: finalActions,
        initialState: state,
        virtueState: {
          shiftCount: state.initialShiftCount || 0,
          initialTE: Object.values(state.initialTeEarned || {}).reduce((s: number, v: any) => s + (v || 0), 0),
          ascensionDate: formatUnixToDateInput(best.summary.startTime, imported.timezone),
          ascensionTime: formatUnixToTimeInput(best.summary.startTime, imported.timezone),
          ascensionTimezone: imported.timezone,
        },
        fuelTankState: {
          tankLevel: state.initialTankLevel || 0,
          fuelAmounts: state.initialFuelAmounts || {},
        },
        truthEggsState: {
          eggsDelivered: state.initialEggsDelivered || {},
          teEarned: state.initialTeEarned || {},
        },
        notesState: { notes: [] },
      },
    };
  });
}
