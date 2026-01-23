<template>
  <div>
    <!-- Player info summary -->
    <div class="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
      <p class="font-medium">{{ nickname }}</p>
      <p class="text-gray-600">
        Last synced:
        <span class="whitespace-nowrap">{{ lastRefreshedRelative }}</span>
      </p>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <p>
          <img :src="iconURL('egginc/egg_soul.png', 64)" class="inline h-4 w-4" />
          {{ formatEIValue(soulEggs) }} SE
        </p>
        <p>
          <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-4 w-4" />
          {{ truthEggs }} TE
        </p>
        <p>Total Shifts: {{ totalShifts }}</p>
        <p>Next Shift: {{ formatEIValue(nextShiftCost) }} SE</p>
      </div>
      <div class="grid grid-cols-5 gap-2 mt-3 text-center text-xs">
        <div v-for="egg in virtueEggData" :key="egg.type">
          <img :src="iconURL(egg.iconPath, 64)" class="h-6 w-6 mx-auto" />
          <p class="text-gray-500">{{ formatEIValue(egg.laid) }}</p>
        </div>
      </div>
    </div>

    <!-- Step chain with loaded data -->
    <step-chain :initial-data="initialData" />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import {
  iconURL,
  requestFirstContact,
  formatEIValue,
  getNumSoulEggs,
  getNumTruthEggs,
  calculateClothedTE,
  allModifiersFromColleggtibles,
  nextShiftCost as calculateNextShiftCost,
} from '@/lib';
import StepChain from '@/components/StepChain.vue';

dayjs.extend(relativeTime);

export default defineComponent({
  components: {
    StepChain,
  },
  props: {
    playerId: {
      type: String,
      required: true,
    },
  },
  async setup(props) {
    const data = await requestFirstContact(props.playerId);
    const backup = data.backup!;

    console.log('Player data:', backup);

    const nickname = backup.userName || props.playerId;
    const lastRefreshed = dayjs(backup.settings!.lastBackupTime! * 1000);
    const lastRefreshedRelative = computed(() => lastRefreshed.fromNow());

    // Soul eggs and truth eggs using lib functions
    const soulEggs = getNumSoulEggs(backup);
    const truthEggs = getNumTruthEggs(backup);
    const clothedTruthEggs = calculateClothedTE(backup);
    const modifiers = allModifiersFromColleggtibles(backup);

    // Shifts info from virtue data
    const totalShifts = backup.virtue?.shiftCount || 0;
    const totalResets = backup.virtue?.resets || 0;

    // Next shift cost using lib function
    const nextShiftCostValue = calculateNextShiftCost(backup);

    // Virtue eggs delivered (laid) - array order: Curiosity, Integrity, Humility, Resilience, Kindness
    const eggsDelivered = backup.virtue?.eggsDelivered || [0, 0, 0, 0, 0];

    // Helper to get epic research level
    const getEpicResearchLevel = (id: string): number =>
      backup.game?.epicResearch?.find(r => r.id === id)?.level || 0;

    // Epic research levels relevant to virtue planning
    const epicResearch = {
      siloCapacity: getEpicResearchLevel('silo_capacity'),
      cheaperContractors: getEpicResearchLevel('cheaper_contractors'),
      bustUnions: getEpicResearchLevel('bust_unions'),
      transportationLobbyist: getEpicResearchLevel('transportation_lobbyist'),
      labUpgrade: getEpicResearchLevel('cheaper_research'),
      afxMissionTime: getEpicResearchLevel('afx_mission_time'),       // FTL Drive (max 60)
      afxMissionCapacity: getEpicResearchLevel('afx_mission_capacity'), // Zero-g Quantum (max 10)
    };

    // Virtue eggs laid data for display
    const virtueEggData = [
      {
        type: 'curiosity',
        iconPath: 'egginc/egg_curiosity.png',
        laid: eggsDelivered[0] || 0,
      },
      {
        type: 'integrity',
        iconPath: 'egginc/egg_integrity.png',
        laid: eggsDelivered[1] || 0,
      },
      {
        type: 'kindness',
        iconPath: 'egginc/egg_kindness.png',
        laid: eggsDelivered[4] || 0, // Kindness is index 4
      },
      {
        type: 'humility',
        iconPath: 'egginc/egg_humility.png',
        laid: eggsDelivered[2] || 0, // Humility is index 2
      },
      {
        type: 'resilience',
        iconPath: 'egginc/egg_resilience.png',
        laid: eggsDelivered[3] || 0, // Resilience is index 3
      },
    ];

    // Initial data to pass to StepChain
    const initialData = {
      soulEggs,
      truthEggs,
      totalShifts,
      totalResets,
      virtueEggsLaid: {
        curiosity: eggsDelivered[0] || 0,
        integrity: eggsDelivered[1] || 0,
        humility: eggsDelivered[2] || 0,
        resilience: eggsDelivered[3] || 0,
        kindness: eggsDelivered[4] || 0,
      },
      clothedTruthEggs,
      artifacts: [null, null, null, null], // Default empty loadout
      modifiers,
      epicResearch,
    };

    return {
      nickname,
      lastRefreshedRelative,
      soulEggs,
      truthEggs,
      totalShifts,
      nextShiftCost: nextShiftCostValue,
      virtueEggData,
      initialData,
      iconURL,
      formatEIValue,
    };
  },
});
</script>
