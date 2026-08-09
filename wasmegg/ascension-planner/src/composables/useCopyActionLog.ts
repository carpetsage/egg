import { ref } from 'vue';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';
import { buildActionHistoryLog } from '@/lib/actionLog';
import type { Action } from '@/types';

/**
 * "Copy an action log" behavior — same Clipboard-API-with-manual-select-fallback shape as
 * useCopyDiagnosticReport.ts (LoadingOverlay.vue's stuck-watchdog / StaleSessionBanner.vue's
 * recovery banner), kept as its own composable rather than generalizing that one: the text this
 * builds (buildActionHistoryLog, over a caller-chosen slice of the live plan's actions) is a
 * different concern from that one's fixed getDebugLogText() source, and the two composables would
 * otherwise need a parameter just to stay separately meaningful.
 *
 * Takes `getActions` rather than always reading the whole plan — CuriositySummary.vue uses this
 * scoped to just its own shift group's actions (the original, and only, use case: pasting a whole
 * multi-hundred-action plan into a chat message routinely blows past message size limits, found by
 * direct testing — a 1656-action export got silently truncated at 50,000 characters, well before
 * reaching the point in the plan the user actually wanted to talk about).
 */
export function useCopyActionLog(getActions: () => Action[]) {
  const virtueStore = useVirtueStore();

  const copyState = ref<'idle' | 'copied'>('idle');
  const showRawText = ref(false);
  const logText = ref('');
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  async function copyActionLog() {
    // planStartOffset is plan-wide, not shift-scoped — needed even for a per-group log so its
    // absolute timestamps line up with the rest of the plan (and with any other export, like a
    // beam-search trace, compared against it).
    const actionsStore = useActionsStore();
    logText.value = buildActionHistoryLog(
      getActions(),
      virtueStore.planStartTime.getTime(),
      actionsStore.planStartOffset,
      virtueStore.ascensionTimezone
    );

    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(logText.value);
      showRawText.value = false;
      copyState.value = 'copied';
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copyState.value = 'idle';
      }, 3000);
    } catch {
      // Same fallback reasoning as useCopyDiagnosticReport.ts: clipboard write blocked (permissions,
      // non-secure context, etc.) — reveal the raw text for manual select-and-copy instead.
      showRawText.value = true;
    }
  }

  return { copyState, showRawText, logText, copyActionLog };
}
