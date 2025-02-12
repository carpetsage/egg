import { computed, onBeforeUnmount, onMounted, ref, Ref, watch } from 'vue';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function useAutoRefreshedRelativeTime(
  referenceTime: Ref<Dayjs>,
  opts?: {
    withoutSuffix?: boolean;
    refreshIntervalMs?: number;
    refreshHook?: (now: Dayjs) => void;
  }
): {
  now: Ref<Dayjs>;
  relativeTime: Ref<string>;
  referenceTimeFormatted: Ref<string>;
} {
  const referenceTimeFormatted = computed(() => referenceTime.value.format('YYYY-MM-DD HH:mm:ss'));

  const now = ref(dayjs());
  const relativeTime = ref('');
  const refreshPure = () => {
    now.value = dayjs();
    relativeTime.value = (referenceTime.value.isBefore(now.value) ? referenceTime.value : now.value).fromNow(
      opts?.withoutSuffix
    );
  };
  refreshPure();

  const refresh = () => {
    refreshPure();
    opts?.refreshHook?.(now.value);
  };

  watch(referenceTime, () => refresh());

  let refreshIntervalId: number;
  onMounted(() => {
    refreshIntervalId = setInterval(refresh, opts?.refreshIntervalMs || 30000);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('visibilitychange', refresh);
  });
  onBeforeUnmount(() => {
    clearInterval(refreshIntervalId);
    window.removeEventListener('pageshow', refresh);
    window.removeEventListener('visibilitychange', refresh);
  });

  return {
    now,
    relativeTime,
    referenceTimeFormatted,
  };
}
