<template>
  <TransitionRoot as="template" :show="shouldShow">
    <Dialog
      as="div"
      static
      class="fixed z-10 inset-0 overflow-y-auto"
      :open="shouldShow"
      :initial-focus="initialFocus"
      @close="hide"
    >
      <div class="min-h-screen text-center">
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <DialogOverlay class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span class="inline-block align-middle h-screen" aria-hidden="true">&#8203;</span>

        <TransitionChild
          as="div"
          class="inline-block my-8 align-middle max-w-sm w-full"
          enter="ease-out duration-300"
          enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-200"
          leave-from="opacity-100 translate-y-0 sm:scale-100"
          leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          @before-enter="$emit('beforeEnter')"
          @after-enter="$emit('afterEnter')"
          @before-leave="$emit('beforeLeave')"
          @after-leave="$emit('afterLeave')"
        >
          <div
            v-if="shouldShow"
            class="bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 sm:p-6 text-left overflow-hidden shadow-xl transform transition-all"
          >
            <slot></slot>
          </div>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Dialog, DialogOverlay, TransitionChild, TransitionRoot } from '@headlessui/vue';

export default defineComponent({
  components: {
    // eslint-disable-next-line vue/no-reserved-component-names
    Dialog,
    DialogOverlay,
    TransitionChild,
    TransitionRoot,
  },
  props: {
    shouldShow: {
      type: Boolean,
      required: true,
    },
    hide: {
      type: Function as PropType<() => void>,
      required: true,
    },
    initialFocus: {
      type: Object as PropType<HTMLElement | null>,
      default: null,
    },
  },
  emits: ['beforeEnter', 'afterEnter', 'beforeLeave', 'afterLeave'],
});
</script>
