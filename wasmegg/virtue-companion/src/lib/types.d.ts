export interface Research {
  id: string;
  name: string;
  maxLevel: number;
  perLevel: number;
  epic?: boolean;
}

export interface ResearchInstance extends Research {
  level: number;
}
