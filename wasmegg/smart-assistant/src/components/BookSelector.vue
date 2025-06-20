<template>
  <Listbox v-model="selected" as="div" class="sm:max-w-xs" :disabled="disabled">
    <ListboxLabel class="block text-sm">Book of Basan:</ListboxLabel>
    <div class="mt-1 relative">
      <ListboxButton
        class="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <span class="flex items-center">
          <img v-if="selected" :src="iconURL(selected.iconPath, 64)" class="flex-shrink-0 h-6 w-6 rounded-full" />
          <ban-icon v-else class="flex-shrink-0 h-6 w-6 p-1 rounded-full text-gray-500" />
          <span class="ml-1.5 block truncate" :class="artifactRarityFgClass(selected?.afxRarity ?? 0)">
            <template v-if="selected">T{{ selected.tierNumber }}, {{ selected.rarity }}</template>
            <template v-else>No book</template>
          </span>
          <span v-if="selected" :class="ownedBookIds.includes(selected.id) ? 'text-green-500' : 'text-red-500'"
            >&nbsp;<template v-if="ownedBookIds.includes(selected.id)">(owned)</template
            ><template v-else>(not owned)</template></span
          >
        </span>
        <span class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <SelectorIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>

      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions
          class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
        >
          <ListboxOption
            v-for="(book, index) in books"
            :key="index"
            v-slot="{ active: isActive, selected: isSelected }"
            as="template"
            :value="book"
          >
            <li
              :class="[
                isActive ? 'text-white bg-blue-500' : 'text-gray-900',
                'cursor-default select-none relative py-0.5 pl-3 pr-9',
              ]"
            >
              <div class="flex items-center">
                <img v-if="book" :src="iconURL(book.iconPath, 64)" class="flex-shrink-0 h-6 w-6 rounded-full" />
                <ban-icon
                  v-else
                  class="flex-shrink-0 h-6 w-6 p-1 rounded-full"
                  :class="isActive ? 'text-white' : 'text-gray-500'"
                />
                <span
                  class="ml-1.5 block truncate"
                  :class="[
                    isSelected ? 'font-semibold' : 'font-normal',
                    isActive ? 'text-white' : artifactRarityFgClass(book?.afxRarity ?? 0),
                  ]"
                >
                  <template v-if="book">T{{ book.tierNumber }}, {{ book.rarity }}</template>
                  <template v-else>No book</template>
                </span>
                <span
                  v-if="book"
                  :class="isActive ? 'text-white' : ownedBookIds.includes(book.id) ? 'text-green-500' : 'text-red-500'"
                  >&nbsp;<template v-if="ownedBookIds.includes(book.id)">(owned)</template
                  ><template v-else>(not owned)</template></span
                >
              </div>

              <span
                v-if="isSelected"
                :class="[
                  isActive ? 'text-white' : 'text-blue-600',
                  'absolute inset-y-0 right-0 flex items-center pr-4',
                ]"
              >
                <CheckIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs, watch } from 'vue';
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { BanIcon, CheckIcon, SelectorIcon } from '@heroicons/vue/solid';

import { ei, iconURL } from 'lib';
import { Book, books } from '@/lib';

import Rarity = ei.ArtifactSpec.Rarity;

export default defineComponent({
  components: {
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
    BanIcon,
    CheckIcon,
    SelectorIcon,
  },
  props: {
    ownedBookIds: {
      type: Array as PropType<string[]>,
      required: true,
    },
    selectedBook: {
      type: Object as PropType<Book | null>,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    'update:selectedBook': (_payload: Book | null) => true,
  },
  setup(props, { emit }) {
    const { selectedBook } = toRefs(props);
    const selected = ref(selectedBook.value);
    watch(selected, () => {
      emit('update:selectedBook', selected.value);
    });
    return {
      books: [null, ...books],
      selected,
      iconURL,
      artifactRarityFgClass,
    };
  },
});

function artifactRarityFgClass(afxRarity: Rarity): string {
  switch (afxRarity) {
    case Rarity.COMMON:
      return '';
    case Rarity.RARE:
      return 'text-rare';
    case Rarity.EPIC:
      return 'text-epic';
    case Rarity.LEGENDARY:
      return 'text-legendary';
  }
}
</script>

<style lang="postcss" scoped>
.text-rare {
  @apply text-blue-500;
}

.text-epic {
  @apply text-purple-500;
}

.text-legendary {
  @apply text-yellow-500;
}
</style>
