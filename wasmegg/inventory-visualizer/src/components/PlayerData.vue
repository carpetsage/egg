<template>
  <div>
    <div class="w-full max-w-xs mx-auto my-2">
      <label class="flex items-center justify-center text-sm text-gray-700 cursor-pointer">
        <input v-model="showVirtue" type="checkbox" class="mr-2 rounded text-green-600 focus:ring-green-500" />
        <span>Virtue artifacts</span>
      </label>
    </div>
    <inventory-canvas :inventory="inventory" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Inventory, requestFirstContact, UserBackupEmptyError, getLocalStorage, setLocalStorage } from 'lib';

import InventoryCanvas from '@/components/InventoryCanvas.vue';

const props = defineProps({
  playerId: {
    type: String,
    required: true,
  },
});

const SHOW_VIRTUE_LOCALSTORAGE_KEY = 'showVirtue';
const showVirtue = ref(getLocalStorage(SHOW_VIRTUE_LOCALSTORAGE_KEY) === 'true');
watch(showVirtue, () => setLocalStorage(SHOW_VIRTUE_LOCALSTORAGE_KEY, showVirtue.value));

// Note that data playerId does not respond to changes. Use a new key when
// playerId changes.

const { playerId } = props;
const data = await requestFirstContact(playerId);
if (!data.backup || !data.backup.game) {
  throw new UserBackupEmptyError(playerId);
}
const backup = data.backup;
if (!backup.settings) {
  throw new Error(`${playerId}: settings not found in backup`);
}
const artifactsDB = backup.artifactsDb;
if (!artifactsDB) {
  throw new Error(`${playerId}: no artifacts database in backup`);
}
const inventory = computed(() => new Inventory(artifactsDB, { virtue: showVirtue.value }));
</script>
