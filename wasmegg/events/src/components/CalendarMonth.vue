<template>
  <div
    class="CalendarMonth mx-auto px-4 py-4 space-y-4 bg-gray-50 border md:rounded-lg md:shadow md:px-6"
    :class="forceFullWidth ? 'CalendarMonth--full-width' : null"
  >
    <h2 class="text-center text-sm font-medium">{{ month.format('MMMM YYYY') }}</h2>
    <div class="grid grid-cols-7 gap-2">
      <div
        v-for="(weekday, index) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
        :key="index"
        class="text-center text-sm text-gray-500"
      >
        {{ weekday }}
      </div>

      <div v-for="index in month.day()" :key="index"></div>

      <div v-for="d in dates" :key="d.date.date()">
        <div class="text-center text-sm" :class="{ 'text-gray-400': d.date > now }">
          {{ d.date.format('D') }}
        </div>
        <div class="space-y-1">
          <template v-for="(event, index) in d.events" :key="index">
            <tippy
              v-if="eventTypesOn[event.type.id] !== false && showEvent(event)"
              class="flex items-center md:justify-start space-x-1"
              :class="forceFullWidth ? 'justify-start' : 'justify-center'"
            >
              <event-badge :event="event.type" />
              <span class="text-xs truncate md:inline" :class="[event.fgClass, forceFullWidth ? 'inline' : 'hidden']">
                <template v-if="event.isInGameEvent()">{{ event.caption }}</template>
                <template v-else>v{{ event.version }}</template>
              </span>

              <template #content>
                <template v-if="event.isInGameEvent()">
                  <div :class="event.brightFgClass">
                    <p class="flex items-center space-x-1">
                      <event-badge :event="event.type" />
                      <span class="text-xs truncate">
                        {{ event.message }}
                      </span>
                    </p>
                    <p>
                      <span class="text-white">Starting time:</span>
                      {{ event.startTime.local().format('MM-DD HH:mm Z') }}
                    </p>
                    <p>
                      <span class="text-white">Duration:</span>
                      {{ formatDuration(event.durationSeconds, true) }}
                    </p>
                    <p>
                      <span class="text-white">Ultra:</span>
                      {{ event.ultra }}
                    </p>
                    <p v-if="devmode">
                      <span class="text-white">ID:</span>
                      {{ event.id }}
                    </p>
                  </div>
                </template>

                <template v-else>
                  <div :class="event.brightFgClass">
                    <p class="flex items-center space-x-1">
                      <img :src="iconURL('egginc/ei_app_icon.png', 64)" class="h-4 w-4 rounded-sm" />
                      <span>App version {{ event.version }}</span>
                    </p>
                    <p>
                      <span class="text-white">Release date:</span>
                      {{ event.startTime.format('MM-DD') }}
                    </p>
                    <p>
                      <span class="text-white">Release notes:</span><br />
                      <span class="whitespace-pre-line">{{ event.releaseNotes.replaceAll('\\n', '\n') }}</span>
                    </p>
                  </div>
                </template>
              </template>
            </tippy>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';
import dayjs, { Dayjs } from 'dayjs';

import { formatDuration, getDevModeOn, iconURL } from 'lib';
import { GameEvent } from '@/events';
import { EventTypeSwitches } from '@/types';
import EventBadge from '@/components/EventBadge.vue';

export default defineComponent({
  components: {
    EventBadge,
    Tippy,
  },
  props: {
    month: {
      type: Object as PropType<Dayjs>,
      required: true,
    },
    date2events: {
      type: Object as PropType<Map<number, GameEvent[]>>,
      required: true,
    },
    eventTypesOn: {
      type: Object as PropType<EventTypeSwitches>,
      required: true,
    },
    forceFullWidth: {
      type: Boolean,
      default: false,
    },
    showUltraEvents: {
      type: Boolean,
      default: false,
    },
    showNormalEvents: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { month, date2events, showUltraEvents, showNormalEvents } = toRefs(props);
    const dates = computed(() => {
      const monthNumber = month.value.month();
      const dates = [];
      for (let date = month.value.clone(); date.month() === monthNumber; date = date.add(1, 'd')) {
        dates.push({
          date,
          events: date2events.value.get(date.date()) ?? [],
        });
      }
      return dates;
    });
    const showEvent = (event: GameEvent) => {
      if (event.isInGameEvent() && event.ultra) {
        return showUltraEvents.value;
      }
      if (event.isInGameEvent() && !event.ultra) {
        return showNormalEvents.value;
      }
      return true;
    };
    const devmode = getDevModeOn();
    return {
      now: dayjs(),
      dates,
      formatDuration,
      showEvent,
      iconURL,
      devmode,
    };
  },
});
</script>

<style scoped>
.CalendarMonth {
  width: 100%;
}

.CalendarMonth.CalendarMonth--full-width {
  width: 744px;
}

@media (min-width: 768px) {
  .CalendarMonth {
    width: 744px;
  }
}
</style>
