<template>
  <api-requester
    api-endpoint="/ei_ctx/get_contracts_archive"
    request-message="BasicRequestInfo"
    response-message="ContractsArchive"
    :response-authenticated="true"
    :persist-form-data="persistFormData"
    :get-request-payload-object="getRequestPayloadObject"
  >
    <template #form-body>
      <parameter-input
        v-model.trim="userId"
        name="user_id"
        label="User ID"
        placeholder="Ex: EI1234567890123456"
        :required="true"
      />
      <request-button :form-valid="formValid" />
    </template>
  </api-requester>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';

import {
  basicRequestInfo,
  ei,
  getLocalStorage,
  setLocalStorage,
} from 'lib';
import ApiRequester from '@/components/APIRequester.vue';
import ParameterInput from '@/components/ParameterInput.vue';
import RequestButton from '@/components/RequestButton.vue';

type BasicRequestInfoPayload = Omit<ei.IBasicRequestInfo, ''>;

const USER_ID_LOCALSTORAGE_KEY = 'user_id';

export default defineComponent({
  components: {
    ApiRequester,
    ParameterInput,
    RequestButton,
  },
  setup() {
    const userId = ref(getLocalStorage(USER_ID_LOCALSTORAGE_KEY) || '');
    const formValid = computed(() => userId.value !== '');

    const persistFormData = () => {
      setLocalStorage(USER_ID_LOCALSTORAGE_KEY, userId.value);
    };

    const getRequestPayloadObject = (): BasicRequestInfoPayload => basicRequestInfo(userId.value);

    return {
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
