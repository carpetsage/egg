<template>
  <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />
  <artifact-selector :key="route.path" v-model="selectedArtifactId" class="mx-4 sm:mx-auto sm:max-w-xs sm:w-full mt-2 mb-4" />
  <router-view name="artifact" />
</template>

<script lang="ts">
import { defineComponent, ref, PropType, toRefs, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import { getSavedPlayerID, savePlayerID } from 'lib';

import ArtifactSelector from '@/components/ArtifactSelector.vue';

export default defineComponent({
  components: {
    ArtifactSelector,
    ThePlayerIdForm,
  },
  props: {
    artifactId: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  setup(props) {
    const router = useRouter();
    const route = useRoute();
    const { artifactId } = toRefs(props);

    const playerId = ref(
      new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || ''
    );
    const submitPlayerId = (id: string) => {
      playerId.value = id;
      savePlayerID(id);
    };

    const selectedArtifactId = ref(artifactId.value);
    watch(artifactId, current => {
      selectedArtifactId.value = current;
    });
    watch(selectedArtifactId, current => {
      if (current !== null) {
        router.push({
          name: 'artifact',
          params: { artifactId: current },
        });
      }
    });

    return {
      route,
      selectedArtifactId,
      playerId,
      submitPlayerId,
    };
  },
});
</script>
