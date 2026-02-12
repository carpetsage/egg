<template>
  <div
    class="px-4 py-3 flex items-start gap-3"
    :class="isStartAction ? 'bg-blue-50' : 'hover:bg-gray-50'"
  >
    <!-- Index -->
    <span class="text-xs text-gray-400 w-6 pt-1">{{ action.index + 1 }}.</span>

    <!-- Action info -->
    <div class="flex-1 min-w-0 flex items-center gap-2">
      <!-- Action Icon -->
      <div 
        v-if="actionIconPath" 
        class="h-6 flex-shrink-0 bg-white border border-gray-100 p-0.5 shadow-sm overflow-hidden"
        :class="isVehicleAction ? 'w-auto min-w-[1.5rem] rounded-md' : 'w-6 rounded-full'"
      >
        <img
          :src="actionIconPath.startsWith('static/') ? `${baseUrl}${actionIconPath}` : iconURL(actionIconPath, 64)"
          :class="isVehicleAction ? 'h-[14px] w-auto min-w-[2.5rem] object-contain' : 'w-full h-full object-contain'"
          :alt="action.type"
        />
      </div>

      <div class="flex-1 min-w-0">
        <div 
          class="font-medium truncate flex items-center gap-1.5" 
          :class="isStartAction ? 'text-blue-800' : 'text-gray-900'"
        >
          <span v-if="eggType" class="opacity-60 font-normal">
            {{ action.type === 'start_ascension' ? 'Start Ascension:' : 'Shift to' }}
          </span>
          <span :class="{ 'font-bold': eggType }">
            {{ eggName || displayName }}{{ isContinued ? ' (from Backup)' : '' }}
          </span>
        </div>
        <div 
          class="text-[10px] uppercase tracking-wider font-semibold opacity-70" 
          :class="isStartAction ? 'text-blue-600' : 'text-gray-500'"
          v-html="effectDescription"
        >
        </div>
        <!-- Deltas -->
        <div v-if="!isStartAction || isContinued" class="text-[10px] mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-gray-500">
          <span v-if="action.eggValueDelta" :class="deltaClass(action.eggValueDelta)">
            Val: {{ formatDelta(action.eggValueDelta) }}
          </span>
          <span v-if="action.habCapacityDelta" :class="deltaClass(action.habCapacityDelta)">
            Hab: {{ formatDelta(action.habCapacityDelta) }}
          </span>
          <span v-if="action.ihrDelta" :class="deltaClass(action.ihrDelta)">
            IHR: {{ formatDelta(action.ihrDelta) }}
          </span>
          <span v-if="action.layRateDelta" :class="deltaClass(action.layRateDelta)">
            Lay: {{ formatDelta(action.layRateDelta) }}
          </span>
          <span v-if="action.shippingCapacityDelta" :class="deltaClass(action.shippingCapacityDelta)">
            Ship: {{ formatDelta(action.shippingCapacityDelta) }}
          </span>
          <span v-if="action.elrDelta" :class="deltaClass(action.elrDelta)">
            ELR: {{ formatDelta(action.elrDelta) }}
          </span>
          <span v-if="action.offlineEarningsDelta" :class="deltaClass(action.offlineEarningsDelta)">
            gems/s: {{ formatDelta(action.offlineEarningsDelta) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Cost, time to save, and deltas (hidden for start_ascension) -->
    <div v-if="!isStartAction" class="text-right shrink-0">
      <div class="flex items-baseline justify-end gap-1.5">
        <template v-if="action.type === 'shift'">
          <span class="text-sm font-mono text-purple-600">
            {{ formatNumber(action.cost, 3) }}
          </span>
          <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-4 h-4" alt="SE" />
        </template>
        <template v-else>
          <span class="text-sm font-mono text-amber-600">
            {{ formatNumber(action.cost, 0) }}
          </span>
          <span class="text-xs text-gray-400" :title="timeToSaveTitle">
            ({{ timeToSaveFormatted }})
          </span>
        </template>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex items-center gap-1 shrink-0">
      <!-- Details button -->
      <button
        class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
        title="View calculation details"
        @click="$emit('show-details')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <!-- Undo button (hidden for start_ascension) -->
      <button
        v-if="!isStartAction"
        class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
        title="Undo this action"
        @click="handleUndo"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { iconURL } from 'lib';
import type { Action, StartAscensionPayload, ShiftPayload, BuyHabPayload, BuyVehiclePayload, StoreFuelPayload, WaitForTEPayload, BuyResearchPayload, ToggleSalePayload, EquipArtifactSetPayload, UpdateArtifactSetPayload } from '@/types';
import { VIRTUE_EGG_NAMES } from '@/types';
import { getHabById } from '@/lib/habs';
import { getVehicleType } from '@/lib/vehicles';
import { getExecutor } from '@/lib/actions';
import { formatNumber } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { getResearchById } from '@/calculations/commonResearch';

const props = defineProps<{
  action: Action;
  previousOfflineEarnings: number;
}>();

const emit = defineEmits<{
  'show-details': [];
  'undo': [options: { skipConfirmation: boolean }];
}>();

const isStartAction = computed(() => props.action.type === 'start_ascension');
const isContinued = computed(() => {
  if (props.action.type !== 'start_ascension') return false;
  const payload = props.action.payload as StartAscensionPayload;
  return !!payload.initialFarmState;
});

const baseUrl = import.meta.env.BASE_URL;

const isVehicleAction = computed(() => 
  props.action.type === 'buy_vehicle' || props.action.type === 'buy_train_car'
);

const eggType = computed(() => {
  if (props.action.type === 'start_ascension') {
    return (props.action.payload as StartAscensionPayload).initialEgg;
  }
  if (props.action.type === 'shift') {
    return (props.action.payload as ShiftPayload).toEgg;
  }
  return null;
});

const actionIconPath = computed(() => {
  if (eggType.value) {
    return `egginc/egg_${eggType.value}.png`;
  }
  if (props.action.type === 'buy_hab') {
    const payload = props.action.payload as BuyHabPayload;
    return getHabById(payload.habId as any)?.iconPath;
  }
  if (props.action.type === 'buy_vehicle') {
    const payload = props.action.payload as BuyVehiclePayload;
    return getVehicleType(payload.vehicleId)?.iconPath;
  }
  if (props.action.type === 'buy_research') {
    const payload = props.action.payload as BuyResearchPayload;
    return getColleggtibleIconPath(payload.researchId);
  }
  if (props.action.type === 'buy_train_car') {
    return 'egginc/ei_vehicle_icon_hyperloop_engine.png';
  }
  if (props.action.type === 'buy_silo') {
    return 'static/img/silo.png';
  }
  if (props.action.type === 'store_fuel') {
    const payload = props.action.payload as StoreFuelPayload;
    return `egginc/egg_${payload.egg}.png`;
  }
  if (props.action.type === 'wait_for_te') {
    // Show truth egg icon for wait_for_te actions
    return 'egginc/egg_truth.png';
  }
  if (props.action.type === 'toggle_sale') {
    const payload = props.action.payload as ToggleSalePayload;
    switch (payload.saleType) {
      case 'research': return 'egginc-extras/icon_research_sale.png';
      case 'hab': return 'egginc-extras/icon_hab_sale.png';
      case 'vehicle': return 'egginc-extras/icon_vehicle_sale.png';
    }
  }
  if (props.action.type === 'equip_artifact_set' || props.action.type === 'update_artifact_set') {
    const payload = props.action.payload as (EquipArtifactSetPayload | UpdateArtifactSetPayload);
    return payload.setName === 'elr' ? 'egginc/afx_quantum_metronome_4.png' : 'egginc/afx_lunar_totem_4.png';
  }
  return null;
});

const eggName = computed(() => {
  if (eggType.value) {
    return VIRTUE_EGG_NAMES[eggType.value];
  }
  return null;
});

const displayName = computed(() => {
  const executor = getExecutor(props.action.type);
  return executor.getDisplayName(props.action.payload);
});

const effectDescription = computed(() => {
  if (props.action.type === 'buy_research') {
    const payload = props.action.payload as BuyResearchPayload;
    const research = getResearchById(payload.researchId);
    if (research) {
      return research.description;
    }
  }
  const executor = getExecutor(props.action.type);
  return executor.getEffectDescription(props.action.payload);
});

/**
 * Calculate time to save in seconds based on cost and previous offline earnings rate.
 */
const timeToSaveSeconds = computed(() => {
  if (props.action.cost <= 0 || props.previousOfflineEarnings <= 0) {
    return 0;
  }
  return props.action.cost / props.previousOfflineEarnings;
});

/**
 * Format the time to save duration.
 * Rules:
 * - Less than 1 minute: "<1m"
 * - Less than 1 day: "Xh Ym" (e.g., "2h12m")
 * - 1+ days: "Xd Yh" (e.g., "1d4h", no minutes)
 */
const timeToSaveFormatted = computed(() => {
  const totalSeconds = timeToSaveSeconds.value;

  if (totalSeconds <= 0) {
    return 'free';
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const minutes = totalMinutes % 60;
  const hours = totalHours % 24;

  if (totalMinutes < 1) {
    return '<1m';
  }

  if (totalDays === 0) {
    // Less than a day: show hours and minutes
    if (totalHours === 0) {
      return `${minutes}m`;
    }
    return `${totalHours}h${minutes}m`;
  }

  // 1+ days: show days and hours, no minutes
  if (totalDays > 999) {
    return '>999d';
  }
  if (hours === 0) {
    return `${totalDays}d`;
  }
  return `${totalDays}d${hours}h`;
});

/**
 * Detailed title for hover tooltip.
 */
const timeToSaveTitle = computed(() => {
  const totalSeconds = timeToSaveSeconds.value;
  if (totalSeconds <= 0) {
    return 'Free action';
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const minutes = totalMinutes % 60;
  const hours = totalHours % 24;

  const parts: string[] = [];
  if (totalDays > 0) parts.push(`${totalDays} day${totalDays !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0 && totalDays === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

  return `Time to save: ${parts.join(', ')}`;
});

function deltaClass(delta: number): string {
  if (delta > 0) return 'text-green-600';
  if (delta < 0) return 'text-red-600';
  return 'text-gray-400';
}

function formatDelta(delta: number): string {
  if (delta === 0) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatNumber(delta, 2)}`;
}

function handleUndo(event: MouseEvent) {
  emit('undo', { skipConfirmation: event.shiftKey });
}
</script>
