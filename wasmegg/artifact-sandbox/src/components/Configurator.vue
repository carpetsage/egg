<template>
  <div class="max-w-xs mx-auto my-4">
    <h3 class="my-2 text-center text-sm font-medium uppercase">Configurations</h3>

    <div class="mt-1 relative rounded-md shadow-sm">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="h-5 w-5" />
      </div>
      <integer-input
        id="prophecy_eggs"
        v-model="conf.prophecyEggs"
        :min="0"
        :max="9999"
        base-class="pl-10 pt-2.5 pb-2"
      />
    </div>

    <div class="mt-1 relative rounded-md shadow-sm">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <img :src="iconURL('egginc/egg_soul.png', 64)" class="h-5 w-5" />
      </div>
      <e-i-value-input
        id="soul_eggs"
        v-model:raw="conf.soulEggsInput"
        v-model:value="conf.soulEggs"
        base-class="pl-10 pt-2.5 pb-2"
      />
    </div>

    <div class="mt-2 flex items-center justify-center">
      <input
        id="is_enlightenment"
        v-model="conf.isEnlightenment"
        name="is_enlightenment"
        type="checkbox"
        class="h-4 w-4 bg-dark-20 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-30 rounded"
      />
      <label for="is_enlightenment" class="ml-2 block text-sm">Enlightenment farm</label>
    </div>

    <div class="mt-4 flex justify-center">
      <div class="space-y-1">
        <h4 class="text-center text-sm uppercase">Epic research</h4>
        <div class="relative flex items-center justify-end">
          <label for="epic_multiplier" class="flex items-center text-sm whitespace-nowrap mr-2">
            <img
              :src="iconURL('egginc/r_icon_epic_multiplier.png', 64)"
              class="h-8 w-8 relative -top-px mr-px"
            />
            Epic multiplier
          </label>
          <integer-input
            id="epic_multiplier"
            v-model="conf.epicMultiplier"
            :min="0"
            :max="100"
            base-class="w-20 pl-2.5 pt-1 pb-0.5"
          />
          <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">
            / 100
          </div>
        </div>
        <div class="relative flex items-center justify-end">
          <label for="soul_food" class="flex items-center text-sm whitespace-nowrap mr-2">
            <img
              :src="iconURL('egginc/r_icon_soul_food.png', 64)"
              class="h-8 w-8 relative -top-px"
            />
            Soul food
          </label>
          <integer-input
            id="soul_food"
            v-model="conf.soulFood"
            :min="0"
            :max="140"
            base-class="w-20 pl-2.5 pt-1 pb-0.5"
          />
          <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">
            / 140
          </div>
        </div>
        <div class="relative flex items-center justify-end">
          <label for="prophecy_bonus" class="flex items-center text-sm whitespace-nowrap mr-2">
            <img
              :src="iconURL('egginc/r_icon_prophecy_bonus.png', 64)"
              class="h-8 w-8 relative -top-px mr-px"
            />
            Prophecy bonus
          </label>
          <integer-input
            id="prophecy_bonus"
            v-model="conf.prophecyBonus"
            :min="0"
            :max="5"
            base-class="w-20 pl-2.5 pt-1 pb-0.5"
          />
          <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">
            / 5
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 flex justify-center">
      <div class="space-y-1">
        <h4 class="text-center text-sm uppercase">Active boost effects</h4>
        <div class="relative flex items-start">
          <input
            id="bird_feed_active"
            v-model="conf.birdFeedActive"
            name="bird_feed_active"
            type="checkbox"
            class="h-4 w-4 bg-dark-20 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-30 rounded"
          />
          <label for="bird_feed_active" class="ml-2 block text-sm">Bird feed (earnings)</label>
        </div>
        <div class="relative flex items-start">
          <input
            id="tachyon_prism_active"
            v-model="conf.tachyonPrismActive"
            name="tachyon_prism_active"
            type="checkbox"
            class="h-4 w-4 bg-dark-20 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-30 rounded"
          />
          <label for="tachyon_prism_active" class="ml-2 block text-sm"
            >Tachyon prism (internal hatchery)</label
          >
        </div>
        <div class="relative flex items-start">
          <input
            id="soul_beacon_active"
            v-model="conf.soulBeaconActive"
            name="soul_beacon_active"
            type="checkbox"
            class="h-4 w-4 bg-dark-20 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-30 rounded"
          />
          <label for="soul_beacon_active" class="ml-2 block text-sm">Soul beacon</label>
        </div>
        <div class="relative flex items-start">
          <input
            id="boost_beacon_active"
            v-model="conf.boostBeaconActive"
            name="boost_beacon_active"
            type="checkbox"
            class="h-4 w-4 bg-dark-20 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-30 rounded"
          />
          <label for="boost_beacon_active" class="ml-2 block text-sm">Boost beacon</label>
        </div>
      </div>
    </div>

    <div class="mt-4 flex justify-center">
      <div class="space-y-0.5">
        <h4 class="text-center text-sm uppercase">Other bonuses</h4>
        <div>
          <label
            v-tippy="{
              content:
                'This is the total tachyon deflector bonus from other players in your coop. Note that the value displayed in-game may be 1% less than the actual value due to a long standing floating-point representation bug in the game. You can always find the correct value from https://eicoop.netlify.app/.',
            }"
            for="tachyon_deflector_percentage"
            class="block text-center"
          >
            Tachyon deflector bonus<sup class="px-0.5">?</sup>
          </label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <img :src="iconURL('egginc/afx_tachyon_deflector_4.png', 64)" class="h-5 w-5" />
            </div>
            <integer-input
              id="tachyon_deflector_percentage"
              :min="0"
              :model-value="round(conf.tachyonDeflectorBonus * 100)"
              base-class="pl-10 pr-4 pt-2.5 pb-2"
              @update:modelValue="value => (conf.tachyonDeflectorBonus = value / 100)"
            />
            <div class="absolute inset-y-0.5 right-0 pr-2 pt-2.5 pb-2 sm:text-sm text-gray-200">
              %
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, toRefs, watch } from 'vue';

import { iconURL } from 'lib';
import { Config } from '@/lib';
import EIValueInput from '@/components/EIValueInput.vue';
import IntegerInput from '@/components/IntegerInput.vue';

export default defineComponent({
  components: {
    EIValueInput,
    IntegerInput,
  },
  props: {
    config: {
      type: Config,
      required: true,
    },
  },
  emits: {
    'update:config': (_payload: Config) => true,
  },
  setup(props, { emit }) {
    const { config } = toRefs(props);
    const conf = ref(config.value);
    watch(
      conf,
      () => {
        emit('update:config', conf.value);
      },
      { deep: true }
    );
    return {
      conf,
      round,
      iconURL,
    };
  },
});

function round(x: number): number {
  return Math.round(x);
}
</script>

<style scoped>
sup {
  color: #a6a6a6;
}
</style>
