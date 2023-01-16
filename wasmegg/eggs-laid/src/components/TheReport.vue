<template>
  <player-card :backup="backup" :eggTotals="eggTotals" />
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue';
import { Emitter } from 'mitt';

import {requestFirstContact, UserBackupEmptyError } from 'lib';
import {getUserContractList, UserContract } from '@/contracts';
import PlayerCard from '@/components/PlayerCard.vue';

export default defineComponent({
  components: {
    PlayerCard
  },
  props: {
    playerId: {
      type: String,
      required: true,
    },
    eventBus: {
      type: Object as PropType<Emitter>,
      required: true,
    },
  },
  // This async component does not respond to playerId changes.
  /* eslint-disable vue/no-setup-props-destructure */
  async setup({ playerId, eventBus }) {
    const data = await requestFirstContact(playerId);
    if (!data.backup || !data.backup.game) {
      throw new UserBackupEmptyError(playerId);
    }
    const backup = data.backup;
    const progress = data.backup.game;
    if (!backup.settings) {
      throw new Error(`${playerId}: settings not found in backup`);
    }
    const contracts = getUserContractList(backup);
    const eggTotals: number[] = backup.value.stats?.eggTotals || [];
    [100, 101, 102, 103, 104, 105].forEach(egg => {
      eggTotals.push(eggsLaid(contracts.filter(c => c.egg == egg)));
    });

    return {
      backup,
      progress,
      eggTotals
    };
  },
});
</script>
