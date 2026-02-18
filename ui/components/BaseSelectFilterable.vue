<script lang="tsx">
// Generically typed component pattern lifted from:
// https://logaretm.com/blog/generically-typed-vue-components/
// https://codesandbox.io/s/generic-vue-components-3etcc

// Unfortunately, <template> doesn't work with this pattern; in development mode
// everything's fine, but in production mode, the render function compiled from
// the template is simply missing; see
// https://1f91b36168d7f0e48c0c697006b826515f4e5b6b--wasmegg.netlify.app/artifact-sandbox
// for the catastrophic result (component with no render function and therefore
// renders to <!---->).
//
// As such we resort to defining the render function directly in defineComponent
// with JSX. This is not ideal since (1) another plugin required
// (@vitejs/plugin-vue-jsx); (2) mixed codebase; (3) volar/eslint is not exactly
// happen with the JSX for some reason.
//
// Note that the codesandbox example using @vue/cli-service does work even in
// production. Why it doesn't work with vite is beyond me. I'll need to consult
// with an expert. If the problem is resolved, revert to the
// 1f91b36168d7f0e48c0c697006b826515f4e5b6b version.

import {
  computed,
  defineComponent,
  nextTick,
  onMounted,
  onUnmounted,
  PropType,
  Ref,
  ref,
  toRefs,
  watchEffect,
} from 'vue';
import {
  CheckIcon,
  ExclamationCircleIcon,
  QuestionMarkCircleIcon,
  SelectorIcon,
  XIcon,
} from '@heroicons/vue/solid';
import scrollIntoView from 'scroll-into-view-if-needed';

import { iconURL } from 'lib';
import BaseIcon from './BaseIcon.vue';

class BaseSelectFilterableFactory<T = unknown> {
  define() {
    return defineComponent({
      components: {
        CheckIcon,
        ExclamationCircleIcon,
        QuestionMarkCircleIcon,
        SelectorIcon,
        XIcon,
        BaseIcon,
      },
      props: {
        modelValue: {
          type: String as PropType<string | null>,
          default: null,
        },
        items: {
          type: Array as PropType<T[]>,
          required: true,
        },
        getItemId: {
          type: Function as PropType<(item: T) => string>,
          required: true,
        },
        getItemDisplay: {
          type: Function as PropType<(item: T) => string>,
          required: true,
        },
        getItemIconPath: {
          type: Function as PropType<(item: T) => string>,
          required: true,
        },
        itemFromId: {
          type: Function as PropType<(id: string) => T>,
          required: true,
        },
        searchItems: {
          type: Function as PropType<(query: string) => T[]>,
          required: true,
        },
        placeholder: {
          type: String,
          required: true,
        },
        itemColorClass: {
          type: Function as PropType<(item: T) => string>,
          default: () => '',
        },
        allowClearing: {
          type: Boolean,
          default: false,
        },
        iconClass: {
          type: String,
          default: 'h-6 w-6',
        },
        inputPaddingClass: {
          type: String,
          default: 'pl-11',
        },
        containerClass: {
          type: String,
          default: 'max-w-sm',
        },
        showInputText: {
          type: Boolean,
          default: true,
        },
        showPlaceholderIcon: {
          type: Boolean,
          default: true,
        },
        dropdownWidthClass: {
          type: String,
          default: 'w-full',
        },
        showSelectorIcon: {
          type: Boolean,
          default: true,
        },
        iconContainerClass: {
          type: String,
          default: 'absolute inset-y-0 left-0 pl-3',
        },
      },
      emits: {
        'update:modelValue': (_payload: string | null) => true,
      },
      setup(props, { emit }) {
        const { modelValue, items, getItemId, getItemDisplay, itemFromId, searchItems } = toRefs(
          props
        );

        const dropdownRef: Ref<HTMLElement | null> = ref(null);
        const selectButtonRef: Ref<HTMLElement | null> = ref(null);
        const dropdownListRef: Ref<HTMLElement | null> = ref(null);

        const selected = computed(() =>
          modelValue.value !== null ? itemFromId.value(modelValue.value) : null
        );
        const searchFilter = ref(selected.value ? getItemDisplay.value(selected.value) : '');
        const filteredItems = computed(() =>
          searchFilter.value !== '' ? searchItems.value(searchFilter.value) : (items.value as T[])
        );
        const active: Ref<T | null> = ref(null);


        const dropdownListEntryIndex = (item: T): number => {
          for (let i = 0; i < filteredItems.value.length; i++) {
            if (isSameItem(filteredItems.value[i], item)) {
              return i;
            }
          }
          return -1;
        };
        const scrollDropdownListEntryIntoViewIfNeeded = (
          index: number,
          block: ScrollLogicalPosition = 'nearest'
        ) => {
          const node = dropdownListRef.value?.querySelector(`:scope > li:nth-child(${index + 1})`);
          if (node) {
            scrollIntoView(node, {
              scrollMode: 'if-needed',
              block,
              inline: 'nearest',
              boundary: dropdownListRef.value,
            });
          }
        };

        const open = ref(false);

        // Keep searchFilter in sync with selected item's display name when closed.
        // This ensures the UI updates correctly when state changes externally (e.g. undo).
        watchEffect(() => {
          if (!open.value) {
            searchFilter.value = selected.value !== null ? getItemDisplay.value(selected.value) : '';
          }
        });
        const openDropdown = () => {
          searchFilter.value = '';
          active.value = selected.value;
          open.value = true;
          nextTick(() => {
            if (active.value) {
              const index = dropdownListEntryIndex(active.value);
              if (index !== -1) {
                scrollDropdownListEntryIntoViewIfNeeded(index, 'center');
              }
            } else {
              scrollDropdownListEntryIntoViewIfNeeded(0);
            }
          });
        };
        const closeDropdown = () => {
          searchFilter.value = selected.value !== null ? getItemDisplay.value(selected.value) : '';
          open.value = false;
          selectButtonRef.value?.blur();
        };
        const selectItem = (item: T) => {
          emit('update:modelValue', getItemId.value(item));
          // Wait for selected entry to be updated before closing the dropdown.
          nextTick(closeDropdown);
        };
        const clearItem = () => {
          emit('update:modelValue', null);
          searchFilter.value = '';
        };
        const activateItem = (item: T) => {
          active.value = item;
        };
        const deactivateItem = () => {
          active.value = null;
        };
        const isSameItem = (i1: T | null, i2: T | null) => {
          if (i1 === null || i2 === null) {
            return false;
          }
          return getItemId.value(i1) === getItemId.value(i2);
        };

        const handleKeydown = (event: KeyboardEvent) => {
          switch (event.key) {
            case 'Enter': {
              event.preventDefault();
              // Do nothing if there are no matching entries.
              if (filteredItems.value.length === 0) {
                return;
              }
              // Select the active entry, or the first entry.
              const item = active.value ?? filteredItems.value[0];
              if (item !== null) {
                selectItem(item);
              }
              return;
            }

            case 'ArrowDown':
            case 'ArrowUp': {
              event.preventDefault();
              // Do nothing if there are no matching entries.
              if (filteredItems.value.length === 0) {
                return;
              }
              const entries = filteredItems.value;
              let currentIndex = active.value ? dropdownListEntryIndex(active.value) : -1;
              if (currentIndex === -1) {
                // No entry currently active.
                currentIndex = event.key === 'ArrowDown' ? -1 : entries.length;
              }
              const newIndex =
                (((event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1) %
                  entries.length) +
                  entries.length) %
                entries.length;
              active.value = entries[newIndex];
              scrollDropdownListEntryIntoViewIfNeeded(newIndex);
              return;
            }

            case 'Home':
            case 'End':
            case 'PageUp':
            case 'PageDown': {
              event.preventDefault();
              const entries = filteredItems.value;
              const newIndex =
                event.key === 'Home' || event.key === 'PageUp' ? 0 : entries.length - 1;
              active.value = entries[newIndex];
              scrollDropdownListEntryIntoViewIfNeeded(newIndex);
              return;
            }

            case 'Escape':
              closeDropdown();
              return;
          }
        };

        // Close dropdown when clicking or focusing elsewhere.
        const handleMousedown = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (!dropdownRef.value?.contains(target)) {
            closeDropdown();
          }
        };
        const handleFocus = () => {
          const active = document.activeElement;
          if (!dropdownRef.value?.contains(active)) {
            closeDropdown();
          }
        };
        onMounted(() => {
          window.addEventListener('mousedown', handleMousedown);
          window.addEventListener('focus', handleFocus, true);
        });
        onUnmounted(() => {
          window.removeEventListener('mousedown', handleMousedown);
          window.removeEventListener('focus', handleFocus);
        });

        return {
          dropdownRef,
          selectButtonRef,
          dropdownListRef,
          selected,
          searchFilter,
          filteredItems,
          active,
          open,
          openDropdown,
          closeDropdown,
          selectItem,
          clearItem,
          activateItem,
          deactivateItem,
          isSameItem,
          handleKeydown,
          iconURL,
        };
      },
      render() {
        return (
          <div ref="dropdownRef" class={['relative', this.containerClass]}>
            <div class="relative rounded-md shadow-sm">
              <div class={[this.iconContainerClass, 'flex items-center pointer-events-none']}>
                {this.selected && this.searchFilter === this.getItemDisplay(this.selected) ? (
                  <BaseIcon
                    iconRelPath={this.getItemIconPath(this.selected)}
                    size={64}
                    class={['flex-shrink-0', this.iconClass]}
                  />
                ) : this.showPlaceholderIcon ? (
                  <QuestionMarkCircleIcon class={['flex-shrink-0 p-px text-gray-400', this.iconClass]} />
                ) : null}
              </div>
              <input
                ref="selectButtonRef"
                value={this.open || this.showInputText ? this.searchFilter : ''}
                type="text"
                class={[
                  'Select__input bg-gray-50 focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md transition-all duration-200',
                  this.inputPaddingClass,
                  this.selected && this.searchFilter === this.getItemDisplay(this.selected)
                    ? this.itemColorClass(this.selected)
                    : null,
                  !this.showInputText && !this.open ? 'cursor-pointer' : '',
                ]}
                spellcheck="false"
                placeholder={this.placeholder}
                onInput={event => {
                  this.searchFilter = (event.target as HTMLInputElement).value;
                }}
                onFocus={this.openDropdown}
                onKeydown={this.handleKeydown}
              />
              {this.showSelectorIcon && (
                <div class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <SelectorIcon class="h-5 w-5 text-gray-400" />
                </div>
              )}
              {this.allowClearing && this.selected && (
                <div
                  class="absolute inset-y-0 right-7 flex items-center cursor-pointer"
                  onClick={this.clearItem}
                >
                  <XIcon class="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>

            <ul
              v-show={this.open}
              ref="dropdownListRef"
              class={['Select__dropdown absolute mt-1 bg-white text-gray-900 shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm z-50', this.dropdownWidthClass]}
              style={{ maxHeight: '21.5rem' }}
              tabindex="-1"
            >
              {this.filteredItems.map(item => (
                <li
                  key={this.getItemId(item)}
                  class={[
                    'cursor-default select-none relative py-0.5 pl-3 pr-9',
                    this.isSameItem(item, this.active)
                      ? 'text-white bg-blue-600'
                      : this.itemColorClass(item),
                  ]}
                  onMousedown={() => this.selectItem(item)}
                  onMouseenter={() => this.activateItem(item)}
                  onMouseleave={this.deactivateItem}
                >
                  <div class="flex items-center">
                    <BaseIcon
                      iconRelPath={this.getItemIconPath(item)}
                      size={64}
                      class={['flex-shrink-0', this.iconClass]}
                    />
                    <span
                      class={[
                        'ml-2 block truncate',
                        this.isSameItem(item, this.selected) ? 'font-semibold' : 'font-normal',
                      ]}
                    >
                      {this.getItemDisplay(item)}
                    </span>
                  </div>

                  {this.isSameItem(item, this.selected) && (
                    <span
                      class={[
                        'absolute inset-y-0 right-0 flex items-center pr-4',
                        this.isSameItem(item, this.active) ? 'text-white' : 'text-blue-600',
                      ]}
                    >
                      <CheckIcon class="h-5 w-5" />
                    </span>
                  )}
                </li>
              ))}
              {this.filteredItems.length === 0 && (
                <div class="py-0.5 pl-3 pr-9">
                  <div class="flex items-center">
                    <ExclamationCircleIcon class="flex-shrink-0 h-6 w-6 p-px text-gray-400" />
                    <span class="ml-2 block truncate">No match</span>
                  </div>
                </div>
              )}
            </ul>
          </div>
        );
      },
    });
  }
}

const main = new BaseSelectFilterableFactory().define();

export function GenericBaseSelectFilterable<T>() {
  // This now will be casted correctly!
  return main as ReturnType<BaseSelectFilterableFactory<T>['define']>;
}

export default main;
</script>
