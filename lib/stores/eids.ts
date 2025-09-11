import { defineStore, acceptHMRUpdate } from 'pinia';
import { getSavedPlayerIDs, savePlayerIDs } from '../storage';
import { ref } from 'vue';
import { PlayerIdSchema } from '../schema';

export const useEidsStore = defineStore('eids', () => {
  // Initialize from saved data
  const eids = ref(getSavedPlayerIDs());

  function addEid(eid: string) {
    eid = eid.trim();
    if (!PlayerIdSchema.safeParse(eid).success || eids.value.has(eid)) {
      return;
    }

    eids.value.set(eid, '');

    // Remove oldest entry if over limit
    if (eids.value.size > 7) {
      const firstKey = eids.value.keys().next().value;
      eids.value.delete(firstKey ?? '');
    }

    savePlayerIDs(eids.value);
  }

  function removeEid(eid: string) {
    eids.value.delete(eid);
    savePlayerIDs(eids.value);
  }

  function updateEid(eid: string, name: string) {
    if (!PlayerIdSchema.safeParse(eid).success) {
      return;
    }
    eids.value.set(eid, name);
    savePlayerIDs(eids.value);
  }

  function editName(eid: string, oldname?: string) {
    const name = prompt('Enter a name for this EID:', oldname);
    if (name !== null) {
      updateEid(eid, name);
    }
  }

  return { eids, addEid, removeEid, updateEid, editName };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEidsStore, import.meta.hot));
}

export default useEidsStore;
