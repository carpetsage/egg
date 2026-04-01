<template>
  <api-requester
    api-endpoint="/ei/coop_status_bot"
    request-message="ContractCoopStatusRequest"
    response-message="ContractCoopStatusResponse"
    :persist-form-data="persistFormData"
    :get-request-payload-object="getRequestPayloadObject"
  >
    <template #form-body>
      <parameter-input
        v-model.trim="contractId"
        name="contract_id"
        label="Contract ID"
        placeholder="Ex: graviton-project"
        :required="true"
      />
      <parameter-input v-model.trim="coopCode" name="coop_code" label="Coop code" :required="true" />
      <parameter-input
        v-model.trim="userId"
        name="user_id"
        label="User ID"
        placeholder="Optional, a valid one by default"
      />
      <request-button :form-valid="formValid" />
    </template>
  </api-requester>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';

import { basicRequestInfo, CLIENT_VERSION, ei, getLocalStorage, setLocalStorage } from 'lib';
import ApiRequester from '@/components/APIRequester.vue';
import ParameterInput from '@/components/ParameterInput.vue';
import RequestButton from '@/components/RequestButton.vue';

type ContractCoopStatusRequestPayload = Omit<ei.IContractCoopStatusRequest, ''>;

const CONTRACT_ID_LOCALSTORAGE_KEY = 'contract_id';
const COOP_CODE_LOCALSTORAGE_KEY = 'coop_code';
const USER_ID_LOCALSTORAGE_KEY = 'user_id';

export default defineComponent({
  components: {
    ApiRequester,
    ParameterInput,
    RequestButton,
  },

  setup() {
    const contractId = ref(getLocalStorage(CONTRACT_ID_LOCALSTORAGE_KEY) || '');
    const coopCode = ref(getLocalStorage(COOP_CODE_LOCALSTORAGE_KEY) || '');
    const userId = ref(getLocalStorage(USER_ID_LOCALSTORAGE_KEY) || '');
    const formValid = computed(() => contractId.value !== '' && coopCode.value != '');

    const persistFormData = () => {
      setLocalStorage(CONTRACT_ID_LOCALSTORAGE_KEY, contractId.value);
      setLocalStorage(COOP_CODE_LOCALSTORAGE_KEY, coopCode.value);
      setLocalStorage(USER_ID_LOCALSTORAGE_KEY, userId.value);
    };

    const getRequestPayloadObject = (): ContractCoopStatusRequestPayload => {
      const uid = userId.value || atob('RUk1NDc5OTE2NjQyNzYyNzUy');
      return {
        contractIdentifier: contractId.value,
        coopIdentifier: coopCode.value.toLowerCase(),
        userId: uid,
        clientVersion: CLIENT_VERSION,
        rinfo: basicRequestInfo(uid),
      };
    };

    return {
      contractId,
      coopCode,
      userId,
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
