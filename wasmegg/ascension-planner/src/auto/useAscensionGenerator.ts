import { ref, computed, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { useAutoPlannerStore } from '@/stores/autoPlanner';
import { formatNumber } from '@/lib/format';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';
import { computeSnapshot } from '@/engine/compute';
import { getLocalTimestampInTimezone } from '@/lib/events';
import { runAscension, runUntilShift, deriveNextStartState, runContinueCurrent } from '@/auto/ascension';
import { getNextSaleEnd } from '@/auto/calendar';
import { rollUpPendingTE } from '@/lib/modes';
import { getArtifactLoadoutFromBackup, getOptimalEarningsSet } from '@/lib/artifacts';
import { triggerPlanExport, type ExportedPlan } from '@/auto/export';
import { buildLibraryPlansFromExport } from '@/auto/buildLibraryPlans';
import { savePlanToLibrary, type PlanData } from '@/lib/storage/db';
import { usePersistence } from '@/composables/usePersistence';
import type { AscensionSummary } from '@/auto/types';
import type { Action } from '@/types/actions/meta';
import type { VirtueEgg } from '@/types';

const VIRTUE_EGGS_MAP: Record<number, VirtueEgg> = {
  50: 'curiosity',
  51: 'integrity',
  52: 'humility',
  53: 'resilience',
  54: 'kindness',
};

export function useAscensionGenerator() {
  const isGenerating = ref(false);
  const generateProgress = ref('');
  const simulationError = ref<string | null>(null);
  const isValidationErrorOpen = ref(false);
  const validationErrorMessage = ref('');
  const copySuccess = ref(false);

  const autoPlannerStore = useAutoPlannerStore();
  const truthEggsStore = useTruthEggsStore();
  const initialStateStore = useInitialStateStore();
  const actionsStore = useActionsStore();

  const { ascensionChain, targetTE, timezone, startDate, startTime } = storeToRefs(autoPlannerStore);

  const getTargets = () => {
    if (!targetTE.value) return [];
    return targetTE.value
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter(n => !isNaN(n) && n > 0);
  };

  const currentTE = computed(() => {
    const snapshot = actionsStore.effectiveSnapshot;
    if (!snapshot?.teEarned) return 0;
    return Object.values(snapshot.teEarned).reduce((a, b) => a + b, 0);
  });

  const isA1Dirty = computed(() => {
    if (ascensionChain.value.length === 0) return true;
    const last = ascensionChain.value[0];
    if (!last.initialParams) return true;

    const initialParamsDirty =
      startDate.value !== last.initialParams.startDate ||
      startTime.value !== last.initialParams.startTime ||
      JSON.stringify(truthEggsStore.teEarned) !== JSON.stringify(last.initialParams.teEarned);

    if (initialParamsDirty) return true;

    const targets = getTargets();
    if (targets.length !== ascensionChain.value.length) return true;

    for (let i = 0; i < targets.length; i++) {
      if (targets[i] !== ascensionChain.value[i].goal.te) return true;
    }

    return false;
  });

  const bestResults = computed(() => {
    return ascensionChain.value.map(item => {
      const candidates = [
        { result: item.result1, label: item.result1.summary.strategyLabel },
        { result: item.result2, label: item.result2.summary.strategyLabel },
      ];
      if (item.result3) {
        candidates.push({ result: item.result3, label: item.result3.summary.strategyLabel });
      }

      let bestIdx = 0;
      if (item.index === 0 && autoPlannerStore.a1ForceMode) {
        if (autoPlannerStore.a1ForceMode === 'continue' && item.result3) {
          bestIdx = candidates.length - 1;
        } else {
          bestIdx = item.result1.summary.totalDurationSeconds <= item.result2.summary.totalDurationSeconds ? 0 : 1;
        }
      } else {
        for (let i = 1; i < candidates.length; i++) {
          if (candidates[i].result.summary.totalDurationSeconds < candidates[bestIdx].result.summary.totalDurationSeconds) {
            bestIdx = i;
          }
        }
      }

      const best = candidates[bestIdx].result;
      const bestDuration = best.summary.totalDurationSeconds;

      const comparisons: { daysFaster: number; otherPlanLabel: string; message?: string }[] = candidates
        .filter((_, i) => i !== bestIdx)
        .map(other => ({
          daysFaster: (other.result.summary.totalDurationSeconds - bestDuration) / 86400,
          otherPlanLabel: `the ${other.label.replace(' build', '')} plan`,
        }))
        .filter(c => c.daysFaster > 0.01)
        .sort((a, b) => b.daysFaster - a.daysFaster);

      if (item.result3SkippedReason === 'startTimeTooFar') {
        comparisons.push({
          message: 'Select a time within 1 hour of the current time if you want to continue your ascension',
          otherPlanLabel: '',
          daysFaster: 0,
        });
      }

      return {
        ...best,
        summary: {
          ...best.summary,
          comparisons,
          comparison: comparisons[0] || undefined,
        },
        targetTE: item.goal.te,
        result3Available: !!item.result3,
      };
    });
  });

  const generate = async (onComplete?: () => void) => {
    if (isGenerating.value) return;
    isGenerating.value = true;
    simulationError.value = null;
    generateProgress.value = 'Initializing simulation...';

    await new Promise(resolve => setTimeout(resolve, 30));

    try {
      const targets = getTargets();
      if (targets.length === 0) {
        throw new Error('Please specify at least one Target TE');
      }

      for (let i = 1; i < targets.length; i++) {
        if (targets[i] <= targets[i - 1]) {
          validationErrorMessage.value = `Target TE #${i + 1} (${targets[i]}) must be greater than the preceding Target TE (${targets[i - 1]})`;
          isValidationErrorOpen.value = true;
          throw new Error('validation_error');
        }
      }

      const teEarned = truthEggsStore.teEarned;
      const currentTotal = Object.values(teEarned).reduce((a, b) => a + b, 0);

      const startEgg = initialStateStore.currentFarmState
        ? VIRTUE_EGGS_MAP[initialStateStore.currentFarmState.eggType] || 'curiosity'
        : 'curiosity';

      const otherEggsSum = Object.entries(teEarned).reduce(
        (sum, [egg, val]) => sum + (egg !== startEgg ? (val as number) : 0),
        0
      );

      if (targets[0] <= otherEggsSum) {
        validationErrorMessage.value = `First Target TE (${targets[0]}) must be greater than the sum of TE from other eggs (${otherEggsSum}).`;
        isValidationErrorOpen.value = true;
        throw new Error('validation_error');
      }

      if (targets[0] <= currentTotal) {
        validationErrorMessage.value = `First Target TE (${targets[0]}) must be greater than your current total TE (${currentTotal}). It is not possible to generate a plan gaining 0 or negative TE.`;
        isValidationErrorOpen.value = true;
        throw new Error('validation_error');
      }

      rollUpPendingTE();

      const context = getSimulationContext();
      const baseState = createBaseEngineState(null);
      const initialSnapshot = computeSnapshot(baseState, context);
      actionsStore.setInitialSnapshot(initialSnapshot);

      const absStartTime = getLocalTimestampInTimezone(startDate.value, startTime.value, timezone.value);

      const initialParamsToSave = {
        startDate: startDate.value,
        startTime: startTime.value,
        teEarned: { ...truthEggsStore.teEarned },
      };

      const lastA1 = ascensionChain.value[0];
      const initialParamsDirty =
        !lastA1 ||
        !lastA1.initialParams ||
        startDate.value !== lastA1.initialParams.startDate ||
        startTime.value !== lastA1.initialParams.startTime ||
        JSON.stringify(truthEggsStore.teEarned) !== JSON.stringify(lastA1.initialParams.teEarned);

      let firstDiffIdx = 0;
      if (!initialParamsDirty) {
        let matchCount = 0;
        for (let i = 0; i < targets.length; i++) {
          if (i < ascensionChain.value.length && targets[i] === ascensionChain.value[i].goal.te) {
            matchCount++;
          } else {
            break;
          }
        }
        firstDiffIdx = matchCount;
      }

      // Force mode changes A1's effective end time, so A2+ must be recomputed
      if (firstDiffIdx >= 1 && autoPlannerStore.a1ForceMode && ascensionChain.value.length > 1) {
        firstDiffIdx = 1;
      }

      let currentBaseState: any;
      let currentStartTime: number;
      let currentSummary: AscensionSummary | null = null;
      const newChain: any[] = [];
      const loops = targets.length;

      if (firstDiffIdx > 0) {
        for (let i = 0; i < firstDiffIdx; i++) {
          newChain.push(ascensionChain.value[i]);
        }
        const lastValid = newChain[firstDiffIdx - 1];
        const naturalBestSummary =
          lastValid.result1.summary.totalDurationSeconds <= lastValid.result2.summary.totalDurationSeconds
            ? lastValid.result1.summary
            : lastValid.result2.summary;
        const lastValidSummary =
          lastValid.index === 0 && autoPlannerStore.a1ForceMode === 'continue' && lastValid.result3
            ? lastValid.result3.summary
            : naturalBestSummary;

        const baseBackupState = createBaseEngineState(null);
        currentBaseState = deriveNextStartState(lastValidSummary, baseBackupState);
        currentStartTime = lastValidSummary.endTime;
        currentSummary = lastValidSummary;

        if (firstDiffIdx < loops && targets[firstDiffIdx] <= currentSummary!.endTE) {
          throw new Error(
            `Target TE (${targets[firstDiffIdx]}) for A${firstDiffIdx + 1} must be greater than A${firstDiffIdx} end TE (${currentSummary!.endTE})`
          );
        }
      } else {
        baseState.currentEgg = 'curiosity';
        baseState.population = 1;
        baseState.bankValue = 0;
        baseState.researchLevels = {};
        currentBaseState = baseState;
        currentStartTime = absStartTime;
      }

      for (let i = firstDiffIdx; i < loops; i++) {
        const stepTargetTE: number | undefined = targets[i] || undefined;
        const stepEndTime: number | undefined = undefined;

        const buildPhaseEnd1 = getNextSaleEnd(currentStartTime);
        const buildPhaseEnd2 = getNextSaleEnd(buildPhaseEnd1 + 1);

        const currentContext = getSimulationContext();
        currentContext.ascensionStartTime = currentStartTime;
        currentContext.planStartOffset = 0;

        generateProgress.value = `Simulating A${i + 1} of ${loops} (1-sale Build)...`;
        await new Promise(resolve => setTimeout(resolve, 15));

        const precomputed = runUntilShift(currentBaseState, currentContext, 'C3');
        const resumeData1 = {
          actions: precomputed.actions,
          state: precomputed.state,
          elapsedSeconds: precomputed.elapsedSeconds,
          resumeShiftName: 'C3' as const,
        };

        const result1 = runAscension(
          currentBaseState, currentContext, buildPhaseEnd1, currentStartTime,
          `asc_${i}`, stepTargetTE, stepEndTime, resumeData1
        );

        generateProgress.value = `Simulating A${i + 1} of ${loops} (2-sale Build)...`;
        await new Promise(resolve => setTimeout(resolve, 15));

        const baseState2 = JSON.parse(JSON.stringify(currentBaseState));
        const context2 = getSimulationContext();
        context2.ascensionStartTime = currentStartTime;
        context2.planStartOffset = 0;

        const resumeData2 = {
          actions: JSON.parse(JSON.stringify(precomputed.actions)),
          state: JSON.parse(JSON.stringify(precomputed.state)),
          elapsedSeconds: precomputed.elapsedSeconds,
          resumeShiftName: 'C3' as const,
        };

        const result2 = runAscension(
          baseState2, context2, buildPhaseEnd2, currentStartTime,
          `asc_${i}`, stepTargetTE, stepEndTime, resumeData2
        );

        let result3: { summary: AscensionSummary; actions: Action[] } | undefined;
        let result3SkippedReason: string | null = null;

        if (i === 0 && stepTargetTE && initialStateStore.currentFarmState) {
          const nowSecs = Date.now() / 1000;
          if (absStartTime > nowSecs + 3600) {
            result3SkippedReason = 'startTimeTooFar';
          } else {
            generateProgress.value = `Simulating A${i + 1} of ${loops} (Continue Current)...`;
            await new Promise(resolve => setTimeout(resolve, 15));

            const farmState = initialStateStore.currentFarmState;
            const rawLoadout = initialStateStore.rawBackup
              ? getArtifactLoadoutFromBackup(initialStateStore.rawBackup)
              : currentBaseState.artifactLoadout;

            const optimalEarnings = initialStateStore.rawBackup
              ? getOptimalEarningsSet(initialStateStore.rawBackup)
              : currentBaseState.artifactSets.earnings || null;

            const continueState: import('@/engine/types').EngineState = {
              currentEgg: (VIRTUE_EGGS_MAP[farmState.eggType] || 'curiosity') as VirtueEgg,
              shiftCount: currentBaseState.shiftCount,
              te: currentBaseState.te,
              soulEggs: currentBaseState.soulEggs,
              vehicles: farmState.vehicles || [{ vehicleId: 0, trainLength: 1 }],
              habIds: farmState.habs || [0, null, null, null],
              researchLevels: { ...farmState.commonResearches },
              siloCount: farmState.numSilos || 1,
              tankLevel: currentBaseState.tankLevel,
              artifactLoadout: rawLoadout.map((slot: any) => ({
                artifactId: slot.artifactId,
                stones: [...slot.stones],
              })),
              activeArtifactSet: 'elr',
              artifactSets: {
                earnings: optimalEarnings ? JSON.parse(JSON.stringify(optimalEarnings)) : null,
                elr: JSON.parse(JSON.stringify(rawLoadout)),
              },
              fuelTankAmounts: { ...currentBaseState.fuelTankAmounts },
              eggsDelivered: { ...currentBaseState.eggsDelivered },
              teEarned: { ...currentBaseState.teEarned },
              population: farmState.population || 0,
              lastStepTime: farmState.lastStepTime || 0,
              bankValue: farmState.cash || 0,
              activeSales: { research: false, hab: false, vehicle: false },
              earningsBoost: { active: false, multiplier: 1 },
            };

            const continueContext = getSimulationContext();
            continueContext.ascensionStartTime = currentStartTime;
            continueContext.planStartOffset = 0;
            const continueSnapshot = computeSnapshot(continueState, continueContext, { skipGrowth: true });
            const realELR = continueSnapshot.elr;

            if (realELR > 0) {
              result3 = runContinueCurrent(
                continueState, continueContext, currentStartTime,
                realELR, stepTargetTE, `asc_${i}_continue`
              );
            }
          }
        }

        const candidates = [result1, result2, ...(result3 ? [result3] : [])];
        let best;
        if (i === 0 && autoPlannerStore.a1ForceMode) {
          if (autoPlannerStore.a1ForceMode === 'continue' && result3) {
            best = result3;
          } else {
            best = result1.summary.totalDurationSeconds <= result2.summary.totalDurationSeconds ? result1 : result2;
          }
        } else {
          best = candidates.reduce((a, b) => (a.summary.totalDurationSeconds <= b.summary.totalDurationSeconds ? a : b));
        }

        const goalToSave = { type: 'te' as const, te: stepTargetTE || null, date: '', time: '' };
        const chainItem: any = { index: i, result1, result2, goal: goalToSave };
        if (result3) chainItem.result3 = result3;
        if (result3SkippedReason) chainItem.result3SkippedReason = result3SkippedReason;
        if (i === 0) chainItem.initialParams = initialParamsToSave;
        newChain.push(chainItem);

        currentSummary = best.summary;

        if (i < loops - 1) {
          const baseBackupState = createBaseEngineState(null);
          currentBaseState = deriveNextStartState(currentSummary, baseBackupState);
          currentStartTime = currentSummary.endTime;

          if (targets[i + 1] <= currentSummary.endTE) {
            throw new Error(
              `Target TE (${targets[i + 1]}) for A${i + 2} must be greater than A${i + 1} end TE (${currentSummary.endTE})`
            );
          }
        }
      }

      if (newChain.length > 0) {
        targetTE.value = targets.join(' ');
      }

      ascensionChain.value = newChain;
    } catch (err: any) {
      if (err.message !== 'validation_error') {
        console.error('Simulation error:', err);
        simulationError.value = err.message || 'An unknown error occurred during simulation.';
      }
    } finally {
      isGenerating.value = false;
      generateProgress.value = '';
      onComplete?.();
    }
  };

  const { partitionHash, broadcastLibraryUpdate } = usePersistence();

  const buildExportedPlan = (): ExportedPlan => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    startTime: getLocalTimestampInTimezone(startDate.value, startTime.value, timezone.value),
    timezone: timezone.value,
    a1ForceMode: autoPlannerStore.a1ForceMode,
    initialState: {
      epicResearchLevels: { ...initialStateStore.epicResearchLevels },
      colleggtibleTiers: { ...initialStateStore.colleggtibleTiers },
      artifactLoadout: JSON.parse(JSON.stringify(initialStateStore.artifactLoadout)),
      soulEggs: initialStateStore.soulEggs,
      isUltra: initialStateStore.isUltra,
      initialTankLevel: initialStateStore.initialTankLevel,
      initialFuelAmounts: { ...initialStateStore.initialFuelAmounts },
      initialEggsDelivered: { ...initialStateStore.initialEggsDelivered },
      initialTeEarned: { ...initialStateStore.initialTeEarned },
    },
    ascensions: ascensionChain.value.map((item, idx) => {
      const asc: ExportedPlan['ascensions'][number] = {
        index: idx,
        targetTE: item.goal.te || item.result1.summary.endTE,
        result1: item.result1,
        result2: item.result2,
        goal: item.goal,
      };
      if (item.result3) asc.result3 = item.result3;
      return asc;
    }),
  });

  const isExporting = ref(false);

  const exportCurrentPlan = async () => {
    if (ascensionChain.value.length === 0) return;
    isExporting.value = true;
    await nextTick();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      triggerPlanExport(buildExportedPlan());
    } finally {
      isExporting.value = false;
    }
  };

  const isSavingToLibrary = ref(false);
  const saveToLibrarySuccess = ref(false);

  const saveToLibrary = async () => {
    if (ascensionChain.value.length === 0 || !partitionHash.value) return;
    isSavingToLibrary.value = true;
    try {
      const plan = buildExportedPlan();
      const datePrefix = new Date().toISOString().split('T')[0];
      const plansToSave = buildLibraryPlansFromExport(plan, datePrefix);
      for (const p of plansToSave) {
        const entry: PlanData = {
          id: crypto.randomUUID(),
          name: p.name,
          timestamp: Date.now(),
          data: p.data,
        };
        await savePlanToLibrary(partitionHash.value, entry);
      }
      // Increment tick directly so this tab refreshes too (BroadcastChannel skips the sender)
      actionsStore.libraryUpdateTick++;
      broadcastLibraryUpdate();
      saveToLibrarySuccess.value = true;
      setTimeout(() => { saveToLibrarySuccess.value = false; }, 2000);
    } finally {
      isSavingToLibrary.value = false;
    }
  };

  const copySummary = async () => {
    if (ascensionChain.value.length === 0) return;

    const startTE = ascensionChain.value[0].initialParams?.teEarned
      ? Object.values(ascensionChain.value[0].initialParams.teEarned).reduce((a: number, b: any) => a + b, 0)
      : currentTE.value;

    const bestPlans = ascensionChain.value.map(item => {
      const candidates = [item.result1, item.result2, ...(item.result3 ? [item.result3] : [])];
      return candidates.reduce((a, b) => (a.summary.totalDurationSeconds <= b.summary.totalDurationSeconds ? a : b)).summary;
    });

    const finalTE = bestPlans[bestPlans.length - 1].endTE;
    let totalSeconds = 0;
    let totalSE = 0;
    const lines = [`Ascension Plan - Starting TE: ${startTE}`];

    bestPlans.forEach((plan, idx) => {
      const ascStartTE = idx === 0 ? startTE : bestPlans[idx - 1].endTE;
      const saleStr = plan.strategyLabel.replace(' build', '');
      const durationDays = Math.floor(plan.totalDurationSeconds / 86400);
      const durationHours = Math.floor((plan.totalDurationSeconds % 86400) / 3600);
      lines.push(
        `  A${idx + 1}: ${ascStartTE} → ${plan.endTE} TE (${saleStr}, ${durationDays}d ${durationHours}h, ${formatNumber(plan.maxELR * 3600, 3)}/hr)`
      );
      totalSeconds += plan.totalDurationSeconds;
      totalSE += plan.startSoulEggs - plan.endSoulEggs;
    });

    lines.push(`Total: ${startTE} → ${finalTE} TE in ~${(totalSeconds / 86400).toFixed(1)} days, ${formatNumber(totalSE)} SE consumed`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      copySuccess.value = true;
      setTimeout(() => { copySuccess.value = false; }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleToggleForceMode = (mode: 'continue' | 'prestige') => {
    autoPlannerStore.a1ForceMode = mode;
    generate();
  };

  return {
    isGenerating,
    isExporting,
    isSavingToLibrary,
    saveToLibrarySuccess,
    generateProgress,
    simulationError,
    isValidationErrorOpen,
    validationErrorMessage,
    copySuccess,
    isA1Dirty,
    bestResults,
    generate,
    copySummary,
    exportCurrentPlan,
    saveToLibrary,
    handleToggleForceMode,
  };
}
