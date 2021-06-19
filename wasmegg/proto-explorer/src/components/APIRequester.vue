<template>
  <div class="flex flex-col flex-1 pt-1 pb-4">
    <div class="flex flex-col flex-1 max-w-4xl w-full mx-auto px-4 xl:px-0 space-y-2 mt-2">
      <form
        class="space-y-2"
        @submit.prevent="
          persistFormData();
          sendRequest();
        "
      >
        <slot name="form-body"></slot>
      </form>

      <div v-if="encodedRequestPayload">
        <label for="message" class="flex items-center text-sm font-medium text-gray-700">
          Request payload
          <copy-button class="ml-1" :content="encodedRequestPayload" />
        </label>
        <textarea
          id="request"
          v-model="encodedRequestPayload"
          class="mt-1 px-3 py-2 w-full resize-y border border-gray-300 rounded-md text-base sm:text-xs font-mono"
          :rows="1"
          spellcheck="false"
          readonly
        ></textarea>
      </div>

      <base-loading v-if="loading" class="text-sm text-gray-700">
        Waiting for server response...
      </base-loading>

      <div v-if="!loading && encodedResponsePayload">
        <label for="message" class="flex items-center text-sm font-medium text-gray-700">
          Response payload
          <copy-button class="ml-1" :content="encodedResponsePayload" />
        </label>
        <textarea
          id="response"
          v-model="encodedResponsePayload"
          class="mt-1 px-3 py-2 w-full resize-y border border-gray-300 rounded-md text-base sm:text-xs font-mono"
          spellcheck="false"
          readonly
        ></textarea>
      </div>

      <div
        v-if="requestError !== null"
        class="text-xs text-red-500 font-mono font-medium whitespace-pre-wrap break-words"
      >
        {{ requestError }}
      </div>

      <decode-result
        v-show="!loading && encodedResponsePayload"
        :message-name="responseMessage"
        :authenticated="responseAuthenticated"
        :encoded-payload="encodedResponsePayload || ''"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, toRefs } from 'vue';

import { useAPIClient } from '@/composables/api';
import { MessageName } from '@/lib';
import BaseLoading from 'ui/components/BaseLoading.vue';
import CopyButton from '@/components/CopyButton.vue';
import DecodeResult from '@/components/DecodeResult.vue';

export default defineComponent({
  components: {
    BaseLoading,
    CopyButton,
    DecodeResult,
  },

  props: {
    apiEndpoint: {
      type: String,
      required: true,
    },
    requestMessage: {
      type: String as PropType<MessageName>,
      required: true,
    },
    responseMessage: {
      type: String as PropType<MessageName>,
      required: true,
    },
    responseAuthenticated: {
      type: Boolean,
      default: true,
    },
    persistFormData: {
      type: Function as PropType<() => void>,
      required: true,
    },
    getRequestPayloadObject: {
      type: Function as PropType<() => Record<string, unknown>>,
      required: true,
    },
  },

  setup(props) {
    const { apiEndpoint, requestMessage, getRequestPayloadObject } = toRefs(props);
    const {
      encodedRequestPayload,
      encodedResponsePayload,
      requestError,
      loading,
      sendRequest,
    } = useAPIClient(apiEndpoint.value, requestMessage.value, getRequestPayloadObject.value);
    return {
      encodedRequestPayload,
      encodedResponsePayload,
      requestError,
      loading,
      sendRequest,
    };
  },
});
</script>

<style scoped>
textarea#request {
  min-height: 2rem;
}

textarea#response {
  min-height: 6rem;
}
</style>
