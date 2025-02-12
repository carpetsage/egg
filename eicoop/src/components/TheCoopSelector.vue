<template>
  <base-modal
    :should-show="shouldShow"
    :hide="hide"
    @before-enter="ensureDefaultContractId"
    @after-enter="focusCoopCodeInput"
  >
    <div>
      <form class="space-y-4" @submit="submit">
        <fieldset class="space-y-2 min-w-0">
          <coop-selector-contract-select v-model="selectedContractId" :contracts="contracts" />

          <label class="block text-sm text-gray-900 dark:text-gray-100" for="contract_id_manual">
            Or manually enter the contract ID:
          </label>

          <div>
            <div class="mt-1">
              <base-input
                id="contract_id_manual"
                v-model.trim="manuallyEnteredContractId"
                name="contract_id_manual"
                type="text"
                class="appearance-none block w-full px-3 py-2 text-base border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500 !duration-0"
                placeholder="Contract ID"
                spellcheck="false"
                autocapitalize="off"
              />
            </div>
            <p class="mt-2 -mb-1 text-xs text-gray-500">
              The contract ID is not visible within the game.
              <base-info
                v-tippy="{
                  content: `If you're on the Egg, Inc. Discord server, you can find the ID in the #contracts channel, or through the bot command 'ecci'.`,
                }"
                class="inline relative -top-px"
              />
            </p>
          </div>
        </fieldset>

        <div class="w-full border-t border-gray-300"></div>

        <div>
          <div class="mt-1">
            <base-input
              id="coop_code"
              ref="coopCodeInputRef"
              v-model.trim="coopCode"
              name="coop_code"
              type="text"
              required
              class="appearance-none block w-full px-3 py-2 text-base border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500 !duration-0"
              placeholder="Coop Code"
              spellcheck="false"
              autocapitalize="off"
            />
          </div>
        </div>

        <div class="mt-5 sm:mt-6">
          <button
            type="submit"
            class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:text-sm disabled:opacity-50 disabled:cursor-default disabled:hover:bg-blue-600 !duration-0"
            :disabled="!submittable"
          >
            View coop status
          </button>
        </div>
      </form>
    </div>
  </base-modal>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import hotkeys from 'hotkeys-js';

import BaseInfo from 'ui/components/BaseInfo.vue';
import BaseInput from 'ui/components/BaseInput.vue';
import BaseModal from '@/components/BaseModal.vue';
import CoopSelectorContractSelect from '@/components/CoopSelectorContractSelect.vue';
import useCoopSelectorStore from '@/stores/coopSelector';
import useContractsStore from '@/stores/contracts';

export default defineComponent({
  components: {
    BaseInfo,
    BaseInput,
    BaseModal,
    CoopSelectorContractSelect,
  },
  setup() {
    const coopSelectorStore = useCoopSelectorStore();
    const contractsStore = useContractsStore();
    const router = useRouter();
    const route = useRoute();

    const shouldShow = computed(() => coopSelectorStore.showModal);
    const toggle = () => coopSelectorStore.toggle();
    const hide = () => coopSelectorStore.hide();
    onMounted(() =>
      hotkeys('c', event => {
        event.preventDefault();
        toggle();
      })
    );
    watch(shouldShow, () => {
      if (shouldShow.value) {
        hotkeys('esc', () => hide());
      } else {
        hotkeys.unbind('esc');
      }
    });
    onBeforeUnmount(() => {
      hotkeys.unbind('c');
      hotkeys.unbind('esc');
    });

    const contracts = computed(() => [...contractsStore.deduplicatedList].reverse());

    const storeContractId = computed(() => coopSelectorStore.selectedContractId);
    const selectedContractId = ref(storeContractId.value || '');
    const manuallyEnteredContractId = ref('');
    const coopCode = ref('');
    const contractId = computed(() => manuallyEnteredContractId.value || selectedContractId.value);
    const submittable = computed(() => contractId.value !== '' && coopCode.value !== '');

    const submit = (event: Event) => {
      event.preventDefault();
      if (!submittable.value) {
        return;
      }
      hide();
      router.push({
        name: 'coop',
        params: {
          contractId: contractId.value,
          coopCode: coopCode.value.toLowerCase(),
        },
      });
    };

    watch(selectedContractId, () => {
      if (selectedContractId.value !== '') {
        manuallyEnteredContractId.value = '';
      }
      coopSelectorStore.selectContract(selectedContractId.value);
    });
    watch(manuallyEnteredContractId, () => {
      if (manuallyEnteredContractId.value !== '') {
        selectedContractId.value = '';
      }
    });
    watch(storeContractId, () => {
      if (storeContractId.value !== selectedContractId.value) {
        selectedContractId.value = storeContractId.value;
        manuallyEnteredContractId.value = '';
      }
    });

    // Automatically set contractId and coopCode based on route params.
    watch(
      () => route.params,
      () => {
        if (route.params.contractId) {
          selectedContractId.value = route.params.contractId as string;
        }
        if (route.params.coopCode) {
          coopCode.value = route.params.coopCode as string;
        }
      }
    );

    // Pre-select the latest contract if none is selected.
    const ensureDefaultContractId = () => {
      if (selectedContractId.value === '' && manuallyEnteredContractId.value === '' && contracts.value.length > 0) {
        selectedContractId.value = contracts.value[0].id;
      }
    };

    // Ref to coop code input in order to focus on it when the modal is shown.
    const coopCodeInputRef = ref(null as HTMLElement | null);

    // Ideally we should just use the initial-focus property on base-modal,
    // which is functionality provided by headlessui/Dialog. In reality, this
    // feature is seriously broken and simply locks the focus, making it
    // impossible to use the other input:
    // https://github.com/tailwindlabs/headlessui/issues/542
    const focusCoopCodeInput = () => {
      coopCodeInputRef.value?.focus();
    };

    return {
      shouldShow,
      hide,
      contracts,
      selectedContractId,
      manuallyEnteredContractId,
      coopCode,
      submittable,
      submit,
      coopCodeInputRef,
      ensureDefaultContractId,
      focusCoopCodeInput,
    };
  },
});
</script>
