<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all" @click="$emit('close')" />

      <!-- Dialog -->
      <div
        class="card-glass relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl rounded-2xl border border-white/50 bg-white/95 transition-all duration-300 animate-in fade-in zoom-in-95 flex flex-col"
      >
        <div class="bg-gradient-to-r from-slate-50 to-white px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div class="p-1.5 bg-indigo-100 rounded-lg text-indigo-600 flex-shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest truncate">{{ ascensionLabel }} — TE Calendar</h3>
          </div>
          <button class="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0" @click="$emit('close')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body: month-grid navigator (Step 2.2) above a chronological list (Step 2.3),
             with tooltips (Step 2.4). -->
        <div class="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
          <p v-if="entries.length === 0" class="text-xs text-slate-400 text-center py-8">No calendar data.</p>

          <template v-else>
            <div class="max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
              <div class="flex flex-wrap gap-4">
                <div v-for="month in months" :key="month.label">
                  <div class="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">{{ month.label }}</div>
                  <div class="grid grid-cols-7 gap-0.5 text-center">
                    <span
                      v-for="(dow, dowIndex) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
                      :key="dowIndex"
                      class="w-5 text-[7px] font-bold text-slate-400"
                    >
                      {{ dow }}
                    </span>
                    <template v-for="(week, wi) in month.weeks" :key="wi">
                      <button
                        v-for="(day, di) in week"
                        :key="di"
                        type="button"
                        class="w-5 h-5 flex flex-col items-center justify-center rounded text-[7px] leading-none gap-px"
                        :class="day ? (day.entries.length > 0 ? 'hover:bg-indigo-100 cursor-pointer text-slate-800 font-bold' : 'text-slate-400') : ''"
                        :disabled="!day || day.entries.length === 0"
                        v-tippy="dayTooltip(day)"
                        @click="day && onDayClick(day)"
                      >
                        <template v-if="day">
                          <span>{{ day.dayOfMonth }}</span>
                          <span v-if="day.entries.length > 0" class="flex gap-px">
                            <span
                              v-for="(e, ei) in day.entries.slice(0, 3)"
                              :key="ei"
                              class="w-1 h-1 rounded-full"
                              :class="entryDotClass(e)"
                            />
                          </span>
                        </template>
                      </button>
                    </template>
                  </div>
                </div>
              </div>
              <!-- Sticky, not absolute: stays pinned to the bottom of this box's own
                   scroll viewport while there's more to see, and naturally settles
                   into the flow (stops overlapping anything) once you reach the
                   actual end — so it also doubles as "have I scrolled all the way?" -->
              <div
                class="sticky bottom-0 -mx-2.5 -mb-2.5 h-5 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none flex items-end justify-center"
              >
                <svg class="w-3 h-3 text-slate-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <ul class="space-y-0.5">
              <li v-for="(entry, i) in entries" :key="i" :ref="el => (listItemRefs[i] = el as HTMLElement | null)">
                <div
                  class="flex items-center flex-wrap gap-x-1.5 sm:gap-x-2.5 gap-y-0.5 px-2.5 py-1.5 rounded-lg transition-colors text-[11px]"
                  :class="highlightedIndices.has(i) ? 'bg-amber-100' : entry.type === 'te' ? 'hover:bg-indigo-50 cursor-pointer' : 'hover:bg-slate-50'"
                  v-tippy="tooltipFor(entry)"
                  @click="entry.type === 'te' && toggleCallout(i)"
                >
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="entryDotClass(entry)" />
                  <span class="uppercase font-black text-[8px] w-16 flex-shrink-0" :class="entryTypeClass(entry.type)">
                    {{ entryLabel(entry) }}
                  </span>
                  <span class="w-9 flex-shrink-0 text-right font-mono-premium font-bold text-slate-700">{{ entry.te ?? '—' }}</span>
                  <span class="font-mono-premium text-slate-700 flex-shrink-0">{{ formatEntryTime(entry) }}</span>
                  <span v-if="entry.gapSeconds != null" class="text-slate-500 font-mono-premium flex-shrink-0">
                    +{{ formatDuration(entry.gapSeconds) }}
                  </span>
                  <span v-if="entry.type === 'crossover'" class="text-amber-600 font-bold">
                    {{ entry.fromVariant }} → {{ entry.toVariant }}
                  </span>
                </div>

                <!-- Update callout: only for plain TE entries, toggled by clicking the row above -->
                <div v-if="selectedEntryIndex === i" class="ml-9 mr-2.5 mb-1.5 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg space-y-2">
                  <p class="text-[10px] text-slate-700 leading-relaxed">{{ tooltipFor(entry) }}</p>
                  <button
                    type="button"
                    class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                    @click="$emit('update-target', entry.te!); $emit('close')"
                  >
                    Update {{ ascensionLabel }} to end at TE {{ entry.te }}
                  </button>
                </div>
              </li>
            </ul>

            <!-- Same sticky-fade trick as the grid box above, for the body's own scroll. -->
            <div class="sticky bottom-0 -mx-3 sm:-mx-4 -mb-3 sm:-mb-4 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          </template>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            class="px-6 py-2 text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all rounded-xl hover:shadow-sm"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import type { TECalendarEntry, PlanVariantLabel } from '@/auto/te-calendar';
import { useAutoPlannerStore } from '@/stores/autoPlanner';
import { formatAbsoluteTime, formatDuration } from '@/lib/format';

const props = defineProps<{
  isOpen: boolean;
  entries: TECalendarEntry[];
  ascensionLabel: string;
}>();

defineEmits<{ close: []; 'update-target': [te: number] }>();

const selectedEntryIndex = ref<number | null>(null);

function toggleCallout(i: number) {
  selectedEntryIndex.value = selectedEntryIndex.value === i ? null : i;
}

const { timezone } = storeToRefs(useAutoPlannerStore());

interface CalendarDay {
  dateKey: string; // 'YYYY-MM-DD'
  dayOfMonth: number;
  entries: TECalendarEntry[];
}

interface CalendarMonth {
  label: string;
  weeks: (CalendarDay | null)[][];
}

function dateKeyFor(unixSeconds: number, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(unixSeconds * 1000));
}

function formatEntryTime(entry: TECalendarEntry): string {
  // formatAbsoluteTime expects a duration-from-baseTimestamp; entry.timestamp is
  // already absolute, so fold it into baseTimestamp and pass a zero duration.
  return formatAbsoluteTime(0, entry.timestamp * 1000, timezone.value);
}

function entryLabel(entry: TECalendarEntry): string {
  switch (entry.type) {
    case 'start':
      return 'Start';
    case 'end':
      return 'Planned End';
    case 'crossover':
      return 'Crossover';
    case 'shift':
      return entry.shiftLabel ?? 'Shift';
    default:
      return 'TE';
  }
}

function entryTypeClass(type: TECalendarEntry['type']): string {
  switch (type) {
    case 'start':
      return 'text-emerald-600';
    case 'end':
      return 'text-rose-600';
    case 'crossover':
      return 'text-amber-600';
    case 'shift':
      return 'text-violet-600';
    default:
      return 'text-indigo-600';
  }
}

// Shared by both the list-row marker and the grid-cell dots — projected entries are
// just as real a possibility as actual ones ("what could be if the player wanted"),
// so they're styled identically rather than dimmed/hollow.
function entryDotClass(entry: TECalendarEntry): string {
  switch (entry.type) {
    case 'start':
      return 'bg-emerald-500';
    case 'end':
      return 'bg-rose-500';
    case 'crossover':
      return 'bg-amber-500';
    case 'shift':
      return 'bg-violet-500';
    default:
      return 'bg-indigo-500';
  }
}

function variantDisplayName(variant: PlanVariantLabel): string {
  return variant === 'continue' ? 'continuing' : variant;
}

function gapSuffix(entry: TECalendarEntry): string {
  return entry.gapSeconds != null ? ` - ${formatDuration(entry.gapSeconds)} since previous TE` : '';
}

function tooltipFor(entry: TECalendarEntry): string {
  const time = formatEntryTime(entry);
  switch (entry.type) {
    case 'start':
      return `Ascension start: ${time}`;
    case 'end':
      return `Planned end: ${time}`;
    case 'crossover': {
      const switchLabel =
        entry.fromVariant && entry.toVariant
          ? `${variantDisplayName(entry.toVariant)} becomes faster than ${variantDisplayName(entry.fromVariant)} starting here`
          : '';
      return `TE ${entry.te} — ${time}${gapSuffix(entry)} — ${switchLabel}`;
    }
    case 'shift':
      return `${entry.shiftLabel}: ${time}`;
    default:
      return `TE ${entry.te}${gapSuffix(entry)}`;
  }
}

function dayTooltip(day: CalendarDay | null): string {
  if (!day || day.entries.length === 0) return '';
  if (day.entries.length === 1) return tooltipFor(day.entries[0]);
  return `${day.entries.length} events on ${day.dateKey} — click to view`;
}

function buildMonth(
  year: number,
  month: number,
  entriesByDay: Map<string, TECalendarEntry[]>,
  trimBeforeDay?: number
): CalendarMonth {
  // Grid arithmetic (weekday-of-1st, days-in-month) is done at UTC noon for a bare
  // Y-M-D civil date — this is independent of `timezone`, which is only used to
  // decide which civil date each entry's absolute timestamp falls on (dateKeyFor).
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const label = new Date(Date.UTC(year, month - 1, 1, 12)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const days: (CalendarDay | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ dateKey, dayOfMonth: d, entries: entriesByDay.get(dateKey) || [] });
  }
  while (days.length % 7 !== 0) days.push(null);

  let weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // Only the very first month gets trimmed: drop leading weeks that fall entirely
  // before the ascension's start date, so the first visible row is the start date's
  // own week rather than padding back to the 1st of that month.
  if (trimBeforeDay != null) {
    const firstRelevantWeek = weeks.findIndex(week => week.some(day => day && day.dayOfMonth >= trimBeforeDay));
    if (firstRelevantWeek > 0) weeks = weeks.slice(firstRelevantWeek);
  }

  return { label, weeks };
}

const months = computed<CalendarMonth[]>(() => {
  if (props.entries.length === 0) return [];

  const entriesByDay = new Map<string, TECalendarEntry[]>();
  for (const entry of props.entries) {
    const key = dateKeyFor(entry.timestamp, timezone.value);
    if (!entriesByDay.has(key)) entriesByDay.set(key, []);
    entriesByDay.get(key)!.push(entry);
  }

  const timestamps = props.entries.map(e => e.timestamp);
  const [startYear, startMonth, startDay] = dateKeyFor(Math.min(...timestamps), timezone.value).split('-').map(Number);
  const [endYear, endMonth] = dateKeyFor(Math.max(...timestamps), timezone.value).split('-').map(Number);

  const result: CalendarMonth[] = [];
  let y = startYear;
  let m = startMonth;
  let isFirstMonth = true;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    result.push(buildMonth(y, m, entriesByDay, isFirstMonth ? startDay : undefined));
    isFirstMonth = false;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return result;
});

const listItemRefs = ref<(HTMLElement | null)[]>([]);
const highlightedIndices = ref<Set<number>>(new Set());

function onDayClick(day: CalendarDay) {
  if (day.entries.length === 0) return;

  const indices = props.entries
    .map((e, i) => (dateKeyFor(e.timestamp, timezone.value) === day.dateKey ? i : -1))
    .filter(i => i !== -1);
  if (indices.length === 0) return;

  listItemRefs.value[indices[0]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  highlightedIndices.value = new Set(indices);
  setTimeout(() => {
    highlightedIndices.value = new Set();
  }, 1500);
}
</script>

<style scoped>
.font-mono-premium {
  font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
}

.animate-in {
  animation-duration: 200ms;
}
</style>
