<template>
  <picture>
    <source :srcset="iconURL(iconRelPath, size, 'webp')" type="image/webp" />
    <img :src="iconURL(iconRelPath, size)" class="h-full w-full" />
  </picture>
</template>

<script setup lang="ts">
import { PropType } from 'vue';

import { iconURL } from 'lib';

defineProps({
  iconRelPath: {
    type: String,
    required: true,
  },
  size: {
    type: Number as PropType<number | string | undefined>,
    default: undefined,
  },
});
</script>
