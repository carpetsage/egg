<template>
  <a
    :href="href"
    target="_blank"
    class="text-blue-600 hover:text-blue-700 underline"
    :class="everfresh ? null : 'visited:text-purple-600 hover:visited:text-purple-700'"
    ><slot></slot
  ></a>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    href: {
      type: String,
      required: true,
    },
    everfresh: {
      type: Boolean,
      default: false,
    },
  },
});
</script>
