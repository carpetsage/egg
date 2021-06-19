<template>
  <div class="flex flex-col flex-1 space-y-2">
    <div class="text-sm font-medium text-gray-700 break-words">
      <div
        v-if="decodeError !== null"
        class="text-xs text-red-500 font-mono font-medium whitespace-pre-wrap break-words"
      >
        {{ decodeError }}
      </div>

      <div v-if="decodedMAC !== null">
        Message authentication code:
        <span class="text-xs font-mono">{{ decodedMAC }}</span>
      </div>

      <div v-if="messageName">
        <router-link
          :to="{ name: 'doc', hash: `#ei.${messageName}` }"
          target="_blank"
          class="hover:text-gray-500 border-b border-gray-500 border-dashed"
        >
          <code class="text-xs font-mono">{{ messageName }}</code> documentation
        </router-link>
      </div>
    </div>

    <div
      v-show="decodedPayload !== null"
      class="flex flex-col flex-1 relative"
      :style="{ minHeight: '24rem' }"
    >
      <div ref="editorRef" class="absolute h-full w-full border border-gray-300 rounded-md"></div>
      <copy-button
        class="absolute top-1 left-1 z-50"
        :content="formattedDecodedPayload"
        tooltip="Copy decoded payload as JSON"
      />
    </div>

    <div
      v-show="decodedPayload !== null"
      class="text-sm text-gray-700 flex flex-row flex-wrap items-center"
    >
      <label for="ei-raw-value" class="mr-2">Format EI value:</label>
      <div class="flex flex-row flex-1 min-w-full sm:min-w-max items-center">
        <input
          id="ei-raw-value"
          v-model.number="eiValue"
          class="flex-1 max-w-xs shadow-sm px-2 py-1 text-base sm:text-sm border-gray-300 rounded appearance-none mr-1"
          type="number"
          placeholder="Ex. 10000000000000 (=10T)"
        />
        <template v-if="formattedEIValue !== ''"> = {{ formattedEIValue }} </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  PropType,
  Ref,
  ref,
  toRefs,
  watch,
} from 'vue';
import { Ace, config, edit } from 'ace-builds';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/ext-searchbox';
import AceWorkerJsonInline from 'ace-builds/src-noconflict/worker-json.js?url';
import * as $protobuf from 'protobufjs/minimal';

config.setModuleUrl('ace/mode/json_worker', AceWorkerJsonInline);

import { decodeMessage, ei, formatEIValue } from 'lib';
import CopyButton from '@/components/CopyButton.vue';
import { MessageName } from '@/lib';

export default defineComponent({
  components: {
    CopyButton,
  },

  props: {
    messageName: {
      type: String as PropType<MessageName>,
      required: true,
    },
    authenticated: {
      type: Boolean,
      required: true,
    },
    encodedPayload: {
      type: String,
      required: true,
    },
  },

  setup(props) {
    const { messageName, authenticated, encodedPayload } = toRefs(props);
    const eiValue = ref('');

    const decodeResult = computed(() => {
      if (!messageName.value || !encodedPayload.value) {
        return {};
      }
      const result = decode(messageName.value, encodedPayload.value, authenticated.value);
      // If decoding failed, see if we can decode as authenticated instead.
      if (result.error !== undefined && !authenticated.value) {
        const resultAsAuthenticated = decode(messageName.value, encodedPayload.value, true);
        if (resultAsAuthenticated.error === undefined) {
          resultAsAuthenticated.error =
            `Failed to decode directlly, but successfully decoded as authenticated message. Forgot to check the box?\n` +
            `(${result.error})`;
          return resultAsAuthenticated;
        }
      }
      return result;
    });

    const decodedPayload = computed(() => {
      const { payload = null } = decodeResult.value;
      return payload;
    });

    const decodedMAC = computed(() => {
      const { code = null } = decodeResult.value;
      return code;
    });

    const decodeError = computed(() => {
      const { error = null } = decodeResult.value;
      return error;
    });

    const formattedDecodedPayload = computed(() => {
      const decoded = decodedPayload.value;
      return decoded === null ? '' : JSON.stringify(decoded, null, 2);
    });

    const formattedEIValue = computed(() => {
      const val = eiValue.value;
      return val === '' || isNaN(Number(val)) ? '' : formatEIValue(Number(val));
    });

    const editorRef: Ref<HTMLElement | null> = ref(null);
    let editor: Ace.Editor | null = null;

    onMounted(() => {
      editor = edit(editorRef.value!);
      editor.setReadOnly(true);
      editor.setOption('tabSize', 2);
      editor.session.setMode('ace/mode/json');
      editor.session.setUseWrapMode(true);
      editor.session.setValue(formattedDecodedPayload.value);
    });

    watch(formattedDecodedPayload, () => editor?.session.setValue(formattedDecodedPayload.value));

    onBeforeUnmount(() => {
      editor?.destroy();
    });

    return {
      editorRef,
      eiValue,
      decodedPayload,
      decodedMAC,
      decodeError,
      formattedDecodedPayload,
      formattedEIValue,
    };
  },
});

function decode(
  messageName: MessageName,
  encoded: string,
  authenticated: boolean
): { payload?: Record<string, unknown>; code?: string; error?: string } {
  if (authenticated) {
    const wrapperResult = decode('AuthenticatedMessage', encoded, false);
    if (wrapperResult.error !== undefined) {
      return {
        error: wrapperResult.error,
      };
    }
    const wrapperPayload = wrapperResult.payload as { message?: string; code?: string };
    const innerResult = decode(messageName, wrapperPayload.message || '', false);
    return {
      ...innerResult,
      code: wrapperPayload.code,
    };
  }

  try {
    return {
      payload: decodeMessage(ei[messageName], encoded, false),
    };
  } catch (e) {
    if (e instanceof $protobuf.util.ProtocolError) {
      const partiallyDecoded = e.instance;
      return {
        payload: partiallyDecoded.toJSON(),
        error: `Partially decoded due to error: ${e}.`,
      };
    } else {
      return {
        error: `Decoding failed with error: ${e}.`,
      };
    }
  }
}
</script>

<style scoped>
/* Disable spin button for number input */
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
}
</style>
