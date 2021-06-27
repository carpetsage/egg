import { Ref, ref, watch } from 'vue';

import { getLocalStorage, setLocalStorage } from 'lib';
import dayjs, { Dayjs } from 'dayjs';

const NOTIFICATIONS_LOCALSTORAGE_KEY = 'notifications';
const notificationSupportedByBrowser = 'Notification' in window;

export type NotificationParams = {
  description?: string;
  fireAt: Dayjs;
  title: string;
  options: NotificationOptions | undefined;
};

export function useNotifications(
  params: Ref<NotificationParams[]>
): {
  notificationSupportedByBrowser: boolean;
  isMobileBrowser: boolean;
  notificationPermissionDenied: Ref<boolean>;
  on: Ref<boolean>;
  toggleNotifications: () => void;
  clearNotifications: () => void;
} {
  const on = ref(false);
  const notificationPermissionDenied = ref(false);
  const isMobileBrowser = navigator.userAgent.match(/iPhone|iPad|iPod|Android/i) !== null;
  if (!notificationSupportedByBrowser) {
    return {
      notificationSupportedByBrowser,
      isMobileBrowser,
      notificationPermissionDenied,
      on,
      /* eslint-disable @typescript-eslint/no-empty-function */
      toggleNotifications: () => {},
      clearNotifications: () => {},
      /* eslint-enable */
    };
  }

  const notificationTimeoutIds = <number[]>[];

  const toggleNotifications = async () => {
    // Turn off.
    if (on.value) {
      on.value = false;
      setLocalStorage(NOTIFICATIONS_LOCALSTORAGE_KEY, false);
      clearNotifications();
      return;
    }
    // Turn on.
    if (!(await requestPermission())) {
      return;
    }
    on.value = true;
    setLocalStorage(NOTIFICATIONS_LOCALSTORAGE_KEY, true);
    setNotifications();
    watch(params, () => {
      setNotifications();
    });
  };

  const setNotifications = () => {
    clearNotifications();
    for (const p of params.value) {
      const timeout = p.fireAt.diff(dayjs());
      if (timeout <= 0) {
        continue;
      }
      const timeoutId = setTimeout(() => {
        new Notification(p.title, p.options);
      }, timeout);
      console.log(
        `scheduled notification for ${p.description || '?'} at ${
          p.fireAt
        } (timeout ID ${timeoutId})`
      );
      notificationTimeoutIds.push(timeoutId);
    }
  };

  const clearNotifications = () => {
    notificationTimeoutIds.forEach(timeoutId => {
      clearTimeout(timeoutId);
      console.log(`unscheduled notification with timeout ID ${timeoutId}`);
    });
    notificationTimeoutIds.length = 0;
  };

  const requestPermission = async (): Promise<boolean> => {
    // Safari doesn't support the promise version of Notification.requestPermission. Thanks Apple!
    const permission = await new Promise(resolve => {
      Notification.requestPermission(result => resolve(result));
    });
    if (permission === 'default' || permission === 'denied') {
      console.error(`no permissions to display notifications: ${permission}`);
      notificationPermissionDenied.value = true;
      on.value = false;
      setLocalStorage(NOTIFICATIONS_LOCALSTORAGE_KEY, false);
      return false;
    }
    notificationPermissionDenied.value = false;
    return true;
  };

  // Initial value from localStorage.
  if (getLocalStorage(NOTIFICATIONS_LOCALSTORAGE_KEY) === 'true') {
    toggleNotifications();
  }

  return {
    notificationSupportedByBrowser,
    isMobileBrowser,
    notificationPermissionDenied,
    on,
    toggleNotifications,
    clearNotifications,
  };
}
