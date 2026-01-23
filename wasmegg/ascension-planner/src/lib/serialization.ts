import { AscensionPlan, IAscensionPlan, VirtueEgg } from './schema';
import type { AscensionStep as AppStep, VirtueEgg as AppVirtueEgg } from '@/types';

// Helper to convert Uint8Array to binary string for base64 encoding
function uint8ArrayToBinaryString(arr: Uint8Array): string {
  let result = '';
  for (let i = 0; i < arr.length; i++) {
    result += String.fromCharCode(arr[i]);
  }
  return result;
}

// Helper to convert binary string back to Uint8Array
function binaryStringToUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

// Map app virtue egg type to proto enum
const APP_TO_PROTO_EGG: Record<AppVirtueEgg, VirtueEgg> = {
  curiosity: VirtueEgg.CURIOSITY,
  integrity: VirtueEgg.INTEGRITY,
  kindness: VirtueEgg.KINDNESS,
  humility: VirtueEgg.HUMILITY,
  resilience: VirtueEgg.RESILIENCE,
};

// Map proto enum to app virtue egg type
const PROTO_TO_APP_EGG: Record<VirtueEgg, AppVirtueEgg | null> = {
  [VirtueEgg.VIRTUE_EGG_UNKNOWN]: null,
  [VirtueEgg.CURIOSITY]: 'curiosity',
  [VirtueEgg.INTEGRITY]: 'integrity',
  [VirtueEgg.KINDNESS]: 'kindness',
  [VirtueEgg.HUMILITY]: 'humility',
  [VirtueEgg.RESILIENCE]: 'resilience',
};

/**
 * Encode an ascension plan to a base64 string using protobuf
 */
export function encodePlan(steps: AppStep[]): string {
  const plan: IAscensionPlan = {
    steps: steps.map(step => ({
      id: step.id,
      eggType: APP_TO_PROTO_EGG[step.eggType],
      expanded: step.expanded,
    })),
  };

  const buffer = AscensionPlan.encode(plan).finish();
  const encoded = btoa(uint8ArrayToBinaryString(buffer));
  return encoded;
}

/**
 * Decode a base64 string back to an ascension plan using protobuf
 */
export function decodePlan(encoded: string): AppStep[] {
  const buffer = binaryStringToUint8Array(atob(encoded));
  const plan = AscensionPlan.decode(buffer);

  return (plan.steps || [])
    .map(step => {
      const eggType = PROTO_TO_APP_EGG[step.eggType ?? VirtueEgg.VIRTUE_EGG_UNKNOWN];
      if (!eggType) return null;

      return {
        id: step.id || crypto.randomUUID().slice(0, 7),
        eggType,
        visitNumber: 0, // Will be recalculated
        expanded: step.expanded ?? false,
      } as AppStep;
    })
    .filter((step): step is AppStep => step !== null);
}
