<template>
  <span :class="tool.isHighlight ? 'bg-green-100' : null">
    <tool-link :tool="tool" />
    <template v-if="tool.isHighlight">
      <sup class="text-xs font-medium uppercase text-green-600 ml-1">
        <template v-if="tool.isNew">New</template>
        <template v-else-if="tool.isMajorUpdate">Major update</template>
        <template v-else-if="tool.isUpdate">Update</template>
      </sup>
    </template>
  </span>
  <template v-if="tool.description"> &mdash; {{ tool.description }}</template>
  <template v-if="tool.whatsNew">
    <br />
    <p class="text-sm text-green-600">New: {{ tool.whatsNew }}</p>
  </template>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';

import { idToTool } from '@/tools';
import ToolLink from '@/components/ToolLink.vue';

export default defineComponent({
  components: {
    ToolLink,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { id } = toRefs(props);
    const tool = computed(() => {
      const t = idToTool.get(id.value);
      if (!t) {
        throw new Error(`/${id.value}/ is not registered`);
      }
      return t;
    });
    return {
      tool,
    };
  },
});
</script>
