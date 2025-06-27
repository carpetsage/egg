<template>
  <the-nav-bar active-entry-id="events" width-classes="max-w-4xl px-4 lg:px-0" />

  <div class="max-w-4xl px-4 lg:px-0 mx-auto my-4 space-y-2">
    <h1 class="mx-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">Events calendar</h1>

    <div class="flex justify-start sm:justify-center">
      <div>
        <div class="relative flex items-start">
          <div class="flex items-center h-5">
            <input
              id="useUtcDates"
              v-model="useUtcDates"
              name="useUtcDates"
              type="checkbox"
              class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
            />
          </div>
          <div class="ml-2 flex items-center space-x-1">
            <label for="useUtcDates" class="text-sm text-gray-600">Use UTC dates</label>
            <base-info
              v-tippy="{
                content: `Events are marked on the calendar by their respective starting dates.
                  If this option is checked, the date is calculated under UTC, which basically
                  always avoids putting events of consecutive days under the same date, or
                  leaving some dates empty (these happens when, for instance, two days' worth
                  of events start at 1:00am and 23:00pm of the same day in local timezone).
                  Uncheck to use local timezone instead. Note that you can always hover/click
                  on an event to reveal the exact starting time in local timezone.`,
              }"
              class="cursor-help"
            />
          </div>
        </div>

        <div class="relative flex md:hidden items-start">
          <div class="flex items-center h-5">
            <input
              id="forceFullWidth"
              v-model="forceFullWidth"
              name="forceFullWidth"
              type="checkbox"
              class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
            />
          </div>
          <div class="ml-2 flex items-center space-x-1">
            <label for="forceFullWidth" class="text-sm text-gray-600"> Display boost multipliers </label>
            <base-info
              v-tippy="{
                content: `Display boost multipliers in addition to event labels directly in the
                  calendar. Due to screen width restrictions, checking this option comes with
                  the downside of requiring horizontal scrolling. Regardless of whether you
                  turn this on, you can always click on an event label to reveal more details,
                  including the multiplier.`,
              }"
              class="cursor-help"
            />
          </div>
        </div>

        <div class="relative flex items-start">
          <div class="flex items-center h-5">
            <input
              id="showUltraEvents"
              v-model="showUltraEvents"
              name="showUltraEvents"
              type="checkbox"
              class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
            />
          </div>
          <div class="ml-2 flex items-center space-x-1">
            <label for="showUltraEvents" class="text-sm text-gray-600">Show Ultra Only events</label>
            <base-info
              v-tippy="{
                content: `Ultra Subscribers get exclusive events. If this option is checked,
                  these events are shown in the calendar with all the normal events.`,
              }"
              class="cursor-help"
            />
          </div>
        </div>

        <div class="relative flex items-start">
          <div class="flex items-center h-5">
            <input
              id="showNormalEvents"
              v-model="showNormalEvents"
              name="showNormalEvents"
              type="checkbox"
              class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
            />
          </div>
          <div class="ml-2 flex items-center space-x-1">
            <label for="showNormalEvents" class="text-sm text-gray-600">Show Normal (non-Ultra) events</label>
            <base-info
              v-tippy="{
                content: `If this option is checked, normal non-ultra events will be shown.`,
              }"
              class="cursor-help"
            />
          </div>
        </div>

        <div class="relative hidden 2col:flex items-start">
          <div class="flex items-center h-5">
            <input
              id="forceSingleColumn"
              v-model="forceSingleColumn"
              name="forceSingleColumn"
              type="checkbox"
              class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
            />
          </div>
          <div class="ml-2 flex items-center space-x-1">
            <label for="forceSingleColumn" class="text-sm text-gray-600"> Single column view </label>
            <base-info
              v-tippy="{
                content: `When checked, show only one month per row.`,
              }"
              class="cursor-help"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <div v-for="eventType in eventTypes" :key="eventType.id" class="relative flex items-start">
        <div class="flex items-center h-5">
          <input
            :id="`show-${eventType.id}`"
            v-model="eventTypesOn[eventType.id]"
            :name="`show-${eventType.id}`"
            type="checkbox"
            class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
            @change="persistEventTypeOn(eventType.id)"
          />
        </div>
        <div class="ml-2">
          <label :for="`show-${eventType.id}`" class="flex items-center space-x-1">
            <event-badge :event="eventType" />
            <span class="text-sm text-gray-600">{{ capitalize(eventType.name.toLowerCase()) }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-center space-x-2">
      <button
        type="button"
        class="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-gray-500 hover:bg-gray-700 focus:outline-none"
        @click="turnOnAllEventTypes()"
      >
        Select all
      </button>
      <button
        type="button"
        class="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-gray-500 hover:bg-gray-700 focus:outline-none"
        @click="turnOffAllEventTypes()"
      >
        Unselect all
      </button>
    </div>

    <div>
      <p class="text-center text-xs text-gray-500">
        Data for 2020 events were extracted from spreadsheet provided by Discord user @lamCube. Start timestamps and
        durations are provided on a best-effort basis and not accurate. 2019 or earlier events are omitted due to event
        scarcity and lack of predictive power.
      </p>
      <p class="text-center text-xs text-gray-700">Tip: Hover over / click on event labels to reveal details.</p>
    </div>
  </div>

  <div class="overflow-x-auto pb-6 mt-4">
    <div
      class="Calendar grid content-evenly gap-6 mx-auto"
      :class="[forceFullWidth ? 'Calendar--full-width' : null, forceSingleColumn ? 'Calendar--single-column' : null]"
    >
      <template v-for="{ month, date2events } in months" :key="month">
        <calendar-month
          :month="month"
          :date2events="date2events"
          :event-types-on="eventTypesOn"
          :force-full-width="forceFullWidth"
          :show-ultra-events="showUltraEvents"
          :show-normal-events="showNormalEvents"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import TheNavBar from 'ui/components/NavBar.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';
import CalendarMonth from '@/components/CalendarMonth.vue';
import EventBadge from '@/components/EventBadge.vue';

import { computed, defineComponent, ref, watch } from 'vue';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { getLocalStorage, setLocalStorage } from 'lib';
import { events, eventTypes, GameEvent } from '@/events';
import { EventTypeId, EventTypeSwitches } from '@/types';

dayjs.extend(utc);

const SHOW_ULTRA_EVENTS_LOCALSTORAGE_KEY = 'showUltraEvents';
const SHOW_NORMAL_EVENTS_LOCALSTORAGE_KEY = 'showNormalEvents';
const USE_UTC_DATES_LOCALSTORAGE_KEY = 'useUtcDates';
const FORCE_FULL_WIDTH_LOCALSTORAGE_KEY = 'forceFullWidth';
const FORCE_SINGLE_COLUMN_LOCALSTORAGE_KEY = 'forceSingleColumn';

const eventTypeOnLocalStorageKey = (id: EventTypeId) => `show-${id}`;
const getEventTypesOn = (): EventTypeSwitches => {
  const eventTypesOn: EventTypeSwitches = {
    'app-update': false,
    'epic-research-sale': false,
    'piggy-boost': false,
    'piggy-cap-boost': false,
    'prestige-boost': false,
    'earnings-boost': false,
    'gift-boost': false,
    'drone-boost': false,
    'research-sale': false,
    'hab-sale': false,
    'vehicle-sale': false,
    'boost-sale': false,
    'boost-duration': false,
    'crafting-sale': false,
    'mission-fuel': false,
    'mission-capacity': false,
    'mission-duration': false,
    'shell-sale': false,
  };
  for (const type of eventTypes) {
    eventTypesOn[type.id] = getLocalStorage(eventTypeOnLocalStorageKey(type.id)) !== 'false';
  }
  return eventTypesOn;
};

export default defineComponent({
  components: {
    TheNavBar,
    BaseInfo,
    CalendarMonth,
    EventBadge,
  },
  setup() {
    const useUtcDates = ref(getLocalStorage(USE_UTC_DATES_LOCALSTORAGE_KEY) !== 'false');
    watch(useUtcDates, () => setLocalStorage(USE_UTC_DATES_LOCALSTORAGE_KEY, useUtcDates.value));
    const forceFullWidth = ref(getLocalStorage(FORCE_FULL_WIDTH_LOCALSTORAGE_KEY) === 'true');
    watch(forceFullWidth, () => setLocalStorage(FORCE_FULL_WIDTH_LOCALSTORAGE_KEY, forceFullWidth));
    const forceSingleColumn = ref(getLocalStorage(FORCE_SINGLE_COLUMN_LOCALSTORAGE_KEY) === 'true');
    watch(forceSingleColumn, () => setLocalStorage(FORCE_SINGLE_COLUMN_LOCALSTORAGE_KEY, forceSingleColumn.value));
    const showUltraEvents = ref(getLocalStorage(SHOW_ULTRA_EVENTS_LOCALSTORAGE_KEY) === 'false');
    watch(showUltraEvents, () => setLocalStorage(SHOW_ULTRA_EVENTS_LOCALSTORAGE_KEY, showUltraEvents.value));
    const showNormalEvents = ref(getLocalStorage(SHOW_NORMAL_EVENTS_LOCALSTORAGE_KEY) !== 'false');
    watch(showNormalEvents, () => setLocalStorage(SHOW_NORMAL_EVENTS_LOCALSTORAGE_KEY, showNormalEvents.value));

    const eventTypesOn = ref(getEventTypesOn());
    const persistEventTypeOn = (id: EventTypeId) =>
      setLocalStorage(eventTypeOnLocalStorageKey(id), eventTypesOn.value[id]);
    const turnOnAllEventTypes = () => {
      for (const type of eventTypes) {
        eventTypesOn.value[type.id] = true;
        persistEventTypeOn(type.id);
      }
    };
    const turnOffAllEventTypes = () => {
      for (const type of eventTypes) {
        eventTypesOn.value[type.id] = false;
        persistEventTypeOn(type.id);
      }
    };

    const months = computed(() => {
      const months = [];
      let currentMonth: Dayjs | undefined;
      let date2events = new Map<number, GameEvent[]>();
      for (const event of events) {
        const startTime = useUtcDates.value ? event.startTime.utc() : event.startTime;
        const month = startTime.startOf('month');
        const date = startTime.date();
        if (currentMonth === undefined || !month.isSame(currentMonth)) {
          if (currentMonth !== undefined) {
            months.push({
              month: currentMonth,
              date2events,
            });
          }
          currentMonth = month;
          date2events = new Map();
        }
        if (date2events.has(date)) {
          date2events.get(date)!.push(event);
        } else {
          date2events.set(date, [event]);
        }
      }
      if (currentMonth != undefined) {
        months.push({
          month: currentMonth,
          date2events,
        });
      }
      return months.reverse();
    });

    return {
      useUtcDates,
      forceFullWidth,
      forceSingleColumn,
      showUltraEvents,
      showNormalEvents,
      eventTypes,
      eventTypesOn,
      persistEventTypeOn,
      turnOnAllEventTypes,
      turnOffAllEventTypes,
      months,
      capitalize: (s: string): string => s.charAt(0).toUpperCase() + s.slice(1),
    };
  },
});
</script>

<style scoped>
.Calendar.Calendar--full-width {
  /* 744px * 3 + 24px * 2 */
  max-width: 2280px;
  grid-template-columns: repeat(auto-fit, minmax(744px, 1fr));
}

.Calendar.Calendar--single-column,
.Calendar.Calendar--single-column.Calendar.Calendar--full-width {
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .Calendar {
    max-width: 2280px;
    grid-template-columns: repeat(auto-fit, minmax(744px, 1fr));
  }
}
</style>
