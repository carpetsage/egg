<template>
  <template v-if="inventoryIsEmpty">
    <p class="max-w-lg mx-auto text-center">Looks like you don't have any artifact :(</p>
  </template>
  <template v-else>
    <div class="flex justify-center mb-3" :class="loading ? 'opacity-50' : null">
      <div class="space-y-0.5">
        <div class="relative flex items-start">
          <div class="flex items-center h-5">
            <input
              id="rarerItemsFirst"
              v-model="rarerItemsFirst"
              name="rarerItemsFirst"
              type="checkbox"
              class="focus:ring-0 focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
              :disabled="loading"
            />
          </div>
          <div class="ml-2 text-sm">
            <label for="rarerItemsFirst" class="text-gray-600">Rarer items first</label>
          </div>
        </div>
      </div>
    </div>

    <template v-if="loading">
      <p class="max-w-lg mx-auto text-center text-sm text-gray-500">
        Generating image, this might take a while...<br />
        Note that this tool may not work in all browsers.
      </p>
    </template>
    <template v-else>
      <template v-if="error !== null">
        <p class="max-w-lg mx-auto text-center text-sm text-red-500">{{ error }}</p>
        <p class="max-w-lg mx-auto text-center text-sm text-gray-500">Maybe try another browser?</p>
      </template>
      <div v-else class="space-y-2">
        <p v-if="blockedByFirefoxPrivacyResistFingerprinting" class="text-xs text-red-500">
          Oops! Canvas to image functionality might have been sabotaged by your browser! Ignore this if the image looks
          normal. Otherwise, if you're using Firefox, you might have the
          <code>privacy.resistFingerprinting</code> setting turned on. Please check your browser address bar and look
          for a picture icon which you can click and grant "Extract canvas data" permission to this site. Reload after
          granting the permission.
        </p>
        <div class="flex items-center justify-center">
          <a
            :href="imageURL"
            download="inventory.png"
            class="inline-flex items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Download Image
          </a>
        </div>
        <p class="max-w-lg mx-auto text-center text-xs text-gray-500">
          If the download button doesn't work, you may also right click / long press on the image below to use your
          browser's image saving function.
        </p>
        <div class="overflow-scroll">
          <img :src="imageURL" :width="width / 2" :height="height / 2" class="block mx-auto max-w-full" />
        </div>
      </div>
    </template>
    <canvas ref="canvasRef" class="hidden"></canvas>
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, PropType, ref, toRefs, watch } from 'vue';

import { getLocalStorage, Inventory, setLocalStorage } from 'lib';
import { drawInventory, generateInventoryGrid } from '@/lib';

const props = defineProps({
  inventory: {
    type: Object as PropType<Inventory>,
    required: true,
  },
});
const { inventory } = toRefs(props);
const RARER_ITEMS_FIRST_LOCALSTORAGE_KEY = 'rarerItemsFirst';
const rarerItemsFirst = ref(getLocalStorage(RARER_ITEMS_FIRST_LOCALSTORAGE_KEY) !== 'false');
watch(rarerItemsFirst, () => setLocalStorage(RARER_ITEMS_FIRST_LOCALSTORAGE_KEY, rarerItemsFirst.value));
const grid = computed(() =>
  generateInventoryGrid(inventory.value as Inventory, {
    rarerItemsFirst: rarerItemsFirst.value,
  })
);
const inventoryIsEmpty = computed(() => grid.value.length === 0);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const loading = ref(false);
const imageURL = ref('');
const width = ref(0);
const height = ref(0);
const blockedByFirefoxPrivacyResistFingerprinting = ref(false);
const error = ref<Error | null>(null);

const regenerate = async () => {
  loading.value = true;
  imageURL.value = '';
  blockedByFirefoxPrivacyResistFingerprinting.value = true;
  error.value = null;
  try {
    const result = await drawInventory(canvasRef.value!, grid.value);
    imageURL.value = result.url;
    width.value = result.width;
    height.value = result.height;
    blockedByFirefoxPrivacyResistFingerprinting.value = result.blockedByFirefoxPrivacyResistFingerprinting;
    if (await imageIsEmpty(imageURL.value)) {
      error.value = new Error('unknown error occurred, generated canvas is empty');
    }
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(`${err}`);
  }
  loading.value = false;
};

onMounted(regenerate);
watch(grid, regenerate, { deep: true });

async function imageIsEmpty(url: string): Promise<boolean> {
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
  } catch (err) {
    console.log(`failed to load image into HTMLImageElement: ${err}`);
    return false;
  }
  return image.naturalWidth === 0 || image.naturalHeight === 0;
}
</script>
