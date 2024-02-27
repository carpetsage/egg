<template>
  <api-requester
    api-endpoint="/ei_afx/config"
    request-message="ArtifactsConfigurationRequest"
    response-message="ArtifactsConfigurationResponse"
    :persist-form-data="() => {}"
    :get-request-payload-object="getRequestPayloadObject"
  >
    <template #form-body>
      <request-button :form-valid="true" />
    </template>
  </api-requester>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { ei } from 'lib';
import ApiRequester from '@/components/APIRequester.vue';
import RequestButton from '@/components/RequestButton.vue';
import { basicRequestInfo } from '../../../../lib/api/index';

type ArtifactsConfigurationRequestPayload = Omit<ei.IArtifactsConfigurationRequest, ''>;

export default defineComponent({
  components: {
    ApiRequester,
    RequestButton,
  },
  setup() {
    const getRequestPayloadObject = (): ArtifactsConfigurationRequestPayload => ({
      rinfo: basicRequestInfo(atob('RUk2MjkxOTQwOTY4MjM1MDA4')),
    });
    return {
      getRequestPayloadObject,
    };
  },
});
</script>
