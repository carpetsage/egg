/**
 * Store Fuel Action Executor
 *
 * Stores eggs in the fuel tank. Takes time based on lay rate at max habs.
 * Cost is 0 (free action, just time-based).
 */

import type { ActionExecutor, ExecutorContext } from '../executor';
import type { StoreFuelPayload } from '@/types';
import { VIRTUE_EGG_NAMES } from '@/types';
import { formatNumber, formatDuration } from '@/lib/format';

export const storeFuelExecutor: ActionExecutor<'store_fuel'> = {
  execute(payload: StoreFuelPayload, context: ExecutorContext): number {
    const { egg, amount } = payload;

    // Add fuel to tank
    context.addFuel(egg, amount);

    // Storing fuel is free (time-based, not cost-based)
    return 0;
  },

  getDisplayName(payload: StoreFuelPayload): string {
    return `Store ${formatNumber(payload.amount, 1)} ${VIRTUE_EGG_NAMES[payload.egg]}`;
  },

  getEffectDescription(payload: StoreFuelPayload): string {
    return `+${formatNumber(payload.amount, 1)} eggs (${formatDuration(payload.timeSeconds)})`;
  },
};
