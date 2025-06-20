<template>
  <tr>
    <td class="px-4 py-1.5 text-sm text-left">
      <span
        v-tippy="{
          content: effectProps.note,
        }"
        class="relative"
        :class="dagger ? 'Dagger' : null"
      >
        <slot name="name">{{ effectProps.name }}</slot
        ><sup class="px-0.5">
          <span v-if="showFootnote">{{ effectProps.footnoteIndex }}</span>
          <span v-else data-html2canvas-ignore>?</span>
        </sup>
      </span>
    </td>
    <td v-if="builds.builds[0].hasDuplicates()" class="px-4 py-1.5 text-base text-right text-red-500 whitespace-nowrap">
      &mdash;
    </td>
    <td v-else class="px-4 py-1.5 text-base text-right whitespace-nowrap">
      <slot :build="builds.builds[0]" :config="builds.config"></slot>
    </td>
  </tr>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { Builds } from '@/lib';
import { effects } from '@/effects';

export default defineComponent({
  props: {
    effectId: {
      type: String,
      required: true,
    },
    dagger: {
      type: Boolean,
      default: false,
    },
    showFootnote: {
      type: Boolean,
      default: false,
    },
    builds: {
      type: Object as PropType<Builds>,
      required: true,
    },
  },
  setup(props) {
    const { effectId } = toRefs(props);
    const effectProps = computed(() => {
      for (let i = 0; i < effects.length; i++) {
        if (effects[i].id === effectId.value) {
          return {
            ...effects[i],
            footnoteIndex: i + 1,
          };
        }
      }
      throw new Error(`no effect with ID ${effectId.value}`);
    });
    return {
      effectProps,
    };
  },
});
</script>

<style scoped>
sup {
  color: #a6a6a6;
}

.Dagger {
  color: #ffc601;
}

.Dagger::before {
  content: '\2020';
  position: absolute;
  top: -0.25em;
  left: -0.75em;
  font-size: 75%;
}
</style>
