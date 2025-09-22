<template>
  <div class="max-w-xs sm:max-w-6xl mx-auto my-4">
    <h3 class="my-2 mb-4 text-center text-sm font-medium uppercase">Configurations</h3>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <h4 class="text-center text-sm uppercase">Mystical Eggs</h4>
        <div class="mt-1 relative rounded-md shadow-sm max-w-xs mx-auto">
          <div class="mt-1 relative rounded-md shadow-sm max-w-xs mx-auto">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <img :src="iconURL('egginc/egg_truth.png', 64)" class="h-5 w-5" />
            </div>
            <integer-input
              id="truth_eggs"
              v-model="conf.truthEggs"
              :min="0"
              :max="999"
              base-class="pl-10 pt-2.5 pb-2 w-full"
            />
          </div>
        </div>
        <div class="mt-1 relative rounded-md shadow-sm max-w-xs mx-auto">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="h-5 w-5" />
          </div>
          <integer-input
            id="prophecy_eggs"
            v-model="conf.prophecyEggs"
            :min="0"
            :max="9999"
            base-class="pl-10 pt-2.5 pb-2 w-full"
          />
        </div>

        <div class="mt-1 relative rounded-md shadow-sm max-w-xs mx-auto">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <img :src="iconURL('egginc/egg_soul.png', 64)" class="h-5 w-5" />
          </div>
          <e-i-value-input
            id="soul_eggs"
            v-model:raw="conf.soulEggsInput"
            v-model:value="conf.soulEggs"
            base-class="pl-10 pt-2.5 pb-2 w-full"
          />
        </div>

        <div class="mt-4 flex justify-center">
          <div class="space-y-1">
            <div class="flex space-x-4">
              <div class="relative flex items-start">
                <input
                  id="is_enlightenment"
                  v-model="conf.isEnlightenment"
                  name="is_enlightenment"
                  type="checkbox"
                  class="h-4 w-4 bg-dark-20 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-30 rounded"
                />
                <label for="is_enlightenment" class="ml-2 block text-sm">Enlightenment farm</label>
              </div>
              <div class="relative flex items-start">
                <input
                  id="is_virtue"
                  v-model="conf.isVirtue"
                  name="is_virtue"
                  type="checkbox"
                  class="h-4 w-4 bg-dark-20 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-30 rounded"
                />
                <label for="is_virtue" class="ml-2 block text-sm">Virtue farm</label>
              </div>

              <div class="relative flex items-start">
                <input
                  id="has_proPermit"
                  v-model="conf.proPermit"
                  name="has_proPermit"
                  type="checkbox"
                  class="h-4 w-4 bg-dark-20 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-30 rounded"
                />
                <label for="has_proPermit" class="ml-2 block text-sm">Pro Permit</label>
              </div>
            </div>
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
              <label for="tachyon_prism_active" class="ml-2 block text-sm">Tachyon prism (internal hatchery)</label>
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
            <h4 class="text-center text-sm uppercase">Epic research</h4>
            <div class="relative flex items-center justify-end">
              <label for="soul_food" class="flex items-center text-sm whitespace-nowrap mr-2">
                <img :src="iconURL('egginc/r_icon_soul_food.png', 64)" class="h-8 w-8 relative -top-px" />
                Soul food
              </label>
              <integer-input
                id="soul_food"
                v-model="conf.soulFood"
                :min="0"
                :max="140"
                base-class="w-24 pl-2.5 pt-1 pb-0.5"
              />
              <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">/ 140</div>
            </div>
            <div class="relative flex items-center justify-end">
              <label for="prophecy_bonus" class="flex items-center text-sm whitespace-nowrap mr-2">
                <img :src="iconURL('egginc/r_icon_prophecy_bonus.png', 64)" class="h-8 w-8 relative -top-px mr-px" />
                Prophecy bonus
              </label>
              <integer-input
                id="prophecy_bonus"
                v-model="conf.prophecyBonus"
                :min="0"
                :max="5"
                base-class="w-16 pl-2.5 pt-1 pb-0.5"
              />
              <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">/ 5</div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-center">
          <div class="space-y-0.5">
            <h4 class="text-center text-sm uppercase">Other bonuses</h4>
            <div class="relative flex items-center justify-end">
              <label for="RCB" class="flex items-center text-sm whitespace-nowrap mr-2"> Max Base RCB </label>
              <integer-input id="RCB" v-model="conf.RCB" :min="0" :max="540" base-class="w-24 pl-2.5 pt-1 pb-0.5" />
              <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">/ 540</div>
            </div>
            <div class="relative flex items-center justify-end">
              <span
                v-tippy="{
                  content:
                    'This is the total tachyon deflector bonus from other players in your coop. Note that the value displayed in-game may be 1% less than the actual value due to a long standing floating-point representation bug in the game. You can always find the correct value from https://eicoop-carpet.netlify.app/.',
                }"
              >
                <label for="tachyon_deflector_percentage" class="flex items-center text-sm whitespace-nowrap mr-2">
                  <img :src="iconURL('egginc/afx_tachyon_deflector_4.png', 64)" class="h-4 w-4 mr-1" />
                  Deflector bonus<sup class="px-0.5">?</sup>
                </label>
              </span>
              <integer-input
                id="tachyon_deflector_percentage"
                :min="0"
                :model-value="round(conf.tachyonDeflectorBonus * 100)"
                base-class="w-24 pl-2.5 pt-1 pb-0.5"
                @update:model-value="value => (conf.tachyonDeflectorBonus = value / 100)"
              />
              <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">%</div>
            </div>
          </div>
        </div>
      </div>

      <colleggtibles-config :config="conf" @colleggtible-tier-changed="handleColleggtibleTierChanged" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, toRefs, watch } from 'vue';
import { iconURL } from 'lib';
import { Config } from '@/lib';
import EIValueInput from '@/components/EIValueInput.vue';
import IntegerInput from '@/components/IntegerInput.vue';
import ColleggtiblesConfig from '@/components/ColleggtiblesConfig.vue';

export default defineComponent({
  name: 'TheConfigurator',
  components: {
    EIValueInput,
    IntegerInput,
    ColleggtiblesConfig,
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
    const { config: configRef } = toRefs(props);
    const conf = ref(configRef.value);

    watch(
      conf,
      () => {
        emit('update:config', conf.value);
      },
      { deep: true }
    );

    // Prevent both enlightenment and virtue from being selected simultaneously
    watch(
      () => conf.value.isEnlightenment,
      newValue => {
        if (newValue && conf.value.isVirtue) {
          conf.value.isVirtue = false;
        }
      }
    );

    watch(
      () => conf.value.isVirtue,
      newValue => {
        if (newValue && conf.value.isEnlightenment) {
          conf.value.isEnlightenment = false;
        }
      }
    );

    const round = (x: number): number => Math.round(x);

    const handleTachyonDeflectorUpdate = (value: number | null) => {
      if (value !== null) {
        conf.value.tachyonDeflectorBonus = value / 100;
      }
    };

    const handleColleggtibleTierChanged = (eggIdentifier: string, tier: number) => {
      conf.value.colleggtibleTiers[eggIdentifier] = tier;
    };

    return {
      conf,
      round,
      iconURL,
      handleTachyonDeflectorUpdate,
      handleColleggtibleTierChanged,
    };
  },
});
</script>

<style scoped>
sup {
  color: #a6a6a6;
}
</style>
