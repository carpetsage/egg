<template>
  <TransitionRoot as="template" :show="playerOverridesModalOpen">
    <Dialog as="div" class="fixed z-10 inset-0 overflow-y-auto" @close="closePlayerOverridesModal">
      <div class="min-h-screen text-center px-4">
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <DialogOverlay class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>

        <span class="inline-block align-middle h-screen" aria-hidden="true">&#8203;</span>
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0 translate-y-0 scale-95"
          enter-to="opacity-100 translate-y-0 scale-100"
          leave="ease-in duration-200"
          leave-from="opacity-100 translate-y-0 scale-100"
          leave-to="opacity-0 translate-y-0 scale-95"
        >
          <div
            class="inline-block bg-white rounded-lg px-6 pt-4 pb-6 text-left overflow-hidden shadow-xl transform transition-all my-8 align-middle max-w-lg w-full p-6 space-y-3 relative"
          >
            <DialogTitle as="h3" class="text-center text-base font-medium text-gray-900">
              {{ player ? 'Override player data' : 'Mission configuration' }}
            </DialogTitle>
            <p v-if="player" class="text-center text-xs text-gray-500 -mt-2">
              Tick a row to use the manual value instead of what was loaded from your save.
            </p>

            <button
              class="absolute -top-3 right-0 inline-flex rounded-md p-2 focus:outline-none"
              @click="closePlayerOverridesModal"
            >
              <XIcon class="h-4 w-4 text-gray-500 hover:text-gray-600" aria-hidden="true" />
            </button>

            <template v-if="!player">
              <!-- No player data: simple config form (mirrors ConfigModal) -->
              <div>
                <label for="po_epic_research_ftl" class="block">
                  <div class="text-sm font-medium text-gray-700">FTL Drive Upgrades</div>
                  <div class="text-sm text-gray-500">(Mission time reducing epic research)</div>
                </label>
                <div class="relative flex items-center w-20 mt-2">
                  <base-integer-input
                    id="po_epic_research_ftl"
                    base-class="block w-full w-number-input sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-2.5 py-1 border-gray-300"
                    :min="0"
                    :max="60"
                    :model-value="config.epicResearchFTLLevel"
                    @update:model-value="setEpicResearchFTLLevel"
                  />
                  <div class="absolute inset-y-0 right-0 pr-2.5 sm:text-sm flex items-center">/ 60</div>
                </div>
              </div>
              <div>
                <label for="po_epic_research_zerog" class="block">
                  <div class="text-sm font-medium text-gray-700">Zero-g Quantum Containment</div>
                  <div class="text-sm text-gray-500">(Mission capacity increasing epic research)</div>
                </label>
                <div class="relative flex items-center w-20 mt-2">
                  <base-integer-input
                    id="po_epic_research_zerog"
                    base-class="block w-full w-number-input sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-2.5 py-1 border-gray-300"
                    :min="0"
                    :max="10"
                    :model-value="config.epicResearchZerogLevel"
                    @update:model-value="setEpicResearchZerogLevel"
                  />
                  <div class="absolute inset-y-0 right-0 pr-2.5 sm:text-sm flex items-center">/ 10</div>
                </div>
              </div>
              <div>
                <template v-for="ship in spaceshipList" :key="ship">
                  <div class="flex flex-wrap">
                    <div class="flex items-center space-x-2 w-full xs:w-40">
                      <input
                        :id="`po_ship_visibility_${ship}`"
                        v-model="config.shipVisibility[ship]"
                        :name="`po_ship_visibility_${ship}`"
                        type="checkbox"
                        class="focus:ring-green-500 h-3 w-3 text-green-600 border-gray-300 rounded"
                      />
                      <span class="text-sm">{{ spaceshipName(ship) }}</span>
                    </div>
                    <div v-if="shipMaxLevel(ship) > 0" class="flex items-center space-x-0.5">
                      <ShipStars
                        :level="config.shipLevels[ship]"
                        :max="shipMaxLevel(ship)"
                        :interactive="true"
                        @set="(lvl: number) => setShipLevel(ship, lvl)"
                      />
                    </div>
                  </div>
                </template>
                <div class="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-200">
                  <input
                    id="po_ship_visibility_all"
                    :checked="allShipsVisible"
                    :indeterminate="someShipsVisible && !allShipsVisible"
                    name="po_ship_visibility_all"
                    type="checkbox"
                    class="focus:ring-green-500 h-3.5 w-3.5 text-green-600 border-gray-300 rounded"
                    @change="toggleAllShips"
                  />
                  <label for="po_ship_visibility_all" class="text-sm text-gray-600 cursor-pointer">
                    Show/Hide All Ships
                  </label>
                </div>
              </div>
              <div>
                <div class="flex items-center space-x-0.5">
                  <input
                    id="po_show_nodata"
                    v-model="config.showNodata"
                    name="po_show_nodata"
                    type="checkbox"
                    class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                  />&nbsp;
                  <label class="text-sm text-gray-600">Show Targets with No Data</label>
                </div>
              </div>
              <div>
                <div class="text-sm font-medium text-gray-700">Ship Targets</div>
                <div class="text-sm text-gray-500">(Targets shown in Artifact view)</div>
                <template v-for="target in targets" :key="target">
                  <div class="flex items-center space-x-0.5">
                    <input
                      :id="`po_target_${target}`"
                      v-model="config.targets[target]"
                      :name="`po_target_${target}`"
                      type="checkbox"
                      class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                    />&nbsp;
                    <label :for="`po_target_${target}`" class="text-sm text-gray-600">
                      <template v-if="Number(target) !== 10000">
                        <img
                          class="inline-flex h-6 w-6"
                          :src="id2url(Number(target), 32)"
                          :alt="ei.ArtifactSpec.Name[target]"
                        />
                        {{ getTargetName(target) }}
                      </template>
                      <template v-else>Untargeted</template>
                    </label>
                  </div>
                </template>
              </div>
            </template>
            <template v-else>
              <!-- Header -->
              <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-xs font-medium text-gray-400 px-1">
                <span></span>
                <span class="text-right w-20">Player</span>
                <span class="text-center w-12">Override</span>
                <span class="text-right w-24">Manual</span>
              </div>

              <!-- Player Properties -->
              <div class="border-t border-gray-100 pt-2 space-y-1">
                <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1">
                  <span class="text-sm text-gray-700">Crafting Level</span>
                  <span
                    class="font-mono text-sm text-right w-20"
                    :class="overrides.craftingLevel ? 'text-gray-400' : 'text-gray-700 font-semibold'"
                  >
                    {{ playerCraftingLevel ?? '—' }} / 30
                  </span>
                  <input
                    type="checkbox"
                    class="justify-self-center w-12 h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                    :checked="overrides.craftingLevel"
                    @change="setOverrideCraftingLevel(($event.target as HTMLInputElement).checked)"
                  />
                  <div class="w-24 flex justify-end">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      class="block w-16 sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 px-1.5 py-0.5 border border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                      :disabled="!overrides.craftingLevel"
                      :value="extras.craftingLevel"
                      @input="onIntInput($event, setCraftingLevel, 0, 30)"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1">
                  <span class="text-sm text-gray-700">Previous Crafts</span>
                  <span
                    class="font-mono text-sm text-right w-20"
                    :class="overrides.previousCrafts ? 'text-gray-400' : 'text-gray-700 font-semibold'"
                  >
                    {{ playerPreviousCrafts ?? '—' }}
                  </span>
                  <input
                    type="checkbox"
                    class="justify-self-center w-12 h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                    :checked="overrides.previousCrafts"
                    @change="setOverridePreviousCrafts(($event.target as HTMLInputElement).checked)"
                  />
                  <div class="w-24 flex justify-end">
                    <input
                      type="number"
                      min="0"
                      class="block w-16 sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 px-1.5 py-0.5 border border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                      :disabled="!overrides.previousCrafts"
                      :value="extras.previousCrafts"
                      @input="onIntInput($event, setPreviousCraftCount, 0, Number.MAX_SAFE_INTEGER)"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1">
                  <span class="text-sm text-gray-700">Fuel Tank Level</span>
                  <span
                    class="font-mono text-sm text-right w-20"
                    :class="overrides.tankLevel ? 'text-gray-400' : 'text-gray-700 font-semibold'"
                  >
                    {{ playerTankLevel ?? '—' }} / {{ maxTankLevel }}
                  </span>
                  <input
                    type="checkbox"
                    class="justify-self-center w-12 h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                    :checked="overrides.tankLevel"
                    @change="setOverrideTankLevel(($event.target as HTMLInputElement).checked)"
                  />
                  <div class="w-24 flex justify-end">
                    <input
                      type="number"
                      :min="0"
                      :max="maxTankLevel"
                      class="block w-16 sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 px-1.5 py-0.5 border border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                      :disabled="!overrides.tankLevel"
                      :value="extras.tankLevel"
                      @input="onIntInput($event, setTankLevel, 0, maxTankLevel)"
                    />
                  </div>
                </div>
              </div>

              <!-- Epic researches -->
              <div class="border-t border-gray-100 pt-2 space-y-1">
                <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1">
                  <span class="text-sm text-gray-700">FTL Drive Upgrades</span>
                  <span
                    class="font-mono text-sm text-right w-20"
                    :class="overrides.epicResearchFTLLevel ? 'text-gray-400' : 'text-gray-700 font-semibold'"
                  >
                    {{ player.epicResearchFTLLevel }} / 60
                  </span>
                  <input
                    type="checkbox"
                    class="justify-self-center w-12 h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                    :checked="overrides.epicResearchFTLLevel"
                    @change="setOverrideFTL(($event.target as HTMLInputElement).checked)"
                  />
                  <div class="w-24 flex justify-end">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      class="block w-16 sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 px-1.5 py-0.5 border border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                      :disabled="!overrides.epicResearchFTLLevel"
                      :value="config.epicResearchFTLLevel"
                      @input="onIntInput($event, setEpicResearchFTLLevel, 0, 60)"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1">
                  <span class="text-sm text-gray-700">Zero-g Quantum Containment</span>
                  <span
                    class="font-mono text-sm text-right w-20"
                    :class="overrides.epicResearchZerogLevel ? 'text-gray-400' : 'text-gray-700 font-semibold'"
                  >
                    {{ player.epicResearchZerogLevel }} / 10
                  </span>
                  <input
                    type="checkbox"
                    class="justify-self-center w-12 h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                    :checked="overrides.epicResearchZerogLevel"
                    @change="setOverrideZerog(($event.target as HTMLInputElement).checked)"
                  />
                  <div class="w-24 flex justify-end">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      class="block w-16 sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 px-1.5 py-0.5 border border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                      :disabled="!overrides.epicResearchZerogLevel"
                      :value="config.epicResearchZerogLevel"
                      @input="onIntInput($event, setEpicResearchZerogLevel, 0, 10)"
                    />
                  </div>
                </div>
              </div>

              <!-- Ships -->
              <div class="border-t border-gray-100 pt-2 space-y-1 max-h-80 overflow-y-auto">
                <template v-for="ship in spaceshipList" :key="ship">
                  <!-- Visibility row -->
                  <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1">
                    <span class="text-sm text-gray-700 truncate">{{ spaceshipName(ship) }} — Visible</span>
                    <span class="text-right w-20" :class="overrides.shipVisibility[ship] ? 'opacity-40' : ''">
                      <span class="text-sm" :class="player.shipVisibility[ship] ? 'text-green-600' : 'text-gray-400'">
                        {{ player.shipVisibility[ship] ? '✓' : '—' }}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      class="justify-self-center w-12 h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                      :checked="!!overrides.shipVisibility[ship]"
                      @change="setOverrideShipVisibility(ship, ($event.target as HTMLInputElement).checked)"
                    />
                    <div class="w-24 flex justify-end items-center">
                      <input
                        type="checkbox"
                        class="h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                        :checked="config.shipVisibility[ship]"
                        :disabled="!overrides.shipVisibility[ship]"
                        @change="setShipVisibility(ship, ($event.target as HTMLInputElement).checked)"
                      />
                    </div>
                  </div>
                  <!-- Level row -->
                  <div
                    v-if="shipMaxLevel(ship) > 0"
                    class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-1 pb-1 border-b border-gray-50"
                  >
                    <span class="text-xs text-gray-500 truncate pl-3">{{ spaceshipName(ship) }} — Level</span>
                    <div
                      class="flex justify-end items-center w-20"
                      :class="overrides.shipLevels[ship] ? 'opacity-40' : ''"
                    >
                      <ShipStars :level="player.shipLevels[ship]" :max="shipMaxLevel(ship)" />
                    </div>
                    <input
                      type="checkbox"
                      class="justify-self-center w-12 h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                      :checked="!!overrides.shipLevels[ship]"
                      @change="setOverrideShipLevel(ship, ($event.target as HTMLInputElement).checked)"
                    />
                    <div class="w-24 flex justify-end items-center">
                      <ShipStars
                        :level="config.shipLevels[ship]"
                        :max="shipMaxLevel(ship)"
                        :interactive="!!overrides.shipLevels[ship]"
                        @set="(lvl: number) => setShipLevel(ship, lvl)"
                      />
                    </div>
                  </div>
                </template>
              </div>

              <!-- Bulk actions -->
              <div class="flex justify-between items-center text-xs pt-2 border-t border-gray-100">
                <button type="button" class="text-blue-600 hover:text-blue-800" @click="takeControlOfAllShips">
                  Take control of all ships
                </button>
                <button type="button" class="text-gray-500 hover:text-gray-700" @click="resetAllOverrides">
                  Reset all overrides
                </button>
              </div>

              <!-- Mission settings (config-only, no player counterpart) -->
              <div class="border-t border-gray-100 pt-2 space-y-1">
                <div class="text-xs font-medium text-gray-500 px-1 pb-1">Mission settings</div>
                <div class="flex items-center space-x-2 px-1">
                  <input
                    id="po_show_nodata"
                    v-model="config.showNodata"
                    name="po_show_nodata"
                    type="checkbox"
                    class="focus:ring-green-500 h-3.5 w-3.5 text-green-600 border-gray-300 rounded"
                  />
                  <label for="po_show_nodata" class="text-sm text-gray-600 cursor-pointer"
                    >Show Targets with No Data</label
                  >
                </div>
                <div class="text-xs font-medium text-gray-500 px-1 pt-1">Ship Targets</div>
                <div class="text-xs text-gray-400 px-1">(Targets shown in Artifact view)</div>
                <template v-for="target in targets" :key="target">
                  <div class="flex items-center space-x-1 px-1">
                    <input
                      :id="`po_target_${target}`"
                      v-model="config.targets[target]"
                      :name="`po_target_${target}`"
                      type="checkbox"
                      class="focus:ring-green-500 h-3.5 w-3.5 text-green-600 border-gray-300 rounded"
                    />&nbsp;
                    <label :for="`po_target_${target}`" class="text-sm text-gray-600">
                      <template v-if="Number(target) !== 10000">
                        <img
                          class="inline-flex h-5 w-5"
                          :src="id2url(Number(target), 32)"
                          :alt="ei.ArtifactSpec.Name[target]"
                        />
                        {{ getTargetName(target) }}
                      </template>
                      <template v-else>Untargeted</template>
                    </label>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts">
import { computed, defineComponent, h } from 'vue';
import { Dialog, DialogOverlay, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XIcon } from '@heroicons/vue/solid';

import {
  ei,
  fuelTankSizes,
  getImageUrlFromId as id2url,
  getTargetName,
  noFragTargets as targets,
  shipMaxLevel,
  spaceshipList,
  spaceshipName,
} from 'lib';
import BaseIntegerInput from 'ui/components/BaseIntegerInput.vue';

import {
  closePlayerOverridesModal,
  config,
  extras,
  overrides,
  playerCraftingLevel,
  playerOverridesModalOpen,
  playerPreviousCrafts,
  playerShipsConfig,
  playerTankLevel,
  resetAllOverrides,
  setCraftingLevel,
  setEpicResearchFTLLevel,
  setEpicResearchZerogLevel,
  setOverrideCraftingLevel,
  setOverrideFTL,
  setOverridePreviousCrafts,
  setOverrideShipLevel,
  setOverrideShipVisibility,
  setOverrideTankLevel,
  setOverrideZerog,
  setPreviousCraftCount,
  setShipLevel,
  setShipVisibility,
  setTankLevel,
  takeControlOfAllShips,
} from '@/store';

const ShipStars = defineComponent({
  name: 'ShipStars',
  props: {
    level: { type: Number, required: true },
    max: { type: Number, required: true },
    interactive: { type: Boolean, default: false },
  },
  emits: ['set'],
  setup(props, { emit }) {
    return () => {
      const stars = [];
      // Ban / zero-out icon
      stars.push(
        h(
          'svg',
          {
            viewBox: '0 0 512 512',
            class: [
              'h-3 w-3 text-gray-400 relative top-px mr-0.5 select-none',
              props.interactive ? 'cursor-pointer' : 'cursor-default opacity-50',
            ],
            onClick: () => props.interactive && emit('set', 0),
          },
          [
            h('path', {
              fill: 'currentColor',
              d: 'M256 8C119.034 8 8 119.033 8 256s111.034 248 248 248 248-111.034 248-248S392.967 8 256 8zm130.108 117.892c65.448 65.448 70 165.481 20.677 235.637L150.47 105.216c70.204-49.356 170.226-44.735 235.638 20.676zM125.892 386.108c-65.448-65.448-70-165.481-20.677-235.637L361.53 406.784c-70.203 49.356-170.226 44.736-235.638-20.676z',
            }),
          ]
        )
      );
      for (let i = 1; i <= props.max; i++) {
        const filled = i <= props.level;
        stars.push(
          h(
            'svg',
            {
              key: i,
              viewBox: '0 0 576 512',
              class: [
                'h-3.5 w-3.5 text-yellow-400 select-none',
                props.interactive ? 'cursor-pointer' : 'cursor-default',
              ],
              onClick: () => props.interactive && emit('set', i),
            },
            [
              filled
                ? h('path', {
                    fill: 'currentColor',
                    d: 'M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z',
                  })
                : h('path', {
                    fill: 'currentColor',
                    d: 'M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z',
                  }),
            ]
          )
        );
      }
      return h('div', { class: 'flex items-center space-x-0.5' }, stars);
    };
  },
});

export default defineComponent({
  components: {
    Dialog,
    DialogOverlay,
    DialogTitle,
    TransitionChild,
    TransitionRoot,
    XIcon,
    ShipStars,
    BaseIntegerInput,
  },
  setup() {
    function onIntInput(event: Event, setter: (n: number) => void, min: number, max: number) {
      const raw = (event.target as HTMLInputElement).value.trim();
      if (!raw.match(/^-?\d+$/)) return;
      const n = parseInt(raw);
      if (n < min || n > max) return;
      setter(n);
    }

    const maxTankLevel = fuelTankSizes.length - 1;

    const allShipsVisible = computed(() => spaceshipList.every(ship => config.value.shipVisibility[ship]));
    const someShipsVisible = computed(() => spaceshipList.some(ship => config.value.shipVisibility[ship]));
    const toggleAllShips = () => {
      const newValue = !allShipsVisible.value;
      spaceshipList.forEach(ship => setShipVisibility(ship, newValue));
    };

    return {
      playerOverridesModalOpen,
      closePlayerOverridesModal,
      player: playerShipsConfig,
      playerCraftingLevel,
      playerPreviousCrafts,
      playerTankLevel,
      config,
      extras,
      overrides,
      spaceshipList,
      spaceshipName,
      shipMaxLevel,
      setCraftingLevel,
      setPreviousCraftCount,
      setEpicResearchFTLLevel,
      setEpicResearchZerogLevel,
      setShipLevel,
      setShipVisibility,
      setOverrideCraftingLevel,
      setOverridePreviousCrafts,
      setOverrideFTL,
      setOverrideZerog,
      setOverrideShipLevel,
      setOverrideShipVisibility,
      setOverrideTankLevel,
      setTankLevel,
      resetAllOverrides,
      takeControlOfAllShips,
      onIntInput,
      ei,
      id2url,
      getTargetName,
      targets,
      maxTankLevel,
      allShipsVisible,
      someShipsVisible,
      toggleAllShips,
    };
  },
});
</script>

<style scoped>
::deep(.w-number-input) {
  width: 4.5rem;
}
</style>
