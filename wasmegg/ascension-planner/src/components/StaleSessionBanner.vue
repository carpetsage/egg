<template>
  <div class="fixed inset-x-0 top-0 z-[110] flex justify-center p-3 pointer-events-none">
    <div
      class="pointer-events-auto max-w-md w-full bg-amber-50 border border-amber-200 rounded-2xl shadow-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div class="flex items-start gap-2">
        <span class="text-lg leading-none">⚠️</span>
        <p class="text-xs text-amber-900 leading-snug">
          It looks like the app didn't close properly last time — it may have frozen while working on something. If
          you're reporting this, tap below to copy a diagnostic report you can paste into your message.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          class="btn-premium flex-1 text-sm py-2"
          :class="copyState === 'copied' ? 'bg-green-500 text-white' : 'bg-gray-800 text-white hover:bg-gray-900'"
          @click="handleCopy"
        >
          {{ copyState === 'copied' ? 'Copied!' : 'Copy Diagnostic Report' }}
        </button>
        <button
          class="px-3 py-2 text-xs font-semibold text-amber-700 hover:text-amber-900"
          @click="$emit('dismiss')"
        >
          Dismiss
        </button>
      </div>
      <div v-if="showRawText" class="space-y-1">
        <p class="text-[11px] text-amber-800 text-center">
          Couldn't copy automatically — tap the box below, select all, then copy.
        </p>
        <textarea
          ref="rawTextArea"
          readonly
          class="w-full h-24 text-[10px] font-mono p-2 border border-amber-200 rounded-lg bg-white"
          :value="diagnosticText"
          @focus="($event.target as HTMLTextAreaElement).select()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useCopyDiagnosticReport } from '@/composables/useCopyDiagnosticReport';

// `openOperations` isn't rendered directly (the message stays generic and non-technical), but it's
// accepted here so a future version could show it in a details/debug view without plumbing new
// props through App.vue.
defineProps<{ openOperations: string[] }>();
defineEmits<{ dismiss: [] }>();

const rawTextArea = ref<HTMLTextAreaElement | null>(null);
const { copyState, showRawText, diagnosticText, copyDiagnostics } = useCopyDiagnosticReport();

async function handleCopy() {
  await copyDiagnostics();
  if (showRawText.value) {
    await nextTick();
    rawTextArea.value?.focus();
  }
}
</script>
