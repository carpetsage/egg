<template>
  <the-nav-bar active-entry-id="artifact-sandbox" :center-icons="true">
    <font-switcher />
  </the-nav-bar>

  <main class="flex-1 w-full mx-auto">
    <h1 class="mx-4 my-4 text-center text-lg leading-6 font-medium uppercase">Artifact sandbox</h1>
    <div class="mt-4">
      <router-view />
    </div>
  </main>

  <teleport to="body">
    <footer class="py-4 text-center text-xs text-dark-80">
      <div>
        Copyright &copy; 2021
        <a href="https://wasmegg.netlify.app/" target="_blank" class="underline hover:text-dark-70"
          >@mk2</a
        >
      </div>
      <div>Image assets copyright &copy; 2016-2021 Auxbrain, Inc.</div>
      <div>Image assets for artifact glowing effects courtesy of @mikit (Egg, Inc. Discord)</div>
      <div>
        Font:
        <a
          href="https://www.dafont.com/always-together.font"
          target="_blank"
          class="underline hover:text-dark-70"
          >Always Together</a
        >
      </div>
      <div>
        <a
          href="https://github.com/fanaticscripter/Egg/tree/master/wasmegg/artifact-sandbox"
          target="_blank"
          class="underline hover:text-dark-70"
          >Source code</a
        >
        (MIT license)
      </div>
    </footer>
  </teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import TheNavBar from 'ui/components/NavBar.vue';
import FontSwitcher from '@/components/FontSwitcher.vue';

export default defineComponent({
  components: {
    TheNavBar,
    FontSwitcher,
  },
});
</script>
