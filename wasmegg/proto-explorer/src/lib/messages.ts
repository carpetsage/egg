import { ei } from 'lib';

const enumNames = [
  'AdNetwork',
  'DeviceFormFactor',
  'Egg',
  'FarmType',
  'GameDimension',
  'GoalType',
  'Platform',
  'RewardType',
  'LeaderboardScope',
  'UILocation',
  'UserType',
] as const;
export type MessageName = Exclude<keyof typeof ei, (typeof enumNames)[number]>;

const messages: Record<string, MessageName[]> = {
  commonlyInspected: [
    'EggIncFirstContactRequest',
    'EggIncFirstContactResponse',
    'GetPeriodicalsRequest',
    'PeriodicalsResponse',
    'ConfigRequest',
    'ConfigResponse',
    'MissionRequest',
    'MissionResponse',
    'CompleteMissionResponse',
    'ContractCoopStatusRequest',
    'ContractCoopStatusResponse',
    'Backup',
    'SaveBackupResponse',
    'Contract',
    'CustomEgg',
    'ContractSeasonInfo',
  ],
  otherArtifactRequestResponse: [
    'ArtifactsConfigurationRequest',
    'ArtifactsConfigurationResponse',
    'CraftArtifactRequest',
    'CraftArtifactResponse',
    'ConsumeArtifactRequest',
    'ConsumeArtifactResponse',
    'SetArtifactRequest',
    'SetArtifactResponse',
  ],
  otherCoopRequestResponse: [
    'QueryCoopRequest',
    'QueryCoopResponse',
    'CreateCoopRequest',
    'CreateCoopResponse',
    'JoinCoopRequest',
    'JoinCoopResponse',
    'CollectContractArtifactRewardsRequest',
    'AutoJoinCoopRequest',
    'UpdateCoopPermissionsRequest',
    'UpdateCoopPermissionsResponse',
    'LeaveCoopRequest',
    'GiftPlayerCoopRequest',
    'KickPlayerCoopRequest',
    'ContractCoopStatusUpdateRequest',
    'ContractCoopStatusUpdateResponse',
  ],
  other: [],
};

const seen = ([] as MessageName[]).concat(
  messages.commonlyInspected,
  messages.otherArtifactRequestResponse,
  messages.otherCoopRequestResponse
);
for (const name in ei) {
  // Make sure we only pick up capitalized names just in case some lower case
  // helpers are introduced in the future.
  if ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(name[0])) {
    if (!(enumNames as ReadonlyArray<string>).includes(name) && !seen.includes(name as MessageName)) {
      messages.other.push(name as MessageName);
    }
  }
}
messages.other.sort();

export const messageGroups = [
  {
    label: 'Commonly inspected',
    messages: messages.commonlyInspected,
  },
  {
    label: 'Other artifact-related requests & responses',
    messages: messages.otherArtifactRequestResponse,
  },
  {
    label: 'Other coop-related requests & responses',
    messages: messages.otherCoopRequestResponse,
  },
  {
    label: 'Other',
    messages: messages.other,
  },
];

export const validMessageNames = ([] as MessageName[]).concat(
  messages.commonlyInspected,
  messages.otherArtifactRequestResponse,
  messages.otherCoopRequestResponse,
  messages.other
);
