<template>
  <div class="flex justify-center my-3">
    <div class="px-4 py-2 bg-gray-50 rounded-md shadow">
      <div class="text-center mb-0.5 text-sm font-medium text-gray-900">
        Eggs of Prophecy progress
      </div>
      <div class="flex items-center justify-center mb-0.5 space-x-0.5">
        <img :src="iconURL('egginc/egg_of_prophecy.png', 128)" class="inline h-6 w-6" />
        <span class="text-sm font-medium text-yellow-500">
          {{ progress.completed }}/{{ progress.available }}
        </span>
        <span class="h-6 w-6 invisible"></span>
      </div>
      <ul class="text-center mb-1">
        <tippy tag="li" class="text-sm text-gray-700">
          From contracts:&nbsp;
          <span class="font-medium text-gray-900">
            {{ progress.fromContracts.completed }}/{{ progress.fromContracts.available }}
          </span>

          <template #content>
            PEs collected from
            <span class="text-green-300">
              {{ progress.fromContracts.numPEContractsCompleted }}/{{
                progress.fromContracts.numPEContractsAvailable
              }}
            </span>
            PE contracts
          </template>
        </tippy>

        <tippy tag="li" class="text-sm text-gray-700">
          From trophies:&nbsp;
          <span class="font-medium text-gray-900">
            {{ progress.fromTrophies.completed }}/{{ progress.fromTrophies.available }}
          </span>

          <template #content>
            <ul>
              <template v-for="egg in progress.fromTrophies.eggs" :key="egg.egg">
                <li v-if="egg.available > 0" class="flex items-center my-0.5">
                  <img :src="iconURL(eggIconPath(egg.egg), 64)" class="inline h-4 w-4 mr-0.5" />
                  {{ egg.eggName }}: {{ egg.levelName }},&nbsp;
                  <span class="text-green-300">{{ egg.completed }}/{{ egg.available }}</span>
                </li>
              </template>
            </ul>
          </template>
        </tippy>

        <tippy tag="li" class="text-sm text-gray-700">
          From daily gifts:&nbsp;
          <span class="font-medium text-gray-900">
            {{ progress.fromDailyGifts.completed }}/{{ progress.fromDailyGifts.available }}
          </span>

          <template #content>
            Currently on month {{ progress.fromDailyGifts.onMonth }}, day
            {{ progress.fromDailyGifts.onDay }}.
          </template>
        </tippy>

        <tippy tag="li" class="text-sm text-gray-700">
          From seasons:&nbsp;
          <span class="font-medium text-gray-900">
            {{ progress.fromContractSeasons.completed }}/{{ progress.fromContractSeasons.available }}
          </span>
        </tippy>


      </ul>
      <p class="text-center text-xs text-gray-500">
        Hover over or click on each line of the breakdown to see details.
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Tippy } from 'vue-tippy';

import { eggIconPath, iconURL, ProphecyEggsProgressAggregate } from 'lib';

export default defineComponent({
  components: {
    Tippy,
  },
  props: {
    progress: {
      type: Object as PropType<ProphecyEggsProgressAggregate>,
      required: true,
    },
  },
  setup() {
    return {
      eggIconPath,
      iconURL,
    };
  },
});
</script>
