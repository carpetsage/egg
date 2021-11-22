<template>
  <tippy
    v-if="!(tooLittleMissionData && hideWhenNotEnough)"
    tag="span"
    class="inline-flex items-center text-sm tabular-nums"
    :class="highlight ? 'text-green-700 font-medium' : tooLittleItemData ? 'text-gray-500' : null"
  >
    <template v-if="!tooLittleMissionData">
      {{ formatToPrecision(expectedDropsPerMission, precision)
      }}<sup v-if="tooLittleItemData" class="-top-0.5">?</sup>/<img
        class="h-4 w-4 ml-px"
        :src="iconURL(mission.shipIconPath, 32)"
      />, {{ formatToPrecision(expectedDropsPerDay, precision)
      }}<sup v-if="tooLittleItemData" class="-top-0.5">?</sup>/d
    </template>
    <template v-else>
      <span :class="highlight ? 'text-green-700' : 'text-gray-500'">Not enough data</span>
    </template>

    <template #content>
      {{ ts(itemTotalDrops) }} seen out of {{ ts(totalDrops) }} recorded mission drops.<br />
      <template v-if="tooLittleMissionData">
        <span class="text-red-300">Too little mission data.</span><br />
      </template>
      <template v-else-if="tooLittleItemData">
        <span class="text-red-300">Not enough data, rates likely far from accurate.</span><br />
      </template>

      <template v-if="itemTotalDrops > 0 && !tooLittleMissionData">
        <hr class="my-1 border-gray-400" />

        <span class="text-blue-200">With 1 mission slot:</span><br />
        1 item per
        <span class="text-green-300">{{
          formatToPrecision(expectedMissionsPerDrop, precision)
        }}</span>
        missions, or 1 item per
        <span class="text-green-300">{{ formatToPrecision(expectedDaysPerDrop, precision) }}</span>
        days.<br />
        <span class="text-blue-200">With 3 mission slots:</span><br />
        1 item per
        <span class="text-green-300">{{
          formatToPrecision(expectedDaysPerDrop / 3, precision)
        }}</span>
        days.<br />

        <hr class="my-1 border-gray-400" />

        <template v-for="entry in uncommonStats" :key="entry.afxRarity">
          <span :class="rarityFgClass400(entry.afxRarity)">{{ entry.rarity }}</span
          >: {{ entry.drops }}/{{ itemTotalDrops
          }}<template v-if="entry.drops >= 10"
            >, 1 per
            <span class="text-green-300">{{
              formatToPrecision(entry.daysPerDrop, entry.precision)
            }}</span>
            days (<span class="text-green-300">{{
              formatToPrecision(entry.daysPerDrop / 3, entry.precision)
            }}</span>
            days with 3 slots)</template
          >
          <br />
        </template>
      </template>
    </template>
  </tippy>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';

import { ei, iconURL, MissionType } from 'lib';
import Rarity = ei.ArtifactSpec.Rarity;
import { config } from '@/store';
import { missionDataNotEnough } from '@/lib';
import { capitalize, rarityFgClass400 } from '@/utils';

export default defineComponent({
  components: {
    Tippy,
  },
  props: {
    mission: {
      type: Object as PropType<MissionType>,
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    totalDrops: {
      type: Number,
      required: true,
    },
    itemDrops: {
      type: Object as PropType<[number, number, number, number]>,
      required: true,
    },
    highlight: {
      type: Boolean,
      default: false,
    },
    hideWhenNotEnough: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { mission, level, totalDrops, itemDrops } = toRefs(props);
    const customConfig = computed(() => {
      const shipLevels = { ...config.value.shipLevels };
      shipLevels[mission.value.shipType] = level.value;
      return {
        ...config.value,
        shipLevels,
      };
    });
    const tooLittleMissionData = computed(() =>
      missionDataNotEnough(mission.value, totalDrops.value)
    );
    const missionCapacity = computed(() => mission.value.boostedCapacity(customConfig.value));
    const missionDurationDays = computed(
      () => mission.value.boostedDurationSeconds(customConfig.value) / 86400
    );
    const itemTotalDrops = computed(() => itemDrops.value.reduce((s, x) => s + x));
    const tooLittleItemData = computed(() => itemTotalDrops.value < 20);
    const expectedDropsPerMission = computed(() =>
      totalDrops.value > 0 ? (itemTotalDrops.value / totalDrops.value) * missionCapacity.value : 0
    );
    const expectedDropsPerDay = computed(
      () => expectedDropsPerMission.value / missionDurationDays.value
    );
    const expectedMissionsPerDrop = computed(() => 1 / expectedDropsPerMission.value);
    const expectedDaysPerDrop = computed(() => 1 / expectedDropsPerDay.value);
    const precision = computed(() => Math.min(itemTotalDrops.value.toString().length, 3));
    const uncommonStats = computed(() =>
      [Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY].map(afxRarity => ({
        afxRarity,
        rarity: capitalize(Rarity[afxRarity]),
        drops: itemDrops.value[afxRarity],
        daysPerDrop:
          expectedDaysPerDrop.value * (itemTotalDrops.value / itemDrops.value[afxRarity]),
        precision: Math.min(itemDrops.value[afxRarity].toString().length, 3),
      }))
    );
    return {
      tooLittleMissionData,
      tooLittleItemData,
      itemTotalDrops,
      expectedDropsPerMission,
      expectedDropsPerDay,
      expectedMissionsPerDrop,
      expectedDaysPerDrop,
      precision,
      uncommonStats,
      rarityFgClass400,
      ts,
      formatToPrecision,
      iconURL,
    };
  },
});

// Format with thousand separator
function ts(x: number): string {
  return x.toLocaleString('en-US');
}

function formatToPrecision(x: number, precision: number): string {
  if (!isFinite(x)) {
    return '';
  }
  const s = x.toPrecision(precision);
  // If the formatted string is a decimal without exponent, or one with a
  // negative exponent, return as is.
  if (s.match(/^\d+\.\d+$/) || s.includes('e-')) {
    return s;
  }
  // If the formatted string is an integer, or has a positive exponent,
  // convert it to non-scientific notation, and add a ~ in front to mark it
  // as an approximate.
  return '~' + parseFloat(s).toFixed();
}
</script>
