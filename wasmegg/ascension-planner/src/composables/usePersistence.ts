import { ref, onMounted, onUnmounted } from 'vue';
import { useActionsStore } from '@/stores/actions';
import { hashID, saveMetadata, loadMetadata } from '@/lib/storage/db';
import { exportPlanData } from '@/stores/actions/io';

const SYNC_CHANNEL_NAME = 'ascension_sync';
const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
const partitionHash = ref('');
const isSyncing = ref(false);

let lastSyncedDataStr = '';
let channelListenerAttached = false;

async function loadActiveDraft() {
  if (!partitionHash.value) return;

  const draft = await loadMetadata(partitionHash.value, 'active_draft');
  if (draft) {
    isSyncing.value = true;
    try {
      const actionsStore = useActionsStore();
      await actionsStore.importPlan(JSON.stringify(draft), true);

      const planData = exportPlanData(actionsStore.actions, actionsStore.initialSnapshot);
      const dataForComparison = { ...planData, timestamp: 0 };
      lastSyncedDataStr = JSON.stringify(dataForComparison);
    } finally {
      isSyncing.value = false;
    }
  }
}

const handleMessage = async (event: MessageEvent) => {
  if (event.data.type === 'STATE_UPDATED' && event.data.partitionHash === partitionHash.value) {
    await loadActiveDraft();
  }
};

export function usePersistence() {
  /**
   * Initialize persistence for a player EID.
   */
  async function initPersistence(eid: string) {
    partitionHash.value = await hashID(eid);
    await loadActiveDraft();
  }

  /**
   * Broadcast a state update to other tabs.
   */
  function broadcastUpdate() {
    if (isSyncing.value) return;
    channel.postMessage({
      type: 'STATE_UPDATED',
      partitionHash: partitionHash.value,
      timestamp: Date.now(),
    });
  }

  /**
   * Save the current session to the "Active Draft" slot.
   */
  async function saveActiveDraft() {
    if (!partitionHash.value || isSyncing.value) return;

    const actionsStore = useActionsStore();
    if (actionsStore.isRecalculating) return;

    const planData = exportPlanData(actionsStore.actions, actionsStore.initialSnapshot);
    const dataForComparison = { ...planData, timestamp: 0 };
    const newDataStr = JSON.stringify(dataForComparison);
    if (newDataStr === lastSyncedDataStr) return;

    lastSyncedDataStr = newDataStr;
    await saveMetadata(partitionHash.value, 'active_draft', planData);
    broadcastUpdate();
  }

  onMounted(() => {
    if (!channelListenerAttached) {
      channel.addEventListener('message', handleMessage);
      channelListenerAttached = true;
    }
  });

  onUnmounted(() => {
    // Don't close the channel — it's a module-level singleton.
    // Other components may still be using it.
  });

  return {
    initPersistence,
    saveActiveDraft,
    broadcastUpdate,
    partitionHash,
  };
}
