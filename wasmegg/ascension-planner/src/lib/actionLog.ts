/**
 * Builds a plain-text, chronological log of every action in the current plan — one line per
 * action, with an absolute timestamp (in the plan's own configured timezone) and enough detail
 * (payload, resulting sale/boost state, earnings/ELR) to reconstruct what happened and when.
 *
 * Built for pasting into a chat message for external analysis — e.g. cross-referencing a manual
 * plan's real purchase order/timing against a beam-search trace export
 * (workers/beamSearch.protocol.ts) without retyping dozens of actions by hand, which is slow and
 * error-prone. Not meant for on-screen display, so verbosity/length isn't a concern the way it is
 * for UI panels — every action gets a line, full stop.
 */
import type { Action } from '@/types';
import { formatAbsoluteTime, formatNumber } from './format';

function formatPayload(action: Action): string {
  switch (action.type) {
    case 'start_ascension':
      return `egg=${action.payload.initialEgg}`;
    case 'shift':
      return `${action.payload.fromEgg} -> ${action.payload.toEgg} (shift #${action.payload.newShiftCount})`;
    case 'buy_research':
      return `${action.payload.researchId} ${action.payload.fromLevel} -> ${action.payload.toLevel} (cost ${formatNumber(action.cost)})`;
    case 'wait_for_time':
    case 'wait_for_research_sale':
    case 'wait_for_earnings_boost':
    case 'wait_for_no_earnings':
      return `${formatNumber(action.payload.totalTimeSeconds)}s`;
    case 'wait_for_full_habs':
      return `${formatNumber(action.payload.totalTimeSeconds)}s (habCapacity=${formatNumber(action.payload.habCapacity)})`;
    case 'wait_for_gems':
      return `target ${formatNumber(action.payload.targetGems)} gems, ${formatNumber(action.payload.timeSeconds)}s`;
    case 'wait_for_te':
      return `target ${action.payload.targetTE} TE (${action.payload.egg}), ${formatNumber(action.payload.timeSeconds)}s`;
    case 'wait_for_missions':
      return `${formatNumber(action.payload.totalTimeSeconds)}s`;
    case 'toggle_sale':
      return `${action.payload.saleType} sale ${action.payload.active ? 'STARTED' : 'ENDED'}`;
    case 'toggle_earnings_boost':
      return `${action.payload.active ? 'STARTED' : 'ENDED'} (${action.payload.multiplier}x)`;
    default:
      // Infra/artifact/misc action types not central to research-purchase timing investigations —
      // still logged (every action gets a line), just via a generic dump rather than a hand-tuned
      // formatter for each one.
      return JSON.stringify(action.payload);
  }
}

export function buildActionHistoryLog(
  actions: Action[],
  planStartTimestampMs: number,
  planStartOffsetSeconds: number,
  timezone: string
): string {
  const lines: string[] = [
    `Ascension action log — ${actions.length} actions — exported ${formatAbsoluteTime(0, Date.now(), timezone)}`,
    `Timezone: ${timezone}`,
    '',
  ];

  for (const [i, action] of actions.entries()) {
    const absoluteSeconds = planStartTimestampMs / 1000 + (action.endState.lastStepTime - planStartOffsetSeconds);
    const when = formatAbsoluteTime(0, absoluteSeconds * 1000, timezone);
    const sale = action.endState.activeSales?.research ? 'sale=ON' : 'sale=off';
    const boost = action.endState.earningsBoost?.active ? 'boost=ON' : 'boost=off';
    const earn = formatNumber(action.endState.offlineEarnings * 3600);
    const elr = formatNumber(action.endState.elr * 3600);
    lines.push(
      `[${i + 1}] ${when} | ${action.type} | ${formatPayload(action)} | ${sale} ${boost} | earn=${earn}/hr elr=${elr}/hr`
    );
  }

  return lines.join('\n');
}
