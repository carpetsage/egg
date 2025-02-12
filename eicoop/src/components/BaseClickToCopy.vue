<template>
  <tippy class="active:duration-0 cursor-pointer select-none" :class="colorClasses" @click="copyTextToClipboard(text)">
    <slot>{{ text }}</slot>
    <template #content>
      <slot name="tooltip">Click to copy</slot>
    </template>
  </tippy>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Tippy } from 'vue-tippy';
import copyTextToClipboard from 'copy-text-to-clipboard';

export default defineComponent({
  components: {
    Tippy,
  },
  props: {
    text: {
      type: String,
      required: true,
    },
    colorClasses: {
      type: String,
      default: 'active:text-green-500 dark:active:text-green-500',
    },
  },
  setup() {
    return {
      copyTextToClipboard,
    };
  },
});
</script>
