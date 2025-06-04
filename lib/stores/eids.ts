import { defineStore, acceptHMRUpdate } from 'pinia';
import { getSavedPlayerIDs, savePlayerIDs, type EidEntry } from '../storage';
import { ref } from 'vue';

export const useEidsStore = defineStore('eids', () => {
  const list = ref<Set<EidEntry>>(new Set());

  // Initialize from saved data
  const savedEntries = getSavedPlayerIDs() ?? [];
  savedEntries.forEach((entry) => {
    list.value.add(entry);
  });

  function addEid(eid: string, name?: string) {
    if (!/^EI\d{16}$/.test(eid)) {
      return;
    }

    // Check if eid already exists
    const existingEntry = Array.from(list.value).find((entry) => entry.id === eid);
    if (existingEntry) {
      if (name) {
        existingEntry.name = name;
      }
      return;
    }

    // Add new entry
    list.value.add({ id: eid, name });

    // Remove oldest entry if over limit
    if (list.value.size > 5) {
      removeEid(Array.from(list.value)[0].id);
    }

    savePlayerIDs(list.value);
  }

  function removeEid(eid: string) {
    const entry = list.value.values().find((entry) => entry.id === eid);
    if (entry) {
      removeEntry(entry);
    }
  }

  function removeEntry(entry: EidEntry) {
    list.value.delete(entry);
    savePlayerIDs(list.value);
  }

  function updateEidName(eid: string, name: string) {
    const entry = list.value.values().find((entry) => entry.id === eid);
    if (entry) {
      entry.name = name;
      savePlayerIDs(list.value);
    }
  }

  return { list, addEid, removeEntry, removeEid, updateEidName };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEidsStore, import.meta.hot));
}

export default useEidsStore;
