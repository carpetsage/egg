<template>
  <h1 class="mb-4 text-center text-h1 leading-6 font-medium text-gray-900">Privacy Policy</h1>

  <p>
    For tools that may include confidential information directly in URLs, e.g. the CoopTracker with
    coop codes, since the URL you directly land on (but not the ones you later navigate to) is
    collected by the analytics service, the confidential information may leak into analytics logs,
    and leaked data could be accessed with some effort. In that case, I will not disclose the
    information without a compelling reason (haven't found one to date) and without confirming it is
    already public or having express permission. Also rest assured that I have zero interest in
    joining or even checking your coop, really.
  </p>

  <p>
    Tools that ask for input like your player ID or coop code in order to display personalized
    information communicate with Egg, Inc.'s server through an intermediary due to browser
    restrictions preventing direct connectivity. The intermediary is a Cloudflare Workers domain
    under the author's control:
    <base-link href="https://workers.dev/">wasmegg.zw.workers.dev</base-link>. Confidential
    information used in communications through this domain is not logged.
  </p>

  <p><base-router-link :to="{ name: 'home' }">Back to home page</base-router-link></p>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import BaseLink from '@/components/BaseLink.vue';
import BaseRouterLink from '@/components/BaseRouterLink.vue';

export default defineComponent({
  components: {
    BaseLink,
    BaseRouterLink,
  },
});
</script>

<style lang="postcss" scoped>
p {
  @apply my-4;
}
</style>
