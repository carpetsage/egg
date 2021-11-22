import { allMissionTypes, ei } from 'lib';
import DurationType = ei.MissionInfo.DurationType;

export const missions = allMissionTypes.filter(m => m.durationType !== DurationType.TUTORIAL);
