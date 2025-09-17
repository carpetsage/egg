<template>
  <div v-if="farms.length > 0" class="-mt-2 mx-4 xl:mx-0">
    <div class="text-center text-xs mb-2">You can hover over or click on an artifact to reveal names and effects.</div>
    <div class="space-y-4">
      <div v-for="(farm, index) in farms" :key="index">
        <div class="text-center">
          <img :src="iconURL(eggIconPath(farm.egg))" class="inline h-5 w-5 relative -top-px" />
          <span class="text-sm">{{ farmTitle(farm) }}</span>
        </div>
        <div class="text-center mb-1">
          <a :href="farmToSandboxURL(farm)" target="_blank" class="text-xs text-blue-500 hover:text-blue-600">
            <span class="underline">Tweak this set in the sandbox</span>
            <svg class="inline h-3 w-3 relative -top-px ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
        <artifact-gallery v-if="farm.artifactSet.artifacts.length > 0" :artifact-set="farm.artifactSet" />
        <div v-else class="text-center text-sm text-gray-700">No artifact equipped on this farm.</div>
        <div
          v-if="farm.isHomeFarm"
          class="w-max max-w-full px-3 py-2 text-center text-xs text-green-800 bg-green-50 rounded-md shadow-sm mx-auto mt-1"
        >
          You can get recommendations for optimal prestige loadouts from
          <a href="/smart-assistant/" target="_blank" class="text-green-700 hover:text-green-900 underline"
            >Smart assistant</a
          >.<template v-if="farm.isEnlightenmentFarm"
            ><br />
            If you're aiming for an enlightenment trophy, check
            <a href="/enlightenment/" target="_blank" class="text-green-700 hover:text-green-900 underline"
              >Enlightenment companion</a
            >.</template
          >
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-center text-sm text-red-500 -mt-2">No farm found in save.</div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { eggIconPath, ei, Farm, farmToSandboxURL, iconURL } from 'lib';
import ArtifactGallery from '@/components/ArtifactGallery.vue';

export default defineComponent({
  components: {
    ArtifactGallery,
  },
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
  },
  setup(props) {
    const { backup } = toRefs(props);
    const activeContracts = computed(() => backup.value.contracts?.contracts || []);
    const farms = computed(() => {
      const activeContractIds = activeContracts.value.map(c => c.contract!.identifier!);
      return (backup.value.farms || [])
        .filter(
          farm =>
            farm.farmType === ei.FarmType.HOME ||
            (farm.farmType === ei.FarmType.CONTRACT && activeContractIds.includes(farm.contractId!))
        )
        .map(farm => new Farm(backup.value, farm));
    });
    const farmTitle = (farm: Farm): string => {
      const contractId = farm.farm.contractId;
      if (!contractId) {
        return 'Home farm';
      }
      for (const activeContract of activeContracts.value) {
        if (activeContract.contract?.identifier === contractId) {
          return activeContract.contract.name!;
        }
      }
      return contractId;
    };
    return {
      farms,
      farmTitle,
      eggIconPath,
      iconURL,
      farmToSandboxURL,
    };
  },
});
</script>
