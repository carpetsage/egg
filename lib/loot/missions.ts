import { allMissionTypes, ei } from '../';
import DurationType = ei.MissionInfo.DurationType;

export const missions = allMissionTypes.filter(m => m.durationType !== DurationType.TUTORIAL);
