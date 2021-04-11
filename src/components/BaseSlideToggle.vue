<template>
  <transition
    name="slide-toggle"
    @before-enter="beforeEnter"
    @enter="enter"
    @after-enter="afterEnter"
    @before-leave="beforeLeave"
    @leave="leave"
    @after-leave="afterLeave"
  >
    <slot></slot>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const beforeEnter = (el: Element) => {};
    const enter = (el: Element) => {
      const e = el as HTMLElement;
      const fullHeight = e.offsetHeight;
      e.style.maxHeight = '0px';
      // requestAnimationFrame works here on WebKit-based browsers, but somehow
      // doesn't work on Gecko (no transition, directly to full height). I ended
      // up with shitty polling-based workaround. For some reason setting the
      // max-height after Vue has set v-enter-to[1], which seems to use a double
      // requestAnimationFrame (nextFrame[2]), does work.
      //
      // [1] https://github.com/vuejs/vue-next/blob/870f2a7ba35245fd8c008d2ff666ea130a7e4704/packages/runtime-dom/src/components/Transition.ts#L128-L141
      // [2] https://github.com/vuejs/vue-next/blob/870f2a7ba35245fd8c008d2ff666ea130a7e4704/packages/runtime-dom/src/components/Transition.ts#L238-L242
      const pollId = setInterval(() => {
        if (el.classList.contains('slide-toggle-enter-to')) {
          e.style.maxHeight = `${fullHeight}px`;
          clearInterval(pollId);
        }
      }, 5);
    };
    const afterEnter = (el: Element) => {
      const e = el as HTMLElement;
      e.style.maxHeight = '';
    };
    const beforeLeave = (el: Element) => {
      const e = el as HTMLElement;
      e.style.maxHeight = `${e.offsetHeight}px`;
    };
    const leave = (el: Element) => {
      const e = el as HTMLElement;
      e.style.maxHeight = '0px';
    };
    const afterLeave = (el: Element) => {
      const e = el as HTMLElement;
      e.style.maxHeight = '';
    };

    return {
      beforeEnter,
      enter,
      afterEnter,
      beforeLeave,
      leave,
      afterLeave,
    };
  },
});
</script>

<style lang="postcss" scoped>
.slide-toggle-enter-active,
.slide-toggle-leave-active {
  @apply duration-200 overflow-y-hidden;
  transition-property: max-height;
}
</style>
