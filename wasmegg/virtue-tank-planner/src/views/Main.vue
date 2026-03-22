<template>
  <artifact-selector :key="route.path" v-model="selectedArtifactId" class="my-4" />
  <router-view name="artifact" />
</template>

<script lang="ts">
import { defineComponent, ref, PropType, toRefs, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ArtifactSelector from '@/components/ArtifactSelector.vue';

export default defineComponent({
  components: {
    ArtifactSelector,
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
    };
  },
});
</script>
