<template>
  <main class="flex-1 w-full mx-auto">
    <h1 class="mx-4 my-4 text-center text-lg leading-6 font-medium uppercase">Artifact sandbox</h1>
    <div class="mt-4">
      <div class="max-w-3xl w-full mx-auto px-4 mb-4 text-sm leading-tight space-y-2">
        <div v-if="activeNews.length > 0" class="text-green-500">
          <p class="uppercase">What's New</p>
          <ul v-for="(news, index) in activeNews" :key="index">
            <li>
              {{ news.datetime.toISOString().substring(0, 10) }} &mdash;
              <span v-html="news.content"></span>
            </li>
          </ul>
        </div>
      </div>
      <router-view />
    </div>
  </main>

  <font-switcher />

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

<script>
import FontSwitcher from '@/components/FontSwitcher.vue';

export default {
  components: {
    FontSwitcher,
  },

  data() {
    return {
      news: [
        {
          datetime: new Date(1614525360000),
          expiry: new Date(1614784563000),
          content: `Boosts support: New <span class="uppercase">active boost effects</span>
          configuration section, new stats “SE gain w/ empty habs start” and “Boost duration”,
          as well as a guide on optimizing SE gain from prestiges.`,
        },
      ],
    };
  },

  computed: {
    activeNews() {
      const now = new Date();
      return this.news.filter(entry => now < entry.expiry);
    },
  },
};
</script>
