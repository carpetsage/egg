<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        @click="$emit('cancel')"
      />

      <!-- Dialog -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 class="font-semibold text-lg text-gray-900 mb-2">{{ title }}</h3>

        <p class="text-gray-600 mb-6">
          {{ message }}
        </p>

        <!-- Buttons -->
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            @click="$emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            class="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'Confirm Action',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
});

defineEmits<{
  'confirm': [];
  'cancel': [];
}>();
</script>
