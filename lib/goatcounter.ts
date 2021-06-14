declare global {
  interface Window {
    goatcounter:
      | {
          count: (options: { path: string; title: string; event: boolean }) => void;
        }
      | undefined;
  }
}

export const goatcounter = window.goatcounter;
