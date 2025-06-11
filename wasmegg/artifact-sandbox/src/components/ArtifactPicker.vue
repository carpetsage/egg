<template>
  <div class="max-w-sm w-full mx-auto my-2">
    <label class="block text-sm font-medium">Artifact #{{ artifactIndex }}</label>
    <artifact-picker-item-select v-model="selectedArtifact.id" type="artifact" class="mt-1" />
    <template v-for="i in 3" :key="i">
      <div class="flex items-center space-x-1 mt-1" :class="i > numSlots ? 'opacity-50' : null">
        <div class="flex-shrink-0 h-8 w-8 rounded-lg bg-dark-20">
          <img class="h-8 w-8" :src="iconURL('egginc-extras/icon_afx_stone_slot.png', 64)" />
        </div>
        <artifact-picker-item-select
          v-model="selectedArtifact.stones[i - 1]"
          type="stone"
          :disabled="i > numSlots"
          class="flex-grow"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

import { ArtifactBuildProps, artifactFromId } from '@/lib';
import ArtifactPickerItemSelect from '@/components/ArtifactPickerItemSelect.vue';
import { iconURL } from 'lib';

export default defineComponent({
  components: {
    ArtifactPickerItemSelect,
  },
  props: {
    artifactIndex: {
      type: Number,
      required: true,
    },
    artifact: {
      type: Object as PropType<ArtifactBuildProps>,
      required: true,
    },
  },
  emits: {
    'update:artifact': (_payload: ArtifactBuildProps) => true,
  },
  setup(props, { emit }) {
    const { artifact } = toRefs(props);
    const numSlots = computed(() => artifactFromId(artifact.value.id)?.slots ?? 0);
    const selectedArtifact = ref(artifact.value);
    watch(
      selectedArtifact,
      () => {
        emit('update:artifact', selectedArtifact.value);
      },
      {
        deep: true,
      }
    );
    return {
      selectedArtifact,
      numSlots,
      iconURL,
    };
  },
});
</script>
