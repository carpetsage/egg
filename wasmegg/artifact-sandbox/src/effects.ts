export const effects = [
  { id: 'eb', name: 'EB', note: 'Earning bonus, as shown on the prestige screen.' },
  {
    id: 'role',
    name: 'Role',
    note: 'This is the role (rank) corresponding to the earning bonus, as used in the Egg, Inc. Discord.',
  },
  {
    id: 'earnings',
    name: 'Earnings',
    note: 'Aggregate effect on bock earning rate from earning bonus increase, egg value increase, and egg laying rate increase (not considering shipping-limited scenarios). Running chicken bonus is not taken into account here; see “Earnings w/ max RCB” instead. Indirect bonus from boosted chicken population growth is not included.',
  },
  {
    id: 'earnings-away',
    name: 'Away Earnings',
    note: 'Aggregate effect on AFK bock earning rate from earning bonus increase, egg value increase, egg laying rate increase, and away earning bonuses (not considering shipping-limited scenarios). Indirect bonus from boosted chicken population growth is not included.',
  },
  {
    id: 'earnings-away-relative',
    name: 'Away Earnings (Relative)',
    note: 'Away Earnings divided by running chicken bonus to provide a number comparable to online earning.',
  },
  { id: 'max-rcb', name: 'Max RCB', note: 'Max running chicken bonus.' },
  {
    id: 'earnings-max-rcb',
    name: 'Earnings w/ max RCB',
    note: 'Increase in bock earning rate assuming the respective max running chicken bonus is attained with and without artifacts.',
  },
  {
    id: 'se-gain',
    name: 'SE gain',
    note: 'Soul egg earning rate multiplier from bock earning rate bonus (with max RCB) and soul egg collection rate bonus. The late game dampening exponent (0.21) is used; may not be accurate for early game players. Indirect bonus from boosted chicken population growth is not included; see “SE gain w/ empty habs start” instead.',
  },
  {
    id: 'se-gain-empty-habs',
    name: 'SE gain w/ empty habs start',
    note: 'Same as “SE gain” except for taking into account the indirect earnings bonus from faster chicken population growth from the chalice, life stones, and a monocle-boosted tachyon prism (if any). Assumes the tachyon prism is activated at zero population, and population never hits the hab space cap; otherwise, the actual effect is between this stat and “SE gain”.',
  },
  {
    id: 'se-gain-away',
    name: 'Away SE gain',
    note: 'Same as “SE gain” except for taking into account afk earnings boosts and ignoring RCB',
  },
  {
    id: 'se-gain-away-relative',
    name: 'Away SE gain (Relative)',
    note: 'Same as "Away SE gain", except divides earnings by RCB to end up with a number comparable to online SE gain.',
  },
  {
    id: 'se-gain-empty-habs-away',
    name: 'Away SE gain w/ empty habs start',
    note: 'Same as “SE gain w/ empty habs start” except for taking into account afk earnings boosts and ignoring RCB',
  },
  {
    id: 'boost-duration',
    name: 'Boost duration',
    note: 'Affects the duration of any boost activated while this artifact set is equipped. Artifact changes after activation have no effect on the duration.',
  },
  {
    id: 'research-discount',
    name: 'Research discount',
    note: 'Only applies to common research. Compounds with research sale events: e.g. 60% discount compounded with a 65% research sale results in an aggregate 1−(1−60%)×(1−65%) = 86% discount.',
  },
  {
    id: 'max-hab-space',
    name: 'Max hab space',
    note: 'Hab space from four chicken universe habs with relevant common researches maxed out.',
  },
  {
    id: 'max-ihr',
    name: 'Max IHR',
    note: 'Internal hatchery rate (as shown on the stats page) with relevant common researches maxed out, without taking internal hatchery calm into account.',
  },
  {
    id: 'elr',
    name: 'Egg laying rate',
    note: 'Per-chicken multiplier from egg laying rate bonuses. Tachyon deflector bonus included.',
  },
  {
    id: 'max-elr',
    name: 'Max egg laying rate',
    note: 'Total hourly egg laying rate with full habs. Tachyon deflector bonus included.',
  },
  {
    id: 'max-shipping-capacity',
    name: 'Max shipping capacity',
    note: 'Actual egg shipping rate is capped at this value.',
  },
];
