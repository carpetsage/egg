// @heroicons/vue does not have type declarations.
// https://github.com/tailwindlabs/heroicons/issues/252
// https://github.com/tailwindlabs/heroicons/pull/254
declare module '@heroicons/vue/solid' {
  import { DefineComponent } from 'vue';
  export let BanIcon: DefineComponent;
  export let CheckIcon: DefineComponent;
  export let SelectorIcon: DefineComponent;
}
