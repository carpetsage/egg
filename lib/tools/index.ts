import { iconURL } from '../utils';

const now = Date.now();

export class Tool {
  id: string;
  url: string;
  title: string;
  iconUrl = '';
  description?: string;
  displayIconOnly = false;
  iconCssClasses = '';
  newUntil = 0;
  majorUpdateUntil = 0;
  updateUntil = 0;
  whatsNew?: string;

  constructor({
    id,
    url,
    title,
    iconUrl,
    description,
    displayIconOnly,
    iconCssClasses,
    newUntil,
    majorUpdateUntil,
    updateUntil,
    whatsNew,
  }: {
    id: string;
    url?: string;
    title: string;
    iconUrl?: string;
    description?: string;
    displayIconOnly?: boolean;
    iconCssClasses?: string;
    newUntil?: number;
    majorUpdateUntil?: number;
    updateUntil?: number;
    whatsNew?: string;
  }) {
    this.id = id;
    this.url = url || `/${this.id}/`;
    this.title = title;
    this.iconUrl = iconUrl || '';
    this.description = description;
    this.displayIconOnly = displayIconOnly || false;
    this.iconCssClasses = iconCssClasses || '';
    this.newUntil = newUntil || 0;
    this.majorUpdateUntil = majorUpdateUntil || 0;
    this.updateUntil = updateUntil || 0;
    this.whatsNew = whatsNew;
  }

  get isNew(): boolean {
    return now < this.newUntil;
  }

  get isMajorUpdate(): boolean {
    return now < this.majorUpdateUntil;
  }

  get isUpdate(): boolean {
    return now < this.updateUntil;
  }

  get isHighlight(): boolean {
    return this.isNew || this.isMajorUpdate || this.isUpdate;
  }
}

export const tools = [
  new Tool({
    id: 'eicoop',
    url: 'https://eicoop.netlify.app/',
    title: 'CoopTracker',
    iconUrl: iconURL('wasmegg/eicoop.svg'),
    description: 'Coop tracker and contract master list',
    displayIconOnly: true,
    iconCssClasses: 'h-6 -ml-0.5 -mr-1 -top-0.5',
    // Fri Jun 25 07:57:36 UTC 2021
    majorUpdateUntil: 1624607856000,
    whatsNew:
      'Personal dashboard where you can check the status of all your active contracts, including solos and not-yet-joined-coops.',
  }),

  new Tool({
    id: 'artifact-explorer',
    title: 'Artifact explorer',
    iconUrl: iconURL('wasmegg/artifact-explorer.svg'),
    description: 'Explorer for everything artifacts',
  }),
  new Tool({
    id: 'artifact-sandbox',
    title: 'Artifact sandbox',
    iconUrl: iconURL('wasmegg/artifact-sandbox.svg'),
    description: 'Sandbox for experimenting, optimizing, and sharing artifact builds',
  }),
  new Tool({
    id: 'rockets-tracker',
    title: 'Rockets tracker',
    iconUrl: iconURL('wasmegg/rockets-tracker.svg'),
    description:
      'Tracker for active rocket missions, historical mission statistics, progress on artifact collection, etc.',
    // Wed Nov 24 18:54:42 UTC 2021
    updateUntil: 1637780082000,
    whatsNew:
      'In the "Artifacting progress" section, for each stone, the number of slotted copies and free copies are now displayed, and you can hover over / click on "<N> slotted" to reveal where the slotted stones are.',
  }),
  new Tool({
    id: 'past-contracts',
    title: 'Past contracts viewer',
    iconUrl: iconURL('wasmegg/past-contracts.svg'),
    description: 'Past contracts and prophecy egg completion tracker',
    // Tue Jun  8 12:33:17 UTC 2021
    majorUpdateUntil: 1623155597000,
  }),
  new Tool({
    id: 'loot-simulator',
    title: 'Loot simulator',
    iconUrl: iconURL('wasmegg/loot-simulator.svg'),
    description: 'Simulator for mission loot drops',
  }),
  new Tool({
    id: 'enlightenment',
    title: 'Enlightenment companion',
    iconUrl: iconURL('wasmegg/enlightenment.svg'),
    description: 'Informational companion on your journey to the Enlightenment Diamond Trophy',
  }),
  new Tool({
    id: 'smart-assistant',
    title: 'Smart assistant',
    iconUrl: iconURL('wasmegg/smart-assistant.svg'),
    description:
      'Smart, personalized artifact loadout generator \u2014 effortlessly optimize your prestige loadout; full-fledged earning bonus planner',
    // Tue Aug 10 16:38:57 UTC 2021
    newUntil: 1628613537000,
    // Mon Aug  2 13:52:46 UTC 2021
    updateUntil: 1627912366000,
    whatsNew: 'Added earning bonus planner.',
  }),

  new Tool({
    id: 'mission-list',
    title: 'Mission list',
    // Thu Jun 24 15:35:02 UTC 2021
    majorUpdateUntil: 1624548902000,
    description: 'Spaceship & mission parameters list',
    whatsNew:
      'Rewritten for v1.21. Now you can interactively configure relevant epic researches and individual ship levels, and view corresponding mission duration, capacity, etc.',
  }),
  new Tool({
    id: 'consumption-sheet',
    title: 'Consumption sheet',
    description: 'Artifact consumption outcomes',
    // Fri Jul 30 12:32:29 UTC 2021
    updateUntil: 1627648349000,
    whatsNew:
      'Added expected gold yield of fully consuming artifacts, and gold yield of demoting uncommon artifacts.',
  }),
  new Tool({
    id: 'loot-analysis',
    title: 'Loot analysis',
    description: 'Statistical analysis of mission rewards data through interactive plots',
  }),
  new Tool({
    id: 'events',
    title: 'Events calendar',
    description: 'Filterable calendar of (not so) special events',
  }),
  new Tool({
    id: 'legendary-study',
    url: 'https://legendary-study.netlify.app/',
    title: 'Legendary study report',
    description:
      'See how you fare against other Egg, Inc. players in the legendary artifact department',
    // Fri Aug  6 17:33:54 UTC 2021
    newUntil: 1628271234000,
  }),

  new Tool({
    id: 'researches',
    title: 'Researches',
    description: 'Structured data of common and epic researches, customizable by SQL',
  }),

  new Tool({
    id: 'EggContractor',
    url: 'https://github.com/fanaticscripter/EggContractor',
    title: 'EggContractor',
    description:
      'Contract monitoring web app & CLI client, with multi-account aggregation, offline time tracking, and more',
  }),

  new Tool({
    id: 'ebeb',
    url: 'https://ebeb.netlify.app/',
    title: 'Earning Bonus Enhancing Bootcamp',
    iconUrl: iconURL('wasmegg/ebeb.svg'),
    description: 'The shortest path to fame and fortune (terms and conditions may apply)',
    // Tue Jul 20 14:57:17 UTC 2021
    newUntil: 1626793037000,
  }),
];

export const idToTool = new Map<string, Tool>(tools.map(t => [t.id, t]));

export const newTools = tools.filter(tool => tool.isNew);
export const majorUpdateTools = tools.filter(tool => !tool.isNew && tool.isMajorUpdate);
export const updateTools = tools.filter(
  tool => !tool.isNew && !tool.isMajorUpdate && tool.isUpdate
);

// This is the signature of the what's new section of a particular build. We
// generate a signature so that a user can hide what's new and won't be bothered
// until something changes.
export const updateSignature = generateUpdateSignature();

function generateUpdateSignature(): string {
  let s = '';
  for (const tool of tools) {
    if (tool.newUntil || tool.majorUpdateUntil || tool.updateUntil) {
      s += `${tool}:${tool.newUntil}:${tool.majorUpdateUntil}:${tool.updateUntil}`;
    }
  }
  return hashFNV1a32bit(s).toString(16);
}

// https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV-1a_hash
// https://datatracker.ietf.org/doc/html/draft-eastlake-fnv-17
function hashFNV1a32bit(s: string): number {
  const prime = 0x01000193;
  const offsetBasis = 0x811c9dc5;
  const uint32max = 0x100000000;
  let hash = offsetBasis;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, prime);
  }
  return (hash + uint32max) % uint32max;
}
