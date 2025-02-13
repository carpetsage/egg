import { defineStore, acceptHMRUpdate } from 'pinia';
import { Ref, ref } from 'vue';

type Notification = {
  id: number;
  key?: string;
  message: string;
};

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications: Ref<Notification[]> = ref([]);
  const index = ref(0);

  function upsert({ message, key }: { message: string; key?: string }) {
    if (key) {
      for (const notification of notifications.value) {
        if (notification.key === key) {
          notification.message = message;
          return;
        }
      }
    }
    notifications.value.push({
      id: index.value,
      key,
      message,
    });
    index.value++;
  }

  function dismiss(id: number) {
    notifications.value = notifications.value.filter(notification => notification.id !== id);
  }

  return { notifications, index, upsert, dismiss };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useNotificationsStore, import.meta.hot));
}

export default useNotificationsStore;
