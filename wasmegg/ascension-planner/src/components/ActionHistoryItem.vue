<template>
  <div
    class="px-5 py-4 flex items-start gap-4 transition-colors"
    :class="isStartAction ? 'bg-slate-50/80 border-l-4 border-brand-primary' : 'hover:bg-slate-50/50'"
  >
    <!-- Index -->
    <span class="text-[9px] font-black text-slate-300 w-6 pt-1">{{ action.index + 1 }}</span>

    <!-- Action info -->
    <div class="flex-1 min-w-0 flex items-center gap-3">
      <!-- Action Icon -->
      <div 
        v-if="actionIconPath" 
        class="h-8 flex-shrink-0 border border-slate-100 p-1 shadow-inner overflow-hidden"
        :class="[
          isVehicleAction ? 'w-auto min-w-[2rem] rounded-xl' : 'w-8 rounded-full',
          isMissionAction ? 'bg-slate-900 shadow-lg' : 'bg-white shadow-sm'
        ]"
      >
        <img
          :src="actionIconPath.startsWith('static/') ? `${baseUrl}${actionIconPath}` : iconURL(actionIconPath, 64)"
          :class="isVehicleAction ? 'h-[9px] w-auto min-w-[3rem] object-contain' : 'w-full h-full object-contain'"
          :alt="action.type"
        />
      </div>

      <div class="flex-1 min-w-0">
        <div 
          class="text-sm font-bold truncate flex items-center gap-1.5" 
          :class="isStartAction ? 'text-slate-800' : 'text-slate-700'"
        >
          <span v-if="eggType" class="text-[9px] uppercase font-black text-slate-400 tracking-widest">
            {{ action.type === 'start_ascension' ? 'Start:' : 'Egg:' }}
          </span>
          <span :class="{ 'text-slate-900': eggType }">
            {{ eggName || displayName }}{{ isContinued ? ' (continued)' : '' }}
          </span>
        </div>
        <div 
          class="text-[9px] uppercase tracking-widest font-black opacity-60 text-slate-500" 
          v-html="effectDescription"
        >
        </div>
        <!-- Deltas -->
        <div v-if="!isStartAction || isContinued" class="text-[8px] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-black uppercase tracking-wider">
          <span v-if="action.eggValueDelta" :class="deltaClass(action.eggValueDelta)">
            Val {{ formatDelta(action.eggValueDelta) }}
          </span>
          <span v-if="action.habCapacityDelta" :class="deltaClass(action.habCapacityDelta)">
            Hab {{ formatDelta(action.habCapacityDelta) }}
          </span>
          <span v-if="action.ihrDelta" :class="deltaClass(action.ihrDelta)">
            IHR {{ formatDelta(action.ihrDelta) }}
          </span>
          <span v-if="action.layRateDelta" :class="deltaClass(action.layRateDelta)">
            Lay {{ formatDelta(action.layRateDelta) }}
          </span>
          <span v-if="action.shippingCapacityDelta" :class="deltaClass(action.shippingCapacityDelta)">
            Ship {{ formatDelta(action.shippingCapacityDelta) }}
          </span>
          <span v-if="action.elrDelta" :class="deltaClass(action.elrDelta)">
            ELR {{ formatDelta(action.elrDelta) }}
          </span>
          <span v-if="action.offlineEarningsDelta" :class="deltaClass(action.offlineEarningsDelta)">
             Earn {{ formatDelta(action.offlineEarningsDelta) }}
          </span>
          <span v-if="action.populationDelta" :class="deltaClass(action.populationDelta)">
            Pop {{ formatDelta(action.populationDelta) }}
          </span>
          <span v-if="Math.abs(action.bankDelta) >= 0.5 && (!isPurchaseAction || action.type === 'launch_missions')" :class="action.bankDelta >= 0.5 ? 'text-emerald-600' : 'text-slate-400'">
             Gems {{ action.bankDelta >= 0.5 ? '+' : '' }}{{ formatGemPrice(action.bankDelta) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Cost, time to save, and deltas (hidden for start_ascension) -->
    <div v-if="!isStartAction" class="text-right shrink-0">
      <div class="flex flex-col items-end gap-0.5">
        <template v-if="action.type === 'shift'">
          <div class="flex items-center gap-1">
            <span class="text-xs font-bold text-slate-700 font-mono-premium">
              {{ formatNumber(action.cost, 3) }}
            </span>
            <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3 h-3" alt="SE" />
          </div>
        </template>
        <template v-else>
          <div class="flex items-center gap-0.5">
            <span 
              class="text-xs font-bold font-mono-premium"
              :class="[
                action.cost >= 0.5 ? 'text-slate-800' : 
                (action.bankDelta >= 0.5 ? 'text-emerald-600 font-black' : 'text-slate-300')
              ]"
            >
              {{ action.bankDelta >= 0.5 && action.cost < 0.5 ? '+' : '' }}{{ formatGemPrice(action.cost >= 0.5 ? action.cost : (action.bankDelta >= 0.5 ? action.bankDelta : 0)) }}
            </span>
            <img v-if="action.cost >= 0.5 || action.bankDelta >= 0.5" :src="iconURL('egginc/icon_virtue_gem.png', 64)" class="w-2.5 h-2.5 opacity-60" />
          </div>
          <div class="flex flex-col items-end">
            <span v-if="savingDuration > 0 || (isPurchaseAction && action.cost > 0)" class="text-[8px] font-black text-rose-500 uppercase tracking-widest" v-tippy="timeToSaveTitle">
              Save {{ savingDurationFormatted }}
            </span>
            <span v-if="waitDuration > 0" class="text-[8px] font-black text-slate-400 uppercase tracking-widest" v-tippy="timeToSaveTitle">
              Wait {{ waitDurationFormatted }}
            </span>
            <span v-if="action.totalTimeSeconds < 1 && action.cost < 0.5 && Math.abs(action.bankDelta) < 0.5" class="text-[8px] font-black text-slate-300 uppercase tracking-widest">
              0s
            </span>
          </div>
        </template>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex items-center gap-1 shrink-0">
      <!-- Details button -->
      <button
        class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
        v-tippy="'View calculation details'"
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
        v-tippy="'Undo this action'"
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
import type { Action, StartAscensionPayload, ShiftPayload, BuyHabPayload, BuyVehiclePayload, StoreFuelPayload, WaitForTEPayload, BuyResearchPayload, ToggleSalePayload, EquipArtifactSetPayload, UpdateArtifactSetPayload, WaitForFullHabsPayload } from '@/types';
import { VIRTUE_EGG_NAMES } from '@/types';
import { getHabById } from '@/lib/habs';
import { getVehicleType } from '@/lib/vehicles';
import { getExecutor } from '@/lib/actions';
import { formatNumber, formatGemPrice, formatDuration } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { getResearchById } from '@/calculations/commonResearch';
import { useActionsStore } from '@/stores/actions';
import { useVirtueStore } from '@/stores/virtue';

const props = defineProps<{
  action: Action;
}>();

const emit = defineEmits<{
  'show-details': [];
  'undo': [options: { skipConfirmation: boolean }];
}>();

const actionsStore = useActionsStore();
const virtueStore = useVirtueStore();

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

const isMissionAction = computed(() => 
  props.action.type === 'wait_for_missions' || props.action.type === 'launch_missions'
);

const isPurchaseAction = computed(() => [
  'buy_research',
  'buy_hab',
  'buy_vehicle',
  'buy_train_car',
  'buy_silo',
  'launch_missions'
].includes(props.action.type));

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
  if (props.action.type === 'wait_for_time') {
    return 'egginc/tiny_indicator_waiting.png';
  }
  if (props.action.type === 'wait_for_missions') {
    return 'egginc/icon_afx_mission.png';
  }
  if (props.action.type === 'wait_for_full_habs') {
    return 'egginc/ei_hab_icon_chicken_universe.png';
  }
  if (props.action.type === 'toggle_earnings_boost') {
    return 'egginc-extras/icon_earnings_boost.png';
  }
  if (props.action.type === 'notification') {
    return 'egginc/tiny_indicator_waiting.png';
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
 * Calculate save duration (time spent accumulating gems)
 */
const savingDuration = computed(() => {
  if (props.action.cost <= 0) return 0;
  const payloadTime = (props.action.payload as any).totalTimeSeconds || 0;
  return Math.max(0, props.action.totalTimeSeconds - payloadTime);
});

/**
 * Calculate wait duration (inherent action time)
 */
const waitDuration = computed(() => {
  const payload = props.action.payload as any;
  if (props.action.type === 'launch_missions' && payload.isZeroTime) return 0;
  if (props.action.cost <= 0) return props.action.totalTimeSeconds || 0;
  return payload.totalTimeSeconds || 0;
});

const savingDurationFormatted = computed(() => formatDuration(savingDuration.value));
const waitDurationFormatted = computed(() => formatDuration(waitDuration.value));

/**
 * The absolute end time of this action, calculated from the ascension start time.
 */
const absoluteEndTime = computed(() => {
  const { ascensionDate, ascensionTime } = virtueStore;
  const dateTimeStr = `${ascensionDate}T${ascensionTime}:00`;
  let startTime: Date;
  try {
    startTime = new Date(dateTimeStr);
  } catch {
    startTime = new Date();
  }

  const actions = actionsStore.actions;
  const myIndex = props.action.index;
  let totalSeconds = 0;
  // Sum up all durations from the start to this action
  for (let i = 0; i <= myIndex; i++) {
    totalSeconds += actions[i].totalTimeSeconds || 0;
  }
  
  return new Date(startTime.getTime() + totalSeconds * 1000);
});

/**
 * Detailed title for hover tooltip.
 */
const timeToSaveTitle = computed(() => {
  const date = absoluteEndTime.value;
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
});

function deltaClass(delta: number): string {
  if (delta > 0) return 'text-slate-900';
  return 'text-slate-400';
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
