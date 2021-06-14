<template>
  <template v-if="tool.displayIconOnly">
    <base-link :href="tool.url" @click="$emit('visit', tool)">
      <img :src="tool.iconUrl" class="inline relative" :class="tool.iconCssClasses" />
    </base-link>
  </template>
  <template v-else>
    <img
      v-if="tool.iconUrl"
      :src="tool.iconUrl"
      class="inline h-4 w-4 mr-1 relative -top-px"
      :class="tool.iconCssClasses"
    />
    <base-link :href="tool.url" @click="$emit('visit', tool)">{{ tool.title }}</base-link>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { Tool } from '@/tools';
import BaseLink from '@/components/BaseLink.vue';

export default defineComponent({
  components: {
    BaseLink,
  },
  props: {
    tool: {
      type: Object as PropType<Tool>,
      required: true,
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    visit: (tool: Tool) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
});
</script>
