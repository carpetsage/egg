import { ei } from './proto';

export enum ContractLeague {
  Elite = 0,
  Standard = 1,
}

export function getContractGoals (
  contract: ei.IContract,
  grade = ei.Contract.PlayerGrade.GRADE_C,
  league = ContractLeague.Elite
) {
  if (contract.gradeSpecs) {
    const goals = contract.gradeSpecs.at((grade > 0 ? grade : 1) - 1)?.goals;
    if (goals && goals.length) return goals;
  }
  if (contract.goalSets) {
    const goals = contract.goalSets.at(league)?.goals;
    if (goals && goals.length) return goals;
  }
  if (contract.goals) {
    const goals = contract.goals;
    if (goals && goals.length) return goals;
  }
  throw new Error(`no goals found for contract ${contract.identifier}`);
}
