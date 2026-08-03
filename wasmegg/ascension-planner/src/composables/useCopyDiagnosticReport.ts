import { ref } from 'vue';
import { getDebugLogText } from '@/lib/debugLog';

/**
 * Shared "copy the diagnostic report" behavior for LoadingOverlay.vue's in-session stuck-watchdog
 * and StaleSessionBanner.vue's after-the-fact recovery banner. Tries the Clipboard API (works
 * reliably here since both callers only invoke this from a real tap, satisfying the user-gesture
 * requirement mobile browsers impose on clipboard writes); falls back to revealing the raw text
 * for manual select-and-copy if the API is unavailable or the write is rejected for any reason.
 */
export function useCopyDiagnosticReport() {
  const copyState = ref<'idle' | 'copied'>('idle');
  const showRawText = ref(false);
  const diagnosticText = ref('');
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  async function copyDiagnostics() {
    diagnosticText.value = getDebugLogText();

    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(diagnosticText.value);
      showRawText.value = false;
      copyState.value = 'copied';
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copyState.value = 'idle';
      }, 3000);
    } catch {
      // Clipboard write blocked (permissions, non-secure context, etc.) — fall back to a
      // manually-selectable text box, which works everywhere since it relies on the OS's native
      // text selection rather than any browser API.
      showRawText.value = true;
    }
  }

  return { copyState, showRawText, diagnosticText, copyDiagnostics };
}
