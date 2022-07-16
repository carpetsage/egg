<template>
  <api-requester
    api-endpoint="/ei/bot_first_contact"
    request-message="EggIncFirstContactRequest"
    response-message="EggIncFirstContactResponse"
    :response-authenticated="false"
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
      <parameter-input
        v-model.trim="deviceId"
        name="device_id"
        label="Device ID"
        placeholder="Optional"
      />
      <parameter-input
        v-model.trim="gameServicesId"
        name="game_services_id"
        label="Game services ID"
        placeholder="Optional"
      />
      <request-button :form-valid="formValid" />
    </template>
  </api-requester>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';

import {
  basicRequestInfo,
  CLIENT_VERSION,
  ei,
  getLocalStorage,
  PLATFORM,
  setLocalStorage,
} from 'lib';
import ApiRequester from '@/components/APIRequester.vue';
import ParameterInput from '@/components/ParameterInput.vue';
import RequestButton from '@/components/RequestButton.vue';

type EggIncFirstContactRequestPayload = Omit<ei.IEggIncFirstContactRequest, ''>;

const USER_ID_LOCALSTORAGE_KEY = 'user_id';
const DEVICE_ID_LOCALSTORAGE_KEY = 'device_id';
const GAME_SERVICES_ID_LOCALSTORAGE_KEY = 'game_services_id';

export default defineComponent({
  components: {
    ApiRequester,
    ParameterInput,
    RequestButton,
  },
  setup() {
    const userId = ref(getLocalStorage(USER_ID_LOCALSTORAGE_KEY) || '');
    const deviceId = ref(getLocalStorage(DEVICE_ID_LOCALSTORAGE_KEY) || '');
    const gameServicesId = ref(getLocalStorage(GAME_SERVICES_ID_LOCALSTORAGE_KEY) || '');
    const formValid = computed(() => userId.value !== '');

    const persistFormData = () => {
      setLocalStorage(USER_ID_LOCALSTORAGE_KEY, userId.value);
      setLocalStorage(DEVICE_ID_LOCALSTORAGE_KEY, deviceId.value);
      setLocalStorage(GAME_SERVICES_ID_LOCALSTORAGE_KEY, gameServicesId.value);
    };

    const getRequestPayloadObject = (): EggIncFirstContactRequestPayload => ({
      clientVersion: CLIENT_VERSION,
      platform: PLATFORM,
      eiUserId: userId.value,
      deviceId: deviceId.value || 'wasmegg',
      gameServicesId: gameServicesId.value || null,
      rinfo: basicRequestInfo(userId.value),
    });

    return {
      userId,
      deviceId,
      gameServicesId,
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
