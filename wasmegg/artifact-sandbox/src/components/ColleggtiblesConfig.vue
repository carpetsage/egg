<template>
  <div class="mt-4 flex justify-center">
    <div class="space-y-0.5">
      <h4 class="text-center text-sm uppercase">Colleggtibles</h4>
      <div class="space-y-4 max-w-4xl mx-auto">
        <div v-for="group in groupedColleggtibles" :key="group.dimensionIndex">
          <h5 class="mt-3 mb-1 text-center text-xs uppercase">
            {{ modifierName(group.dimensionIndex) }}
          </h5>
          <div
            v-for="egg in group.eggs"
            :key="egg.identifier"
            class="grid grid-cols-1 colleggtible-responsive gap-2 items-center"
          >
            <div class="flex items-center space-x-2 justify-center colleggtible-icon-align">
              <img
                v-tippy="{ content: egg.name }"
                :src="iconURL(eggIconPath(ei.Egg.CUSTOM_EGG, egg.identifier), 64)"
                class="h-5 w-5 flex-shrink-0"
              />
            </div>

            <div class="flex justify-end colleggtible-controls-align">
              <!-- Segmented Control -->
              <div class="inline-flex w-70 rounded-md shadow-sm flex-shrink-0" role="group">
                <!-- None Button -->
                <button
                  :class="[
                    'w-14 justify-center px-3 py-1 text-xs font-medium border transition-colors rounded-l-md',
                    config.colleggtibleTiers[egg.identifier] === -1
                      ? 'bg-blue-600 border-blue-600 text-white z-10'
                      : 'bg-dark-20 border-gray-600 text-gray-300 hover:bg-dark-10',
                  ]"
                  @click="updateColleggtibleTier(egg.identifier, -1)"
                >
                  {{ formatMultiplier(1) }}
                </button>

                <!-- Tier Buttons -->
                <button
                  v-for="(_, index) in farmSizeTiers"
                  :key="index"
                  :class="[
                    'w-14 justify-center px-3 py-1 text-xs font-medium border transition-colors',
                    index === farmSizeTiers.length - 1 ? 'rounded-r-md' : '',
                    config.colleggtibleTiers[egg.identifier] === index
                      ? 'bg-blue-600 border-blue-600 text-white z-10'
                      : 'bg-dark-20 border-gray-600 text-gray-300 hover:bg-dark-10',
                  ]"
                  @click="updateColleggtibleTier(egg.identifier, index)"
                >
                  {{ formatMultiplier(egg.buffs[index]?.value || 1) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { iconURL, groupCustomEggsByDimension, eggIconPath, ei } from 'lib';
import { Config } from '@/lib';

export default defineComponent({
  name: 'ColleggtiblesConfig',
  props: {
    config: {
      type: Config,
      required: true,
    },
  },
  emits: {
    'colleggtible-tier-changed': (_eggIdentifier: string, _tier: number) => true,
  },
  setup(props, { emit }) {
    const IGNORED_DIMENSIONS = [ei.GameModifier.GameDimension.HAB_COST, ei.GameModifier.GameDimension.VEHICLE_COST];

    const groupedColleggtibles = computed(() => {
      return groupCustomEggsByDimension()
        .map((eggs, dimensionIndex) => ({ dimensionIndex, eggs }))
        .filter(group => !IGNORED_DIMENSIONS.includes(group.dimensionIndex))
        .filter(group => group.eggs.length > 0);
    });

    const formatMultiplier = (value: number) => {
      if (value === 1) {
        return '1.0x';
      }
      return `${value.toFixed(2)}x`;
    };

    const modifierName = (dimensionIndex: number) => {
      return ei.GameModifier.GameDimension[dimensionIndex].replace(/_/g, ' ');
    };

    const updateColleggtibleTier = (eggIdentifier: string, tier: number) => {
      emit('colleggtible-tier-changed', eggIdentifier, tier);
    };

    return {
      groupedColleggtibles,
      formatMultiplier,
      modifierName,
      updateColleggtibleTier,
      iconURL,
      eggIconPath,
      ei,
      farmSizeTiers: [10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000],
    };
  },
});
</script>

<style scoped>
/* Custom 300px breakpoint for colleggtibles */
@media (min-width: 300px) {
  .colleggtible-responsive {
    grid-template-columns: auto 1fr;
  }

  .colleggtible-icon-align {
    justify-content: flex-start;
  }

  .colleggtible-controls-align {
    justify-content: flex-end;
  }
}
</style>
