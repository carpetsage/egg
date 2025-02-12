/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// declare module "vuex" {
// export * from "vuex/types/index.d.ts";
// export * from "vuex/types/helpers.d.ts";
// export * from "vuex/types/logger.d.ts";
// export * from "vuex/types/vue.d.ts";
// }
