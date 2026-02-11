import { defineStore } from 'pinia';

export interface SalesState {
    research: boolean;
    hab: boolean;
    vehicle: boolean;
}

export const useSalesStore = defineStore('sales', {
    state: (): SalesState => ({
        research: false,
        hab: false,
        vehicle: false,
    }),
    actions: {
        setSaleActive(type: keyof SalesState, active: boolean) {
            this[type] = active;
        }
    }
});
