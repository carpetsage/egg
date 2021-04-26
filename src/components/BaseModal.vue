<template>
  <transition enter-active-class="block" leave-active-class="block">
    <div
      v-show="shouldShow"
      class="fixed z-10 inset-0 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Background overlay -->
        <transition
          enter-active-class="ease-out duration-300"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="ease-in duration-200"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="shouldShow"
            class="fixed inset-0 bg-gray-500 dark:bg-gray-700 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
            aria-hidden="true"
            @click="hide"
          ></div>
        </transition>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true"
          >&#8203;</span
        >

        <!-- Modal panel -->
        <transition
          enter-active-class="ease-out duration-300"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="ease-in duration-200"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          @before-enter="beforeEnter"
          @enter="enter"
          @after-enter="afterEnter"
          @enter-cancelled="enterCancelled"
          @before-leave="beforeLeave"
          @leave="leave"
          @after-leave="afterLeave"
          @leave-cancelled="leaveCancelled"
        >
          <div
            v-if="shouldShow"
            class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
          >
            <slot></slot>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  props: {
    shouldShow: {
      type: Boolean,
      required: true,
    },
    hide: {
      type: Function as PropType<() => void>,
      required: true,
    },
    // Transition hooks on modal panel.
    beforeEnter: Function as PropType<(el: Element) => void>,
    enter: Function as PropType<(el: Element, done: () => void) => void>,
    afterEnter: Function as PropType<(el: Element) => void>,
    enterCancelled: Function as PropType<(el: Element) => void>,
    beforeLeave: Function as PropType<(el: Element) => void>,
    leave: Function as PropType<(el: Element, done: () => void) => void>,
    afterLeave: Function as PropType<(el: Element) => void>,
    leaveCancelled: Function as PropType<(el: Element) => void>,
  },
});
</script>
