<template>
  <base-collapsible-panel title="Frequently asked questions" :collapse="!show" :toggle="toggle">
    <dl class="mt-2 space-y-2">
      <div>
        <dt class="text-green-700 dark:text-green-300">
          What is the meaning of the various colors and patterns in a progress bar?
        </dt>
        <dd class="mt-1 text-gray-900 dark:text-gray-100">
          The solid darker green bar
          <span class="inline-block h-4 w-4 bg-green-500 border border-gray-300 relative top-0.5"></span>
          is confirmed production (already checked-in); the solid lighter green bar
          <span class="inline-block h-4 w-4 bg-green-350 border border-gray-300 relative top-0.5"></span>
          is currently estimated production taking into account how long each member has been offline (i.e., it would be
          the confirmed value if everyone checked-in now); the striped bar
          <span class="inline-block h-4 w-4 ProgressBar--striped border border-gray-300 relative top-0.5"></span>
          is projected total production before contract expiration. You can hover over or click on the progress bar to
          reveal more details in a tooltip. In general, many UI elements can be hovered over or clicked on to reveal
          more information. If you don't see a lighter green bar you may need to disable your Dark Reader or other dark
          mode browser extension. This site has a dark mode already.
        </dd>
      </div>

      <div>
        <dt class="text-green-700 dark:text-green-300">Is population growth taken into account in projections?</dt>
        <dd class="mt-1 text-gray-900 dark:text-gray-100">
          Unfortunately no. For coops, the game's API simply does not expose enough information to make it possible. For
          non-coops, it is possible to predict population growth if the game is kept offline, but potential active play
          (which disturbs internal hatchery calm) and the fact that the game syncs at unpredictable moments makes
          projection unreliable, and considerable over-projection possible in some common scenarios. Therefore, the
          feature is not implemented for now out of an abundance of caution. With enough user interest, this feature can
          be reconsidered.
        </dd>
      </div>

      <div>
        <dt class="text-green-700 dark:text-green-300">Why do I need to click a button to load coop status?</dt>
        <dd class="mt-1 text-gray-900 dark:text-gray-100">
          The game's API now requires your EID to check coop status. When eicoop does that, it intercepts any tokens
          sent to you that haven't been received yet. These typically show up 30 minutes later, but occasionally they
          may not appear at all. Since checking coop status can interfere with your incoming tokens, it now requires
          manual action, unless you enable the "Auto-load coops" checkbox
        </dd>
      </div>
    </dl>
  </base-collapsible-panel>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

import { getLocalStorage, setLocalStorage } from '@/lib';
import BaseCollapsiblePanel from '@/components/BaseCollapsiblePanel.vue';

const SHOW_FAQ_LOCALSTORAGE_KEY = 'showFaq';

export default defineComponent({
  components: {
    BaseCollapsiblePanel,
  },
  setup() {
    const show = ref(getLocalStorage(SHOW_FAQ_LOCALSTORAGE_KEY, '') !== 'false');
    const toggle = () => {
      show.value = !show.value;
      setLocalStorage(SHOW_FAQ_LOCALSTORAGE_KEY, show.value, '');
    };
    return {
      show,
      toggle,
    };
  },
});
</script>
