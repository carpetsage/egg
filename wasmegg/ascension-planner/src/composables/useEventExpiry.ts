import { ref } from 'vue';
import { checkEventCrossing, EventType } from '@/lib/actions/eventThresholds';
import { useActionsStore } from '@/stores/actions';
import { useSalesStore } from '@/stores/sales';
import { generateActionId } from '@/types';
import { computeDependencies } from '@/lib/actions/executor';
import { useActionExecutor } from '@/composables/useActionExecutor';

export function useEventExpiry() {
    const actionsStore = useActionsStore();
    const salesStore = useSalesStore();
    const { prepareExecution, completeExecution } = useActionExecutor();

    const showExpiryDialog = ref(false);
    const expiryData = ref({
        eventName: '',
        endTime: 0,
        completionTime: 0,
        type: EventType.RESEARCH_SALE,
    });

    let pendingAction: (() => void) | null = null;

    /**
     * Checks if the action(s) cross an active event boundary and shows a warning if so.
     * 
     * @param duration Estimated duration of the action(s)
     * @param isResearch Whether this action involves research (checks Research Sale)
     * @param action Function to execute if confirmed
     */
    function withExpiryCheck(duration: number, isResearch: boolean, action: () => void) {
        const snapshot = actionsStore.effectiveSnapshot;

        // 1. Check Earnings Boost (affects everything)
        const earningsCrossing = checkEventCrossing(snapshot, duration, EventType.EARNINGS_BOOST);
        if (earningsCrossing.isCrossed) {
            expiryData.value = {
                ...earningsCrossing,
                eventName: '2x Earnings Boost',
                type: EventType.EARNINGS_BOOST,
            };
            showExpiryDialog.value = true;
            pendingAction = action;
            return;
        }

        // 2. Check Research Sale
        if (isResearch) {
            const researchCrossing = checkEventCrossing(snapshot, duration, EventType.RESEARCH_SALE);
            if (researchCrossing.isCrossed) {
                expiryData.value = {
                    ...researchCrossing,
                    eventName: 'Research Sale',
                    type: EventType.RESEARCH_SALE,
                };
                showExpiryDialog.value = true;
                pendingAction = action;
                return;
            }
        }

        // 3. No crossing or no active event
        action();
    }

    function confirm() {
        if (pendingAction) {
            pendingAction();
            pendingAction = null;
        }
        showExpiryDialog.value = false;
    }

    function cancel() {
        pendingAction = null;
        showExpiryDialog.value = false;
    }

    /**
     * Cancel the original action and instead add a deactivation action for the event.
     */
    async function deactivateAndCancel() {
        const actionToRun = pendingAction;
        pendingAction = null;
        showExpiryDialog.value = false;

        const beforeSnapshot = prepareExecution();

        if (expiryData.value.type === EventType.RESEARCH_SALE) {
            const payload = {
                saleType: 'research' as const,
                active: false,
                multiplier: 0.3,
            };
            salesStore.setSaleActive('research', false);
            await completeExecution({
                id: generateActionId(),
                timestamp: Date.now(),
                type: 'toggle_sale',
                payload,
                cost: 0,
                dependsOn: computeDependencies(
                    'toggle_sale',
                    payload,
                    actionsStore.actionsBeforeInsertion,
                    actionsStore.initialSnapshot.researchLevels
                ),
            }, beforeSnapshot);
        } else {
            const payload = {
                active: false,
                multiplier: 2,
            };
            salesStore.setEarningsBoost(false, 1);
            await completeExecution({
                id: generateActionId(),
                timestamp: Date.now(),
                type: 'toggle_earnings_boost',
                payload,
                cost: 0,
                dependsOn: computeDependencies(
                    'toggle_earnings_boost',
                    payload,
                    actionsStore.actionsBeforeInsertion,
                    actionsStore.initialSnapshot.researchLevels
                ),
            }, beforeSnapshot);
        }
    }

    return {
        showExpiryDialog,
        expiryData,
        withExpiryCheck,
        confirm,
        cancel,
        deactivateAndCancel,
    };
}
