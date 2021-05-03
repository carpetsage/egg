import { ei } from './proto';

export function rewardIconPath(r: ei.IReward | ei.Contract.IGoal): string {
  switch (r.rewardType!) {
    case ei.RewardType.GOLD:
      return 'egginc-extras/icon_golden_egg.png';
    case ei.RewardType.SOUL_EGGS:
      return 'egginc/egg_soul.png';
    case ei.RewardType.EGGS_OF_PROPHECY:
      return 'egginc/egg_of_prophecy.png';
    case ei.RewardType.EPIC_RESEARCH_ITEM:
      let name = r.rewardSubType!;
      switch (r.rewardSubType!) {
        case 'epic_internal_incubators':
          name = 'epic_internal_hatchery';
        case 'cheaper_research':
          name = 'lab_upgrade';
        case 'epic_silo_quality':
          // Defunct, replaced by pro permit
          name = 'silo_quality';
        case 'int_hatch_sharing':
          name = 'internal_hatchery_sharing';
        case 'int_hatch_calm':
          name = 'internal_hatchery_calm';
        case 'soul_eggs':
          name = 'soul_food';
        case 'warp_shift':
          // Defunct, replaced by boosts
          name = 'warp_boost';
      }
      return `egginc/r_icon_${name}.png`;
    case ei.RewardType.PIGGY_FILL:
      return 'egginc-extras/icon_piggy_golden_egg.png';
    case ei.RewardType.PIGGY_MULTIPLIER:
      return 'egginc-extras/icon_piggy_multiply.png';
    case ei.RewardType.PIGGY_LEVEL_BUMP:
      return 'egginc-extras/icon_piggy_level_up.png';
    case ei.RewardType.BOOST:
      return `egginc/b_icon_${r.rewardSubType!}.png`;
    case ei.RewardType.ARTIFACT_CASE:
      return `egginc/icon_afx_chest_3.png`;
    // We haven't seen a single-artifact reward yet, so I'd rather not guess
    // what rewardSubType would be, so unknown it is.
    case ei.RewardType.ARTIFACT:
    case ei.RewardType.CASH:
    case ei.RewardType.BOOST_TOKEN:
    case ei.RewardType.UNKNOWN_REWARD:
      return 'egginc/icon_help.png';
  }
}
