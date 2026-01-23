<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-sm m-4">
      <!-- Header -->
      <div class="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-sm font-medium text-gray-900">
          {{ launch ? 'Edit Launch' : 'Add Launch' }}
        </h3>
        <button
          class="text-gray-400 hover:text-gray-600 transition-colors"
          @click="$emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-3 space-y-3">
        <!-- Ship Selection -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Ship</label>
          <ship-picker v-model="selectedShipType" />
        </div>

        <!-- Duration Selection -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Duration</label>
          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="dur in durationTypes"
              :key="dur.durationType"
              class="px-2 py-1.5 rounded text-xs transition-colors"
              :class="
                selectedDurationType === dur.durationType
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              "
              @click="selectedDurationType = dur.durationType"
            >
              {{ dur.name }}
            </button>
          </div>
        </div>

        <!-- Mission Preview (compact) -->
        <div class="bg-gray-50 rounded p-2 text-xs">
          <div class="flex justify-between gap-2">
            <span class="text-gray-500">Duration: <span class="font-medium text-gray-700">{{ formattedDuration }}</span></span>
            <span class="text-gray-500">Cap: <span class="font-medium text-gray-700">{{ previewCapacity }}</span></span>
            <span class="text-gray-500">Qual: <span class="font-medium text-gray-700">{{ previewQuality.toFixed(1) }}</span></span>
          </div>
          <div class="flex gap-1 mt-1">
            <span
              v-for="(amount, egg) in fuelRequirements"
              :key="egg"
              class="px-1.5 py-0.5 rounded text-xs"
              :class="fuelEggClass(egg as string)"
            >
              {{ (egg as string).charAt(0).toUpperCase() }}: {{ formatFuel(amount) }}
            </span>
          </div>
        </div>

        <!-- Target Selection (for FTL ships) - at bottom -->
        <div v-if="showTargetPicker">
          <label class="block text-xs font-medium text-gray-700 mb-1">Sensor Target</label>
          <target-picker v-model="selectedTarget" />
        </div>
      </div>

      <!-- Footer -->
      <div class="px-3 py-2 border-t border-gray-200 flex justify-end gap-2">
        <button
          class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          class="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-xs"
          @click="saveLaunch"
        >
          {{ launch ? 'Update' : 'Add' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, type PropType } from 'vue';
import type { ScheduledLaunch, EpicResearchLevels } from '@/types';
import {
  getAvailableDurationTypes,
  isFTLShip,
  getMaxShipLevel,
  getReturnTimeOffset,
  getLaunchCapacity,
  getLaunchQuality,
  getVirtueFuelRequirements,
  formatLaunchDuration,
} from '@/lib/missions-virtue';
import { MissionType, formatEIValue, ei } from 'lib';
import ShipPicker from './ShipPicker.vue';
import TargetPicker from './TargetPicker.vue';

export default defineComponent({
  components: {
    ShipPicker,
    TargetPicker,
  },
  props: {
    launch: {
      type: Object as PropType<ScheduledLaunch | null>,
      default: null,
    },
    suggestedTime: {
      type: Number,
      default: 0,
    },
    epicResearch: {
      type: Object as PropType<EpicResearchLevels>,
      required: true,
    },
    existingLaunches: {
      type: Array as PropType<ScheduledLaunch[]>,
      default: () => [],
    },
  },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    // Form state - use max level by default since users can't change stars
    const selectedShipType = ref(props.launch?.shipType ?? ei.MissionInfo.Spaceship.HENERPRISE);
    const selectedDurationType = ref(props.launch?.durationType ?? ei.MissionInfo.DurationType.EPIC);
    const selectedTarget = ref<number | undefined>(props.launch?.targetArtifact);

    // Get max level for the ship (users can't change this)
    const selectedShipLevel = computed(() => getMaxShipLevel(selectedShipType.value));

    // Duration types
    const durationTypes = computed(() => getAvailableDurationTypes());

    // Clear target if not FTL when ship changes
    watch(selectedShipType, () => {
      if (!isFTLShip(selectedShipType.value)) {
        selectedTarget.value = undefined;
      }
    });

    // Show target picker for FTL ships
    const showTargetPicker = computed(() => isFTLShip(selectedShipType.value));

    // Use suggested time directly
    const launchTimeOffset = computed(() => props.suggestedTime);

    // Create preview launch object
    const previewLaunch = computed<ScheduledLaunch>(() => ({
      id: props.launch?.id ?? '',
      shipType: selectedShipType.value,
      durationType: selectedDurationType.value,
      shipLevel: selectedShipLevel.value,
      targetArtifact: selectedTarget.value,
      launchTimeOffset: launchTimeOffset.value,
    }));

    const previewCapacity = computed(() =>
      getLaunchCapacity(previewLaunch.value, props.epicResearch)
    );

    const previewQuality = computed(() =>
      getLaunchQuality(previewLaunch.value)
    );

    const fuelRequirements = computed(() =>
      getVirtueFuelRequirements(previewLaunch.value)
    );

    const formattedDuration = computed(() => {
      const missionType = new MissionType(selectedShipType.value, selectedDurationType.value);
      const durationSeconds = missionType.boostedDurationSecondsAtLevel(props.epicResearch.afxMissionTime);
      return formatLaunchDuration(durationSeconds);
    });

    const formatFuel = (amount: number | undefined) => formatEIValue(amount ?? 0, { trim: true });

    const fuelEggClass = (egg: string) => {
      const classes: Record<string, string> = {
        curiosity: 'bg-blue-100 text-blue-700',
        integrity: 'bg-green-100 text-green-700',
        kindness: 'bg-pink-100 text-pink-700',
        humility: 'bg-purple-100 text-purple-700',
        resilience: 'bg-orange-100 text-orange-700',
      };
      return classes[egg] || 'bg-gray-100 text-gray-700';
    };

    const saveLaunch = () => {
      emit('save', previewLaunch.value);
    };

    return {
      selectedShipType,
      selectedDurationType,
      selectedTarget,
      durationTypes,
      showTargetPicker,
      previewCapacity,
      previewQuality,
      fuelRequirements,
      formattedDuration,
      formatFuel,
      fuelEggClass,
      saveLaunch,
    };
  },
});
</script>
