<template>
  <div
    v-if="newTools.length > 0 || majorUpdateTools.length > 0 || updateTools.length > 0"
    class="py-2 bg-green-100 rounded-lg shadow-inner"
  >
    <template v-if="newTools.length > 0">
      <h2 class="px-5 font-medium">New tools</h2>
      <ul class="my-1">
        <li v-for="tool in newTools" :key="tool.id"><tool-link :tool="tool" /></li>
      </ul>
    </template>

    <template v-if="majorUpdateTools.length > 0">
      <h2 class="px-5 font-medium">Major updates</h2>
      <ul class="my-1">
        <li v-for="tool in majorUpdateTools" :key="tool.id"><tool-link :tool="tool" /></li>
      </ul>
    </template>

    <template v-if="updateTools.length > 0">
      <h2 class="px-5 font-medium">
        <template v-if="majorUpdateTools.length > 0">Other updates</template>
        <template v-else>Updates</template>
      </h2>
      <ul class="my-1">
        <li v-for="tool in updateTools" :key="tool.id"><tool-link :tool="tool" /></li>
      </ul>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { majorUpdateTools, newTools, updateTools } from '@/tools';
import ToolLink from '@/components/ToolLink.vue';

export default defineComponent({
  components: {
    ToolLink,
  },
  setup() {
    return {
      newTools,
      majorUpdateTools,
      updateTools,
    };
  },
});
</script>
