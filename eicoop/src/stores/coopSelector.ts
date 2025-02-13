import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';

export const useCoopSelectorStore = defineStore('coopSelector', () => {
  const showModal = ref(false);
  const selectedContractId = ref('');

  function show() {
    showModal.value = true;
  }

  function hide() {
    showModal.value = false;
  }

  function toggle() {
    showModal.value = !showModal.value;
  }

  function selectContract(contractId: string) {
    selectedContractId.value = contractId;
  }

  function selectContractAndShow(contractId: string) {
    selectContract(contractId);
    show();
  }

  return { showModal, selectedContractId, selectContract, show, hide, toggle, selectContractAndShow };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCoopSelectorStore, import.meta.hot));
}

export default useCoopSelectorStore;
