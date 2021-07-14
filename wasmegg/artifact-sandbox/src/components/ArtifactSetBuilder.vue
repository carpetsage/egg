<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <artifact-picker :key="key" v-model:artifact="buildProps[0]" :artifact-index="1" />
    <artifact-picker :key="key" v-model:artifact="buildProps[1]" :artifact-index="2" />
    <artifact-picker :key="key" v-model:artifact="buildProps[2]" :artifact-index="3" />
    <artifact-picker :key="key" v-model:artifact="buildProps[3]" :artifact-index="4" />
  </div>

  <div class="my-2 text-center">
    <button
      type="button"
      class="inline-flex items-center px-3 py-2 border border-dark-30 shadow-sm text-sm leading-4 font-medium rounded-md bg-dark-20 hover:bg-dark-23 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-50 focus:ring-offset-dark-30"
      @click="showResetConfirmation = true"
    >
      Reset build
    </button>
  </div>

  <confirmation-dialog
    v-if="showResetConfirmation"
    title="Reset build"
    message="All currently selected artifacts and stones will be cleared. Please copy the share link if you want to restore the current configuration in the future."
    confirm-label="Reset"
    cancel-label="Cancel"
    @confirmed="
      () => {
        reset();
        showResetConfirmation = false;
      }
    "
    @cancelled="showResetConfirmation = false"
    @dismissed="showResetConfirmation = false"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { Build } from '@/lib';
import ArtifactPicker from '@/components/ArtifactPicker.vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';

export default defineComponent({
  components: {
    ArtifactPicker,
    ConfirmationDialog,
  },

  props: {
    build: {
      type: Build,
      required: true,
    },
  },

  emits: ['update:build'],

  data() {
    return {
      // Force children to rerender after resets with a key.
      key: 0,
      buildProps: this.build.buildProps(),
      showResetConfirmation: false,
    };
  },

  watch: {
    buildProps: {
      handler() {
        this.$emit('update:build', Build.fromBuildProps(this.buildProps));
      },
      deep: true,
    },
  },

  methods: {
    reset() {
      const emptyBuild = Build.newEmptyBuild();
      this.buildProps = emptyBuild.buildProps();
      this.key = 1 - this.key;
      this.$emit('update:build', emptyBuild);
    },
  },
});
</script>
