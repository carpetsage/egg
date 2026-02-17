<template>
  <div v-if="missions.length > 0" class="space-y-3">
    <div class="flex items-center justify-between px-1">
      <h3 class="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
        Active Virtue Missions
      </h3>
      <span class="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
        {{ missions.filter(m => !m.statusIsFueling).length }} In-flight
        <template v-if="missions.some(m => m.statusIsFueling)">
          + {{ missions.filter(m => m.statusIsFueling).length }} Fueling
        </template>
      </span>
    </div>

    <div class="grid grid-cols-1 gap-3">
      <div
        v-for="(mission, index) in missions"
        :key="index"
        class="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center gap-4 relative overflow-hidden"
      >
        <!-- Ship Icon -->
        <div class="relative w-12 h-12 flex-shrink-0">
          <img
            :src="iconURL(mission.shipIconPath, 128)"
            class="w-full h-full object-contain relative z-10"
            :alt="mission.shipName"
          />
          <div class="absolute inset-0 bg-blue-50 rounded-full scale-110 opacity-50"></div>
          
          <!-- Virtue Badge -->
          <div class="absolute -top-1 -right-1 z-20">
            <img :src="iconURL('egginc/icon_virtue_gem.png', 64)" class="w-4 h-4 shadow-sm" />
          </div>
        </div>

        <!-- Mission Details -->
        <div class="flex-grow min-w-0">
          <div class="flex items-center justify-between mb-0.5">
            <h4 class="text-sm font-bold text-gray-900 truncate">{{ mission.shipName }}</h4>
            <span 
              class="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase"
              :class="getDurationClass(mission.duration)"
            >
              {{ mission.durationTypeName }}
            </span>
          </div>

          <div class="flex items-center gap-3 text-[11px] text-gray-500 font-medium">
            <div class="flex items-center gap-1">
              <span class="text-gray-400">Target:</span>
              <span class="text-gray-700">{{ mission.sensorTarget || 'None' }}</span>
            </div>
            <div class="w-px h-2 bg-gray-200"></div>
            <div class="flex items-center gap-1">
              <span class="text-gray-400">Capacity:</span>
              <span class="text-gray-700">{{ mission.capacity }}</span>
            </div>
          </div>

          <!-- Status & Countdown -->
          <div class="mt-2 flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
            <div class="flex items-center gap-1.5">
              <div 
                class="w-1.5 h-1.5 rounded-full animate-pulse"
                :class="mission.statusIsFueling ? 'bg-orange-500' : 'bg-green-500'"
              ></div>
              <span class="text-[11px] font-bold" :class="mission.statusIsFueling ? 'text-orange-600' : 'text-green-600'">
                {{ mission.statusName }}
              </span>
              <div v-if="mission.statusIsFueling" class="flex items-center gap-0.5 ml-1">
                <img
                  v-for="fuel in mission.fuels"
                  :key="fuel.egg"
                  :src="iconURL(fuel.eggIconPath, 64)"
                  class="w-3.5 h-3.5"
                />
              </div>
            </div>
            
            <div v-if="mission.returnTimestamp" class="text-[11px] font-mono font-bold text-blue-600 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ formatRemaining(mission.returnTimestamp) }}
            </div>
          </div>
        </div>

        <!-- Progress background (subtle) -->
        <div 
          v-if="!mission.statusIsFueling && mission.returnTimestamp"
          class="absolute bottom-0 left-0 h-0.5 bg-blue-500 opacity-20 transition-all duration-1000"
          :style="{ width: getProgressWidth(mission) }"
        ></div>
      </div>
    </div>

    <!-- Wait Action Button -->
    <div class="pt-2 px-1">
      <button
        @click="$emit('wait-missions')"
        class="w-full group relative flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:grayscale pointer-events-auto"
        :disabled="isWaitDisabled"
      >
        <div class="flex flex-col items-center">
          <span class="text-sm font-bold flex items-center gap-2">
            <svg class="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Wait for In-flight Missions
          </span>
          <span class="text-[10px] font-medium opacity-80" v-if="maxWaitSeconds > 0">
            Passes {{ formatDuration(maxWaitSeconds) }} in-simulation time
          </span>
        </div>
      </button>
      <p class="mt-2 text-[10px] text-gray-500 text-center italic">
        Adds a no-cost action to account for the duration of the ship that takes the longest to return.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { iconURL } from 'lib';
import type { ActiveMissionInfo } from '@/types';

const props = defineProps<{
  missions: ActiveMissionInfo[];
  currentTimeSeconds: number;
  startUnix: number;
}>();

defineEmits<{
  'wait-missions': [];
}>();

const maxWaitSeconds = computed(() => {
  if (props.missions.length === 0) return 0;
  const maxReturn = Math.max(...props.missions.map(m => m.returnTimestamp || 0));
  const remaining = (maxReturn - props.startUnix) - props.currentTimeSeconds;
  return Math.max(0, remaining);
});

const isWaitDisabled = computed(() => {
  return props.missions.length === 0 || maxWaitSeconds.value <= 10;
});

function getDurationClass(duration: number) {
  switch (duration) {
    case 1: return 'bg-blue-100 text-blue-700'; // Short
    case 2: return 'bg-purple-100 text-purple-700'; // Standard/Long
    case 3: return 'bg-amber-100 text-amber-700'; // Extended/Epic
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getProgressWidth(mission: ActiveMissionInfo) {
  // We don't have mission start time here easily, so this is just a placeholder logic
  // if we wanted a real progress bar. For now, since it's just display, we'll keep it simple
  // or omit it if it's too complex without more data.
  return '100%';
}

function formatRemaining(returnTimestamp: number): string {
  const remaining = (returnTimestamp - props.startUnix) - props.currentTimeSeconds;
  return formatDuration(Math.max(0, Math.floor(remaining)));
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  
  return parts.join(' ');
}
</script>
