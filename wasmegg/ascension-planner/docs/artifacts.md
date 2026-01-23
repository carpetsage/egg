# Artifacts Module

## Location

```
lib/artifacts/
├── recommendation.ts    # Artifact set recommendation algorithm
├── virtue_effects.ts    # Virtue-specific effect calculations
├── data.json           # Complete artifact database (340KB+)
├── data.schema.json    # JSON schema for data.json
└── effects.ts          # Core effect calculations (see separate docs)
```

## Overview

The artifacts module provides:

- Complete artifact/stone database with effects, crafting costs, and recipes
- Optimal artifact set recommendation for prestige and virtue strategies
- Virtue-specific effect multiplier calculations (CTE)
- Assembly status tracking for recommended sets

## Importing

```typescript
// Recommendation functions
import { recommendArtifactSet, contenderToArtifactSet, Strategy } from 'lib';

// Virtue effects
import { eggValueMultiplier, awayEarningsMultiplier, researchPriceMultiplierFromArtifacts } from 'lib';

// Data access
import artifactData from 'lib/artifacts/data.json';
```

---

## recommendation.ts

### Purpose

Finds the optimal artifact + stone combination for maximum Soul Egg gain (prestige) or Clothed TE (virtue).

### Strategies

```typescript
enum Strategy {
  // Prestige strategies
  STANDARD_PERMIT_SINGLE_PRELOAD,  // 2 artifact slots
  PRO_PERMIT_SINGLE_PRELOAD,       // 4 artifact slots
  PRO_PERMIT_MULTI,                // 4 slots, multi-prestige
  PRO_PERMIT_LUNAR_PRELOAD_AIO,    // 4 slots, lunar preload all-in-one

  // Virtue strategies
  STANDARD_PERMIT_VIRTUE_CTE,      // 2 artifact slots
  PRO_PERMIT_VIRTUE_CTE,           // 4 artifact slots
}
```

### Algorithm Overview

The algorithm uses **divide and conquer + exhaustive search with pruning**:

1. **Independent artifacts** - Artifacts that contribute effects/slots independently:
   - Demeter's Necklace (egg value)
   - Tungsten Ankh (egg value)
   - Phoenix Feather (soul egg bonus - prestige only)
   - Quantum Metronome (egg laying rate - prestige only)
   - Dilithium Monocle (boost duration - prestige only)
   - Lunar Totem (away earnings)
   - Puzzle Cube (research discount - virtue only)
   - Gusset (hab space - preload only)
   - Chalice (IHR - multi only)

2. **Independent stones** - Stones with direct effects:
   - Shell Stones (egg value)
   - Tachyon Stones (egg laying - prestige only)
   - Soul Stones (SE bonus - prestige only)
   - Life Stones (IHR - prestige multi only)
   - Lunar Stones (away earnings)

3. **Interdependent combos** - Items that must be evaluated together:
   - Book of Basan + Prophecy Stones (prophecy egg bonus)
   - Vial of Martian Dust + Terra Stones (running chicken bonus)

### Functions

#### `recommendArtifactSet(backup, strategy, opts?): Contender`

Finds the optimal artifact/stone combination.

```typescript
import { recommendArtifactSet, Strategy } from 'lib';

const winner = recommendArtifactSet(backup, Strategy.PRO_PERMIT_VIRTUE_CTE, {
  excludedIds: ['artifact-id-to-exclude'],  // Optional: exclude specific items
  debug: true,                               // Optional: console logging
  requireGusset: false,                      // Optional: force gusset inclusion
});

console.log(`Effect multiplier: ${winner.effectMultiplier}`);
console.log(`Artifacts: ${winner.artifacts.map(a => a.id).join(', ')}`);
console.log(`Stones: ${winner.stones.map(s => s.id).join(', ')}`);
```

**Returns:** A `Contender` object containing:
- `artifacts: Item[]` - Recommended artifact items
- `stones: Item[]` - Recommended stone items
- `effectMultiplier: number` - Combined effect multiplier
- `numArtifactSlotsTaken: number` - Artifact slots used
- `numStoneSlotsTaken: number` - Stone slots used

#### `contenderToArtifactSet(contender, guide, inventory): { artifactSet, assemblyStatuses }`

Converts recommendation to actual artifact set with assembly instructions.

```typescript
import { contenderToArtifactSet, ArtifactSet, Inventory } from 'lib';

const guide = farm.artifactSet;  // Currently equipped set
const inventory = new Inventory(backup.artifactsDb!, { virtue: true });

const { artifactSet, assemblyStatuses } = contenderToArtifactSet(winner, guide, inventory);

// assemblyStatuses tells you what to do:
// - EQUIPPED: Already in the right slot
// - ASSEMBLED: Exists in inventory with correct stones
// - AWAITING_ASSEMBLY: Need to slot stones into artifact
```

**Assembly Statuses:**
```typescript
enum ArtifactAssemblyStatus {
  EQUIPPED,           // Already equipped correctly
  ASSEMBLED,          // In inventory, ready to equip
  AWAITING_ASSEMBLY,  // Need to add stones to artifact
  MISSING,            // Item not in inventory
}
```

---

## virtue_effects.ts

### Purpose

Calculates virtue-specific effect multipliers from artifacts for CTE (Clothed TE) calculation.

### Functions

#### `eggValueMultiplier(artifacts): number`

Calculates egg value multiplier from equipped artifacts.

**Considers:**
- Demeter's Necklace
- Tungsten Ankh
- Shell Stones

```typescript
import { eggValueMultiplier } from 'lib';

const artifacts = farm.artifactSet.artifacts;
const multiplier = eggValueMultiplier(artifacts);
// e.g., 2.5 means 2.5x egg value
```

#### `awayEarningsMultiplier(artifacts): number`

Calculates away/offline earnings multiplier.

**Considers:**
- Lunar Totem
- Lunar Stones

```typescript
import { awayEarningsMultiplier } from 'lib';

const multiplier = awayEarningsMultiplier(artifacts);
// e.g., 3.0 means 3x away earnings
```

#### `researchPriceMultiplierFromArtifacts(artifacts): number`

Calculates research price multiplier (discount).

**Considers:**
- Puzzle Cube

```typescript
import { researchPriceMultiplierFromArtifacts } from 'lib';

const multiplier = researchPriceMultiplierFromArtifacts(artifacts);
// e.g., 0.6 means 40% discount (pay 60% of base price)
```

---

## data.json

### Purpose

Complete database of all artifacts, stones, and ingredients with:
- Names, icons, tiers
- Effects by rarity
- Crafting recipes and costs
- Mission availability

### Structure

```json
{
  "$schema": "./data.schema.json",
  "artifact_families": [
    {
      "id": "puzzle-cube",
      "afx_id": 23,
      "name": "Puzzle cube",
      "afx_type": 0,
      "type": "Artifact",
      "effect": "Lowers research costs",
      "effect_target": "research cost",
      "tiers": [...]
    }
  ]
}
```

### Family Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Human-readable ID (e.g., "puzzle-cube") |
| `afx_id` | number | ArtifactSpec.Name enum value |
| `name` | string | Display name |
| `afx_type` | number | 0=Artifact, 1=Stone, 2=Ingredient |
| `type` | string | "Artifact", "Stone", or "Ingredient" |
| `effect` | string | Effect description |
| `effect_target` | string | What the effect targets |
| `tiers` | array | Array of tier objects |

### Tier Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique tier ID (e.g., "puzzle-cube-4") |
| `afx_level` | number | 0-3 for tiers 1-4 |
| `name` | string | Full item name |
| `tier_number` | number | 1-4 |
| `tier_name` | string | Tier qualifier (e.g., "Eggceptional") |
| `icon_filename` | string | Icon asset name |
| `quality` | number | Quality value for sorting |
| `craftable` | boolean | Can be crafted |
| `has_rarities` | boolean | Has rarity variants |
| `possible_afx_rarities` | array | [0=Common, 1=Rare, 2=Epic, 3=Legendary] |
| `effects` | array | Effect objects per rarity |
| `recipe` | object | Crafting recipe (null if not craftable) |

### Effect Structure

| Field | Type | Description |
|-------|------|-------------|
| `afx_rarity` | number | 0=Common, 1=Rare, 2=Epic, 3=Legendary |
| `rarity` | string | "Common", "Rare", "Epic", "Legendary" |
| `effect` | string | Full effect text (e.g., "-5% research cost") |
| `effect_delta` | number | Numeric effect value (e.g., -0.05) |
| `slots` | number | Stone slots (artifacts only) |

### Recipe Structure

```json
{
  "ingredients": [
    { "id": "gold-meteorite-3", "count": 6, ... }
  ],
  "crafting_price": {
    "base": 500,
    "low": 100,
    "domain": 10000,
    "curve": 0.5,
    "initial": 500,
    "minimum": 100
  }
}
```

---

## Usage in Ascension Planner

### Recommending Artifacts for Virtue (CTE)

```typescript
import {
  recommendArtifactSet,
  contenderToArtifactSet,
  Strategy,
  Inventory,
  ArtifactSet
} from 'lib';

// Get optimal artifact set for virtue
const winner = recommendArtifactSet(
  backup,
  Strategy.PRO_PERMIT_VIRTUE_CTE
);

// Convert to displayable set
const inventory = new Inventory(backup.artifactsDb!, { virtue: true });
const guide = new ArtifactSet(backup.artifactsDb!.activeArtifactSets![0].slots!, false);
const { artifactSet, assemblyStatuses } = contenderToArtifactSet(winner, guide, inventory);

// Display recommendations
artifactSet.artifacts.forEach((artifact, i) => {
  console.log(`Slot ${i + 1}: ${artifact.name}`);
  console.log(`  Status: ${assemblyStatuses[i]}`);
  console.log(`  Stones: ${artifact.stones.map(s => s.name).join(', ')}`);
});
```

### Calculating CTE from Artifacts

```typescript
import {
  eggValueMultiplier,
  awayEarningsMultiplier,
  researchPriceMultiplierFromArtifacts,
  multiplierToTE
} from 'lib';

const artifacts = artifactSet.artifacts;

// Get individual multipliers
const eggValue = eggValueMultiplier(artifacts);
const awayEarnings = awayEarningsMultiplier(artifacts);
const researchDiscount = 1 / researchPriceMultiplierFromArtifacts(artifacts);

// Combine for total CTE contribution
const totalMultiplier = eggValue * awayEarnings * researchDiscount;
const cteFromArtifacts = multiplierToTE(totalMultiplier);

console.log(`Artifacts contribute ${cteFromArtifacts.toFixed(1)} CTE`);
```

### Displaying Artifact Options

```typescript
import artifactData from 'lib/artifacts/data.json';
import { iconURL } from 'lib';

// Find all artifacts (not stones or ingredients)
const artifactFamilies = artifactData.artifact_families.filter(
  f => f.type === 'Artifact'
);

// Display each family
artifactFamilies.forEach(family => {
  console.log(`${family.name}: ${family.effect}`);

  family.tiers.forEach(tier => {
    const icon = iconURL(`egginc/${tier.icon_filename}`, 64);
    const effects = tier.effects || [];
    effects.forEach(eff => {
      console.log(`  T${tier.tier_number} ${eff.rarity}: ${eff.effect} (${eff.slots} slots)`);
    });
  });
});
```

---

## Related Files

- `lib/artifacts/effects.ts` - Core `Item`, `Stone`, `Artifact`, `ArtifactSet` classes
- `lib/artifacts/inventory.ts` - `Inventory` class for player's artifact collection
- `lib/virtue.ts` - `cteFromArtifacts()`, `multiplierToTE()` functions
- `lib/farm/farm.ts` - Farm class with `artifactSet` property
