<template>
  <input :value="modelValue" @input="setModelValue" />
</template>

<script setup lang="ts">
defineProps({
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits({
  'update:modelValue': (_payload: string) => true,
});

const setModelValue = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
};
</script>
