<template>
  <base-modal
    :shouldShow="shouldShow"
    :hide="hide"
    :beforeEnter="ensureDefaultContractId"
    :afterEnter="focusCoopCodeInput"
  >
    <div>
      <form class="space-y-4" @submit="submit">
        <fieldset class="space-y-2 min-w-0">
          <label class="block text-sm text-gray-900 dark:text-gray-100" for="contract_id_selected">
            Select a contract:
          </label>

          <coop-selector-contract-select v-model="selectedContractId" :contracts="contracts" />

          <label class="block text-sm text-gray-900 dark:text-gray-100" for="contract_id_manual">
            Or manually enter the contract ID:
          </label>

          <div>
            <div class="mt-1">
              <input
                id="contract_id_manual"
                name="contract_id_manual"
                type="text"
                class="appearance-none block w-full px-3 py-2 text-base border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500"
                placeholder="Contract ID"
                spellcheck="false"
                autocapitalize="off"
                v-model.trim="manuallyEnteredContractId"
              />
            </div>
            <p class="mt-2 -mb-1 text-xs text-gray-500">
              The contract ID is not visible within the game.
              <base-info classes="h-3.5 w-3.5" class="align-middle relative -top-0.5">
                If you're on the Egg, Inc. Discord server, you can find the ID in the #contracts
                channel, or through the bot command "ecci".
              </base-info>
            </p>
          </div>
        </fieldset>

        <div class="w-full border-t border-gray-300"></div>

        <div>
          <div class="mt-1">
            <input
              ref="coopCodeInput"
              id="coop_code"
              name="coop_code"
              type="text"
              required
              class="appearance-none block w-full px-3 py-2 text-base border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500"
              placeholder="Coop Code"
              spellcheck="false"
              autocapitalize="off"
              v-model.trim="coopCode"
            />
          </div>
        </div>

        <div class="mt-5 sm:mt-6">
          <button
            type="submit"
            class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:text-sm disabled:opacity-50 disabled:cursor-default disabled:hover:bg-blue-600"
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
import { useStore } from 'vuex';
import hotkeys from 'hotkeys-js';

import { Contract } from '@/lib';
import { key } from '@/store';
import BaseInfo from './BaseInfo.vue';
import BaseModal from '@/components/BaseModal.vue';
import CoopSelectorContractSelect from '@/components/CoopSelectorContractSelect.vue';

export default defineComponent({
  components: {
    BaseInfo,
    BaseModal,
    CoopSelectorContractSelect,
  },
  setup() {
    const store = useStore(key);
    const router = useRouter();
    const route = useRoute();

    const shouldShow = computed(() => store.state.coopSelector.showModal);
    const toggle = () => store.commit('coopSelector/toggle');
    const hide = () => store.commit('coopSelector/hide');
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

    const contracts = computed(
      () => store.getters['contracts/deduplicatedList'].reverse() as Contract[]
    );

    const storeContractId = computed(() => store.state.coopSelector.selectedContractId);
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
          contractId: contractId.value.toLowerCase(),
          coopCode: coopCode.value.toLowerCase(),
        },
      });
    };

    watch(selectedContractId, () => {
      if (selectedContractId.value !== '') {
        manuallyEnteredContractId.value = '';
      }
      store.commit('coopSelector/selectContract', selectedContractId.value);
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
      if (
        selectedContractId.value === '' &&
        manuallyEnteredContractId.value === '' &&
        contracts.value.length > 0
      ) {
        selectedContractId.value = contracts.value[0].id;
      }
    };

    // Focus coop code when modal is shown.
    const coopCodeInput = ref(null as HTMLElement | null);
    const focusCoopCodeInput = () => {
      coopCodeInput.value?.focus();
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
      coopCodeInput,
      ensureDefaultContractId,
      focusCoopCodeInput,
      selectedContract: ref(''),
    };
  },
});
</script>
