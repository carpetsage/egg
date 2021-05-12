import { ei } from './proto';

export function eggName(egg: ei.Egg): string {
  const symbol = ei.Egg[egg];
  return symbol
    .split('_')
    .map(word => word[0] + word.substring(1).toLowerCase())
    .join(' ');
}

export function eggValue(egg: ei.Egg): number {
  switch (egg) {
    case ei.Egg.EDIBLE:
      return 0.1;
    case ei.Egg.SUPERFOOD:
      return 1.25;
    case ei.Egg.MEDICAL:
      return 6.25;
    case ei.Egg.ROCKET_FUEL:
      return 30;
    case ei.Egg.SUPER_MATERIAL:
      return 150;
    case ei.Egg.FUSION:
      return 700;
    case ei.Egg.QUANTUM:
      return 3_000;
    case ei.Egg.IMMORTALITY:
      return 12_500;
    case ei.Egg.TACHYON:
      return 50_000;
    case ei.Egg.GRAVITON:
      return 175_000;
    case ei.Egg.DILITHIUM:
      return 525_000;
    case ei.Egg.PRODIGY:
      return 1_500_000;
    case ei.Egg.TERRAFORM:
      return 10_000_000;
    case ei.Egg.ANTIMATTER:
      return 1e9;
    case ei.Egg.DARK_MATTER:
      return 1e11;
    case ei.Egg.AI:
      return 1e12;
    case ei.Egg.NEBULA:
      return 1.5e13;
    case ei.Egg.UNIVERSE:
      return 1e14;
    case ei.Egg.ENLIGHTENMENT:
      return 1e-7;
    case ei.Egg.CHOCOLATE:
      return 5;
    case ei.Egg.EASTER:
      return 0.05;
    case ei.Egg.WATERBALLOON:
      return 0.1;
    case ei.Egg.FIREWORK:
      return 4.99;
    case ei.Egg.PUMPKIN:
      return 0.99;
    case ei.Egg.UNKNOWN:
      return 0;
  }
}

export function eggIconPath(egg: ei.Egg): string {
  switch (egg) {
    case ei.Egg.EDIBLE:
      return 'egginc/egg_edible.png';
    case ei.Egg.SUPERFOOD:
      return 'egginc/egg_superfood.png';
    case ei.Egg.MEDICAL:
      return 'egginc/egg_medical2.png';
    case ei.Egg.ROCKET_FUEL:
      return 'egginc/egg_rocketfuel.png';
    case ei.Egg.SUPER_MATERIAL:
      return 'egginc/egg_supermaterial.png';
    case ei.Egg.FUSION:
      return 'egginc/egg_fusion.png';
    case ei.Egg.QUANTUM:
      return 'egginc/egg_quantum.png';
    case ei.Egg.IMMORTALITY:
      return 'egginc/egg_immortality.png';
    case ei.Egg.TACHYON:
      return 'egginc/egg_tachyon.png';
    case ei.Egg.GRAVITON:
      return 'egginc/egg_graviton.png';
    case ei.Egg.DILITHIUM:
      return 'egginc/egg_dilithium.png';
    case ei.Egg.PRODIGY:
      return 'egginc/egg_prodigy.png';
    case ei.Egg.TERRAFORM:
      return 'egginc/egg_terraform.png';
    case ei.Egg.ANTIMATTER:
      return 'egginc/egg_antimatter.png';
    case ei.Egg.DARK_MATTER:
      return 'egginc/egg_darkmatter.png';
    case ei.Egg.AI:
      return 'egginc/egg_ai.png';
    case ei.Egg.NEBULA:
      return 'egginc/egg_vision.png';
    case ei.Egg.UNIVERSE:
      return 'egginc/egg_universe.png';
    case ei.Egg.ENLIGHTENMENT:
      return 'egginc/egg_enlightenment.png';
    case ei.Egg.CHOCOLATE:
      return 'egginc/egg_chocolate.png';
    case ei.Egg.EASTER:
      return 'egginc/egg_easter.png';
    case ei.Egg.WATERBALLOON:
      return 'egginc/egg_waterballoon.png';
    case ei.Egg.FIREWORK:
      return 'egginc/egg_firework.png';
    case ei.Egg.PUMPKIN:
      return 'egginc/egg_pumpkin.png';
    case ei.Egg.UNKNOWN:
      return 'egginc/egg_unknown.png';
  }
}
