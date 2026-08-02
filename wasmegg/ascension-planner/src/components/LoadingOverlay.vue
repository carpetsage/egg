<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm cursor-wait transition-all duration-300 p-4"
  >
    <div
      class="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-2xl border border-gray-100/50 animate-in fade-in zoom-in duration-300 max-w-sm w-full"
    >
      <div class="relative w-16 h-16">
        <svg
          class="animate-spin text-blue-500 w-16 h-16 filter drop-shadow-lg"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
          <path
            class="opacity-100"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <div class="space-y-2 text-center max-w-[15rem]">
        <h3 class="text-xl font-black text-gray-900 tracking-tight">{{ title }}</h3>
        <p class="text-sm font-bold text-gray-500 leading-snug">{{ message }}</p>
      </div>

      <!-- Stuck helper: only appears if `show` has stayed true past a threshold, so a non-technical
           user with no console access has a way to hand over diagnostic info. -->
      <div v-if="stuckHelperVisible" class="w-full pt-3 mt-1 border-t border-gray-100 space-y-3">
        <p class="text-xs text-gray-500 text-center leading-snug">
          This is taking longer than expected. If you're reporting this issue, tap below to copy a diagnostic report you
          can paste into your message.
        </p>
        <button
          class="btn-premium w-full text-sm py-2"
          :class="copyState === 'copied' ? 'bg-green-500 text-white' : 'bg-gray-800 text-white hover:bg-gray-900'"
          @click="copyDiagnostics"
        >
          {{ copyState === 'copied' ? 'Copied!' : 'Copy Diagnostic Report' }}
        </button>
        <div v-if="showRawText" class="space-y-1">
          <p class="text-[11px] text-gray-500 text-center">
            Couldn't copy automatically — tap the box below, select all, then copy.
          </p>
          <textarea
            ref="rawTextArea"
            readonly
            class="w-full h-24 text-[10px] font-mono p-2 border border-gray-200 rounded-lg bg-gray-50"
            :value="diagnosticText"
            @focus="($event.target as HTMLTextAreaElement).select()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { getDebugLogText } from '@/lib/debugLog';

const props = withDefaults(
  defineProps<{
    show: boolean;
    title?: string;
    message?: string;
    // How long `show` must stay true before the diagnostic-copy helper appears. Kept configurable
    // (rather than hardcoded) since different overlays have different "this is normal" durations —
    // a milestone recompute might reasonably take a couple seconds, so the threshold there should
    // be longer than for something expected to be near-instant.
    stuckAfterMs?: number;
  }>(),
  {
    title: 'Optimizing Your Plan',
    message:
      'Simulating research sales and 2x earnings windows across thousands of purchase orders to chart your fastest path...',
    stuckAfterMs: 6000,
  }
);

const stuckHelperVisible = ref(false);
const copyState = ref<'idle' | 'copied'>('idle');
const showRawText = ref(false);
const diagnosticText = ref('');
const rawTextArea = ref<HTMLTextAreaElement | null>(null);
let stuckTimer: ReturnType<typeof setTimeout> | null = null;
let copiedResetTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.show,
  show => {
    if (show) {
      stuckTimer = setTimeout(() => {
        stuckHelperVisible.value = true;
      }, props.stuckAfterMs);
    } else {
      if (stuckTimer) clearTimeout(stuckTimer);
      stuckTimer = null;
      stuckHelperVisible.value = false;
      copyState.value = 'idle';
      showRawText.value = false;
    }
  },
  { immediate: true }
);

async function copyDiagnostics() {
  diagnosticText.value = getDebugLogText();

  try {
    if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(diagnosticText.value);
    showRawText.value = false;
    copyState.value = 'copied';
    if (copiedResetTimer) clearTimeout(copiedResetTimer);
    copiedResetTimer = setTimeout(() => {
      copyState.value = 'idle';
    }, 3000);
  } catch {
    // Clipboard write blocked (permissions, non-secure context, etc.) — fall back to a
    // manually-selectable text box, which works everywhere since it relies on the OS's native
    // text selection rather than any browser API.
    showRawText.value = true;
    await nextTick();
    rawTextArea.value?.focus();
  }
}
</script>
