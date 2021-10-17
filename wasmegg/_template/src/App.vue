<template>
  <the-nav-bar />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">
    @@TITLE@@
  </h1>

  <div class="max-w-5xl w-full px-4 pb-4 xl:px-0 mx-auto"></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import TheNavBar from 'ui/components/NavBar.vue';

export default defineComponent({
  components: {
    TheNavBar,
  },
});
</script>
