/**
 * Wait for Sleep Action Executor
 *
 * Account for time spent sleeping or resting.
 * Cost is 0 gems.
 */

import type { ActionExecutor, ExecutorContext } from '../executor';
import type { WaitForSleepPayload } from '@/types';
import { formatDuration } from '@/lib/format';

export const waitForSleepExecutor: ActionExecutor<'wait_for_sleep'> = {
    execute(_payload: WaitForSleepPayload, _context: ExecutorContext): number {
        // Waiting for sleep is free
        return 0;
    },

    getDisplayName(_payload: WaitForSleepPayload): string {
        return 'Wait for Sleep';
    },

    getEffectDescription(payload: WaitForSleepPayload): string {
        return `Rest period — ${formatDuration(payload.totalTimeSeconds)}`;
    },
};
