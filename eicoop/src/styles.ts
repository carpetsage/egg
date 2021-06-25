import { ContractCompletionStatus } from '@/lib';

export function completionStatusFgColorClass(s: ContractCompletionStatus): string {
  switch (s) {
    case ContractCompletionStatus.HasCompleted:
      return 'text-green-500';
    case ContractCompletionStatus.HasNoTimeLeft:
      return 'text-red-500';
    case ContractCompletionStatus.IsOnTrackToFinish:
      return 'text-blue-500';
    case ContractCompletionStatus.IsNotOnTrackToFinish:
      return 'text-yellow-500';
  }
}

export function completionStatusBgColorClass(s: ContractCompletionStatus): string {
  switch (s) {
    case ContractCompletionStatus.HasCompleted:
      return 'bg-green-50 dark:bg-gray-700-green-tint-100';
    case ContractCompletionStatus.HasNoTimeLeft:
      return 'bg-red-50 dark:bg-gray-700-red-tint-100';
    case ContractCompletionStatus.IsOnTrackToFinish:
      return 'bg-blue-50 dark:bg-gray-700-blue-tint-100';
    case ContractCompletionStatus.IsNotOnTrackToFinish:
      return 'bg-yellow-50 dark:bg-gray-700-yellow-tint-100';
  }
}
