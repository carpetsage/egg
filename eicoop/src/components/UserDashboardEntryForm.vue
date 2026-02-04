<template>
  <div class="bg-white dark:bg-gray-800 shadow overflow-hidden ultrawide:rounded-lg">
    <div class="px-4 sm:px-6 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 text-sm font-medium">
      Access personal dashboard
      <sup
        v-if="onboarding"
        class="inline-flex items-center pl-0.5 text-green-500 animate-bounce"
        :style="{ fontSize: '0.625rem', lineHeight: '0.75rem' }"
      >
        NEW
      </sup>
    </div>
    <div class="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3">
      <p class="text-xs text-gray-900 dark:text-gray-100 mb-2">
        Enter your ID to access a personal dashboard where the status of all your contracts, including solos and
        not-yet-joined-coops, are shown in one place. Bookmark your dashboard page to check on all your contracts at any
        time.
      </p>

      <form
        class="relative sm:max-w-xs flex items-stretch flex-grow focus-within:z-10"
        :class="onboarding ? 'border border-green-500 rounded-md' : null"
        :style="onboarding ? { animation: 'glowing 2s ease-in-out infinite' } : undefined"
        @submit="
          $event.preventDefault();
          submit();
        "
      >
        <base-input
          id="user_id"
          v-model="userId"
          name="user_id"
          type="text"
          class="appearance-none block w-full px-3 py-2 text-base border border-gray-300 rounded-l-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500"
          placeholder="User ID"
          spellcheck="false"
          autocapitalize="off"
        />
        <button
          type="submit"
          class="-ml-px relative inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-r-md bg-blue-600 hover:bg-blue-700 !duration-0 focus:outline-none disabled:opacity-50"
          :class="{ 'cursor-not-allowed': !submittable }"
          :disabled="!submittable"
        >
          <svg class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </form>

      <span
        v-tippy="{
          content: `The ID asked for here is the unique ID used by Egg, Inc.\'s server to identify your account. You can find it in <span class='text-blue-300'>game screen -> nine dots menu -> Settings -> Privacy & Data, at the very bottom</span>. It should look like EI1234567890123456. Your old game services ID prior to the Artifact Update does not work here. Also note that the ID is case-sensitive.`,
          allowHTML: true,
        }"
        class="mt-2 flex items-center space-x-1 w-max"
      >
        <base-info />
        <span class="text-xs text-gray-500 dark:text-gray-400">Where do I find my ID?</span>
      </span>

      <label class="mt-3 flex items-center space-x-2 cursor-pointer">
        <input
          v-model="autoLoadCoops"
          type="checkbox"
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          @change="saveAutoLoadCoops"
        />
        <span class="text-xs text-gray-700 dark:text-gray-300">Auto-load coops</span>
      </label>

      <div v-if="eids.size > 1" class="mt-3">
        <div class="text-xs text-gray-900 dark:text-gray-100 mb-1">Recent IDs:</div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="[eid, name] in eids"
            :key="eid"
            class="inline-flex items-center px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs text-gray-800 dark:text-gray-200"
          >
            <button
              type="button"
              class="mr-1 text-gray-400 hover:text-blue-500 focus:outline-none"
              aria-label="Edit name"
              @click="eidsStore.editName(eid, name)"
            >
              ✎
            </button>
            <button
              type="button"
              class="hover:underline mr-1"
              style="text-decoration-thickness: 1.5px"
              @click="
                userId = eid;
                submit();
              "
            >
              {{ name || eid }}
            </button>
            <button
              type="button"
              class="ml-1 text-gray-400 hover:text-red-500 focus:outline-none"
              aria-label="Remove"
              @click="eidsStore.removeEid(eid)"
            >
              &times;
            </button>
          </span>
        </div>
      </div>
    </div>

    <base-modal :should-show="showAutoLoadWarning" :hide="hideAutoLoadWarning">
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Auto-load coops?</h3>
        <div class="mt-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Checking coop status with your EID will intercept any tokens you've been sent but haven't received yet. They usually show up 30 minutes later, but may never appear.
          </p>
        </div>
        <div class="mt-4 flex gap-3 justify-end">
          <button
            @click="declineAutoLoad"
            class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Turn Off
          </button>
          <button
            @click="confirmAutoLoad"
            class="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Keep Enabled
          </button>
        </div>
      </div>
    </base-modal>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  checkIfShouldOnboardUserDashboardFeature,
  getSavedPlayerID,
  savePlayerID,
  useEidsStore,
  getLocalStorage,
  setLocalStorage,
  getLocalStorageNoPrefix,
  setLocalStorageNoPrefix,
} from '@/lib';
import BaseInfo from 'ui/components/BaseInfo.vue';
import BaseInput from 'ui/components/BaseInput.vue';
import BaseModal from '@/components/BaseModal.vue';
import { PlayerIdSchema } from 'lib/schema';

const COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY = 'collapseRecentEids';

export default defineComponent({
  components: {
    BaseInfo,
    BaseInput,
    BaseModal,
  },
  emits: {
    submit: (_userId: string) => true,
  },
  setup(_, { emit }) {
    const router = useRouter();
    const onboarding = checkIfShouldOnboardUserDashboardFeature();
    const userId = ref(getSavedPlayerID() || '');
    const eidsStore = ref(useEidsStore());
    const eids = eidsStore.value.eids;
    const collapsed = ref(getLocalStorage(COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY) === 'true');
    
    const AUTO_LOAD_COOPS_KEY = 'autoLoadCoops';
    const AUTOLOAD_WARNING_ACKNOWLEDGED_KEY = 'autoLoadWarningAcknowledged';
    const autoLoadCoops = ref(getLocalStorageNoPrefix(AUTO_LOAD_COOPS_KEY) === 'true');
    const showAutoLoadWarning = ref(false);

    const saveAutoLoadCoops = () => {
      const wasEnabled = getLocalStorageNoPrefix(AUTO_LOAD_COOPS_KEY) === 'true';
      const isNowEnabled = autoLoadCoops.value;
      
      if (!wasEnabled && isNowEnabled && getLocalStorageNoPrefix(AUTOLOAD_WARNING_ACKNOWLEDGED_KEY) !== 'true') {
        showAutoLoadWarning.value = true;
        // Don't save yet, wait for confirmation
      } else {
        setLocalStorageNoPrefix(AUTO_LOAD_COOPS_KEY, autoLoadCoops.value.toString());
      }
    };

    const hideAutoLoadWarning = () => {
      showAutoLoadWarning.value = false;
    };

    const confirmAutoLoad = () => {
      setLocalStorageNoPrefix(AUTOLOAD_WARNING_ACKNOWLEDGED_KEY, 'true');
      setLocalStorageNoPrefix(AUTO_LOAD_COOPS_KEY, 'true');
      hideAutoLoadWarning();
    };

    const declineAutoLoad = () => {
      autoLoadCoops.value = false;
      setLocalStorageNoPrefix(AUTO_LOAD_COOPS_KEY, 'false');
      hideAutoLoadWarning();
    };

    const submittable = computed(() => {
      return PlayerIdSchema.safeParse(userId.value.trim()).success;
    });

    const submit = () => {
      const trimmedUserId = userId.value.trim();
      savePlayerID(trimmedUserId);
      emit('submit', trimmedUserId);
      // Only navigate if not already on dashboard
      if (router.currentRoute.value.name !== 'dashboard' && router.currentRoute.value.name !== 'dashboard-legacy') {
        router.push({ name: 'dashboard' });
      }
    };

    const toggleCollapse = () => {
      collapsed.value = !collapsed.value;
      setLocalStorage(COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY, collapsed.value);
    };

    return {
      onboarding,
      userId,
      submittable,
      submit,
      eids,
      eidsStore,
      collapsed,
      toggleCollapse,
      autoLoadCoops,
      saveAutoLoadCoops,
      showAutoLoadWarning,
      hideAutoLoadWarning,
      confirmAutoLoad,
      declineAutoLoad,
    };
  },
});
</script>

<style>
@keyframes glowing {
  50% {
    box-shadow: 0 0 0.4rem 0.1rem #10b981;
  }
}
</style>
