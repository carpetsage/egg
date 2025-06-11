<template>
  <api-requester
    api-endpoint="/ei/get_periodicals"
    request-message="GetPeriodicalsRequest"
    response-message="PeriodicalsResponse"
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

import { basicRequestInfo, ei, getLocalStorage, setLocalStorage } from 'lib';
import ApiRequester from '@/components/APIRequester.vue';
import ParameterInput from '@/components/ParameterInput.vue';
import RequestButton from '@/components/RequestButton.vue';

type GetPeriodicalsRequestPayload = Omit<ei.IGetPeriodicalsRequest, ''>;

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

    const getRequestPayloadObject = (): GetPeriodicalsRequestPayload => ({
      userId: userId.value,
      currentClientVersion: 999,
      rinfo: basicRequestInfo(userId.value),
    });

    return {
      userId,
      formValid,
      persistFormData,
      getRequestPayloadObject,
    };
  },
});
</script>
