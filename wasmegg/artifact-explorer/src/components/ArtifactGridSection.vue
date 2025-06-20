<template>
  <ul class="my-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <template v-for="family in families" :key="family.name">
      <li class="col-span-1 bg-gray-50 rounded-lg shadow divide-y divide-gray-200">
        <div class="w-full flex items-center justify-between px-6 py-4 space-x-4">
          <div class="flex-1">
            <div class="flex items-center space-x-3">
              <h3 class="text-gray-900 text-sm font-medium truncate">
                {{ family.name }}
              </h3>
            </div>
            <p class="mt-1 text-gray-500 text-xs truncate">
              {{ family.effect }}
            </p>
            <div class="mt-2 space-y-1.5">
              <template v-for="tier in family.tiers" :key="tier.tier_number">
                <router-link :to="{ name: 'artifact', params: { artifactId: tier.id } }">
                  <div class="flex">
                    <div
                      v-tippy="{
                        content: `<img data-src='${iconURL('egginc/' + tier.icon_filename, 256)}' class='h-32 w-32'>`,
                        allowHTML: true,
                      }"
                      class="flex items-center space-x-2"
                    >
                      <img class="h-12 w-12" :src="iconURL('egginc/' + tier.icon_filename, 128)" />
                      <div>
                        <div
                          class="text-xs"
                          :class="!tier.available_from_missions ? 'text-red-900 dagger' : 'text-gray-500'"
                        >
                          {{ tier.tier_name }}
                        </div>

                        <!-- Effects and slots -->
                        <div class="text-xs text-gray-400 tabular-nums">
                          <template v-for="(rarity, index) in tier.effects" :key="rarity.afx_rarity">
                            <template v-if="index !== 0">, </template>
                            <span
                              class="inline-flex items-center space-x-px"
                              :class="rarityFgClass400(rarity.afx_rarity)"
                            >
                              <span>{{ rarity.effect_size }}</span>
                              <!-- One dot for each slot -->
                              <template v-if="rarity.slots">
                                <svg
                                  viewBox="0 0 10 30"
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-3"
                                  :class="`w-` + (1 + 2 * Math.floor((rarity.slots - 1) / 3))"
                                >
                                  <template v-for="slot of rarity.slots" :key="slot">
                                    <circle
                                      :cx="5 - 10 * Math.floor((slot - 1) / 3)"
                                      :cy="5 + 10 * ((slot + 2) % 3)"
                                      r="3"
                                      fill="currentColor"
                                    />
                                  </template>
                                </svg>
                              </template>
                            </span>
                          </template>
                        </div>
                      </div>
                    </div>
                  </div>
                </router-link>
              </template>
            </div>
          </div>
        </div>
      </li>
    </template>
  </ul>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { iconURL } from 'lib';
import { AfxFamily } from 'lib/artifacts/data';
import { rarityFgClass400 } from '@/utils';

export default defineComponent({
  props: {
    families: {
      type: Array as PropType<AfxFamily[]>,
      required: true,
    },
  },
  setup() {
    return {
      iconURL,
      rarityFgClass400,
    };
  },
});
</script>
