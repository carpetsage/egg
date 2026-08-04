import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUIStore = defineStore('ui', () => {
  const plannerTab = ref<'manual' | 'automatic'>('manual');
  const isHeaderCollapsed = ref(false);
  const isFooterCollapsed = ref(false);
  const loading = ref(false);
  const error = ref('');

  function setActiveTab(tab: 'manual' | 'automatic') {
    plannerTab.value = tab;
  }

  function setHeaderCollapsed(collapsed: boolean) {
    isHeaderCollapsed.value = collapsed;
  }

  function setLoading(l: boolean) {
    loading.value = l;
  }

  function setError(e: string) {
    error.value = e;
  }

  return {
    plannerTab,
    isHeaderCollapsed,
    isFooterCollapsed,
    loading,
    error,
    setActiveTab,
    setHeaderCollapsed,
    setLoading,
    setError,
  };
});
