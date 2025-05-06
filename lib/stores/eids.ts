import { defineStore, acceptHMRUpdate } from 'pinia';
import { getSavedPlayerIDs, savePlayerIDs } from '../storage';
import { ref } from 'vue';

export const useEidsStore = defineStore('eids', () => {
  const list = ref(new Set<string>(getSavedPlayerIDs() ?? []));

  function addEid(eid: string) {
    if (/^EI\d{16}$/.test(eid)) {
      list.value.add(eid);
    }

    if (list.value.size > 5) {
      list.value.delete(list.value.values().next().value ?? '');
    }
    savePlayerIDs(list.value);
  }

  function removeEid(eid: string) {
    list.value.delete(eid);
    savePlayerIDs(list.value);
  }

  return { list, addEid, removeEid };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEidsStore, import.meta.hot));
}

export default useEidsStore;
