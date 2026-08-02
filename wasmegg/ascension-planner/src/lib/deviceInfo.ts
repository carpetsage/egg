/**
 * Snapshot of build/device/browser info, prepended to diagnostic reports (see debugLog.ts) so a
 * bug report from a non-technical user includes enough context to reproduce without a round-trip
 * of follow-up questions — what commit they're on, what device/browser, and (the actual motivation
 * for this file) how weak the device/connection is, since several real bugs here turned out to be
 * performance problems that only showed up on low-powered phones.
 *
 * Everything is read fresh each time `getDeviceInfoText()` is called rather than captured once —
 * none of it changes meaningfully within a session, and reading it fresh means it's never stale
 * relative to when the report was actually generated.
 */

export function getDeviceInfoText(): string {
  const lines: string[] = [];

  lines.push(`Report time: ${new Date().toISOString()}`);
  lines.push(`App commit: ${__APP_COMMIT__} (${__APP_COMMIT_TIME__})`);
  lines.push(`App build time: ${__APP_BUILD_TIME__}`);
  lines.push(`Mode: ${import.meta.env.MODE}`);
  if (typeof location !== 'undefined') {
    lines.push(`URL: ${location.href}`);
  }

  if (typeof navigator !== 'undefined') {
    lines.push(`User agent: ${navigator.userAgent}`);
    lines.push(`Language: ${navigator.language}`);
    lines.push(`CPU cores: ${navigator.hardwareConcurrency ?? 'n/a'}`);

    // Chrome-only APIs — most useful signals for "is this device actually weak", but absent
    // elsewhere (Safari, Firefox), so always guard for undefined rather than assume support.
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
    };
    lines.push(`Device memory: ${nav.deviceMemory !== undefined ? `~${nav.deviceMemory}GB` : 'n/a'}`);
    if (nav.connection) {
      const c = nav.connection;
      lines.push(
        `Network: ${c.effectiveType ?? 'n/a'}, downlink ${c.downlink ?? 'n/a'}Mbps, rtt ${c.rtt ?? 'n/a'}ms, saveData ${c.saveData ?? 'n/a'}`
      );
    } else {
      lines.push('Network: n/a');
    }
  }

  if (typeof screen !== 'undefined' && typeof window !== 'undefined') {
    lines.push(`Screen: ${screen.width}x${screen.height} @ ${window.devicePixelRatio ?? 1}x`);
    lines.push(`Viewport: ${window.innerWidth}x${window.innerHeight}`);
  }

  return lines.join('\n');
}
