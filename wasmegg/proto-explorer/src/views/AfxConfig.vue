<template>
  <api-requester
    api-endpoint="/ei_afx/config"
    request-message="ArtifactsConfigurationRequest"
    response-message="ArtifactsConfigurationResponse"
    :persist-form-data="() => {}"
    :get-request-payload-object="getRequestPayloadObject"
    :eiafxdata-format="eiafxdata"
  >
    <template #form-body>
      <div class="flex items-center">
        <input
          id="eiafxdata"
          v-model="eiafxdata"
          name="eiafxdata"
          type="checkbox"
          class="h-4 w-4 text-blue-600 focus:outline-none border-gray-300 rounded"
        />
        <label for="eiafxdata" class="ml-2 block text-sm text-gray-900">
          Format like eiafx-data
        </label>
      </div>
      <request-button :form-valid="true" />
    </template>
  </api-requester>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';

import { ei, getLocalStorage, setLocalStorage } from 'lib';
import ApiRequester from '@/components/APIRequester.vue';
import RequestButton from '@/components/RequestButton.vue';
import { basicRequestInfo } from '../../../../lib/api/index';

type ArtifactsConfigurationRequestPayload = Omit<ei.IArtifactsConfigurationRequest, ''>;
const EIAFXDATA_LOCALSTORAGE_KEY = 'eiafxdata';

export default defineComponent({
  components: {
    ApiRequester,
    RequestButton,
  },
  setup() {
    const getRequestPayloadObject = (): ArtifactsConfigurationRequestPayload => ({
      rinfo: basicRequestInfo(atob('RUk2MjkxOTQwOTY4MjM1MDA4')),
    });
    const eiafxdata = ref(getLocalStorage(EIAFXDATA_LOCALSTORAGE_KEY) === 'true');
    watch(eiafxdata, () =>
      setLocalStorage(EIAFXDATA_LOCALSTORAGE_KEY, eiafxdata.value)
    );
    return {
      eiafxdata,
      getRequestPayloadObject,
    };
  },
});
</script>
