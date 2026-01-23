<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Rocket Launches</h3>
      <span class="text-xs text-gray-500">{{ launches.length }} scheduled</span>
    </div>

    <!-- Launch Timeline (always visible, use + buttons to add) -->
    <launch-timeline
      :launches="launches"
      :epic-research="epicResearch"
      :current-time="currentTimeOffset"
      @add-launch="openLaunchEditor(null, $event)"
      @remove="removeLaunch"
      @move="moveLaunch"
    />

    <!-- Launch Schedule List -->
    <launch-schedule-list
      v-if="launches.length > 0"
      :launches="launches"
      :epic-research="epicResearch"
      @edit="openLaunchEditor"
      @remove="removeLaunch"
    />

    <!-- Fuel Summary -->
    <fuel-summary
      v-if="launches.length > 0"
      :launches="launches"
      :tank-state="tankState"
      :epic-research="epicResearch"
    />

    <!-- Launch Editor Modal -->
    <launch-editor
      v-if="showEditor"
      :launch="editingLaunch"
      :suggested-time="suggestedLaunchTime"
      :epic-research="epicResearch"
      :existing-launches="launches"
      @save="saveLaunch"
      @close="closeEditor"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import type { ScheduledLaunch, EpicResearchLevels, VirtueEgg } from '@/types';
import { generateLaunchId } from '@/types';
import {
  getNextAvailableTime,
  recompactSchedule,
  moveLaunchToTime,
} from '@/lib/missions-virtue';
import FuelSummary from './FuelSummary.vue';
import LaunchScheduleList from './LaunchScheduleList.vue';
import LaunchTimeline from './LaunchTimeline.vue';
import LaunchEditor from './LaunchEditor.vue';

export default defineComponent({
  components: {
    FuelSummary,
    LaunchScheduleList,
    LaunchTimeline,
    LaunchEditor,
  },
  props: {
    modelValue: {
      type: Array as PropType<ScheduledLaunch[]>,
      default: () => [],
    },
    tankState: {
      type: Object as PropType<Record<VirtueEgg, number>>,
      required: true,
    },
    epicResearch: {
      type: Object as PropType<EpicResearchLevels>,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const showEditor = ref(false);
    const editingLaunch = ref<ScheduledLaunch | null>(null);
    const suggestedLaunchTime = ref(0);
    const currentTimeOffset = ref(0);

    const launches = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value),
    });

    const openLaunchEditor = (launch: ScheduledLaunch | null, atTime?: number) => {
      editingLaunch.value = launch;
      if (atTime !== undefined) {
        suggestedLaunchTime.value = atTime;
      } else if (!launch) {
        // Find next available time
        suggestedLaunchTime.value = getNextAvailableTime(
          launches.value,
          0,
          props.epicResearch
        );
      } else {
        suggestedLaunchTime.value = launch.launchTimeOffset;
      }
      showEditor.value = true;
    };

    const closeEditor = () => {
      showEditor.value = false;
      editingLaunch.value = null;
    };

    const saveLaunch = (launch: ScheduledLaunch) => {
      const newLaunches = [...launches.value];

      if (editingLaunch.value) {
        // Update existing
        const index = newLaunches.findIndex(l => l.id === editingLaunch.value!.id);
        if (index >= 0) {
          newLaunches[index] = launch;
        }
      } else {
        // Add new with generated ID
        newLaunches.push({
          ...launch,
          id: generateLaunchId(),
        });
      }

      // Sort by launch time
      newLaunches.sort((a, b) => a.launchTimeOffset - b.launchTimeOffset);
      launches.value = newLaunches;
      closeEditor();
    };

    const removeLaunch = (launchId: string) => {
      // Remove the launch and recompact to close gaps
      const remaining = launches.value.filter(l => l.id !== launchId);
      launches.value = recompactSchedule(remaining, props.epicResearch);
    };

    const moveLaunch = (launchId: string, newTimeOffset: number) => {
      launches.value = moveLaunchToTime(
        launches.value,
        launchId,
        newTimeOffset,
        props.epicResearch
      );
    };

    return {
      launches,
      showEditor,
      editingLaunch,
      suggestedLaunchTime,
      currentTimeOffset,
      openLaunchEditor,
      closeEditor,
      saveLaunch,
      removeLaunch,
      moveLaunch,
    };
  },
});
</script>
