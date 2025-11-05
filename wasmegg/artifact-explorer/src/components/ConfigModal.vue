<template>
  <TransitionRoot as="template" :show="configModalOpen">
    <Dialog as="div" class="fixed z-10 inset-0 overflow-y-auto" @close="closeConfigModal">
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

        <!-- This element is to trick the browser into centering the modal contents. -->
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
            class="inline-block bg-white rounded-lg px-6 pt-4 pb-6 text-left overflow-hidden shadow-xl transform transition-all my-8 align-middle max-w-sm w-full p-6 space-y-3 relative"
          >
            <DialogTitle as="h3" class="text-center text-base font-medium text-gray-900">
              Mission configuration
            </DialogTitle>

            <button class="absolute -top-3 right-0 inline-flex rounded-md p-2 focus:outline-none">
              <XIcon class="h-4 w-4 text-gray-500 hover:text-gray-600" aria-hidden="true" @click="closeConfigModal" />
            </button>

            <div>
              <label for="epic_research_ftl" class="block">
                <div class="text-sm font-medium text-gray-700">FTL Drive Upgrades</div>
                <div class="text-sm text-gray-500">(Mission time reducing epic research)</div>
              </label>
              <div class="relative flex items-center w-20 mt-2">
                <base-integer-input
                  id="epic_research_ftl"
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
              <label for="epic_research_zerog" class="block">
                <div class="text-sm font-medium text-gray-700">Zero-g Quantum Containment</div>
                <div class="text-sm text-gray-500">(Mission capacity increasing epic research)</div>
              </label>
              <div class="relative flex items-center w-20 mt-2">
                <base-integer-input
                  id="epic_research_zerog"
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
                      :id="`ship_visibility_${ship}`"
                      v-model="config.shipVisibility[ship]"
                      :name="`ship_visibility_${ship}`"
                      type="checkbox"
                      class="focus:ring-green-500 h-3 w-3 text-green-600 border-gray-300 rounded"
                    />
                    <span class="text-sm">{{ spaceshipName(ship) }}</span>
                  </div>
                  <div v-if="shipMaxLevel(ship) > 0" class="flex items-center space-x-0.5">
                    <!-- fa: solid/ban -->
                    <svg
                      viewBox="0 0 512 512"
                      class="h-3 w-3 text-gray-400 relative top-px mr-0.5 select-none cursor-pointer"
                      @click="setShipLevel(ship, 0)"
                    >
                      <path
                        fill="currentColor"
                        d="M256 8C119.034 8 8 119.033 8 256s111.034 248 248 248 248-111.034 248-248S392.967 8 256 8zm130.108 117.892c65.448 65.448 70 165.481 20.677 235.637L150.47 105.216c70.204-49.356 170.226-44.735 235.638 20.676zM125.892 386.108c-65.448-65.448-70-165.481-20.677-235.637L361.53 406.784c-70.203 49.356-170.226 44.736-235.638-20.676z"
                      />
                    </svg>
                    <!-- fa: solid/star and regular/star -->
                    <svg
                      v-for="i in shipMaxLevel(ship)"
                      :key="i"
                      viewBox="0 0 576 512"
                      class="h-3.5 w-3.5 text-yellow-400 select-none cursor-pointer"
                      @click="setShipLevel(ship, i)"
                    >
                      <path
                        v-if="i <= config.shipLevels[ship]"
                        fill="currentColor"
                        d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"
                      />
                      <path
                        v-else
                        fill="currentColor"
                        d="M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z"
                      />
                    </svg>
                  </div>
                </div>
              </template>
              <div class="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-200">
                <input
                  id="ship_visibility_all"
                  :checked="allShipsVisible"
                  :indeterminate="someShipsVisible && !allShipsVisible"
                  name="ship_visibility_all"
                  type="checkbox"
                  class="focus:ring-green-500 h-3.5 w-3.5 text-green-600 border-gray-300 rounded"
                  @change="toggleAllShips"
                />
                <label for="ship_visibility_all" class="text-sm text-gray-600 cursor-pointer">
                  Show/Hide All Ships
                </label>
              </div>
            </div>
            <div>
              <!-- Display targets with insufficient data -->
              <div class="flex items-center space-x-0.5">
                <input
                  :id="`show_nodata`"
                  v-model="config.showNodata"
                  :name="`show_nodata`"
                  type="checkbox"
                  class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                />&nbsp;
                <label class="text-sm text-gray-600"> Show Targets with No data </label>
              </div>
            </div>
            <!-- Target Selection for Artifact Page -->
            <div>
              <div class="text-sm font-medium text-gray-700">Ship Targets</div>
              <div class="text-sm text-gray-500">(Targets shown in Artifact view)</div>
              <template v-for="target in targets" :key="target">
                <div class="flex items-center space-x-0.5">
                  <input
                    :id="`target_${target}`"
                    v-model="config.targets[target]"
                    :name="`target_${target}`"
                    type="checkbox"
                    class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                  />&nbsp;
                  <label :for="`target_${target}`" class="text-sm text-gray-600">
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
          </div>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { Dialog, DialogOverlay, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XIcon } from '@heroicons/vue/solid';

import BaseIntegerInput from 'ui/components/BaseIntegerInput.vue';
import {
  ei,
  iconURL,
  getTargetName,
  getImageUrlFromId as id2url,
  shipMaxLevel,
  spaceshipIconPath,
  spaceshipList,
  spaceshipName,
  noFragTargets as targets,
} from 'lib';
import {
  closeConfigModal,
  config,
  configModalOpen,
  setEpicResearchFTLLevel,
  setEpicResearchZerogLevel,
  setShipLevel,
  setShipVisibility,
} from '@/store';

export default defineComponent({
  components: {
    Dialog,
    DialogOverlay,
    DialogTitle,
    TransitionChild,
    TransitionRoot,
    BaseIntegerInput,
    XIcon,
  },
  setup() {
    const allShipsVisible = computed(() => spaceshipList.every(ship => config.value.shipVisibility[ship]));
    const someShipsVisible = computed(() => spaceshipList.some(ship => config.value.shipVisibility[ship]));

    const toggleAllShips = () => {
      const newValue = !allShipsVisible.value;
      spaceshipList.forEach(ship => {
        setShipVisibility(ship, newValue);
      });
    };

    return {
      configModalOpen,
      closeConfigModal,
      config,
      ei,
      id2url,
      iconURL,
      getTargetName,
      spaceshipList,
      spaceshipName,
      shipMaxLevel,
      spaceshipIconPath,
      setEpicResearchFTLLevel,
      setEpicResearchZerogLevel,
      setShipLevel,
      setShipVisibility,
      targets,
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
