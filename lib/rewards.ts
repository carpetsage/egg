import { ei } from './proto';
import { formatEIValue } from './units';

export function boostIconPath(id: string): string {
  if (id.endsWith('_v2')) {
    id = id.slice(0, -3);
  }
  return `egginc/b_icon_${id}.png`;
}

export function rewardIconPath(r: ei.IReward | ei.Contract.IGoal): string {
  switch (r.rewardType!) {
    case ei.RewardType.GOLD:
      return 'egginc-extras/icon_golden_egg.png';
    case ei.RewardType.SOUL_EGGS:
      return 'egginc/egg_soul.png';
    case ei.RewardType.EGGS_OF_PROPHECY:
      return 'egginc/egg_of_prophecy.png';
    case ei.RewardType.EPIC_RESEARCH_ITEM: {
      let name = r.rewardSubType!;
      switch (r.rewardSubType!) {
        case 'epic_internal_incubators':
          name = 'epic_internal_hatchery';
          break;
        case 'cheaper_research':
          name = 'lab_upgrade';
          break;
        case 'epic_silo_quality':
          // Defunct, replaced by pro permit
          name = 'silo_quality';
          break;
        case 'int_hatch_sharing':
          name = 'internal_hatchery_sharing';
          break;
        case 'int_hatch_calm':
          name = 'internal_hatchery_calm';
          break;
        case 'soul_eggs':
          name = 'soul_food';
          break;
        case 'warp_shift':
          // Defunct, replaced by boosts
          name = 'warp_boost';
          break;
        case 'afx_mission_time':
          name = 'afx_mission_duration';
          break;
      }
      return `egginc/r_icon_${name}.png`;
    }
    case ei.RewardType.PIGGY_FILL:
      return 'egginc-extras/icon_piggy_golden_egg.png';
    case ei.RewardType.PIGGY_MULTIPLIER:
      return 'egginc-extras/icon_piggy_multiply.png';
    case ei.RewardType.PIGGY_LEVEL_BUMP:
      return 'egginc-extras/icon_piggy_level_up.png';
    case ei.RewardType.BOOST:
      return boostIconPath(r.rewardSubType!);
    case ei.RewardType.ARTIFACT_CASE:
      return `egginc/icon_afx_chest_3.png`;
    case ei.RewardType.SHELL_SCRIPT:
      return `egginc/icon_shell_script_colored.png`;
    case ei.RewardType.VIRTUE_GEM:
      return `egginc-extras/icon_virtue_gem.png`;
    // We haven't seen a single-artifact reward yet, so I'd rather not guess
    // what rewardSubType would be, so unknown it is.
    //
    // Similarly, not sure what CHICKEN reward is, for now.
    case ei.RewardType.ARTIFACT:
    case ei.RewardType.CASH:
    case ei.RewardType.BOOST_TOKEN:
    case ei.RewardType.CHICKEN:
    case ei.RewardType.UNKNOWN_REWARD:
      return 'egginc/icon_help.png';
  }
}

export const epicResearchIdToName: { [key: string]: string } = {
  hold_to_hatch: 'Hold to Hatch',
  epic_hatchery: 'Epic Hatchery',
  epic_internal_incubators: 'Epic Int. Hatcheries',
  video_doubler_time: 'Video Doubler Time',
  epic_clucking: 'Epic Clucking',
  epic_multiplier: 'Epic Multiplier',
  cheaper_contractors: 'Cheaper Contractors',
  bust_unions: 'Bust Unions',
  cheaper_research: 'Lab Upgrade',
  silo_capacity: 'Silo Capacity',
  int_hatch_sharing: 'Internal Hatchery Sharing',
  int_hatch_calm: 'Internal Hatchery Calm',
  accounting_tricks: 'Accounting Tricks',
  soul_eggs: 'Soul Food',
  prestige_bonus: 'Prestige Bonus',
  drone_rewards: 'Drone Rewards',
  epic_egg_laying: 'Epic Comfy Nests',
  transportation_lobbyist: 'Transportation Lobbyists',
  prophecy_bonus: 'Prophecy Bonus',
  hold_to_research: 'Hold to Research',
  afx_mission_time: 'FTL Drive Upgrades',
};

export const boostIdToName: { [key: string]: string } = {
  jimbos_blue: "Jimbo's excellent bird feed (2x 1hr)",
  jimbos_blue_v2: "Jimbo's excellent bird feed (3x 20min)",
  jimbos_blue_big: "Jimbo's excellent bird feed (3x 4hr)",
  jimbos_purple: "Jimbo's premium bird feed (10x 30min)",
  jimbos_purple_v2: "Jimbo's premium bird feed (10x 15min)",
  jimbos_purple_big: "Jimbo's premium bird feed (10x 3hr)",
  jimbos_orange: "Jimbo's best bird feed (50x 10min)",
  jimbos_orange_big: "Jimbo's best bird feed (50x 2hr)",
  subsidy_application: 'Subsidy application (+10%)',
  blank_check: 'Blank check (+100%)',
  money_printer: 'Money printer (+500%)',
  tachyon_prism_blue: 'Tachyon prism (10x 30min)',
  tachyon_prism_blue_v2: 'Tachyon prism (10x 10min)',
  tachyon_prism_blue_big: 'Large tachyon prism (10x 4hr)',
  tachyon_prism_purple: 'Powerful tachyon prism (100x 20min)',
  tachyon_prism_purple_v2: 'Powerful tachyon prism (100x 10min)',
  tachyon_prism_purple_big: 'Epic tachyon prism (100x 2hr)',
  tachyon_prism_orange: 'Legendary tachyon prism (1000x 10min)',
  tachyon_prism_orange_big: 'Supreme tachyon prism (1000x 1hr)',
  soul_beacon_blue: 'Soul beacon (5x 1hr)',
  soul_beacon_blue_v2: 'Soul beacon (5x 30min)',
  soul_beacon_purple: 'Epic soul beacon (50x 30min)',
  soul_beacon_purple_v2: 'Epic soul beacon (50x 20min)',
  soul_beacon_orange: 'Legendary soul beacon (500x 10min)',
  boost_beacon_blue: 'Boost beacon (2x 30min)',
  boost_beacon_purple: 'Epic boost beacon (10x 10min)',
  boost_beacon_blue_big: 'Large boost beacon (5x 1hr)',
  boost_beacon_orange: 'Legendary boost beacon (50x 10min)',
  soul_mirror_blue: 'Soul mirror (10min)',
  soul_mirror_purple: 'Epic soul mirror (1hr)',
  soul_mirror_orange: 'Legendary soul mirror (1d)',
  quantum_bulb: 'Quantum warming bulb',
  dilithium_bulb: 'Dilithium warming bulb',
};

export function boostName(id: string): string {
  return boostIdToName[id] ?? id;
}

export function rewardName(r: ei.IReward | ei.Contract.IGoal): string {
  switch (r.rewardType!) {
    case ei.RewardType.GOLD:
      return 'Golden eggs';
    case ei.RewardType.SOUL_EGGS:
      return 'Soul eggs';
    case ei.RewardType.EGGS_OF_PROPHECY:
      return 'Egg of prophecy';
    case ei.RewardType.EPIC_RESEARCH_ITEM: {
      const id = r.rewardSubType!;
      return epicResearchIdToName[id] || id;
    }
    case ei.RewardType.PIGGY_FILL:
    case ei.RewardType.PIGGY_MULTIPLIER:
      return 'Piggy';
    case ei.RewardType.PIGGY_LEVEL_BUMP:
      return 'Piggy level';
    case ei.RewardType.BOOST: {
      return boostName(r.rewardSubType!);
    }
    case ei.RewardType.ARTIFACT_CASE:
      return 'Artifact case';
    case ei.RewardType.ARTIFACT:
      return 'Artifact';
    case ei.RewardType.CASH:
      return 'Cash';
    case ei.RewardType.BOOST_TOKEN:
      return 'Boost token';
    case ei.RewardType.CHICKEN:
      return 'Chicken';
    case ei.RewardType.SHELL_SCRIPT:
      return 'Tickets';
    case ei.RewardType.VIRTUE_GEM:
      return 'Virtue gem';
    case ei.RewardType.UNKNOWN_REWARD:
      return 'Unknown';
  }
}

export function rewardAmountDisplay(r: ei.IReward | ei.Contract.IGoal): string {
  const sign = r.rewardType! === ei.RewardType.PIGGY_MULTIPLIER ? '\u00d7' : '+';
  const amount = r.rewardAmount!;
  return `${sign}${formatEIValue(amount, { trim: true })}`;
}
