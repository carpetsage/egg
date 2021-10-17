<template>
  <the-nav-bar width-classes="max-w-4xl px-4 xl:px-0" />
  <router-view name="header" />
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
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
