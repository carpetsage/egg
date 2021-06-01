<template>
  <router-link
    :to="to"
    class="text-blue-600 hover:text-blue-700 visited:text-purple-600 hover:visited:text-purple-700 underline"
    ><slot></slot
  ></router-link>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { RouteLocationRaw } from 'vue-router';

export default defineComponent({
  props: {
    to: {
      type: Object as PropType<RouteLocationRaw>,
      required: true,
    },
  },
});
</script>
