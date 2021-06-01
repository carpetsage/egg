import eicoopIconUrl from '@/icons/eicoop.svg';
import artifactExplorerIconUrl from '@/icons/artifact-explorer.svg';
import artifactSandboxIconUrl from '@/icons/artifact-sandbox.svg';
import rocketsTrackerIconUrl from '@/icons/rockets-tracker.svg';
import pastContractsIconUrl from '@/icons/past-contracts.svg';
import lootSimulatorIconUrl from '@/icons/loot-simulator.svg';
import enlightenmentIconUrl from '@/icons/enlightenment.svg';

const now = Date.now();

export class Tool {
  id: string;
  url: string;
  title: string;
  iconUrl = '';
  displayIconOnly = false;
  iconCssClasses = '';
  newUntil = 0;
  majorUpdateUntil = 0;

  constructor({
    id,
    url,
    title,
    iconUrl,
    newUntil,
    majorUpdateUntil,
    displayIconOnly,
    iconCssClasses,
  }: {
    id: string;
    url?: string;
    title: string;
    iconUrl?: string;
    displayIconOnly?: boolean;
    iconCssClasses?: string;
    newUntil?: number;
    majorUpdateUntil?: number;
  }) {
    this.id = id;
    this.url = url || `/${this.id}/`;
    this.title = title;
    this.iconUrl = iconUrl || '';
    this.displayIconOnly = displayIconOnly || false;
    this.iconCssClasses = iconCssClasses || '';
    this.newUntil = newUntil || 0;
    this.majorUpdateUntil = majorUpdateUntil || 0;
  }

  get isNew(): boolean {
    return now < this.newUntil;
  }

  get isMajorUpdate(): boolean {
    return now < this.majorUpdateUntil;
  }
}

export const tools = [
  new Tool({
    id: 'eicoop',
    url: 'https://eicoop.netlify.app/',
    title: 'Coop Tracker',
    iconUrl: eicoopIconUrl,
    displayIconOnly: true,
    iconCssClasses: 'h-6 -ml-0.5 -mr-1 -top-0.5',
    // TODO: remove newUntil
    // newUntil: 1623155597000,
  }),

  new Tool({
    id: 'artifact-explorer',
    title: 'Artifact explorer',
    iconUrl: artifactExplorerIconUrl,
  }),
  new Tool({
    id: 'artifact-sandbox',
    title: 'Artifact sandbox',
    iconUrl: artifactSandboxIconUrl,
  }),
  new Tool({
    id: 'rockets-tracker',
    title: 'Rockets tracker',
    iconUrl: rocketsTrackerIconUrl,
    // Tue Jun  8 12:33:17 UTC 2021
    majorUpdateUntil: 1623155597000,
  }),
  new Tool({
    id: 'past-contracts',
    title: 'Past contracts viewer',
    iconUrl: pastContractsIconUrl,
    // Tue Jun  8 12:33:17 UTC 2021
    majorUpdateUntil: 1623155597000,
  }),
  new Tool({
    id: 'loot-simulator',
    title: 'Loot simulator',
    iconUrl: lootSimulatorIconUrl,
  }),
  new Tool({
    id: 'enlightenment',
    title: 'Enlightenment companion',
    iconUrl: enlightenmentIconUrl,
  }),

  new Tool({
    id: 'artifact-list',
    title: 'Artifact list',
  }),
  new Tool({
    id: 'mission-list',
    title: 'Mission list',
  }),
  new Tool({
    id: 'consumption-sheet',
    title: 'Consumption sheet',
  }),
  new Tool({
    id: 'loot-analysis',
    title: 'Loot analysis',
  }),
  new Tool({
    id: 'events',
    title: 'Events calendar',
  }),

  new Tool({
    id: 'researches',
    title: 'Researches',
  }),
];

export const stemToTool = new Map<string, Tool>(tools.map(t => [t.id, t]));
