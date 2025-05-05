import { getSavedPlayerIDs, savePlayerIDs } from 'lib';
import { defineStore, acceptHMRUpdate } from 'pinia';
import { Ref, ref } from 'vue';

export const useEidsStore = defineStore('eids', () => {
  const list: Ref<Set<string>> = ref(new Set<string>(getSavedPlayerIDs() ?? []));
  console.log('uwu: ', JSON.stringify([...list.value]));
  console.log('owo: ', list.value);

  function addEid(eid: string) {
    console.log('adding', eid);
    console.log('uwu: ', JSON.stringify(list.value.values()));
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
