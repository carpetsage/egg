<template>
  <player-card :backup="backup" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import {requestFirstContact, UserBackupEmptyError } from 'lib';
import PlayerCard from '@/components/PlayerCard.vue';

export default defineComponent({
  components: {
    PlayerCard
  },
  props: {
    playerId: {
      type: String,
      required: true,
    }
  },
  // This async component does not respond to playerId changes.
  /* eslint-disable vue/no-setup-props-destructure */
  async setup({ playerId }) {
    const data = await requestFirstContact(playerId);
    if (!data.backup || !data.backup.game) {
      throw new UserBackupEmptyError(playerId);
    }
    const backup = data.backup;
    if (!backup.settings) {
      throw new Error(`${playerId}: settings not found in backup`);
    }
    return {
      backup
    };
  },
});
</script>
