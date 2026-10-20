<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <button
        v-if="store.status !== 'running'"
        type="button"
        class="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-colors"
        @click="store.startBuild()"
      >
        Build lookup table
      </button>
      <button
        v-else
        type="button"
        class="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        @click="store.cancelBuild()"
      >
        Cancel
      </button>

      <label class="flex items-center gap-2 text-xs text-slate-600">
        Workers
        <input
          v-model.number="store.workerCount"
          type="number"
          min="1"
          :max="maxWorkers"
          :disabled="store.status === 'running'"
          class="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs disabled:bg-slate-50"
        />
        <span class="text-slate-400">of {{ maxWorkers }} cores</span>
      </label>

      <span class="text-xs text-slate-500">Start TEs {{ CHAIN_FINDER_TEST_TES.join(' and ') }} (test)</span>
    </div>

    <div v-if="progress" class="space-y-3">
      <div>
        <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
          <span>{{ progress.cellsDone }} / {{ progress.cellsTotal }} cells</span>
          <span>{{ percent }}%</span>
        </div>
        <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full bg-emerald-500 transition-all duration-300" :style="{ width: `${percent}%` }" />
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div class="px-3 py-2 rounded-lg bg-slate-50">
          <div class="text-[10px] text-slate-400 uppercase font-black tracking-widest">Elapsed</div>
          <div class="font-bold text-slate-700">{{ formatMs(progress.elapsedMs) }}</div>
        </div>
        <div class="px-3 py-2 rounded-lg bg-slate-50">
          <div class="text-[10px] text-slate-400 uppercase font-black tracking-widest">Remaining</div>
          <div class="font-bold text-slate-700">
            {{ store.status === 'running' && progress.etaMs != null ? `~${formatMs(progress.etaMs)}` : '—' }}
          </div>
        </div>
        <div class="px-3 py-2 rounded-lg bg-slate-50">
          <div class="text-[10px] text-slate-400 uppercase font-black tracking-widest">Workers busy</div>
          <div class="font-bold text-slate-700">{{ progress.busyWorkers }} / {{ progress.workers }}</div>
        </div>
        <div class="px-3 py-2 rounded-lg bg-slate-50">
          <div class="text-[10px] text-slate-400 uppercase font-black tracking-widest">K3 record</div>
          <div class="font-bold text-slate-700">{{ progress.k3Done ? 'Done' : 'Pending' }}</div>
        </div>
      </div>

      <table class="w-full text-xs">
        <thead>
          <tr class="text-[10px] text-slate-400 uppercase font-black tracking-widest text-left">
            <th class="py-1">Start TE</th>
            <th class="py-1">Hours</th>
            <th class="py-1">Reused prefix</th>
            <th class="py-1">Fresh prefix</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="te in progress.tes" :key="te.te" class="border-t border-slate-100 text-slate-700">
            <td class="py-1 font-bold">{{ te.te }}</td>
            <td class="py-1">{{ te.cellsDone }} / {{ WEEK_HOURS }}</td>
            <td class="py-1">{{ te.reused }}</td>
            <td class="py-1">{{ te.fresh }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="store.status === 'done' && store.result"
      class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100"
    >
      <div class="text-xs text-emerald-800">
        <div class="font-bold">{{ store.result.fileName }}</div>
        <div>
          {{ store.result.cells }} cells, {{ formatBytes(store.result.gzipped.length) }} gzipped ({{
            formatBytes(store.result.bytes.length)
          }}
          unpacked), built in
          {{ formatMs(store.result.elapsedMs) }} · sim {{ store.result.simVersion }}
        </div>
      </div>
      <button
        type="button"
        class="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        @click="store.downloadResult()"
      >
        Download .bin.gz
      </button>
    </div>

    <div v-if="store.status === 'cancelled'" class="text-xs text-slate-500">Build cancelled.</div>
    <div v-if="store.status === 'error'" class="text-xs text-red-600">Build failed: {{ store.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { WEEK_HOURS } from '@/buildTable/cell';
import { CHAIN_FINDER_TEST_TES, useChainFinderStore } from '@/stores/chainFinder';

const store = useChainFinderStore();
const progress = computed(() => store.progress);
const maxWorkers = navigator.hardwareConcurrency || 2;

const percent = computed(() =>
  progress.value ? Math.floor((100 * progress.value.cellsDone) / progress.value.cellsTotal) : 0
);

function formatBytes(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.ceil(n / 1e3)} KB`;
}

function formatMs(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}
</script>
