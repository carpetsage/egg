import { ContractCompletionStatus } from '@/lib';

export function completionStatusColorClass(s: ContractCompletionStatus): string {
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
