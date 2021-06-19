<template>
  <api-requester
    api-endpoint="/ei_afx/complete_mission"
    request-message="MissionRequest"
    response-message="CompleteMissionResponse"
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
        v-model.trim="missionId"
        name="mission_id"
        label="Mission ID"
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

type MissionRequestPayload = Omit<ei.IMissionRequest, ''>;

const USER_ID_LOCALSTORAGE_KEY = 'user_id';
const MISSION_ID_LOCALSTORAGE_KEY = 'mission_id';

export default defineComponent({
  components: {
    ApiRequester,
    ParameterInput,
    RequestButton,
  },
  setup() {
    const userId = ref(getLocalStorage(USER_ID_LOCALSTORAGE_KEY) || '');
    const missionId = ref(getLocalStorage(MISSION_ID_LOCALSTORAGE_KEY) || '');
    const formValid = computed(() => userId.value !== '' && missionId.value !== '');

    const persistFormData = () => {
      setLocalStorage(USER_ID_LOCALSTORAGE_KEY, userId.value);
      setLocalStorage(MISSION_ID_LOCALSTORAGE_KEY, missionId.value);
    };

    const getRequestPayloadObject = (): MissionRequestPayload => ({
      eiUserId: userId.value,
      info: {
        identifier: missionId.value,
      },
      rinfo: basicRequestInfo(userId.value),
    });

    return {
      userId,
      missionId,
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
