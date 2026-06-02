<template>
  <api-requester
    api-endpoint="/ei_ctx/get_contracts_info"
    request-message="ContractsInfoRequest"
    response-message="ContractsInfoResponse"
    :response-authenticated="true"
    :persist-form-data="persistFormData"
    :get-request-payload-object="getRequestPayloadObject as () => Record<string, unknown>"
  >
    <template #form-body>
      <parameter-input
        v-model.trim="userId"
        name="user_id"
        label="User ID"
        placeholder="Ex: EI1234567890123456"
        :required="true"
      />
      <parameter-input
        v-model.trim="contractIdentifiersRaw"
        name="contract_identifiers"
        label="Contract identifiers"
        placeholder="Ex: contract-1, contract-2, contract-3"
        :required="true"
      />
      <parameter-input
        v-model.number="clientVersion"
        name="client_version"
        label="Client version"
        placeholder="Ex: 999"
        type="number"
      />
      <request-button :form-valid="formValid" />
    </template>
  </api-requester>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';

import { basicRequestInfo, ei, getLocalStorage, setLocalStorage } from 'lib';
import ApiRequester from '@/components/APIRequester.vue';
import ParameterInput from '@/components/ParameterInput.vue';
import RequestButton from '@/components/RequestButton.vue';

const USER_ID_LOCALSTORAGE_KEY = 'user_id';
const CONTRACT_IDS_LOCALSTORAGE_KEY = 'contract_identifiers';
const CLIENT_VERSION_LOCALSTORAGE_KEY = 'client_version';

export default defineComponent({
  components: {
    ApiRequester,
    ParameterInput,
    RequestButton,
  },
  setup() {
    const userId = ref(getLocalStorage(USER_ID_LOCALSTORAGE_KEY) || '');
    const contractIdentifiersRaw = ref(getLocalStorage(CONTRACT_IDS_LOCALSTORAGE_KEY) || '');
    const clientVersion = ref<string>(getLocalStorage(CLIENT_VERSION_LOCALSTORAGE_KEY) || '');

    const formValid = computed(() => userId.value !== '' && contractIdentifiersRaw.value !== '');

    const persistFormData = () => {
      setLocalStorage(USER_ID_LOCALSTORAGE_KEY, userId.value);
      setLocalStorage(CONTRACT_IDS_LOCALSTORAGE_KEY, contractIdentifiersRaw.value);
      setLocalStorage(CLIENT_VERSION_LOCALSTORAGE_KEY, clientVersion.value);
    };

    const getRequestPayloadObject = (): ei.IContractsInfoRequest => ({
      rinfo: basicRequestInfo(userId.value),
      contractIdentifiers: contractIdentifiersRaw.value
        .split(/[,\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0),
      clientVersion: clientVersion.value ? Number(clientVersion.value) : undefined,
    });

    return {
      userId,
      contractIdentifiersRaw,
      clientVersion,
      formValid,
      persistFormData,
      getRequestPayloadObject,
    };
  },
});
</script>

<style scoped>
::v-deep(textarea#request) {
  min-height: 3rem !important;
}
</style>
