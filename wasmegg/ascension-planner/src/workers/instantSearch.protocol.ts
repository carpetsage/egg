/**
 * Messages between the Chain Finder store (stores/instantSearch.ts) and its Web Worker
 * (instantSearch.worker.ts). The worker holds the one table loaded; a search names nothing else.
 */
import type { FindOptions, FoundRoutes } from '@/lib/instantSearch/routeFinder';
import type { TableHeader } from '@/lib/instantSearch/table';

export type InstantSearchRequest =
  /** A table file's bytes, gzipped or not (transferred). */
  | { kind: 'load'; requestId: number; bytes: ArrayBuffer }
  | { kind: 'search'; requestId: number; options: Omit<FindOptions, 'onProgress'> };

export type InstantSearchResponse =
  | { type: 'loaded'; requestId: number; header: TableHeader }
  /** `stage` 'waits': the routes found, their prestiges' waits being worked out (`waitForEggs`). */
  | { type: 'progress'; requestId: number; done: number; of: number; stage?: 'waits' }
  | { type: 'result'; requestId: number; found: FoundRoutes; ms: number }
  | { type: 'error'; requestId: number; message: string };
