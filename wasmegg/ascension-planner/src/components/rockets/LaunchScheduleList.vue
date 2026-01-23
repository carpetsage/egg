<template>
  <div v-if="launches.length > 0" class="border border-gray-200 rounded-lg">
    <div class="px-3 py-2 bg-gray-50 border-b border-gray-200">
      <p class="text-sm font-medium text-gray-700">Launch Schedule</p>
    </div>
    <div class="max-h-64 overflow-y-auto">
      <div
        v-for="(launch, index) in sortedLaunches"
        :key="launch.id"
        class="px-3 py-2 border-b border-gray-100 last:border-b-0 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <!-- Index -->
        <div class="text-xs text-gray-400 w-6 text-right">#{{ index + 1 }}</div>

        <!-- Ship icon -->
        <img
          :src="getShipIcon(launch.shipType)"
          class="w-8 h-8 flex-shrink-0"
          :alt="getShipName(launch.shipType)"
        />

        <!-- Launch info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700 truncate">
              {{ getShipName(launch.shipType) }}
            </span>
            <span class="text-xs text-gray-500">
              {{ getDurationName(launch.durationType) }}
            </span>
            <span v-if="launch.shipLevel > 0" class="text-yellow-500 text-xs">
              {{ '*'.repeat(launch.shipLevel) }}
            </span>
          </div>
          <div class="text-xs text-gray-500">
            {{ formatDayOffset(launch.launchTimeOffset) }}
            <span class="text-gray-400 mx-1">→</span>
            {{ formatDayOffset(getReturnTime(launch)) }}
          </div>
          <div v-if="launch.targetArtifact" class="text-xs text-purple-500">
            Target: {{ getTargetName(launch.targetArtifact) }}
          </div>
        </div>

        <!-- Stats -->
        <div class="text-right text-xs text-gray-500 flex-shrink-0">
          <div>Cap: {{ getCapacity(launch) }}</div>
          <div>Qual: {{ getQuality(launch).toFixed(2) }}</div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            class="p-1 text-gray-400 hover:text-purple-600 transition-colors"
            title="Edit"
            @click="$emit('edit', launch)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            class="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Remove"
            @click="$emit('remove', launch.id)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue';
import type { ScheduledLaunch, EpicResearchLevels } from '@/types';
import {
  getReturnTimeOffset,
  getLaunchCapacity,
  getLaunchQuality,
  formatDayOffset,
} from '@/lib/missions-virtue';
import { MissionType, spaceshipIconPath, iconURL, getTargetName as getArtifactTargetName } from 'lib';

export default defineComponent({
  props: {
    launches: {
      type: Array as PropType<ScheduledLaunch[]>,
      required: true,
    },
    epicResearch: {
      type: Object as PropType<EpicResearchLevels>,
      required: true,
    },
  },
  emits: ['edit', 'remove'],
  setup(props) {
    const sortedLaunches = computed(() =>
      [...props.launches].sort((a, b) => a.launchTimeOffset - b.launchTimeOffset)
    );

    const getShipIcon = (shipType: number) => {
      return iconURL(spaceshipIconPath(shipType), 64);
    };

    const getShipName = (shipType: number) => {
      const missionType = new MissionType(shipType, 1);
      return missionType.shipName;
    };

    const getDurationName = (durationType: number) => {
      const missionType = new MissionType(1, durationType);
      return missionType.durationTypeName;
    };

    const getReturnTime = (launch: ScheduledLaunch) => {
      return getReturnTimeOffset(launch, props.epicResearch);
    };

    const getCapacity = (launch: ScheduledLaunch) => {
      return getLaunchCapacity(launch, props.epicResearch);
    };

    const getQuality = (launch: ScheduledLaunch) => {
      return getLaunchQuality(launch);
    };

    const getTargetName = (targetArtifact: number) => {
      return getArtifactTargetName(targetArtifact);
    };

    return {
      sortedLaunches,
      getShipIcon,
      getShipName,
      getDurationName,
      getReturnTime,
      getCapacity,
      getQuality,
      getTargetName,
      formatDayOffset,
    };
  },
});
</script>
