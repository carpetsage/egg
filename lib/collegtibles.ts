import { ei } from './proto';
import { customEggs, SafeCustomEgg } from './eggs';

type Modifier = keyof typeof ei.GameModifier.GameDimension
export type ValidModifier = Exclude<Modifier, "INVALID">

type ColleggtibleBuff = {egg: string; modifier: ei.GameModifier.GameDimension; multiplier: number}

export type Modifiers = {
  earnings: number;
  awayEarnings: number;
  ihr: number;
  elr: number;
  shippingCap: number;
  habCap: number;
  vehicleCost: number;
  habCost: number;
  researchCost: number;
}

const modifierKeys = Object.keys(ei.GameModifier.GameDimension).filter(x => x!="INVALID") as ValidModifier[];
// Create map of string modifier name to enum value
const modifierNames = modifierKeys.map( m => ({ name: m, modifier: ei.GameModifier.GameDimension[m] }) )

const tiers = [10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000] as const;

// helper function to avoid constantly writing modifiers.get(modifier) ?? 1
function getModifier( modifierMap: Map<ValidModifier,number>, modifier: ValidModifier) {
  return modifierMap.get(modifier) ?? 1;
}

export function AllModifiersFromCollegtibles(
  backup: ei.IBackup
): Modifiers  {
  // Get a list of all modifiers from the enum
  const collegtibles = getAllCollegtibleProgress(backup);
  // map modifier name to modifier multiplier
  const modifiers = new Map<ValidModifier,number>(
    modifierNames.map( modifier =>
      [modifier.name, ModifierFromCollegtibles(collegtibles,modifier.modifier)]
    )
  );

  return {
    earnings: getModifier(modifiers, "EARNINGS"),
    awayEarnings: getModifier(modifiers, "AWAY_EARNINGS"),
    ihr: getModifier(modifiers, "INTERNAL_HATCHERY_RATE"),
    elr: getModifier(modifiers, "EGG_LAYING_RATE"),
    shippingCap: getModifier(modifiers, "SHIPPING_CAPACITY"),
    habCap: getModifier(modifiers, "HAB_CAPACITY"),
    vehicleCost: getModifier(modifiers, "VEHICLE_COST"),
    habCost: getModifier(modifiers, "HAB_COST"),
    researchCost: getModifier(modifiers, "RESEARCH_COST")
  };
}
function ModifierFromCollegtibles(
  collegtibles: ColleggtibleBuff[],
  modifier: ei.GameModifier.GameDimension
) {

  // filter to collegtibles matching desired buff and multiply buffs together
  const finalValue = collegtibles
    .filter(collegtible => collegtible.modifier === modifier)
    .map(collegtible => collegtible.multiplier)
    .reduce((accumulator, currentValue) => accumulator * currentValue, 1);
  return finalValue > 0 ? finalValue : 1;
}

// returns buff value or zero
export function getCollegtibleProgress (
  contracts: ei.ILocalContract[],
  egg: SafeCustomEgg
) {
  // get largest farm size of any contract of the given custom egg. Set to 0 if no contracts of given egg
  const maxFarmSize = Math.max(
    ...contracts
      .filter(c => c.contract?.customEggId === egg.identifier)
      .map(c => c.maxFarmSizeReached ?? 0)
    ,0
  );
  const tier = tiers.findLastIndex(t => maxFarmSize >= t);
  return tier >= 0 ? egg.buffs.at(tier)?.value ?? 0 : 0;
}


// returns map of egg to buff strength
export function getAllCollegtibleProgress (
  backup: ei.IBackup
) {
  const archive = backup.contracts?.archive ?? [];
  const active = backup.contracts?.contracts ?? [];
  const contracts = archive.concat(active);
  const progress: ColleggtibleBuff[] = customEggs.map(egg => ({egg: egg.identifier, modifier: egg.buffs[0].dimension, multiplier: getCollegtibleProgress(contracts,egg)}));
  return progress;
}
