# Research Module

## Location

```
src/researches.json          # Complete research database with virtue prices
src/lib/researches.ts        # TypeScript wrapper (create if needed)
```

## Overview

The research module provides complete data for all 78 researches in Egg Inc.:
- 56 common researches (tiers 1-12, unlocked by egg progression)
- 22 epic researches (permanent upgrades)

The ascension-planner version includes **`virtue_prices`** - gem costs for purchasing common research during a virtue run, which the original `/wasmegg/researches/src/researches.json` does not have.

### Research Types in Virtue

Both types of research can only be purchased on the **Curiosity** egg:

| Type | Currency | Notes |
|------|----------|-------|
| **Common** | Gems | Resets each shift. Use `virtue_prices` array for costs. |
| **Epic** | Golden Eggs (GE) | Permanent across all shifts. Use `prices` array for costs. |

## Importing

```typescript
import researchesData from '@/researches.json';

// Or with a wrapper module:
import { researches, getResearchById, getResearchesByCategory } from '@/lib/researches';
```

---

## Data Structure

### Research Object

| Field | Type | Description |
|-------|------|-------------|
| `serial_id` | number | Order/position (1-78) |
| `id` | string | Unique ID used in player data (e.g., `comfy_nests`) |
| `name` | string | Display name |
| `type` | `"common"` \| `"epic"` | Research type |
| `tier` | number | Unlock tier 1-12 (common only) |
| `categories` | string | Effect category (see below) |
| `description` | string | In-game description |
| `effect_type` | `"additive"` \| `"multiplicative"` | How effect applies |
| `levels` | number | Maximum purchasable levels |
| `per_level` | number | Effect value per level |
| `levels_compound` | `"additive"` | How levels stack |
| `prices` | number[] | Bock cost (common) or GE cost (epic) per level |
| `virtue_prices` | number[] | Gem cost per level (common research in virtue only) |

### Categories

| Category | Description | Researches |
|----------|-------------|------------|
| `egg_laying_rate` | Eggs per chicken per second | comfy_nests, hen_house_ac, time_compress, timeline_diversion, relativity_optimization, improved_genetics |
| `egg_value` | Value per egg | nutritional_sup, padded_packaging, usde_prime, improved_genetics, superfood, graviton_coating, chrystal_shells |
| `hab_capacity` | Maximum chickens per hab | hab_capacity1, microlux, grav_plating, wormhole_dampening |
| `internal_hatchery_rate` | Chickens spawned per minute | internal_hatchery1-5, neural_linking |
| `shipping_capacity` | Vehicle capacity | leafsprings, lightweight_boxes, driver_training, super_alloy, quantum_storage, hover_upgrades, dark_containment, neural_net_refine, hyper_portalling, matter_reconfiguration |
| `fleet_size` | Number of vehicles | excoskeletons, traffic_management, motivational_clucking |
| `running_chicken_bonus` | RCB multiplier | excitable_chickens, motivational_clucking, coordinated_clucking, usde_prime |
| `hatchery_refill_rate` | Manual hatch button refill | better_incubators |
| `hatchery_capacity` | Max chickens from manual hatch | bigger_hatchery |
| _(empty)_ | Misc/utility | hold_to_hatch, video_doubler_time, cheaper_contractors, etc. |

---

## Common Research by Tier

### Tier 1 (Edible Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `comfy_nests` | Comfortable Nests | +10% egg laying rate | 50 |
| `nutritional_sup` | Nutritional Supplements | +25% egg value | 40 |
| `better_incubators` | Better Incubators | +10% hatchery refill | 15 |
| `excitable_chickens` | Excitable Chickens | +0.1% RCB per chicken | 25 |

### Tier 2 (Superfood Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `hab_capacity1` | Hen House Remodel | +5% hab capacity | 8 |
| `bigger_hatchery` | Bigger Hatchery | +50 hatchery capacity | 10 |
| `internal_hatchery1` | Internal Hatcheries | +2 chickens/min | 10 |
| `padded_packaging` | Padded Packaging | +25% egg value | 25 |
| `hen_house_ac` | Hen House A/C | +5% egg laying rate | 50 |

### Tier 3 (Medical Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `superfood` | Superfood Diet | +25% egg value | 20 |
| `internal_hatchery2` | Internal Hatchery Upgrades | +5 chickens/min | 10 |
| `leafsprings` | Improved Leafsprings | +5% shipping capacity | 30 |
| `microlux` | Microlux Chicken Suites | +5% hab capacity | 10 |
| `compact_incubators` | Compact Incubators | +100 hatchery capacity | 20 |

### Tier 4 (Rocket Fuel Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `time_compress` | Time Compression | +10% egg laying rate | 20 |
| `grav_plating` | Grav Plating | +2% hab capacity | 25 |
| `usde_prime` | USDE Prime | +25% egg value, +0.25x RCB | 10 |
| `driver_training` | Driver Training | +5% shipping capacity | 30 |

### Tier 5 (Super Material Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `rooster_booster` | Rooster Booster | +10 chickens/min | 10 |
| `lightweight_boxes` | Lightweight Boxes | +10% shipping capacity | 40 |
| `excoskeletons` | Depot Worker Exoskeletons | +1 fleet size | 2 |
| `internal_hatchery3` | Internal Hatchery Expansion | +10 chickens/min | 15 |
| `improved_genetics` | Improved Genetics | +15% laying rate & value | 30 |

### Tier 6 (Fusion Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `traffic_management` | Traffic Management | +1 fleet size | 2 |
| `motivational_clucking` | Motivational Clucking | +0.5x max RCB | 50 |
| `super_alloy` | Super Alloy Frames | +10% shipping capacity | 50 |
| `timeline_diversion` | Timeline Diversion | +2% egg laying rate | 50 |
| `graviton_coating` | Graviton Coating | +25% egg value | 15 |

### Tier 7 (Quantum Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `chrystal_shells` | Chrystal Shells | +25% egg value | 15 |
| `internal_hatchery4` | Internal Hatchery Expansion | +25 chickens/min | 30 |
| `coordinated_clucking` | Coordinated Clucking | +1x max RCB | 30 |
| `quantum_storage` | Quantum Storage | +5% shipping capacity | 20 |
| `relativity_optimization` | Relativity Optimization | +10% egg laying rate | 10 |
| `hover_upgrades` | Hover Upgrades | +10% shipping capacity | 25 |

### Tier 8 (Immortality Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `telepathic_will` | Telepathic Will | +25% egg value | 30 |
| `dark_containment` | Dark Containment | +5% shipping capacity | 25 |
| `wormhole_dampening` | Wormhole Dampening | +5% hab capacity | 25 |
| `internal_hatchery5` | Machine Learning Incubators | +5 chickens/min | 250 |

### Tier 9 (Tachyon Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `neural_net_refine` | Neural Net Refinement | +5% shipping capacity | 25 |
| `hyper_portalling` | Hyper Portalling | +5% shipping capacity | 25 |

### Tier 10 (Graviton Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `matter_reconfiguration` | Matter Reconfiguration | +5% shipping capacity | 25 |

### Tier 11 (Dilithium Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `eggsistor_miniturization` | Eggsistor Miniaturization | +25% egg value | 100 |

### Tier 12 (Prodigy Egg)
| ID | Name | Effect | Levels |
|----|------|--------|--------|
| `neural_linking` | Neural Linking | +50 chickens/min | 30 |

---

## Epic Research

Epic research is permanent (doesn't reset on prestige or between shifts) and costs Golden Eggs (GE). During virtue, epic research can only be purchased on the **Curiosity** egg.

| ID | Name | Effect | Levels | Cost Range |
|----|------|--------|--------|------------|
| `hold_to_hatch` | Hold to Hatch | +2 chickens/sec when holding | 15 | 5-1100 GE |
| `epic_hatchery` | Epic Hatchery | +10% hatchery refill | 20 | 75-3,060 GE |
| `epic_internal_incubators` | Epic Int. Hatcheries | +5% IHR (multiplicative) | 20 | 125-30,000 GE |
| `video_doubler_time` | Video Doubler Time | +30 min video doubler | 12 | 100-500 GE |
| `epic_clucking` | Epic Clucking | +0.1% RCB per chicken | 20 | 100-15,000 GE |
| `epic_multiplier` | Epic Multiplier | +2x max RCB | 100 | 1,000-1,000,000 GE |
| `cheaper_contractors` | Cheaper Contractors | -5% hab build cost | 10 | 25-200 GE |
| `bust_unions` | Bust Unions | -5% vehicle hire cost | 10 | 25-100 GE |
| `cheaper_research` | Lab Upgrade | -5% research cost | 10 | 25-500 GE |
| `silo_capacity` | Silo Capacity | +6 min away time/silo | 20 | 100-75,000 GE |
| `int_hatch_sharing` | Internal Hatchery Sharing | +10% full hab sharing | 10 | 150-10,000 GE |
| `int_hatch_calm` | Internal Hatchery Calm | +10% IHR while away | 20 | 200-25,000 GE |
| `accounting_tricks` | Accounting Tricks | +5% farm valuation | 20 | 200-10,000 GE |
| `soul_eggs` | Soul Food | +1% SE bonus | 140 | 250-1,000,000 GE |
| `prestige_bonus` | Prestige Bonus | +10% SE on prestige | 20 | 500-25,000 GE |
| `drone_rewards` | Drone Rewards | +10% better drone rewards | 20 | 500-25,000 GE |
| `epic_egg_laying` | Epic Comfy Nests | +5% egg laying rate | 20 | 1,000-50,000 GE |
| `transportation_lobbyist` | Transportation Lobbyists | +5% shipping capacity | 30 | 1,000-50,000 GE |
| `prophecy_bonus` | Prophecy Bonus | +1% PE bonus (compound) | 5 | 50,000-500,000 GE |
| `hold_to_research` | Hold to Research | +25% research button speed | 8 | 5,000-50,000 GE |
| `afx_mission_time` | FTL Drive Upgrades | -1% mission time | 25 | varies |
| `afx_mission_capacity` | Zero-g Quantum Containment | +5% mission capacity | 10 | varies |

---

## Usage in Ascension Planner

### Creating a TypeScript Wrapper

```typescript
// src/lib/researches.ts
import researchesRaw from '@/researches.json';

type ResearchType = 'common' | 'epic';
type ResearchCategory =
  | 'egg_laying_rate'
  | 'egg_value'
  | 'fleet_size'
  | 'hab_capacity'
  | 'hatchery_capacity'
  | 'hatchery_refill_rate'
  | 'internal_hatchery_rate'
  | 'running_chicken_bonus'
  | 'shipping_capacity';

export interface Research {
  serial_id: number;
  id: string;
  name: string;
  type: ResearchType;
  tier?: number;
  categories: string;
  description: string;
  effect_type: 'additive' | 'multiplicative';
  levels: number;
  per_level: number;
  levels_compound: 'additive' | 'multiplicative';
  prices: number[];
  virtue_prices: number[];
}

export const researches: Research[] = researchesRaw as Research[];

export const commonResearches = researches.filter(r => r.type === 'common');
export const epicResearches = researches.filter(r => r.type === 'epic');

export function getResearchById(id: string): Research | undefined {
  return researches.find(r => r.id === id);
}

export function getResearchesByCategory(category: string): Research[] {
  return researches.filter(r => r.categories && r.categories.includes(category));
}

export function getResearchesByTier(tier: number): Research[] {
  return researches.filter(r => r.tier === tier);
}
```

### Calculating Research Costs (Virtue)

```typescript
import { getResearchById } from '@/lib/researches';

// Common research: uses virtue_prices (gems)
function getCommonResearchCost(researchId: string, fromLevel: number, toLevel: number): number {
  const research = getResearchById(researchId);
  if (!research || research.type !== 'common' || !research.virtue_prices) return 0;

  let total = 0;
  for (let level = fromLevel; level < toLevel; level++) {
    total += research.virtue_prices[level] || 0;
  }
  return total;
}

// Epic research: uses prices (Golden Eggs)
function getEpicResearchCost(researchId: string, fromLevel: number, toLevel: number): number {
  const research = getResearchById(researchId);
  if (!research || research.type !== 'epic') return 0;

  let total = 0;
  for (let level = fromLevel; level < toLevel; level++) {
    total += research.prices[level] || 0;
  }
  return total;
}

// Example: Cost to buy Comfortable Nests from level 5 to level 20
const gemCost = getCommonResearchCost('comfy_nests', 5, 20);
console.log(`Cost: ${gemCost} gems`);

// Example: Cost to buy Soul Food from level 0 to level 10
const geCost = getEpicResearchCost('soul_eggs', 0, 10);
console.log(`Cost: ${geCost} GE`);
```

### Calculating Research Effects

```typescript
function calculateResearchMultiplier(
  researches: { id: string; level: number }[]
): number {
  let multiplier = 1;

  for (const { id, level } of researches) {
    const research = getResearchById(id);
    if (!research) continue;

    if (research.effect_type === 'multiplicative') {
      // Multiplicative: multiply by (1 + perLevel * level)
      multiplier *= (1 + research.per_level * level);
    }
  }

  return multiplier;
}

// Example: Egg laying rate multiplier
const layingResearch = [
  { id: 'comfy_nests', level: 50 },        // 1 + 0.10 * 50 = 6.0x
  { id: 'hen_house_ac', level: 50 },       // 1 + 0.05 * 50 = 3.5x
  { id: 'improved_genetics', level: 30 },  // 1 + 0.15 * 30 = 5.5x
];
const multiplier = calculateResearchMultiplier(layingResearch);
// 6.0 * 3.5 * 5.5 = 115.5x
```

### Tracking Research in Plan State

```typescript
interface CuriosityStepState {
  // Track levels purchased during this shift (common resets each shift)
  commonResearchLevels: Map<string, number>;
  gemsSpent: number;

  // Epic research is permanent, but can only be bought on Curiosity
  epicResearchLevels: Map<string, number>;
  goldenEggsSpent: number;
}

function purchaseCommonResearch(
  state: CuriosityStepState,
  researchId: string,
  levels: number
): void {
  const research = getResearchById(researchId);
  if (!research || research.type !== 'common') return;

  const currentLevel = state.commonResearchLevels.get(researchId) || 0;
  const newLevel = Math.min(currentLevel + levels, research.levels);

  // Calculate gem cost
  let cost = 0;
  for (let l = currentLevel; l < newLevel; l++) {
    cost += research.virtue_prices[l];
  }

  state.commonResearchLevels.set(researchId, newLevel);
  state.gemsSpent += cost;
}

function purchaseEpicResearch(
  state: CuriosityStepState,
  researchId: string,
  levels: number
): void {
  const research = getResearchById(researchId);
  if (!research || research.type !== 'epic') return;

  const currentLevel = state.epicResearchLevels.get(researchId) || 0;
  const newLevel = Math.min(currentLevel + levels, research.levels);

  // Calculate GE cost
  let cost = 0;
  for (let l = currentLevel; l < newLevel; l++) {
    cost += research.prices[l];
  }

  state.epicResearchLevels.set(researchId, newLevel);
  state.goldenEggsSpent += cost;
}
```

---

## Important Notes

### Price Arrays

- `prices[]` - Cost for each level (0-indexed, so level 1 = prices[0])
  - Common research: Bock (cash) cost (normal gameplay)
  - Epic research: Golden Egg cost
- `virtue_prices[]` - Gem cost for common research during virtue (only in ascension-planner/virtue-companion copies)

### Effect Stacking

All researches use `levels_compound: "additive"`, meaning:
- Level effects add: level 10 at +10%/level = +100% total
- Multiple researches multiply: (1 + 1.0) * (1 + 0.5) = 3.0x

### Virtue-Specific

During virtue runs:
- All research (common and epic) can only be purchased on **Curiosity**
- Common research costs gems (use `virtue_prices` array)
- Epic research costs Golden Eggs (use `prices` array)
- Common research resets when starting a new shift
- Epic research is permanent across all shifts

---

## Related Files

- `lib/farm/laying_rate.ts` - Uses egg_laying_rate research
- `lib/farm/hab_space.ts` - Uses hab_capacity research
- `lib/farm/shipping_capacity.ts` - Uses shipping_capacity research
- `lib/farm/internal_hatchery.ts` - Uses internal_hatchery_rate research
- `lib/farm/silos.ts` - Uses silo_capacity epic research
