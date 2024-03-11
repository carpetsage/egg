<template>
    <eggs-laid :backup="backup" />
    <max-chickens :backup="backup" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import {requestFirstContact, UserBackupEmptyError } from 'lib';
import EggsLaid from '@/components/EggsLaid.vue';
import MaxChickens from '@/components/MaxChickens.vue';

export default defineComponent({
  components: {
    EggsLaid,
    MaxChickens
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
