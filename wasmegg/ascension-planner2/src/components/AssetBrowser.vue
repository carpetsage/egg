<template>
  <div class="fixed right-0 top-0 h-full z-50">
    <!-- Toggle button -->
    <button
      class="absolute top-4 right-0 bg-gray-800 text-white px-2 py-4 rounded-l-lg text-xs"
      :class="{ 'right-80': isOpen }"
      @click="isOpen = !isOpen"
    >
      {{ isOpen ? '→' : '← Assets' }}
    </button>

    <!-- Sidebar panel -->
    <div
      v-show="isOpen"
      class="w-80 h-full bg-white border-l border-gray-300 shadow-lg overflow-y-auto"
    >
      <div class="p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">Asset Browser</h2>
          <button @click="isOpen = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-gray-500 mb-4">Click any asset to copy its iconURL code.</p>

        <!-- Search -->
        <input
          v-model="search"
          type="text"
          placeholder="Search assets..."
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <!-- Asset categories -->
        <div v-for="category in filteredCategories" :key="category.name" class="mb-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">
            {{ category.name }}
          </h3>
          <div class="grid grid-cols-4 gap-2">
            <div
              v-for="asset in category.assets"
              :key="asset.path"
              class="relative group cursor-pointer"
              @click="copyAsset(asset)"
            >
              <div class="aspect-square bg-gray-50 rounded p-1 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200">
                <img
                  :src="iconURL(asset.path, 64)"
                  :alt="asset.name"
                  class="w-full h-full object-contain"
                />
              </div>
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                {{ asset.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- Copied notification -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform translate-y-2 opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform translate-y-0 opacity-100"
          leave-to-class="transform translate-y-2 opacity-0"
        >
          <div
            v-if="copiedAsset"
            class="fixed bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-xl text-sm z-50 flex items-center gap-2"
          >
            <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Copied: {{ copiedAsset }}
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { iconURL } from 'lib';
import { ASSET_CATEGORIES, type Asset } from '@/lib/assets';

const isOpen = ref(false);
const search = ref('');
const copiedAsset = ref<string | null>(null);

const filteredCategories = computed(() => {
  if (!search.value) return ASSET_CATEGORIES;

  const query = search.value.toLowerCase();
  return ASSET_CATEGORIES.map(cat => ({
    ...cat,
    assets: cat.assets.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.path.toLowerCase().includes(query)
    ),
  })).filter(cat => cat.assets.length > 0);
});

const copyAsset = async (asset: Asset) => {
  const code = `iconURL('${asset.path}', 64)`;
  await navigator.clipboard.writeText(code);
  copiedAsset.value = asset.name;
  setTimeout(() => {
    copiedAsset.value = null;
  }, 2000);
};
</script>
