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
        class="relative sm:max-w-xs flex items-stretch grow focus-within:z-10"
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
          class="-ml-px relative inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-r-md bg-blue-600 hover:bg-blue-700 duration-0! focus:outline-none disabled:opacity-50"
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
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';

import { checkIfShouldOnboardUserDashboardFeature, getLocalStorage, setLocalStorage } from '@/lib';
import BaseInfo from 'ui/components/BaseInfo.vue';
import BaseInput from 'ui/components/BaseInput.vue';

const USER_ID_LOCALSTORAGE_KEY = 'userId';

export default defineComponent({
  components: {
    BaseInfo,
    BaseInput,
  },
  setup() {
    const router = useRouter();
    const onboarding = checkIfShouldOnboardUserDashboardFeature();
    const userId = ref(getLocalStorage(USER_ID_LOCALSTORAGE_KEY) || '');
    const submittable = computed(() => {
      return userId.value !== '';
    });
    const submit = () => {
      setLocalStorage(USER_ID_LOCALSTORAGE_KEY, userId.value);
      router.push({ name: 'dashboard', params: { userId: userId.value } });
    };
    return {
      onboarding,
      userId,
      submittable,
      submit,
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
