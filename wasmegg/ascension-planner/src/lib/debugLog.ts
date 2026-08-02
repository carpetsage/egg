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
 */
import { getDeviceInfoText } from './deviceInfo';

const STORAGE_KEY = 'ascension_debug_log';
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
