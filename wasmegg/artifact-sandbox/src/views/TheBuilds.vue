<template>
  <div class="xl:flex xl:max-w-full xl:justify-center w-full mx-auto">
    <div class="xl:flex xl:justify-end xl:flex-1 border-b border-dark-30 xl:border-b-0 xl:border-r xl:border-dark-30">
      <div class="w-full px-4 py-4 max-w-4xl mx-auto xl:mx-0">
        <div class="text-center text-sm text-green-200 mb-2">
          <a href="/smart-assistant/" target="_blank" class="bg-green-700 hover:text-green-300 px-1 underline"
            >Smart assistant</a
          >
          can
          <span class="underline">automatically recommend optimal prestige loadouts</span> taylored for you. Highly
          recommended!<br />
          You can also preload your stats and any active artifact loadout without manual entry using
          <a href="/rockets-tracker/" target="_blank" class="bg-green-700 hover:text-green-300 px-1 underline"
            >Rockets tracker</a
          >.<br />
          Check the &ldquo;artifact loadouts&rdquo; section there.
        </div>
        <artifact-set-builder :key="key" v-model:build="builds.builds[0]" />
        <the-configurator :key="key" v-model:config="builds.config" />
      </div>
    </div>

    <div class="xl:flex xl:flex-1">
      <div class="w-full px-4 py-4 max-w-4xl mx-auto xl:mx-0">
        <div class="my-2 text-center">
          <button
            type="button"
            class="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-dark-30"
            @click="showShareSheet = true"
          >
            Share this build
            <svg
              class="ml-2 -mr-0.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"
              />
            </svg>
          </button>
        </div>

        <div id="builds" class="max-w-4xl w-full mx-auto px-4 py-4 overflow-hidden bg-dark-25 rounded-xl">
          <artifact-set-display :key="key" :build="builds.builds[0]" :config="builds.config" />
          <hr class="border-dark-30" />
          <artifact-sets-effects
            :key="key"
            :builds="builds"
            :show-footnotes="showShareSheet && showFootnotesWhenSharing"
          />
          <div class="mt-2 text-center text-xs text-dark-60">Built on https://ei.tcl.sh/sandbox</div>
        </div>
      </div>
    </div>
  </div>

  <share-sheet
    :key="key"
    v-model:show="showShareSheet"
    v-model:show-footnotes="showFootnotesWhenSharing"
    :builds="builds"
  />
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs, watch } from 'vue';
import { onBeforeRouteUpdate, useRouter } from 'vue-router';

import { Builds } from '@/lib';
import ArtifactSetBuilder from '@/components/ArtifactSetBuilder.vue';
import ArtifactSetDisplay from '@/components/ArtifactSetDisplay.vue';
import ArtifactSetsEffects from '@/components/ArtifactSetsEffects.vue';
import TheConfigurator from '@/components/TheConfigurator.vue';
import ShareSheet from '@/components/ShareSheet.vue';

export default defineComponent({
  components: {
    ArtifactSetBuilder,
    ArtifactSetDisplay,
    ArtifactSetsEffects,
    TheConfigurator,
    ShareSheet,
  },

  props: {
    serializedBuilds: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },

  setup(props) {
    const router = useRouter();
    const { serializedBuilds } = toRefs(props);

    // Use a key to work around the problem of artifact-set-builder and
    // configurator not updating upon manual hashchange.
    const key = ref(0);
    const builds = ref(deserializeBuilds(serializedBuilds.value));
    const showShareSheet = ref(false);
    const showFootnotesWhenSharing = ref(true);

    watch(
      builds,
      () => {
        window.history.replaceState(
          {},
          '',
          router.resolve({
            name: 'builds',
            params: { serializedBuilds: builds.value.serialize() },
          }).href
        );
      },
      {
        deep: true,
      }
    );

    onBeforeRouteUpdate(to => {
      // On manual hashchange, flip key to rerender everything.
      const newSerializedBuilds = to.params.serializedBuilds as string | undefined;
      builds.value = deserializeBuilds(newSerializedBuilds);
      key.value = 1 - key.value;
    });

    return {
      key,
      builds,
      showShareSheet,
      showFootnotesWhenSharing,
    };
  },
});

function deserializeBuilds(s: string | undefined): Builds {
  let builds = Builds.newDefaultBuilds();
  if (s) {
    try {
      builds = Builds.deserialize(s);
    } catch (e) {
      console.error(`error deserializing ${s}`);
      console.error(e);
    }
  }
  return builds;
}
</script>
