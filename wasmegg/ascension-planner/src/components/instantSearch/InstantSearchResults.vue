<template>
  <div class="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-6">
    <div class="flex flex-wrap items-center gap-3 mb-3">
      <h3 class="text-lg font-black text-slate-900">Instant answer</h3>
      <span
        class="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md"
        >precomputed</span
      >
      <span class="ml-auto text-[11px] text-slate-400">every route checked in {{ (answer.ms / 1000).toFixed(1) }} s</span>
    </div>

    <div v-if="filterNote" class="mb-4 text-[11px] text-slate-500">{{ filterNote }}</div>
    <div
      v-if="store.avoidChanged"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800"
    >
      Your dates or hours to avoid have changed since this answer: press Find routes again to use them.
    </div>

    <div v-if="!lead" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <template v-if="byDate">No route reaches a higher TE by {{ show(answer.deadline!) }}.</template>
      <template v-else-if="!store.ascensionCounts.length">No numbers of ascensions are picked in Filters.</template>
      <template v-else>No route reaches {{ answer.final }} TE with {{ countsText }} ascensions.</template>
    </div>

    <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <template v-if="byDate">
        <div class="text-[10px] font-black uppercase tracking-widest text-emerald-700">
          Highest TE by {{ show(answer.deadline!) }}
        </div>
        <div class="mt-1 flex flex-wrap items-baseline gap-3">
          <span class="text-2xl font-black text-slate-900">{{ lastTE(lead) }} TE</span>
          <span class="text-lg font-black" :class="spareClass(lead)">{{ days(spare(lead)) }} to spare</span>
          <span v-if="tight(lead)" class="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">tight</span>
        </div>
        <div class="mt-1 text-sm font-bold text-slate-800">{{ chainText(lead) }}</div>
        <div class="text-xs text-slate-600">
          Reached {{ show(lead.end) }} · {{ count(lead) }} ascension{{ count(lead) === 1 ? '' : 's' }}
        </div>
      </template>
      <template v-else>
        <div class="text-[10px] font-black uppercase tracking-widest text-emerald-700">Fastest route</div>
        <div class="mt-1 text-lg font-black text-slate-900">{{ chainText(lead) }}</div>
        <div class="text-xs text-slate-600">
          Reaches {{ answer.final }} on <span class="font-bold">{{ show(lead.end) }}</span> · {{ days(lead.seconds) }} ·
          {{ count(lead) }} ascension{{ count(lead) === 1 ? '' : 's' }}
        </div>
      </template>
      <div class="mt-2 text-xs text-slate-700">
        <span class="font-bold">First step:</span> {{ firstStepText(lead) }}
      </div>
    </div>

    <table v-if="rows.length" class="mt-4 w-full text-xs">
      <thead>
        <tr class="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
          <th class="py-2 pr-2">Ascensions</th>
          <template v-if="byDate">
            <th class="py-2 pr-2">Highest TE</th>
            <th class="py-2 pr-2">Spare</th>
          </template>
          <template v-else>
            <th class="py-2 pr-2">Reaches {{ answer.final }}</th>
            <th class="py-2 pr-2">Behind</th>
          </template>
          <th class="py-2 pr-2">First step</th>
          <th class="py-2">Route</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="{ k, route } in rows" :key="k">
          <tr
            class="border-t border-slate-100 align-top cursor-pointer hover:bg-slate-50"
            :class="route === lead ? 'bg-emerald-50/60' : ''"
            @click="toggle(k)"
          >
            <td class="py-2 pr-2 font-bold text-slate-800">
              <span class="inline-block w-3 text-slate-400">{{ open.has(k) ? '⌄' : '›' }}</span> {{ k }}
            </td>
            <template v-if="byDate">
              <td class="py-2 pr-2 font-bold text-slate-800">{{ lastTE(route) }} TE</td>
              <td class="py-2 pr-2">
                <span class="font-bold" :class="spareClass(route)">{{ days(spare(route)) }}</span>
                <span v-if="tight(route)" class="ml-1 text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1 py-0.5 rounded">tight</span>
              </td>
            </template>
            <template v-else>
              <td class="py-2 pr-2 text-slate-700">
                {{ show(route.end) }}<br /><span class="text-slate-400">{{ days(route.seconds) }}</span>
              </td>
              <td class="py-2 pr-2 text-slate-600">{{ route === lead ? 'fastest' : `+${days(route.end - lead!.end)}` }}</td>
            </template>
            <td class="py-2 pr-2">
              <span
                class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                :class="route.legs[0].continued ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
                >{{ route.legs[0].continued ? `Continue to ${route.legs[0].to}` : answer.hypothetical || route.legs[0].held ? 'Prestige' : 'Prestige now' }}</span
              >
            </td>
            <td class="py-2 text-slate-800">{{ route.chain.join(' ') }}</td>
          </tr>
          <tr v-if="open.has(k)">
            <td colspan="5" class="pb-3">
              <ol class="ml-5 rounded-lg bg-slate-50 p-3 space-y-1 text-[11px] text-slate-600">
                <li v-for="(leg, i) in route.legs" :key="i">
                  <span class="font-bold text-slate-800">{{ leg.from }} → {{ leg.to }}</span>
                  <span v-if="leg.endTE > leg.to"> (ends at {{ leg.endTE }})</span>:
                  <template v-if="leg.continued">continue your current ascension, </template>
                  <template v-else-if="leg.held">prestige waited for your blocked dates or hours (the eggs laid meanwhile count), </template>
                  <template v-else-if="i === 0">{{ answer.hypothetical ? 'prestige' : 'prestige now' }}, </template>
                  {{ show(leg.start) }} to {{ show(leg.end) }} · {{ days(leg.end - leg.start) }}<template
                    v-if="!leg.continued"
                    > · {{ leg.sales }}-sale build{{ leg.tier13 ? ', tier 13' : '' }}</template
                  >
                </li>
              </ol>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { lastTE, type Route } from '@/lib/instantSearch/routeFinder';
import { MAX_ASCENSIONS, useInstantSearchStore, type InstantAnswer } from '@/stores/instantSearch';

const props = defineProps<{ answer: InstantAnswer }>();
const store = useInstantSearchStore();

const byDate = computed(() => props.answer.mode === 'date');
/** Under this much to spare, the date answer is flagged as tight. */
const TIGHT_SECONDS = 86400;

/** Each picked number of ascensions' route (Filters). */
const rows = computed(() => {
  const list = byDate.value ? props.answer.found.byDateByAscensions : props.answer.found.byAscensions;
  const picked = new Set(store.ascensionCounts);
  return list.flatMap((route, k) => (route && picked.has(k) ? [{ k, route }] : []));
});

/** The headline: the fastest of the rows, or by a date the highest TE (then the soonest). */
const lead = computed<Route | null>(() =>
  rows.value.reduce<Route | null>((a, { route: r }) => {
    if (!a) return r;
    if (byDate.value) return lastTE(r) > lastTE(a) || (lastTE(r) === lastTE(a) && r.end < a.end) ? r : a;
    return r.end < a.end ? r : a;
  }, null)
);

const countsText = computed(() => store.ascensionCounts.join(', '));
/** The filters this answer shows under. */
const filterNote = computed(() => {
  const bits: string[] = [];
  if (store.ascensionCounts.length < MAX_ASCENSIONS && store.ascensionCounts.length)
    bits.push(`Showing ${countsText.value} ascensions`);
  const n = props.answer.blocks.dates.length;
  const h = props.answer.blocks.hours.length;
  if (n) bits.push(`no prestige on the ${n} avoided day${n === 1 ? '' : 's'}`);
  if (h) bits.push(`none in your ${h} blocked hour${h === 1 ? '' : 's'} a week`);
  const text = bits.join('; ');
  return text ? `${text[0].toUpperCase()}${text.slice(1)}.` : '';
});

const open = reactive(new Set<number>());
function toggle(k: number) {
  if (open.has(k)) open.delete(k);
  else open.add(k);
}

const count = (r: Route) => r.legs.length;
const spare = (r: Route) => props.answer.deadline! - r.end;
const tight = (r: Route) => spare(r) < TIGHT_SECONDS;
const spareClass = (r: Route) => (tight(r) ? 'text-amber-700' : 'text-emerald-700');
/** The first ascension in words: continue to its stop, or prestige (on the next whole hour). */
function firstStepText(r: Route): string {
  const l = r.legs[0];
  if (l.held) return `prestige once your blocked dates or hours are past (the build starts ${show(l.start)}).`;
  return l.continued
    ? `continue your current ascension to ${l.to} TE (${show(l.end)})${r.legs.length > 1 ? ', then prestige' : ''}.`
    : `${props.answer.hypothetical ? 'prestige' : 'prestige now'} (the build starts ${show(l.start)}).`;
}
const chainText = (r: Route) => [props.answer.startTE, ...r.chain].join(' → ');
const days = (seconds: number) => `${(seconds / 86400).toFixed(2)} days`;

/** In the time zone the search was run with (the picker's). */
const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: props.answer.timezone,
    })
);
const show = (unix: number) => dateFormat.value.format(new Date(unix * 1000));
</script>
