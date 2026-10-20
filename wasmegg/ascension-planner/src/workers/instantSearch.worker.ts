/**
 * Web Worker for Chain Finder: keeps the loaded table and runs the route search on it (find, then
 * the quick polish), so the page stays responsive for the second or two a search takes.
 */
import { findRoutes, polishFound } from '@/lib/instantSearch/routeFinder';
import { readTable, unpackTableBytes, type Table } from '@/lib/instantSearch/table';
import type { InstantSearchRequest, InstantSearchResponse } from './instantSearch.protocol';

// `Worker`, not `DedicatedWorkerGlobalScope`: see researchCalc.worker.ts (dom and webworker libs clash).
const ctx = self as unknown as Worker;

let table: Table | null = null;

function post(message: InstantSearchResponse): void {
  ctx.postMessage(message);
}

ctx.onmessage = async (event: MessageEvent<InstantSearchRequest>) => {
  const msg = event.data;
  try {
    if (msg.kind === 'load') {
      table = readTable(await unpackTableBytes(msg.bytes));
      post({ type: 'loaded', requestId: msg.requestId, header: table.header });
      return;
    }
    if (!table) throw new Error('no table loaded');
    const t0 = performance.now();
    const options = {
      ...msg.options,
      onProgress: (done: number, of: number) => post({ type: 'progress', requestId: msg.requestId, done, of }),
    };
    const found = polishFound(table.lookup, msg.options, findRoutes(table.lookup, options));
    post({ type: 'result', requestId: msg.requestId, found, ms: performance.now() - t0 });
  } catch (err) {
    post({ type: 'error', requestId: msg.requestId, message: err instanceof Error ? err.message : String(err) });
  }
};
