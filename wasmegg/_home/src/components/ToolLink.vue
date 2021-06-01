<template>
  <span :class="isHighlight ? 'bg-green-100' : null">
    <template v-if="tool.displayIconOnly">
      <base-link :href="tool.url">
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
      <base-link :href="tool.url">{{ tool.title }}</base-link>
    </template>
    <template v-if="isHighlight">
      <sup class="text-xs font-medium uppercase text-green-600 ml-1">
        <template v-if="tool.isNew">New</template>
        <template v-else-if="tool.isMajorUpdate">Major update</template>
      </sup>
    </template>
  </span>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';

import { stemToTool } from '@/tools';
import BaseLink from '@/components/BaseLink.vue';

export default defineComponent({
  components: {
    BaseLink,
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
      const t = stemToTool.get(id.value);
      if (!t) {
        throw new Error(`/${id.value}/ is not registered`);
      }
      return t;
    });
    const isHighlight = computed(() => tool.value.isNew || tool.value.isMajorUpdate);
    return {
      tool,
      isHighlight,
    };
  },
});
</script>
