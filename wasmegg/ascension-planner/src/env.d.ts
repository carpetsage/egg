/// <reference types="vite/client" />

// Injected by vite.config.ts's `define` — see there for how these are computed.
declare const __APP_COMMIT__: string;
declare const __APP_COMMIT_TIME__: string;
declare const __APP_BUILD_TIME__: string;

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
