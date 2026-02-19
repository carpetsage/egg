<template>
  <div class="space-y-4">
    <!-- Player Info -->
    <div class="section-premium p-5 flex items-center justify-between">
      <template v-if="hasData">
        <div>
          <div class="text-xl font-bold text-slate-800 tracking-tight">{{ nickname }}</div>
          <div class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span class="badge-premium badge-brand py-0 rounded text-[9px]">Backup</span>
            <span v-if="lastBackupFormatted">
              Last synced: {{ lastBackupFormatted }}
            </span>
          </div>
        </div>
        <div class="animate-float">
          <img :src="iconURL('egginc/egg_truth.png', 64)" class="w-10 h-10 drop-shadow-xl" alt="" />
        </div>
      </template>
      <template v-else>
        <div class="text-slate-400 text-center py-2 w-full font-medium italic">
          Load player data above to populate initial state
        </div>
      </template>
    </div>

    <!-- Continue Ascension Button -->
    <div v-if="hasData && canContinue" class="section-premium p-5 flex items-center justify-between border-blue-200 bg-blue-50/30 overflow-hidden relative group">
      <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
      <div class="relative z-10">
        <div class="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Resume Progress</div>
        <div class="text-sm font-semibold text-slate-700">Continue from Current {{ currentEggName }}</div>
      </div>
      <button 
        class="btn-premium btn-primary px-5 py-2.5 relative z-10"
        @click="$emit('continue-ascension')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
        <span>Continue Ascension</span>
      </button>
    </div>

    <!-- Ascension Settings -->
    <div class="section-premium p-5 overflow-hidden">
      <h3 class="style-guide-label mb-6">Ascension Settings</h3>
      
      <div class="space-y-6">
        <!-- Ascension Start Time -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="text-sm font-bold text-slate-700">Ascension Start</div>
            <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider">When this journey begins</div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <input
              type="date"
              :value="ascensionDate"
              class="input-premium w-auto text-sm font-mono-premium font-bold text-slate-900 py-2.5 px-4"
              @change="$emit('set-ascension-date', ($event.target as HTMLInputElement).value)"
            />
            <input
              type="time"
              :value="ascensionTime"
              class="input-premium w-auto text-sm font-mono-premium font-bold text-slate-900 py-2.5 px-4"
              @change="$emit('set-ascension-time', ($event.target as HTMLInputElement).value)"
            />
            <select
              :value="ascensionTimezone"
              class="input-premium w-auto text-sm font-mono-premium font-bold text-slate-900 py-2.5 pl-4 pr-12"
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
            <div class="text-sm font-bold text-slate-700">Starting Egg</div>
            <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider">Initial virtue candidate</div>
          </div>
          <div class="flex gap-2">
            <button
              v-for="egg in VIRTUE_EGGS"
              :key="egg"
              class="group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border-2 overflow-visible"
              :class="[
                initialEgg === egg
                  ? 'border-brand-primary scale-110 shadow-lg shadow-brand-primary/20 bg-white'
                  : 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-100 hover:border-slate-200'
              ]"
              :title="VIRTUE_EGG_NAMES[egg]"
              @click="$emit('set-initial-egg', egg)"
            >
              <img
                :src="iconURL(`egginc/egg_${egg}.png`, 64)"
                class="w-8 h-8 object-contain transition-transform"
                :class="{ 'scale-110 drop-shadow-sm': initialEgg === egg }"
                :alt="egg"
              />
              
              <!-- Active indicator dot -->
              <div 
                v-if="initialEgg === egg"
                class="absolute -top-1 -right-1 w-3 h-3 bg-slate-900 rounded-full border-2 border-white shadow-sm pointer-events-none"
              ></div>
            </button>
          </div>
        </div>

        <!-- Previous Shifts (editable) -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-bold text-slate-700">Previous Shifts</div>
            <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider">Experience baseline</div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="initialShiftCount"
              :min="0"
              class="input-premium w-40 text-right text-sm font-mono-premium font-bold text-slate-900"
              @change="$emit('set-initial-shift-count', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
        </div>

        <!-- Soul Eggs -->
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-1.5">
              <div class="text-sm font-bold text-slate-700">Soul Eggs (SE)</div>
              <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-4 h-4 mb-0.5" alt="SE" />
            </div>
            <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider">Earnings potential multiplier</div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="text"
              :value="formatNumber(soulEggs, 3)"
              class="input-premium w-40 text-right text-sm font-mono-premium font-bold text-slate-900"
              @blur="handleSoulEggsChange(($event.target as HTMLInputElement).value)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
          </div>
        </div>
        
        <!-- Assume Double Earnings -->
        <div class="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 group hover:bg-slate-50 transition-colors">
          <div>
            <div class="text-sm font-bold text-slate-700">Assume Double Earnings</div>
            <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider group-hover:text-slate-500 transition-colors">Active Video Doubler or Ultra</div>
          </div>
          <div class="flex items-center">
            <button
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="[assumeDoubleEarnings ? 'bg-brand-primary' : 'bg-slate-300']"
              role="switch"
              :aria-checked="assumeDoubleEarnings"
              @click="$emit('set-assume-double-earnings', !assumeDoubleEarnings)"
            >
              <span class="sr-only">Use video doubler</span>
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
                :class="[assumeDoubleEarnings ? 'translate-x-5' : 'translate-x-0']"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Virtue Progress (collapsible) -->
    <div class="section-premium overflow-hidden">
      <button
        class="w-full px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors group"
        @click="truthEggsExpanded = !truthEggsExpanded"
      >
        <div class="flex items-center gap-3">
          <div class="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
            <img
              :src="iconURL('egginc/egg_truth.png', 64)"
              class="w-5 h-5 object-contain"
              alt="Truth Egg"
            />
          </div>
          <h3 class="style-guide-label mb-0">Virtue Progress</h3>
        </div>
        <div class="flex items-center gap-4">
          <div class="px-2 py-0.5 bg-brand-primary/10 rounded-full">
            <span class="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">
              {{ totalTe }} <span class="opacity-50">/ 490</span> TE
            </span>
          </div>
          <svg
            class="w-4 h-4 text-slate-400 transition-transform duration-300"
            :class="{ 'rotate-180': truthEggsExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div v-if="truthEggsExpanded" class="p-5 space-y-6">
        <!-- Eggs of Truth (Total display) -->
        <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div>
            <div class="text-sm font-bold text-slate-700">Total Eggs of Truth</div>
            <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider">Multiplies IHR & Earnings by 1.1^TE</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="text-lg font-mono-premium font-bold text-slate-900 px-3">{{ totalTe }}</div>
            </div>
            <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Max: 490</span>
          </div>
        </div>

        <div class="flex items-start gap-3 p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
          <svg class="w-5 h-5 text-slate-900 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-[10px] text-slate-500 font-medium leading-relaxed">
            TE are earned through shipping. Levels are synced between <strong class="text-slate-700">Delivered</strong> and <strong class="text-slate-700">TE Count</strong>. Editing one updates the other to the corresponding threshold.
          </p>
        </div>

        <!-- Per-Egg TE Progress -->
        <div class="grid grid-cols-1 gap-3">
          <div
            v-for="egg in VIRTUE_FUEL_ORDER"
            :key="egg"
            class="flex items-center gap-4 p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all group"
          >
            <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center p-2 group-hover:bg-white group-hover:shadow-inner transition-all">
              <img
                :src="iconURL(`egginc/egg_${egg}.png`, 64)"
                class="w-full h-full object-contain drop-shadow-sm"
                :alt="egg"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold text-slate-800 uppercase tracking-tight mb-2">{{ VIRTUE_EGG_NAMES[egg] }}</div>
              <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-2">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivered:</span>
                  <input
                    type="text"
                    :value="formatNumber(eggsDelivered[egg], 3)"
                    class="input-premium w-[100px] text-right text-sm font-mono-premium font-bold text-slate-900"
                    placeholder="0"
                    @change="handleEggsDeliveredChange(egg, ($event.target as HTMLInputElement).value)"
                    @keydown.enter="($event.target as HTMLInputElement).blur()"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">TE:</span>
                  <div class="flex items-center gap-1.5">
                    <input
                      type="number"
                      :value="teEarned[egg]"
                      :min="0"
                      :max="98"
                      class="input-premium w-[90px] text-center text-sm font-mono-premium font-bold text-slate-900"
                      @change="handleTEEarnedChange(egg, ($event.target as HTMLInputElement).value)"
                      @keydown.enter="($event.target as HTMLInputElement).blur()"
                    />
                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">/ 98</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Artifact Loadout -->
    <div class="section-premium overflow-visible">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <h3 class="style-guide-label mb-0">Artifact Sets</h3>
        <div v-if="hasArtifactSets" class="flex gap-1 bg-slate-200/50 p-1 rounded-xl">
          <button
            v-for="setName in (['earnings', 'elr'] as const)"
            :key="setName"
            class="px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
            :class="[
              activeSetTab === setName
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            ]"
            @click="activeSetTab = setName"
          >
            {{ setName }}
          </button>
        </div>
      </div>
      <div class="p-4">
        <template v-if="!hasArtifactSets">
          <div class="mb-4">
            <ArtifactSelector
              :model-value="artifactLoadout"
              @update:model-value="$emit('update:artifact-loadout', $event)"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button
              class="btn-premium btn-primary py-2 text-[10px] font-black uppercase tracking-widest"
              @click="$emit('save-current-to-set', 'earnings')"
            >
              Save as Earnings
            </button>
            <button
              class="btn-premium btn-primary py-2 text-[10px] font-black uppercase tracking-widest"
              @click="$emit('save-current-to-set', 'elr')"
            >
              Save as ELR
            </button>
          </div>
        </template>
        <template v-else>
          <div v-if="activeSetTab === 'earnings'">
            <ArtifactSelector
              :model-value="artifactSets.earnings || createEmptyLoadout()"
              @update:model-value="$emit('update-artifact-set', 'earnings', $event)"
            />
          </div>
          <div v-if="activeSetTab === 'elr'">
            <ArtifactSelector
              :model-value="artifactSets.elr || createEmptyLoadout()"
              @update:model-value="$emit('update-artifact-set', 'elr', $event)"
            />
          </div>
          <div v-if="activeArtifactSet !== activeSetTab" class="mt-4 flex justify-end">
            <button
              class="btn-premium btn-secondary py-1.5 px-4 text-[10px] font-black uppercase tracking-widest"
              @click="$emit('set-active-artifact-set', activeSetTab)"
            >
              Equip as Active
            </button>
          </div>
          <div v-else class="mt-4 flex justify-end items-center gap-3 bg-brand-primary/5 p-2 rounded-xl border border-brand-primary/10">
            <div class="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
            <span class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Currently Active Loadout</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Fuel Tank (collapsible) -->
    <div class="section-premium overflow-hidden">
      <button
        class="w-full px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors group"
        @click="fuelTankExpanded = !fuelTankExpanded"
      >
        <div class="flex items-center gap-3">
          <div class="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 class="style-guide-label mb-0">Fuel Tank</h3>
        </div>
        <div class="flex items-center gap-4">
          <div class="px-2 py-0.5 bg-slate-200/50 rounded-full">
            <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none font-mono-premium">
              {{ formatNumber(totalFuel, 1) }} <span class="opacity-40">/</span> {{ formatNumber(tankCapacity, 1) }}
            </span>
          </div>
          <svg
            class="w-4 h-4 text-slate-400 transition-transform duration-300"
            :class="{ 'rotate-180': fuelTankExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div v-if="fuelTankExpanded" class="p-5 space-y-6">
        <!-- Tank Level Selector -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-bold text-slate-700">Tank Level</div>
            <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider">Storage capacity tier</div>
          </div>
          <select
            :value="tankLevel"
            class="input-premium w-auto text-sm font-bold text-slate-900 py-2.5 pl-4 pr-12"
            @change="$emit('set-tank-level', parseInt(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="opt in tankLevelOptions" :key="opt.level" :value="opt.level">
              {{ opt.label }} ({{ opt.capacity }})
            </option>
          </select>
        </div>

        <!-- Capacity Bar -->
        <div class="space-y-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
          <div class="flex justify-between items-end mb-1">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilization</span>
            <span class="text-xs font-bold text-slate-700 font-mono-premium">{{ fillPercent.toFixed(1) }}%</span>
          </div>
          <div class="h-3 bg-white shadow-inner rounded-full overflow-hidden border border-slate-100">
            <div
              class="h-full transition-all duration-700 ease-out relative"
              :class="fillPercent > 90 ? 'bg-danger' : fillPercent > 70 ? 'bg-warning' : 'bg-success'"
              :style="{ width: `${fillPercent}%` }"
            >
              <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            </div>
          </div>
        </div>

        <!-- Per-Egg Fuel Amounts -->
        <div class="space-y-3">
          <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stored Inventory</h4>
          <div class="grid grid-cols-1 gap-2">
            <div
              v-for="egg in VIRTUE_FUEL_ORDER"
              :key="egg"
              class="flex items-center gap-4 p-3 bg-white hover:bg-slate-50 border border-slate-50 rounded-2xl transition-all group"
            >
              <div class="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center p-1.5 group-hover:bg-white group-hover:shadow-sm transition-all">
                <img
                  :src="iconURL(`egginc/egg_${egg}.png`, 64)"
                  class="w-full h-full object-contain drop-shadow-sm"
                  :alt="egg"
                />
              </div>
              <span class="flex-1 text-xs font-bold text-slate-700 uppercase tracking-tight">{{ VIRTUE_EGG_NAMES[egg] }}</span>
              <input
                type="text"
                :value="formatNumber(fuelAmounts[egg], 1)"
                class="input-premium w-40 text-right text-sm font-mono-premium font-bold text-slate-900"
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
    <div class="section-premium overflow-hidden">
      <button
        class="w-full px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors group"
        @click="epicResearchExpanded = !epicResearchExpanded"
      >
        <div class="flex items-center gap-3">
          <div class="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 class="style-guide-label mb-0">Epic Research</h3>
        </div>
        <svg
          class="w-4 h-4 text-slate-400 transition-transform duration-300"
          :class="{ 'rotate-180': epicResearchExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="epicResearchExpanded" class="divide-y divide-slate-50 max-h-80 overflow-y-auto custom-scrollbar">
        <div
          v-for="research in epicResearchList"
          :key="research.id"
          class="px-5 py-3 hover:bg-slate-50/50 transition-colors group"
        >
          <div class="flex justify-between items-center gap-4">
            <div class="flex items-center gap-4 flex-1 min-w-0">
              <div class="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center p-2 group-hover:bg-white group-hover:shadow-sm transition-all">
                <img
                  :src="iconURL(getColleggtibleIconPath(research.id), 64)"
                  class="w-full h-full object-contain opacity-80"
                  :alt="research.name"
                />
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-800 uppercase tracking-tight">{{ research.name }}</div>
                <div class="text-[10px] text-slate-400 font-medium truncate italic leading-relaxed">{{ research.effect }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  :value="research.level"
                  :min="0"
                  :max="research.maxLevel"
                  class="input-premium w-16 text-center text-xs font-mono-premium py-1 font-bold"
                  @change="$emit('set-epic-research-level', research.id, parseInt(($event.target as HTMLInputElement).value) || 0)"
                />
                <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest w-10">/ {{ research.maxLevel }}</span>
              </div>
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
import { createEmptyLoadout } from '@/lib/artifacts';

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
  artifactSets: Record<import('@/types').ArtifactSetName, EquippedArtifact[] | null>;
  activeArtifactSet: import('@/types').ArtifactSetName | null;
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
  'update-artifact-set': [setName: import('@/types').ArtifactSetName, loadout: EquippedArtifact[]];
  'save-current-to-set': [setName: import('@/types').ArtifactSetName];
  'set-active-artifact-set': [setName: import('@/types').ArtifactSetName];
}>();

// Collapsible state
const epicResearchExpanded = ref(false);
const fuelTankExpanded = ref(false);
const truthEggsExpanded = ref(true);

const activeSetTab = ref<import('@/types').ArtifactSetName>('earnings');

const hasArtifactSets = computed(() => props.artifactSets.earnings || props.artifactSets.elr);

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
