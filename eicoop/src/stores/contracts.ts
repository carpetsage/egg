import { defineStore, acceptHMRUpdate } from 'pinia';
import { ei, rawContractList, SortedContractList } from '@/lib';
import { computed, Ref, ref } from 'vue';

export const useContractsStore = defineStore('contracts', () => {
  const list: Ref<SortedContractList> = ref(new SortedContractList(rawContractList));
  const deduplicatedList = computed(() => list.value.deduplicated());

  function addContract(contract: ei.IContract) {
    list.value.add(contract);
  }

  return { list, deduplicatedList, addContract };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useContractsStore, import.meta.hot));
}

export default useContractsStore;
