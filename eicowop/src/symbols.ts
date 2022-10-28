import { InjectionKey, Ref } from 'vue';

export const devmodeKey: InjectionKey<Ref<boolean>> = Symbol();
export const refreshCallbackKey: InjectionKey<() => void> = Symbol();
