<template>
  <section>
    <div class="flex items-center cursor-pointer select-none group py-1" @click="$emit('toggle')">
      <h2 class="text-lg font-bold text-gray-900 mr-2">
        {{ sectionTitle }}
      </h2>
      <component
        :is="visible ? 'ChevronUpIcon' : 'ChevronDownIcon'"
        class="h-5 w-5 text-gray-400 group-hover:text-gray-600"
      />
    </div>
    <div v-show="visible">
      <slot></slot>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid';

export default defineComponent({
  components: {
    ChevronDownIcon,
    ChevronUpIcon,
  },
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
