/**
 * Table Builder state: the delivery picks and the in-browser table build. Its own store, apart from
 * the manual and auto planners', so a build keeps running when the user switches tabs.
 */
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import {
  chainFinderDeliveryIds,
  defaultDeliverySelection,
  deliverySelectionTag,
  type ChainFinderDeliverySelection,
} from '@/lib/chainFinder/deliveryArtifacts';
import {
  buildChainFinderTable,
  type TableBuildProgress,
  type TableBuildResult,
} from '@/lib/chainFinder/tableBuild';

/** Test build: two start TEs only. The file spans 200..300 with the TEs between left empty. */
export const CHAIN_FINDER_TEST_TES = [200, 300];

export type TableBuildStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

/** All cores but one, so the page stays responsive. */
export function defaultWorkerCount(): number {
  return Math.max(1, (navigator.hardwareConcurrency || 2) - 1);
}

export const useChainFinderStore = defineStore('chainFinder', () => {
  const deliverySelection = ref<ChainFinderDeliverySelection>(defaultDeliverySelection());
  const workerCount = ref(defaultWorkerCount());
  const status = ref<TableBuildStatus>('idle');
  const progress = shallowRef<TableBuildProgress | null>(null);
  const result = shallowRef<(TableBuildResult & { fileName: string }) | null>(null);
  const error = ref('');
  let controller: AbortController | null = null;

  async function startBuild() {
    if (status.value === 'running') return;
    const selection = { ...deliverySelection.value };
    controller = new AbortController();
    status.value = 'running';
    progress.value = null;
    result.value = null;
    error.value = '';
    try {
      const built = await buildChainFinderTable({
        deliveryIds: chainFinderDeliveryIds(selection),
        tes: CHAIN_FINDER_TEST_TES,
        workers: workerCount.value,
        onProgress: p => (progress.value = p),
        signal: controller.signal,
      });
      result.value = { ...built, fileName: `table-${deliverySelectionTag(selection)}-te${built.from}-${built.to}.bin.gz` };
      status.value = 'done';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        status.value = 'cancelled';
      } else {
        status.value = 'error';
        error.value = err instanceof Error ? err.message : String(err);
        console.error('Table Builder table build failed:', err);
      }
    } finally {
      controller = null;
    }
  }

  function cancelBuild() {
    controller?.abort();
  }

  function downloadResult() {
    if (!result.value) return;
    const url = URL.createObjectURL(new Blob([result.value.gzipped], { type: 'application/gzip' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = result.value.fileName;
    a.click();
    // Let the download start before the URL goes away.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    deliverySelection,
    workerCount,
    status,
    progress,
    result,
    error,
    startBuild,
    cancelBuild,
    downloadResult,
  };
});
