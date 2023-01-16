<template>
  <section>
    <div class="mx-4 my-4">
      <h2 class="text-center text-md leading-6 font-medium text-gray-900">{{ sectionTitle }}</h2>
      <div class="text-center">
        <span
          class="text-sm text-indigo-500 hover:text-indigo-600 font-normal underline cursor-pointer select-none"
          @click="$emit('toggle')"
        >
          {{ visible ? 'collapse section' : 'expand section' }}
        </span>
      </div>
    </div>
    <div v-show="visible">
      <slot></slot>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    sectionTitle: {
      type: String,
      required: true,
    },
    visible: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['toggle'],
});
</script>
