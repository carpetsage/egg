<template>
  <slot :input="input" :invalid="invalid" :update-input="updateInput" :update-value="updateValue">
    <input
      :id="id"
      v-model.trim="input"
      :name="id"
      type="text"
      spellcheck="false"
      :class="[baseClass, invalid ? invalidClass : validClass]"
    />
  </slot>
</template>

<script lang="ts">
import { parseValueWithUnit } from 'lib';
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

export default defineComponent({
  props: {
    id: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    raw: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    // If lazy is true, only update the value through the updateValue callback.
    // Useful for only accepting the value change when input loses focus.
    lazy: {
      type: Boolean,
      default: false,
    },
    baseClass: {
      type: String,
      default:
        'shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md focus:outline-none',
    },
    validClass: {
      type: String,
      default: 'focus:ring-blue-500 focus:border-blue-500',
    },
    invalidClass: {
      type: String,
      default:
        'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500',
    },
  },
  emits: {
    'update:raw': (_payload: string) => true,
    'update:value': (_payload: number) => true,
  },
  setup(props, { emit }) {
    const { raw, lazy } = toRefs(props);
    const input = ref(raw.value.trim());
    // updateInput is solely meant for the scoped slot, since two-way binding of
    // input isn't allowed there. Accepts an Event on an input[type=text].
    const updateInput = (event: Event) => {
      input.value = (event.target as HTMLInputElement).value.trim();
    };
    const parsed = computed(() => parseValueWithUnit(input.value, false));
    const invalid = computed(() => parsed.value === null);
    watch(raw, () => {
      input.value = raw.value.trim();
    });
    watch(input, () => {
      if (parsed.value === null) {
        return;
      }
      emit('update:raw', input.value);
      if (!lazy.value) {
        emit('update:value', parsed.value);
      }
    });
    const updateValue = () => {
      if (parsed.value !== null) {
        emit('update:value', parsed.value);
      }
    };
    return {
      input,
      invalid,
      updateInput,
      updateValue,
    };
  },
});
</script>
