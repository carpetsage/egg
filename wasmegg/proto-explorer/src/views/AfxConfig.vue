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

import { CLIENT_VERSION, ei } from 'lib';
import ApiRequester from '@/components/APIRequester.vue';
import RequestButton from '@/components/RequestButton.vue';

type ArtifactsConfigurationRequestPayload = Omit<ei.IArtifactsConfigurationRequest, ''>;

export default defineComponent({
  components: {
    ApiRequester,
    RequestButton,
  },
  setup() {
    const getRequestPayloadObject = (): ArtifactsConfigurationRequestPayload => ({
      clientVersion: CLIENT_VERSION,
    });
    return {
      getRequestPayloadObject,
    };
  },
});
</script>
