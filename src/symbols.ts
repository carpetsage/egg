import { InjectionKey } from 'vue';

export const refreshCallbackKey: InjectionKey<() => void> = Symbol();
