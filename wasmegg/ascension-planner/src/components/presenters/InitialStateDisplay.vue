<template>
  <div class="space-y-4">
    <!-- Player Info -->
    <div class="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
      <template v-if="hasData">
        <div class="text-lg font-medium text-gray-900">{{ nickname }}</div>
        <div class="text-sm text-gray-500 mt-1">
          Data from backup
          <span v-if="lastBackupFormatted" class="text-gray-400">
            ({{ lastBackupFormatted }})
          </span>
        </div>
      </template>
      <template v-else>
        <div class="text-gray-500 text-center py-2">
          Load player data above to populate initial state
        </div>
      </template>
    </div>

    <!-- Continue Ascension Button -->
    <div v-if="hasData && canContinue" class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
      <div>
        <div class="text-sm font-bold text-blue-900">Resume Progress</div>
        <div class="text-xs text-blue-700">Continue from your current {{ currentEggName }} state</div>
      </div>
      <button 
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow transition-colors flex items-center gap-2"
        @click="$emit('continue-ascension')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
        Continue Ascension
      </button>
    </div>

    <!-- Ascension Settings -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Ascension Settings</h3>
      </div>
      <div class="p-4 space-y-4">
        <!-- Ascension Start Time -->
        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="text-sm font-medium text-gray-700">Ascension Start</div>
            <div class="text-xs text-gray-500">When this ascension begins</div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="date"
              :value="ascensionDate"
              class="text-sm border border-gray-300 rounded px-2 py-1"
              @change="$emit('set-ascension-date', ($event.target as HTMLInputElement).value)"
            />
            <input
              type="time"
              :value="ascensionTime"
              class="text-sm border border-gray-300 rounded px-2 py-1"
              @change="$emit('set-ascension-time', ($event.target as HTMLInputElement).value)"
            />
            <select
              :value="ascensionTimezone"
              class="text-sm border border-gray-300 rounded px-2 py-1"
              @change="$emit('set-ascension-timezone', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="tz in allTimezones" :key="tz.value" :value="tz.value">
                {{ tz.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Starting Egg -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">Starting Egg</div>
            <div class="text-xs text-gray-500">Which virtue egg to begin this ascension with</div>
          </div>
          <div class="flex gap-2">
            <button
              v-for="egg in VIRTUE_EGGS"
              :key="egg"
              class="group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm overflow-hidden border-2"
              :class="[
                initialEgg === egg
                  ? 'border-blue-500 scale-110 shadow-md bg-white'
                  : 'border-transparent bg-gray-50 opacity-50 hover:opacity-100 hover:border-gray-200'
              ]"
              :title="VIRTUE_EGG_NAMES[egg]"
              @click="$emit('set-initial-egg', egg)"
            >
              <img
                :src="iconURL(`egginc/egg_${egg}.png`, 64)"
                class="w-8 h-8 object-contain transition-transform"
                :class="{ 'scale-110': initialEgg === egg }"
                :alt="egg"
              />
              
              <!-- Active indicator dot -->
              <div 
                v-if="initialEgg === egg"
                class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm"
              ></div>
            </button>
          </div>
        </div>

        <!-- Previous Shifts (editable) -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">Previous Shifts</div>
            <div class="text-xs text-gray-500">Total shifts performed before this ascension</div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="initialShiftCount"
              :min="0"
              class="w-20 text-center text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              @change="$emit('set-initial-shift-count', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
        </div>



        <!-- Soul Eggs -->
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-1">
              <div class="text-sm font-medium text-gray-700">Soul Eggs (SE)</div>
              <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3.5 h-3.5" alt="SE" />
            </div>
            <div class="text-xs text-gray-500">Baseline soul eggs for earnings bonus</div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="text"
              :value="formatNumber(soulEggs, 3)"
              class="w-32 text-right text-sm font-mono border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              @blur="handleSoulEggsChange(($event.target as HTMLInputElement).value)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
          </div>
        </div>
        
        <!-- Assume Double Earnings -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">Assume Double Earnings</div>
            <div class="text-xs text-gray-500">2x earnings from video doubler or ultra always-on double earnings</div>
          </div>
          <div class="flex items-center">
            <button
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :class="[assumeDoubleEarnings ? 'bg-blue-600' : 'bg-gray-200']"
              role="switch"
              :aria-checked="assumeDoubleEarnings"
              @click="$emit('set-assume-double-earnings', !assumeDoubleEarnings)"
            >
              <span class="sr-only">Use video doubler</span>
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="[assumeDoubleEarnings ? 'translate-x-5' : 'translate-x-0']"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Virtue Progress (collapsible) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <button
        class="w-full px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors"
        @click="truthEggsExpanded = !truthEggsExpanded"
      >
        <div class="flex items-center gap-2">
          <img
            :src="iconURL('egginc/egg_truth.png', 64)"
            class="w-5 h-5 object-contain"
            alt="Truth Egg"
          />
          <h3 class="font-bold text-xs uppercase tracking-widest text-gray-500">Virtue Progress</h3>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-500">
            {{ totalTe }} / 490 TE
          </span>
          <svg
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': truthEggsExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7" />
          </svg>
        </div>
      </button>
      <div v-if="truthEggsExpanded" class="p-4 space-y-4">
        <!-- Eggs of Truth (Moved) -->
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div>
            <div class="text-sm font-medium text-gray-700">Total Eggs of Truth</div>
            <div class="text-xs text-gray-500">Multiplier to IHR and Earnings Bonus (1.1^TE)</div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="totalTe"
              readonly
              class="w-20 text-center text-sm border border-gray-300 bg-gray-100 text-gray-600 rounded px-2 py-1 outline-none"
            />
            <span class="text-xs text-gray-400 font-medium">/ 490</span>
          </div>
        </div>

        <div class="text-xs text-gray-500 mb-3">
          TE are earned by shipping eggs. Each egg can have 0-98 TE. When editing Eggs Delivered, TE is auto-synced based on thresholds. When editing TE, Eggs Delivered is set to the minimum for that threshold.
        </div>

        <!-- Per-Egg TE Progress -->
        <div class="space-y-3">
          <div
            v-for="egg in VIRTUE_FUEL_ORDER"
            :key="egg"
            class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <img
              :src="iconURL(`egginc/egg_${egg}.png`, 64)"
              class="w-8 h-8 object-contain"
              :alt="egg"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-700">{{ VIRTUE_EGG_NAMES[egg] }}</div>
              <div class="flex items-center gap-4 mt-1">
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-500">Delivered:</span>
                  <input
                    type="text"
                    :value="formatNumber(eggsDelivered[egg], 3)"
                    class="w-24 text-right text-xs font-mono border border-gray-300 rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="0"
                    @change="handleEggsDeliveredChange(egg, ($event.target as HTMLInputElement).value)"
                    @keydown.enter="($event.target as HTMLInputElement).blur()"
                  />
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-500">TE:</span>
                  <input
                    type="number"
                    :value="teEarned[egg]"
                    :min="0"
                    :max="98"
                    class="w-16 text-center text-xs font-mono border border-gray-300 rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
                    @change="handleTEEarnedChange(egg, ($event.target as HTMLInputElement).value)"
                    @keydown.enter="($event.target as HTMLInputElement).blur()"
                  />
                  <span class="text-xs text-gray-400">/ 98</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Artifact Loadout -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-visible shadow-sm">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-bold text-xs uppercase tracking-widest text-gray-500">Artifact Loadout</h3>
      </div>
      <div class="p-4">
        <ArtifactSelector
          :model-value="artifactLoadout"
          @update:model-value="$emit('update:artifact-loadout', $event)"
        />
      </div>
    </div>

    <!-- Fuel Tank (collapsible) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <button
        class="w-full px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors"
        @click="fuelTankExpanded = !fuelTankExpanded"
      >
        <h3 class="font-bold text-xs uppercase tracking-widest text-gray-500">Fuel Tank</h3>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-500">
            {{ formatNumber(totalFuel, 1) }} / {{ formatNumber(tankCapacity, 1) }}
          </span>
          <svg
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': fuelTankExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div v-if="fuelTankExpanded" class="p-4 space-y-4">
        <!-- Tank Level Selector -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">Tank Level</div>
            <div class="text-xs text-gray-500">Determines maximum capacity</div>
          </div>
          <select
            :value="tankLevel"
            class="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            @change="$emit('set-tank-level', parseInt(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="opt in tankLevelOptions" :key="opt.level" :value="opt.level">
              {{ opt.label }} ({{ opt.capacity }})
            </option>
          </select>
        </div>

        <!-- Capacity Bar -->
        <div class="space-y-1">
          <div class="flex justify-between text-xs text-gray-500">
            <span>Capacity</span>
            <span>{{ fillPercent.toFixed(1) }}%</span>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-300"
              :class="fillPercent > 90 ? 'bg-red-500' : fillPercent > 70 ? 'bg-amber-500' : 'bg-green-500'"
              :style="{ width: `${fillPercent}%` }"
            />
          </div>
        </div>

        <!-- Per-Egg Fuel Amounts -->
        <div class="space-y-2">
          <div class="text-xs font-medium text-gray-500 uppercase tracking-wider">Stored Fuel by Egg</div>
          <div class="grid grid-cols-1 gap-2">
            <div
              v-for="egg in VIRTUE_FUEL_ORDER"
              :key="egg"
              class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
            >
              <img
                :src="iconURL(`egginc/egg_${egg}.png`, 64)"
                class="w-8 h-8 object-contain"
                :alt="egg"
              />
              <span class="flex-1 text-sm font-medium text-gray-700">{{ VIRTUE_EGG_NAMES[egg] }}</span>
              <input
                type="text"
                :value="formatNumber(fuelAmounts[egg], 1)"
                class="w-24 text-right text-sm font-mono border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="0"
                @blur="handleFuelAmountChange(egg, ($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
            </div>
          </div>
        </div>
      </div>
    </div>



    <!-- Epic Research (collapsible) -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <button
        class="w-full px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors"
        @click="epicResearchExpanded = !epicResearchExpanded"
      >
        <h3 class="font-bold text-xs uppercase tracking-widest text-gray-500">Epic Research</h3>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform"
          :class="{ 'rotate-180': epicResearchExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="epicResearchExpanded" class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        <div
          v-for="research in epicResearchList"
          :key="research.id"
          class="px-4 py-2"
        >
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <img
                :src="iconURL(getColleggtibleIconPath(research.id), 64)"
                class="w-6 h-6 object-contain opacity-80"
                :alt="research.name"
              />
              <div class="min-w-0">
                <span class="text-sm font-semibold text-gray-700">{{ research.name }}</span>
                <br/>
                <span class="text-[11px] text-gray-400 italic truncate block">{{ research.effect }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-2">
              <input
                type="number"
                :value="research.level"
                :min="0"
                :max="research.maxLevel"
                class="w-14 text-center text-sm border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                @change="$emit('set-epic-research-level', research.id, parseInt(($event.target as HTMLInputElement).value) || 0)"
              />
              <span class="text-xs text-gray-400 w-10">/ {{ research.maxLevel }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { iconURL } from 'lib';
import { getColleggtibleIconPath } from '@/lib/assets';
import type { ResearchLevels, VirtueEgg } from '@/types';
import { VIRTUE_EGGS, VIRTUE_EGG_NAMES } from '@/types';
import { epicResearchDefs } from '@/lib/epicResearch';
import type { EquippedArtifact } from '@/lib/artifacts';
import { TANK_CAPACITIES, VIRTUE_FUEL_ORDER } from '@/stores/fuelTank';
import { formatNumber, parseNumber } from '@/lib/format';
import ArtifactSelector from '@/components/ArtifactSelector.vue';

const props = defineProps<{
  hasData: boolean;
  nickname: string;
  lastBackupTime: number;
  epicResearchLevels: ResearchLevels;
  artifactLoadout: EquippedArtifact[];
  initialShiftCount: number;
  initialEgg: VirtueEgg;
  te: number;
  ascensionDate: string;
  ascensionTime: string;
  ascensionTimezone: string;
  tankLevel: number;
  fuelAmounts: Record<VirtueEgg, number>;
  tankCapacity: number;
  eggsDelivered: Record<VirtueEgg, number>;
  teEarned: Record<VirtueEgg, number>;
  totalTe: number;
  canContinue: boolean;
  currentEggName: string;
  soulEggs: number;
  assumeDoubleEarnings: boolean;
}>();

const emit = defineEmits<{
  'set-epic-research-level': [researchId: string, level: number];
  'update:artifact-loadout': [loadout: EquippedArtifact[]];
  'set-initial-egg': [egg: VirtueEgg];
  'set-te': [value: number];
  'set-initial-shift-count': [value: number];
  'set-ascension-date': [value: string];
  'set-ascension-time': [value: string];
  'set-ascension-timezone': [value: string];
  'set-tank-level': [level: number];
  'set-fuel-amount': [egg: VirtueEgg, amount: number];
  'set-eggs-delivered': [egg: VirtueEgg, amount: number];
  'set-te-earned': [egg: VirtueEgg, count: number];
  'continue-ascension': [];
  'set-soul-eggs': [count: number];
  'set-assume-double-earnings': [enabled: boolean];
}>();

// Collapsible state
const epicResearchExpanded = ref(false);
const fuelTankExpanded = ref(false);
const truthEggsExpanded = ref(true);

// Total fuel in tank
const totalFuel = computed(() =>
  Object.values(props.fuelAmounts).reduce((sum, amt) => sum + amt, 0)
);

// Fill percentage for visual bar
const fillPercent = computed(() => {
  if (props.tankCapacity === 0) return 0;
  return Math.min(100, (totalFuel.value / props.tankCapacity) * 100);
});

// Tank level options (0-7)
const tankLevelOptions = TANK_CAPACITIES.map((capacity, index) => ({
  level: index,
  label: `Level ${index}`,
  capacity: formatNumber(capacity, 1),
}));

// Handle fuel amount input change
function handleFuelAmountChange(egg: VirtueEgg, inputValue: string) {
  const parsed = parseNumber(inputValue);
  if (parsed !== null && !isNaN(parsed)) {
    emit('set-fuel-amount', egg, parsed);
  }
}

// Handle eggs delivered input change
function handleEggsDeliveredChange(egg: VirtueEgg, inputValue: string) {
  const parsed = parseNumber(inputValue);
  if (parsed !== null && !isNaN(parsed)) {
    emit('set-eggs-delivered', egg, parsed);
  }
}

// Handle TE earned input change
function handleTEEarnedChange(egg: VirtueEgg, inputValue: string) {
  const value = parseInt(inputValue);
  if (!isNaN(value)) {
    emit('set-te-earned', egg, value);
  }
}

// Handle soul eggs input change
function handleSoulEggsChange(inputValue: string) {
  const parsed = parseNumber(inputValue);
  if (parsed !== null && !isNaN(parsed)) {
    emit('set-soul-eggs', parsed);
  }
}

// Get all available timezones grouped by region
const allTimezones = computed(() => {
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    return zones.map(tz => {
      // Format: "America/New_York" -> "New York (America)"
      const parts = tz.split('/');
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      const region = parts.length > 1 ? parts[0] : '';
      return {
        value: tz,
        label: region ? `${city} (${region})` : city,
        region,
        city,
      };
    }).sort((a, b) => {
      // Sort by region first, then by city
      if (a.region !== b.region) return a.region.localeCompare(b.region);
      return a.city.localeCompare(b.city);
    });
  } catch {
    // Fallback for older browsers
    return [
      { value: 'America/Los_Angeles', label: 'Los Angeles (America)', region: 'America', city: 'Los Angeles' },
      { value: 'America/Denver', label: 'Denver (America)', region: 'America', city: 'Denver' },
      { value: 'America/Chicago', label: 'Chicago (America)', region: 'America', city: 'Chicago' },
      { value: 'America/New_York', label: 'New York (America)', region: 'America', city: 'New York' },
      { value: 'Europe/London', label: 'London (Europe)', region: 'Europe', city: 'London' },
      { value: 'Europe/Paris', label: 'Paris (Europe)', region: 'Europe', city: 'Paris' },
      { value: 'Asia/Tokyo', label: 'Tokyo (Asia)', region: 'Asia', city: 'Tokyo' },
      { value: 'Australia/Sydney', label: 'Sydney (Australia)', region: 'Australia', city: 'Sydney' },
      { value: 'UTC', label: 'UTC', region: '', city: 'UTC' },
    ];
  }
});

const lastBackupFormatted = computed(() => {
  if (props.lastBackupTime === 0) {
    return props.hasData ? 'Imported Plan' : '';
  }
  const date = new Date(props.lastBackupTime * 1000);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
});

const epicResearchList = computed(() =>
  epicResearchDefs.map(def => ({
    id: def.id,
    name: def.name,
    effect: def.effect,
    maxLevel: def.maxLevel,
    level: props.epicResearchLevels[def.id] || 0,
  }))
);
</script>
