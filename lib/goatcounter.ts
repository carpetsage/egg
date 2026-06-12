declare global {
  interface Window {
    goatcounter:
      | {
          count: (options: { path: string; title: string; event: boolean }) => void;
        }
      | undefined;
  }
}

export const goatcounter = typeof window === 'undefined' ? undefined : window.goatcounter;
