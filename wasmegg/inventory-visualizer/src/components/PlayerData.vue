<template>
  <inventory-canvas :inventory="inventory" />
</template>

<script setup lang="ts">
import { Inventory, requestFirstContact, UserBackupEmptyError } from 'lib';

import InventoryCanvas from '@/components/InventoryCanvas.vue';

const props = defineProps({
  playerId: {
    type: String,
    required: true,
  },
});
// Note that data playerId does not respond to changes. Use a new key when
// playerId changes.
/* eslint-disable vue/no-setup-props-destructure */
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
const inventory = new Inventory(artifactsDB);
</script>
