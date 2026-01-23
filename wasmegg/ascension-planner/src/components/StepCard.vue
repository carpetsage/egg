<template>
  <div class="border border-gray-300 rounded-lg mb-2 overflow-hidden">
    <!-- Header - always visible -->
    <div
      class="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
      :class="headerClasses"
      @click="$emit('toggle')"
    >
      <div class="flex items-center gap-3">
        <!-- Step label badge (C1, I2, etc.) -->
        <span
          class="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg"
          :class="badgeClasses"
        >
          {{ label }}
        </span>
        <div>
          <h3 class="font-semibold text-gray-900">{{ eggName }}</h3>
          <p class="text-sm text-gray-500">{{ category }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Slot for action buttons (delete, move, etc.) -->
        <slot name="actions"></slot>
        <component
          :is="expanded ? 'ChevronUpIcon' : 'ChevronDownIcon'"
          class="h-5 w-5 text-gray-400"
        />
      </div>
    </div>

    <!-- Expandable content -->
    <div v-show="expanded" class="border-t border-gray-200 px-4 py-4 bg-white">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid';
import {
  type VirtueEgg,
  VIRTUE_EGG_NAMES,
  VIRTUE_EGG_CATEGORIES,
  getStepLabel,
  type AscensionStep,
} from '@/types';

const EGG_COLORS: Record<VirtueEgg, { header: string; badge: string }> = {
  curiosity: {
    header: 'bg-blue-50 hover:bg-blue-100',
    badge: 'bg-blue-600',
  },
  integrity: {
    header: 'bg-green-50 hover:bg-green-100',
    badge: 'bg-green-600',
  },
  kindness: {
    header: 'bg-pink-50 hover:bg-pink-100',
    badge: 'bg-pink-600',
  },
  humility: {
    header: 'bg-purple-50 hover:bg-purple-100',
    badge: 'bg-purple-600',
  },
  resilience: {
    header: 'bg-orange-50 hover:bg-orange-100',
    badge: 'bg-orange-600',
  },
};

export default defineComponent({
  components: {
    ChevronDownIcon,
    ChevronUpIcon,
  },
  props: {
    step: {
      type: Object as PropType<AscensionStep>,
      required: true,
    },
    expanded: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['toggle'],
  setup(props) {
    const label = computed(() => getStepLabel(props.step));
    const eggName = computed(() => VIRTUE_EGG_NAMES[props.step.eggType]);
    const category = computed(() => VIRTUE_EGG_CATEGORIES[props.step.eggType]);
    const headerClasses = computed(() => EGG_COLORS[props.step.eggType].header);
    const badgeClasses = computed(() => EGG_COLORS[props.step.eggType].badge);

    return {
      label,
      eggName,
      category,
      headerClasses,
      badgeClasses,
    };
  },
});
</script>
