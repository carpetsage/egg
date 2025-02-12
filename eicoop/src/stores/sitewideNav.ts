import { defineStore, acceptHMRUpdate } from 'pinia';
import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from '@/lib';
import { ref } from 'vue';

const SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY = 'sitewideNavFirstUsed';

export const useSitewideNavStore = defineStore('sitewideNav', () => {
  const used = ref(getLocalStorageNoPrefix(SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY) !== undefined);
  const open = ref(false);

  function closeNav() {
    open.value = false;
  }
  function openNav() {
    open.value = true;
    if (!used.value) {
      used.value = true;
      setLocalStorageNoPrefix(SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY, Date.now());
    }
  }
  return { used, open, closeNav, openNav };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSitewideNavStore, import.meta.hot));
}

export default useSitewideNavStore;
