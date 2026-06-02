<template>
  <div>
    <button class="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700" @click="showModal = true">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Colleggtibles
    </button>

    <teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showModal = false"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col" @click.stop>
          <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-900">Colleggtible Configuration</h2>
            <button class="text-gray-400 hover:text-gray-600" @click="showModal = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            v-if="hasUnresolvedContracts"
            class="mx-4 mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs"
          >
            Some contract data could not be loaded from the server. You can manually set your colleggtible tiers below.
          </div>

          <div class="overflow-y-auto flex-1 px-4 py-3">
            <div
              v-for="egg in colleggtiblesList"
              :key="egg.id"
              class="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
            >
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-gray-800">{{ egg.name }}</div>
                <div class="text-[10px] text-gray-400 italic">{{ egg.bonusText }} {{ egg.effect.toLowerCase() }}</div>
              </div>
              <select
                :value="tiers[egg.id] ?? -1"
                class="text-xs border border-gray-200 rounded px-2 py-1 pr-6 bg-white appearance-none"
                style="
                  background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B7280'/%3E%3C/svg%3E&quot;);
                  background-repeat: no-repeat;
                  background-position: right 6px center;
                  background-size: 10px 6px;
                "
                @change="setTier(egg.id, parseInt(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="opt in TIER_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
            <div class="flex gap-2">
              <button class="text-xs text-gray-500 hover:text-gray-700" @click="resetTiers">Reset to Auto</button>
              <button class="text-xs text-green-600 hover:text-green-800 font-medium" @click="maxAllTiers">
                Max All
              </button>
            </div>
            <button
              class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              @click="showModal = false"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { colleggtibleDefs, formatColleggtibleBonus, getColleggtibleMultiplier, type ColleggtibleTiers } from 'lib';

const TIER_OPTIONS = [
  { value: -1, label: 'None' },
  { value: 0, label: '10M' },
  { value: 1, label: '100M' },
  { value: 2, label: '1B' },
  { value: 3, label: '10B' },
];

const props = defineProps<{
  modelValue: ColleggtibleTiers;
  hasUnresolvedContracts?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [tiers: ColleggtibleTiers];
}>();

const showModal = ref(false);
const tiers = computed(() => props.modelValue);

const colleggtiblesList = computed(() =>
  colleggtibleDefs.map(def => ({
    id: def.id,
    name: def.name,
    effect: def.effect,
    bonusText: formatColleggtibleBonus(getColleggtibleMultiplier(def.id, tiers.value[def.id] ?? -1), def.id),
  }))
);

function setTier(id: string, tierIndex: number) {
  const newTiers = { ...tiers.value, [id]: tierIndex };
  emit('update:modelValue', newTiers);
}

function resetTiers() {
  const newTiers: ColleggtibleTiers = {};
  for (const def of colleggtibleDefs) {
    newTiers[def.id] = -1;
  }
  emit('update:modelValue', newTiers);
}

function maxAllTiers() {
  const newTiers: ColleggtibleTiers = {};
  for (const def of colleggtibleDefs) {
    newTiers[def.id] = 3;
  }
  emit('update:modelValue', newTiers);
}
</script>
