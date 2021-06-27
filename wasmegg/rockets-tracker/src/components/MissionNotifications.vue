<template>
  <div v-if="notificationSupportedByBrowser" class="mt-2 space-y-1">
    <div
      v-tippy="{
        content: `Your browser's notifications feature is used to display system-level notifications when your rockets return. You have to allow notifications from this site when prompted to enable this feature. Unfortunately, due to platform limitations, <span class='text-blue-300'>this feature may not work reliably on mobile devices</span>.`,
        allowHTML: true,
      }"
      class="flex items-center justify-center space-x-2"
    >
      <button
        id="notifications"
        name="notifications"
        type="button"
        class="flex-shrink-0 group relative rounded-full inline-flex items-center justify-center h-5 w-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        @click="toggleNotifications"
      >
        <span class="sr-only">Toggle notifications</span>
        <span
          aria-hidden="true"
          class="absolute h-4 w-9 mx-auto rounded-full transition-colors ease-in-out duration-200"
          :class="[on ? 'bg-green-400' : 'bg-gray-200']"
        ></span>
        <span
          aria-hidden="true"
          class="absolute left-0 inline-block h-5 w-5 border border-gray-200 rounded-full bg-white shadow transform ring-0 transition-transform ease-in-out duration-200"
          :class="[on ? 'translate-x-5' : 'translate-x-0']"
        ></span>
      </button>
      <label for="notifications" class="text-sm text-gray-600">Mission return notifications</label>
    </div>

    <div
      v-if="notificationPermissionDenied"
      v-tippy="{
        content: `The site has been denied / did not receive permissions to show you notifications. Reload the page and try to toggle notifications again; or Google “how to allow website notifications in <your browser>” for instructions.`,
      }"
      class="mt-2 flex items-center justify-center space-x-1"
    >
      <svg
        class="h-4 w-4 text-red-500"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
      <a
        href="https://www.google.com/search?q=how+to+allow+website+notifications+in+my+browser"
        target="_blank"
        class="text-xs text-red-500 hover:text-red-400"
        >Notifications permission denied</a
      >
      <svg
        class="h-4 w-4 text-gray-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
    <div v-else-if="on && isMobileBrowser" class="text-center text-xs text-red-500">
      You appear to be using a mobile device. You may not reliably receive notifications when this
      page is in the background.
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, PropType, toRefs } from 'vue';

import { iconURL, Mission } from 'lib';
import { NotificationParams, useNotifications } from '@/composables/notifications';

export default defineComponent({
  props: {
    missions: {
      type: Array as PropType<Mission[]>,
      required: true,
    },
  },
  setup(props) {
    const { missions } = toRefs(props);
    const notifications = computed(() =>
      missions.value
        .filter(
          mission =>
            mission.returnTimestamp !== null && mission.returnTimestamp * 1000 > Date.now() + 10000
        )
        .map(
          (mission): NotificationParams => {
            const description = `${mission.durationTypeName} ${mission.shipName}`;
            return {
              description,
              fireAt: mission.returnTime!,
              title: `Your ${description} mission has returned!`,
              options: {
                icon: iconURL(mission.shipIconPath),
              },
            };
          }
        )
    );

    const {
      notificationSupportedByBrowser,
      isMobileBrowser,
      notificationPermissionDenied,
      on,
      toggleNotifications,
      clearNotifications,
    } = useNotifications(notifications);
    onBeforeUnmount(() => {
      clearNotifications();
    });

    return {
      notificationSupportedByBrowser,
      isMobileBrowser,
      notificationPermissionDenied,
      on,
      toggleNotifications,
    };
  },
});
</script>
