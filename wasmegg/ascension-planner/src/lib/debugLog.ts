/**
 * A small, persistent diagnostic log for reproducing hangs/freezes reported by users who can't
 * open devtools (e.g. on a phone). Writes to localStorage synchronously as each entry is logged,
 * so the trail survives right up to the moment of a freeze — unlike console output, which is lost
 * the instant the tab has to be force-closed. Pair with `LoadingOverlay.vue`'s stuck-watchdog,
 * which surfaces a "copy diagnostic report" button after a loading state has been showing too
 * long, so a non-technical user can grab this log with a single tap and paste it into a message.
 *
 * Deliberately lightweight: log at the same coarse, meaningful checkpoints that proved useful for
 * diagnosing hangs by hand (mode-switch steps, the milestone-chain watchEffect's lifecycle) — not
 * a full console.log replacement, and not every function call. Keep call sites sparse; each entry
 * costs a synchronous localStorage write.
 *
 * Also tracks "open operations" (see `debugLogStart`/`debugLogEnd`) — this is what makes it
 * possible to detect a TRUE main-thread freeze (as opposed to a merely slow one). A genuine
 * synchronous hang blocks everything JS-driven, including the `setTimeout` that
 * `LoadingOverlay.vue`'s in-session stuck-watchdog relies on and even the CSS spinner's compositor
 * frames on a severely starved device — so nothing can respond WHILE it's happening. But
 * `debugLogStart` marks an operation as open in localStorage the instant it begins, durably, so on
 * the NEXT page load (a fresh, definitely-unblocked execution) we can see "X was started last
 * session and never marked finished" and offer to copy that session's log — recovering
 * after the fact instead of needing anything to work during the freeze itself.
 */
import { getDeviceInfoText } from './deviceInfo';

const STORAGE_KEY = 'ascension_debug_log';
const OPEN_OPS_KEY = 'ascension_debug_open_ops';
const MAX_ENTRIES = 400;

interface DebugLogEntry {
  t: number; // Date.now() at log time
  msg: string;
}

let buffer: DebugLogEntry[] = loadBuffer();

function loadBuffer(): DebugLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — logging must never throw or break
    // the app it's trying to help diagnose.
  }
}

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export function debugLog(message: string, data?: unknown): void {
  const entry: DebugLogEntry = {
    t: Date.now(),
    msg: data !== undefined ? `${message} ${safeStringify(data)}` : message,
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
  persist();
}

// `openOperations` is loaded once at module init — i.e. it reflects exactly what was left open by
// the PREVIOUS session, until this session's own debugLogStart/debugLogEnd calls start mutating it.
// `getStaleOpenOperations()` must be called before this session logs anything of its own to get an
// accurate "what did the last session leave hanging" snapshot — see App.vue's onMounted, which
// calls it as the very first thing.
let openOperations: string[] = loadOpenOperations();

function loadOpenOperations(): string[] {
  try {
    const raw = localStorage.getItem(OPEN_OPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistOpenOperations(): void {
  try {
    localStorage.setItem(OPEN_OPS_KEY, JSON.stringify(openOperations));
  } catch {
    // See persist()'s comment — must never throw.
  }
}

/** Marks `label` as started. Pair with `debugLogEnd(label)` on every exit path (success AND
 * early-return), ideally via try/finally, or a hang partway through will look identical to one
 * that never got a matching debugLogEnd. */
export function debugLogStart(label: string, data?: unknown): void {
  debugLog(`START ${label}`, data);
  openOperations.push(label);
  persistOpenOperations();
}

/** Marks the most recently started still-open `label` as finished. Safe to call even if nothing
 * matching was ever started (no-op) — never throws. */
export function debugLogEnd(label: string, data?: unknown): void {
  debugLog(`END ${label}`, data);
  const idx = openOperations.lastIndexOf(label);
  if (idx !== -1) openOperations.splice(idx, 1);
  persistOpenOperations();
}

/**
 * Operations left open by the PREVIOUS session (i.e. `debugLogStart`ed but never matched with a
 * `debugLogEnd`) — a non-empty result means that session likely froze mid-operation. Must be
 * called before this session logs anything of its own (see the field comment above).
 */
export function getStaleOpenOperations(): string[] {
  return [...openOperations];
}

/** Acknowledges (clears) the stale-open-operations record, e.g. once the user has been shown and
 * dismissed/copied the recovery banner for it. Does not clear the event log itself. */
export function clearStaleOpenOperations(): void {
  openOperations = [];
  persistOpenOperations();
}

/**
 * Formats the buffered log as plain text, ready to paste — device/build info first (see
 * `deviceInfo.ts`), then the chronological event trail.
 */
export function getDebugLogText(): string {
  const header = getDeviceInfoText();
  const eventLog =
    buffer.length === 0
      ? '(no diagnostic log recorded yet)'
      : buffer.map(e => `[${new Date(e.t).toISOString()}] ${e.msg}`).join('\n');
  return `${header}\n\n--- event log ---\n${eventLog}`;
}

export function clearDebugLog(): void {
  buffer = [];
  persist();
}
