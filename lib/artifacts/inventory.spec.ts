import { describe, expect, it } from '@jest/globals';

import { Inventory, InventoryItem } from './inventory';
import { ei } from '../proto';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Rarity = ei.ArtifactSpec.Rarity;

describe('artifacts inventory', () => {
  const inventory = new Inventory({});
  const common = { rarity: Rarity.COMMON };
  const rare = { rarity: Rarity.RARE };
  inventory.add({ name: Name.PHOENIX_FEATHER, level: Level.LESSER, ...common }, 80);
  inventory.add({ name: Name.PHOENIX_FEATHER, level: Level.NORMAL, ...common }, 48);
  inventory.add({ name: Name.PHOENIX_FEATHER, level: Level.GREATER, ...common }, 1);
  inventory.add({ name: Name.BOOK_OF_BASAN, level: Level.INFERIOR, ...common }, 16);
  inventory.add({ name: Name.BOOK_OF_BASAN, level: Level.LESSER, ...common }, 65);
  inventory.add({ name: Name.BOOK_OF_BASAN, level: Level.NORMAL, ...common }, 11);
  inventory.add({ name: Name.LIGHT_OF_EGGENDIL, level: Level.NORMAL, ...common }, 9);
  inventory.add({ name: Name.LIGHT_OF_EGGENDIL, level: Level.NORMAL, ...rare }, 1);
  inventory.add({ name: Name.THE_CHALICE, level: Level.GREATER, ...common }, 21);

  it('can craft 4 T4 feathers', () => {
    const t4Feather = new InventoryItem(Name.PHOENIX_FEATHER, Level.GREATER);
    expect(inventory.countCraftable(t4Feather)).toEqual(4);
  });

  it('can craft a T4 light', () => {
    const t4Light = new InventoryItem(Name.LIGHT_OF_EGGENDIL, Level.GREATER);
    expect(inventory.countCraftable(t4Light)).toEqual(1);
  });

  it('can craft 6 T3 books', () => {
    const t3Book = new InventoryItem(Name.BOOK_OF_BASAN, Level.NORMAL);
    expect(inventory.countCraftable(t3Book)).toEqual(6);
  });

  it('can craft a T4 book', () => {
    const t4Book = new InventoryItem(Name.BOOK_OF_BASAN, Level.GREATER);
    expect(inventory.countCraftable(t4Book)).toEqual(1);
  });
});
