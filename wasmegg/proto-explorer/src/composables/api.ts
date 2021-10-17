import { ref, Ref } from 'vue';

import { ei, encodeMessage, getLocalStorage, request, setLocalStorage } from 'lib';
import { MessageName } from '@/lib';

const ENCODED_REQUEST_PAYLOAD_LOCALSTORAGE_KEY = 'encoded_request_payload';
const ENCODED_RESPONSE_PAYLOAD_LOCALSTORAGE_KEY = 'encoded_response_payload';

export function useAPIClient(
  endpoint: string,
  requestMessageName: MessageName,
  getRequestPayloadObject: () => Record<string, unknown>
): {
  encodedRequestPayload: Ref<string | null>;
  encodedResponsePayload: Ref<string | null>;
  requestError: Ref<string | null>;
  loading: Ref<boolean>;
  sendRequest: () => void;
} {
  const encodedRequestPayload: Ref<string | null> = ref(
    getLocalStorage(ENCODED_REQUEST_PAYLOAD_LOCALSTORAGE_KEY) || ''
  );
  const encodedResponsePayload: Ref<string | null> = ref(
    getLocalStorage(ENCODED_RESPONSE_PAYLOAD_LOCALSTORAGE_KEY) || ''
  );
  const requestError: Ref<string | null> = ref(null);
  const loading = ref(false);

  // requestId is used to track whether the request being handled has been
  // superseded by another request.
  let requestId: number | undefined;

  const sendRequest = async () => {
    const thisRequestId = Math.floor(Math.random() * 65536);
    requestId = thisRequestId;
    loading.value = true;
    encodedResponsePayload.value = null;
    requestError.value = null;

    encodedRequestPayload.value = encodeMessage(ei[requestMessageName], getRequestPayloadObject());
    let err: Error | null = null;
    let response: string | null = null;
    try {
      response = await request(endpoint, encodedRequestPayload.value);
    } catch (e) {
      err = e instanceof Error ? e : new Error(`${e}`);
    }

    if (requestId === thisRequestId) {
      encodedResponsePayload.value = response;
      requestError.value = err !== null ? `${err}` : null;
      if (err === null) {
        setLocalStorage(ENCODED_REQUEST_PAYLOAD_LOCALSTORAGE_KEY, encodedRequestPayload.value);
        setLocalStorage(ENCODED_RESPONSE_PAYLOAD_LOCALSTORAGE_KEY, encodedResponsePayload.value);
      } else {
        setLocalStorage(ENCODED_REQUEST_PAYLOAD_LOCALSTORAGE_KEY, '');
        setLocalStorage(ENCODED_RESPONSE_PAYLOAD_LOCALSTORAGE_KEY, '');
      }
    }

    loading.value = false;
  };

  return {
    encodedRequestPayload,
    encodedResponsePayload,
    requestError,
    loading,
    sendRequest,
  };
}
