<template v-if="!notEnoughData || !hideWhenNotEnough" >
  <tippy
    v-if="!(notEnoughData && hideWhenNotEnough)"
    tag="span"
    class="inline-flex items-center text-sm tabular-nums"
  >
    <div v-if="notEnoughData">NOT ENOUGH DATA</div><br />

    <span
      class="mx-4 inline-flex items-center text-sm tabular-nums">
      {{ formatToPrecision(totalCrafts, precision)}} <img
        class="h-4 w-4"
        :src="getImageUrlFromId(target.afx_id, 32)"
      /> Crafts
    </span><br />

    <div class="mx-4">{{ totalShips }} ships</div><br />

    <div class="mx-4">
      Stored Fuel
      <ul>
        <li v-for="fuel in filteredFuels" 
      class="inline-flex items-center text-sm tabular-nums">
          {{ fuel.amount * totalShips / 1_000_000_000_000 }}T<img
        class="h-4 w-4 ml-px"
        :src="iconURL(fuel.eggIconPath, 32)"
      />
        </li> 
      </ul>
    </div><br />
    <template #content>
      <ul>
        <li v-for="item of applicableDrops">
          <span
      class="inline-flex items-center text-sm tabular-nums">
      {{ item.count }} <img
        class="h-4 w-4"
        :src="iconURL('egginc/'+item.icon_filename, 32)"
      />
    </span>
        </li>
      </ul>
    </template>
  </tippy>

  <tippy
    v-if="!(notEnoughData && hideWhenNotEnough) && timeLimited"
    tag="span"
    class="inline-flex items-center text-sm tabular-nums"
  >
    <div class="mx-4" v-if="timeLimited"><em>Patience is a Virtue.</em></div><br />

    <template #content>
      Could send up to {{ fuelLimitedShips }} Ships...
    </template>
  </tippy>

</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';

import { eggFromName, ei, iconURL, MissionType,getImageUrlFromId } from 'lib';
import Rarity = ei.ArtifactSpec.Rarity;
import { configWithCustomShipLevel } from '@/store';
import { capitalize, formatToPrecision, rarityFgClass400, sum, ts } from '@/utils';
import { missionDataNotEnough } from '@/lib';
import { Ingredient, Tier } from 'lib/artifacts/data-json';

export default defineComponent({
  components: {
    Tippy,
  },
  props: {
    target: {
      type: Object as PropType<Tier>,
      required: true,
    },
    mission: {
      type: Object as PropType<MissionType>,
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    totalCrafts: {
      type: Number,
      required: true,
    },
    applicableDrops : {
      type: Array<Ingredient>,
      required: true,
    },
    totalShips: {
      type: Number,
      required: true,
    },
    timeLimited: {
      type: Boolean,
      required: true,
    },
    fuelLimitedShips: {
      type: Number,
      required: true,
    },
    notEnoughData: {
      type: Boolean,
      default: false,
    },
    hideWhenNotEnough: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { totalCrafts: totalDrops, mission } = toRefs(props);

    const precision = computed(() => Math.min(totalDrops.value.toString().length, 3));


    const filteredFuels = computed(() => mission.value.virtueFuels.filter((fuel)=> fuel.egg !== ei.Egg.HUMILITY));

    return {
      precision,
      filteredFuels,
      rarityFgClass400,
      ts,
      formatToPrecision,
      iconURL,
      getImageUrlFromId,
    };
  },
});
</script>
