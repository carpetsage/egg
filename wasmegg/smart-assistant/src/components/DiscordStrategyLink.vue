<template>
  <p class="text-gray-500">
    <template v-if="plural">
      You can read more about these strategies and how they compare to others in
    </template>
    <template v-else>
      You can read more about this strategy and how it compares to others in
    </template>
    <template v-if="!lunar">
    <a
      href="https://discord.com/channels/455380663013736479/455385659079917569/866500767119442001"
      target="_blank"
      class="text-blue-500 hover:text-blue-600 underline"
      >this post</a
    >
    by Stormin#3993
    </template>
    <template v-else>
    <a
      href="https://discord.com/channels/455380663013736479/455385659079917569/1215896581237379082"
      target="_blank"
      class="text-blue-500 hover:text-blue-600 underline"
      >this post</a
    >
    by jack875
    </template>
    (you need to be a member of the
    <a
      href="https://discord.gg/egginc"
      target="_blank"
      class="text-blue-500 hover:text-blue-600 underline"
      >Discord server</a
    >
    and signed in to read the post).
  </p>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    plural: {
      type: Boolean,
      default: false,
    },
    lunar: {
      type: Boolean,
      default: false
    }
  },
});
</script>
