<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="flex-1 max-w-ultrawide w-full mx-auto mt-6 ultrawide:px-4">
    <user-dashboard-entry-form @submit="setUserId" />
    <div v-if="!userId">
      <frequently-asked-questions />
    </div>
    <div v-else-if="backup" class="relative -my-px py-px">
      <main>
        <user-dashboard :backup="backup" />
        <frequently-asked-questions />
      </main>
      <div
        v-if="loading || error"
        class="absolute inset-0 rounded-md bg-gray-200 dark:bg-gray-700 bg-opacity-80 dark:bg-opacity-80"
      >
        <div class="pt-6 flex items-center justify-center">
          <base-loading v-if="loading" />
          <div v-else-if="error" class="overflow-y-scroll">
            <error-message :error="error" />
          </div>
        </div>
      </div>
    </div>
    <div v-else class="flex items-center justify-center">
      <base-loading v-if="loading" class="mt-6" />
      <div v-else-if="error" class="mt-6">
        <error-message :error="error" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, provide, Ref, ref, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';

import { ei, getUserBackup, recordUserDashboardFeatureUsage, getSavedPlayerID, savePlayerID } from '@/lib';
import { refreshCallbackKey } from '@/symbols';
import BaseLoading from '@/components/BaseLoading.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import FrequentlyAskedQuestions from '@/components/FrequentlyAskedQuestions.vue';
import UserDashboard from '@/components/UserDashboard.vue';
import useEidsStore from 'lib/stores/eids';
import UserDashboardEntryForm from '@/components/UserDashboardEntryForm.vue';

export default defineComponent({
  components: {
    BaseLoading,
    ErrorMessage,
    FrequentlyAskedQuestions,
    UserDashboard,
    UserDashboardEntryForm,
  },
  props: {
    userId: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const { userId: userIdProp } = toRefs(props);
    const router = useRouter();
    const eidsStore = useEidsStore();

    // Load from localStorage, fallback to URL userId
    const userId = ref(getSavedPlayerID() || userIdProp.value || '');

    const setUserId = (newUserId: string) => {
      userId.value = newUserId;
      savePlayerID(newUserId);
      eidsStore.addEid(newUserId);
      // Navigate to /dashboard with userId in URL
      router.replace({ name: 'dashboard', params: { userId: newUserId } });
    };

    // If URL has userId but differs from localStorage, use URL (legacy link support)
    if (userIdProp.value && userIdProp.value !== userId.value) {
      setUserId(userIdProp.value);
    }

    const loading = ref(true);
    const backup: Ref<ei.IBackup | undefined> = ref(undefined);
    const error: Ref<Error | undefined> = ref(undefined);

    const refreshBackup = async () => {
      if (!userId.value) {
        loading.value = false;
        return;
      }
      loading.value = true;
      error.value = undefined;
      try {
        const userBackup = await getUserBackup(userId.value);
        backup.value = userBackup;
        recordUserDashboardFeatureUsage();
        eidsStore.addEid(userId.value);
      } catch (err) {
        error.value = err instanceof Error ? err : new Error(`${err}`);
      }
      loading.value = false;
    };

    refreshBackup();
    provide(refreshCallbackKey, () => {
      refreshBackup();
    });
    watch(userId, () => {
      backup.value = undefined;
      refreshBackup();
    });

    return {
      userId,
      loading,
      backup,
      error,
      setUserId,
    };
  },
});
</script>
