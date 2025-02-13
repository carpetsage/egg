<template>
  <div aria-live="assertive" class="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start">
    <div class="w-full flex flex-col items-center space-y-4 sm:items-end">
      <template v-for="notification in notifications" :key="notification.id">
        <transition
          enter-active-class="transform ease-out duration-300 transition"
          enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="notification.id"
            class="max-w-sm w-full bg-white dark:bg-gray-700 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black dark:ring-gray-500 ring-opacity-5 overflow-hidden"
          >
            <div class="p-4">
              <div class="flex items-center">
                <div class="w-0 flex-1 flex justify-between">
                  <p class="w-0 flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ notification.message }}
                  </p>
                </div>
                <div class="ml-4 flex-shrink-0 flex">
                  <button
                    class="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    @click="dismiss(notification.id)"
                  >
                    <span class="sr-only">Close</span>
                    <XIcon class="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { XIcon } from '@heroicons/vue/solid';
import useNotificationsStore from '@/stores/notifications';

export default defineComponent({
  components: {
    XIcon,
  },
  setup() {
    const notificationStore = useNotificationsStore();
    const notifications = computed(() => notificationStore.notifications);
    const dismiss = (id: number) => {
      notificationStore.dismiss(id);
    };
    return {
      notifications,
      dismiss,
    };
  },
});
</script>
