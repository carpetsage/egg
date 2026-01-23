<template>
  <div class="border border-gray-200 rounded-lg p-3">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium text-gray-700">Timeline</h4>
      <span class="text-xs text-gray-500">{{ maxDay }} days</span>
    </div>

    <!-- Timeline visualization -->
    <div class="relative">
      <!-- Day markers -->
      <div class="flex border-b border-gray-200 mb-1 ml-8 mr-8">
        <div
          v-for="day in dayMarkers"
          :key="day"
          class="flex-1 text-center text-xs text-gray-400 pb-1"
        >
          {{ day }}
        </div>
      </div>

      <!-- Slot rows -->
      <div
        v-for="slot in 3"
        :key="slot"
        class="relative h-8 mb-1 flex items-center"
      >
        <!-- Slot label -->
        <div class="text-xs text-gray-400 w-8 flex-shrink-0">S{{ slot }}</div>

        <!-- Timeline bar area -->
        <div
          ref="timelineRefs"
          class="flex-1 relative h-full bg-gray-50 rounded"
          @mouseup="handleMouseUp"
          @mousemove="handleMouseMove"
          @mouseleave="handleMouseUp"
        >
          <!-- Launch bars -->
          <div
            v-for="launch in getSlotLaunches(slot - 1)"
            :key="launch.id"
            class="absolute h-full rounded cursor-grab group flex items-center justify-center select-none"
            :class="[
              getLaunchBarClass(launch),
              draggingLaunchId === launch.id ? 'opacity-70 cursor-grabbing' : ''
            ]"
            :style="getLaunchBarStyle(launch)"
            :title="getLaunchTooltip(launch)"
            @mousedown.prevent="startDrag($event, launch, slot - 1)"
          >
            <!-- Delete button on hover -->
            <button
              class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/20 hover:bg-red-500 text-white"
              @click.stop="$emit('remove', launch.id)"
              @mousedown.stop
              title="Remove launch"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Add button at end of row -->
        <button
          class="w-8 h-8 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors ml-1"
          :title="getAddButtonTooltip(slot - 1)"
          @click="addLaunchToSlot(slot - 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <!-- Current time marker -->
      <div
        v-if="currentTime > 0"
        class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
        :style="{ left: `calc(${(currentTime / maxTimeOffset) * 100}% + 2rem)` }"
      />
    </div>

    <!-- Legend -->
    <div class="flex gap-4 mt-2 text-xs text-gray-500">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 bg-purple-400 rounded" />
        <span>Henerprise</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 bg-blue-400 rounded" />
        <span>Atreggies</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 bg-gray-400 rounded" />
        <span>Other</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, type PropType } from 'vue';
import type { ScheduledLaunch, EpicResearchLevels } from '@/types';
import {
  getReturnTimeOffset,
  getSlotAssignments,
  formatDayOffset,
} from '@/lib/missions-virtue';
import { MissionType, ei } from 'lib';

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
    currentTime: {
      type: Number,
      default: 0,
    },
  },
  emits: ['add-launch', 'remove', 'move'],
  setup(props, { emit }) {
    const timelineRefs = ref<HTMLElement[]>([]);
    const draggingLaunchId = ref<string | null>(null);
    const dragStartX = ref(0);
    const dragStartTime = ref(0);
    const dragSlot = ref(0);

    const slotAssignments = computed(() =>
      getSlotAssignments(props.launches, props.epicResearch)
    );

    // Find the maximum return time to determine timeline scale
    const maxTimeOffset = computed(() => {
      if (props.launches.length === 0) return 24 * 60 * 60; // Default 1 day
      // Add some padding beyond the last return time
      const maxReturn = Math.max(
        ...props.launches.map(l => getReturnTimeOffset(l, props.epicResearch))
      );
      return maxReturn * 1.1; // 10% padding
    });

    const maxDay = computed(() => Math.ceil(maxTimeOffset.value / (24 * 60 * 60)));

    const dayMarkers = computed(() => {
      const markers: number[] = [];
      for (let i = 0; i <= maxDay.value; i++) {
        markers.push(i);
      }
      return markers;
    });

    const getSlotLaunches = (slotIndex: number): ScheduledLaunch[] => {
      return props.launches.filter(l => slotAssignments.value.get(l.id) === slotIndex);
    };

    const getLaunchBarStyle = (launch: ScheduledLaunch) => {
      const startPercent = (launch.launchTimeOffset / maxTimeOffset.value) * 100;
      const returnTime = getReturnTimeOffset(launch, props.epicResearch);
      const durationPercent = ((returnTime - launch.launchTimeOffset) / maxTimeOffset.value) * 100;

      return {
        left: `${startPercent}%`,
        width: `${Math.max(durationPercent, 2)}%`, // Minimum width for visibility
      };
    };

    const getLaunchBarClass = (launch: ScheduledLaunch) => {
      if (launch.shipType === ei.MissionInfo.Spaceship.HENERPRISE) {
        return 'bg-purple-400';
      }
      if (launch.shipType === ei.MissionInfo.Spaceship.ATREGGIES) {
        return 'bg-blue-400';
      }
      return 'bg-gray-400';
    };

    const getLaunchTooltip = (launch: ScheduledLaunch) => {
      const missionType = new MissionType(launch.shipType, launch.durationType);
      const returnTime = getReturnTimeOffset(launch, props.epicResearch);
      return `${missionType.shipName} - ${formatDayOffset(launch.launchTimeOffset)} to ${formatDayOffset(returnTime)}`;
    };

    const getLastReturnTimeForSlot = (slotIndex: number): number => {
      const slotLaunches = getSlotLaunches(slotIndex);
      if (slotLaunches.length === 0) return 0;
      return Math.max(
        ...slotLaunches.map(l => getReturnTimeOffset(l, props.epicResearch))
      );
    };

    const getAddButtonTooltip = (slotIndex: number) => {
      const lastReturn = getLastReturnTimeForSlot(slotIndex);
      if (lastReturn === 0) {
        return 'Add launch at Day 0';
      }
      return `Add launch at ${formatDayOffset(lastReturn)}`;
    };

    const addLaunchToSlot = (slotIndex: number) => {
      const launchTime = getLastReturnTimeForSlot(slotIndex);
      emit('add-launch', launchTime, slotIndex);
    };

    // Drag handling
    const startDrag = (event: MouseEvent, launch: ScheduledLaunch, slotIndex: number) => {
      draggingLaunchId.value = launch.id;
      dragStartX.value = event.clientX;
      dragStartTime.value = launch.launchTimeOffset;
      dragSlot.value = slotIndex;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!draggingLaunchId.value) return;

      const target = event.currentTarget as HTMLElement;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const deltaX = event.clientX - dragStartX.value;
      const deltaPercent = deltaX / rect.width;
      const deltaTime = deltaPercent * maxTimeOffset.value;

      const newTime = Math.max(0, dragStartTime.value + deltaTime);
      emit('move', draggingLaunchId.value, newTime);
    };

    const handleMouseUp = () => {
      draggingLaunchId.value = null;
    };

    return {
      timelineRefs,
      draggingLaunchId,
      maxTimeOffset,
      maxDay,
      dayMarkers,
      getSlotLaunches,
      getLaunchBarStyle,
      getLaunchBarClass,
      getLaunchTooltip,
      getAddButtonTooltip,
      addLaunchToSlot,
      startDrag,
      handleMouseMove,
      handleMouseUp,
    };
  },
});
</script>
