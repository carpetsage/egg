# Rockets Reference

This document contains complete reference data for spaceships/rockets in Egg Inc.

## Data Sources

- **Ship Parameters**: `/lib/eiafx-config.json` - Contains duration, capacity, quality for each ship/mission type
- **Fuel Requirements**: `/lib/missions.ts` - Contains both standard and virtue fuel requirements
- **Ship Icons**: Located at `egginc/afx_ship_*.png`

## Ships Overview

There are 11 spaceships in total. Ships are unlocked sequentially by completing missions.

| # | Ship ID | Display Name | Icon Path | Sensor | Max Level |
|---|---------|--------------|-----------|--------|-----------|
| 0 | CHICKEN_ONE | Chicken One | `egginc/afx_ship_chicken_1.png` | Basic | 0 |
| 1 | CHICKEN_NINE | Chicken Nine | `egginc/afx_ship_chicken_9.png` | Basic | 2 |
| 2 | CHICKEN_HEAVY | Chicken Heavy | `egginc/afx_ship_chicken_heavy.png` | Intermediate | 3 |
| 3 | BCR | BCR | `egginc/afx_ship_bcr.png` | Intermediate | 4 |
| 4 | MILLENIUM_CHICKEN | Quintillion Chicken | `egginc/afx_ship_millenium_chicken.png` | Advanced | 4 |
| 5 | CORELLIHEN_CORVETTE | Cornish-Hen Corvette | `egginc/afx_ship_corellihen_corvette.png` | Advanced | 4 |
| 6 | GALEGGTICA | Galeggtica | `egginc/afx_ship_galeggtica.png` | Advanced | 5 |
| 7 | CHICKFIANT | Defihent | `egginc/afx_ship_defihent.png` | Cutting Edge | 5 |
| 8 | VOYEGGER | Voyegger | `egginc/afx_ship_voyegger.png` | Cutting Edge | 6 |
| 9 | HENERPRISE | Henerprise | `egginc/afx_ship_henerprise.png` | Next Generation | 8 |
| 10 | ATREGGIES | Atreggies Henliner | `egginc/afx_ship_atreggies.png` | Next Generation | 8 |

## Mission Duration Types

| Duration Type | Display Name | Proto Value |
|---------------|--------------|-------------|
| TUTORIAL | Tutorial | 3 |
| SHORT | Short | 0 |
| LONG | Standard | 1 |
| EPIC | Extended | 2 |

Note: Tutorial missions are only available for Chicken One.

## Launches to Unlock Next Ship

| Ship | Launches Required |
|------|-------------------|
| Chicken One | 4 |
| Chicken Nine | 6 |
| Chicken Heavy | 12 |
| BCR | 15 |
| Quintillion Chicken | 18 |
| Cornish-Hen Corvette | 21 |
| Galeggtica | 24 |
| Defihent | 27 |
| Voyegger | 30 |
| Henerprise | 40 |
| Atreggies Henliner | ∞ (max ship) |

## Ship Level Requirements

Launch points required to reach each star level (cumulative):

| Ship | Level Thresholds |
|------|-----------------|
| Chicken One | (no levels) |
| Chicken Nine | 4, 14 |
| Chicken Heavy | 5, 20, 45 |
| BCR | 5, 20, 45, 85 |
| Quintillion Chicken | 10, 35, 75, 125 |
| Cornish-Hen Corvette | 10, 35, 75, 125 |
| Galeggtica | 10, 35, 75, 125, 185 |
| Defihent | 10, 35, 75, 125, 185 |
| Voyegger | 10, 35, 75, 125, 185, 255 |
| Henerprise | 10, 35, 75, 125, 185, 255, 335, 435 |
| Atreggies Henliner | 20, 60, 140, 260, 420, 620, 920, 1420 |

Launch points per mission type:
- Short: 1 point
- Standard: 1.4 points
- Extended: 1.8 points

## Mission Parameters by Ship

### Chicken One

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Tutorial | 1m | 0.9 | 0 - 1.3 | 4 | 0 | 0 |
| Short | 20m | 1.0 | 0 - 1.4 | 4 | 0 | 0.10 |
| Standard | 1h | 1.1 | 0 - 1.7 | 5 | 1 | 0.14 |
| Extended | 2h | 1.2 | 0 - 2.2 | 6 | 1 | 0.17 |

### Chicken Nine

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 30m | 1.4 | 0 - 1.9 | 7 | 1 | 0.10 |
| Standard | 1h | 1.6 | 0 - 2.35 | 8 | 1 | 0.18 |
| Extended | 3h | 1.75 | 0 - 2.7 | 9 | 1 | 0.20 |

### Chicken Heavy

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 45m | 1.9 | 0 - 3.1 | 12 | 1 | 0.20 |
| Standard | 1.5h | 2.1 | 0 - 3.3 | 14 | 2 | 0.22 |
| Extended | 4h | 2.4 | 0 - 3.6 | 15 | 2 | 0.25 |

### BCR

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 1.5h | 2.5 | 0 - 3.2 | 18 | 2 | 0.22 |
| Standard | 4h | 2.7 | 0 - 3.6 | 20 | 2 | 0.25 |
| Extended | 8h | 2.9 | 0 - 4.2 | 22 | 3 | 0.27 |

### Quintillion Chicken (FTL ships start here)

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 3h | 3.0 | 0.5 - 4.1 | 10 | 1 | 0.25 |
| Standard | 6h | 3.3 | 0.5 - 4.5 | 12 | 2 | 0.25 |
| Extended | 12h | 3.5 | 0.5 - 5.4 | 14 | 2 | 0.25 |

### Cornish-Hen Corvette

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 4h | 3.5 | 1.5 - 4.3 | 18 | 3 | 0.27 |
| Standard | 12h | 3.8 | 1.6 - 5.0 | 21 | 3 | 0.27 |
| Extended | 1d | 4.1 | 1.75 - 5.9 | 24 | 4 | 0.27 |

### Galeggtica

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 6h | 4.0 | 2.0 - 5.2 | 27 | 4 | 0.28 |
| Standard | 16h | 4.3 | 2.3 - 6.1 | 30 | 5 | 0.28 |
| Extended | 30h | 4.6 | 2.5 - 7.2 | 35 | 6 | 0.28 |

### Defihent

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 8h | 5.0 | 3.0 - 7.2 | 20 | 3 | 0.29 |
| Standard | 1d | 5.6 | 3.2 - 8.0 | 24 | 4 | 0.29 |
| Extended | 2d | 6.3 | 3.4 - 9.2 | 28 | 5 | 0.29 |

### Voyegger

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 12h | 5.8 | 3.3 - 8.5 | 30 | 4 | 0.30 |
| Standard | 1.5d | 6.4 | 3.8 - 9.7 | 35 | 5 | 0.30 |
| Extended | 3d | 7.1 | 3.9 - 12.0 | 40 | 6 | 0.30 |

### Henerprise

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 1d | 6.6 | 3.8 - 9.5 | 45 | 5 | 0.31 |
| Standard | 2d | 7.3 | 4.1 - 11.5 | 50 | 6 | 0.31 |
| Extended | 4d | 8.0 | 4.5 - 14.0 | 56 | 7 | 0.31 |

### Atreggies Henliner

| Duration | Time | Quality | Quality Range | Capacity | +Cap/Lvl | +Qual/Lvl |
|----------|------|---------|---------------|----------|----------|-----------|
| Short | 2d | 6.7 | 3.2 - 9.5 | 60 | 7 | 0.31 |
| Standard | 3d | 7.4 | 4.0 - 11.5 | 78 | 8 | 0.31 |
| Extended | 4d | 8.1 | 4.0 - 14.0 | 86 | 10 | 0.31 |

## Fuel Requirements

### Standard Fuel (Regular Missions)

| Ship | Short | Standard | Extended |
|------|-------|----------|----------|
| Chicken One | RF 2M | RF 3M | RF 10M |
| Chicken Nine | RF 10M | RF 15M | RF 25M |
| Chicken Heavy | RF 100M | RF 50M + FU 5M | RF 75M + FU 25M |
| BCR | RF 250M + FU 50M | RF 400M + FU 75M | SF 5M + RF 300M + FU 100M |
| Quintillion Chicken | FU 5B + GV 1B | FU 7B + GV 5B | SF 10M + FU 10B + GV 15B |
| Cornish-Hen Corvette | FU 15B + GV 2B | FU 20B + GV 3B | SF 500M + FU 25B + GV 5B |
| Galeggtica | FU 50B + GV 10B | FU 75B + GV 25B | FU 100B + GV 50B + AM 1B |
| Defihent | DI 200B + AM 50B | DI 250B + AM 150B | TA 25B + DI 250B + AM 250B |
| Voyegger | DI 1T + AM 1T | DI 1.5T + AM 1.5T | TA 100B + DI 2T + AM 2T |
| Henerprise | DI 2T + AM 2T | DI 3T + AM 3T + DM 3T | TA 1T + DI 3T + AM 3T + DM 3T |
| Atreggies | DI 4T + AM 4T + DM 3T | DI 6T + AM 6T + DM 4T | TA 2T + DI 6T + AM 6T + DM 6T |

Egg abbreviations: RF=Rocket Fuel, FU=Fusion, SF=Superfood, GV=Graviton, DI=Dilithium, AM=Antimatter, TA=Tachyon, DM=Dark Matter

### Virtue Fuel (Virtue Missions)

| Ship | Short | Standard | Extended |
|------|-------|----------|----------|
| Chicken One | HU 5M | HU 10M | HU 20M |
| Chicken Nine | HU 10M | HU 20M | HU 50M |
| Chicken Heavy | HU 50M | HU 100M | HU 150M |
| BCR | HU 100M + IN 10M | HU 150M + IN 20M | HU 200M + IN 30M |
| Quintillion Chicken | HU 10B + IN 10B | HU 20B + IN 20B | HU 50B + IN 50B |
| Cornish-Hen Corvette | HU 20B + IN 5B | HU 40B + IN 8B | HU 70B + IN 10B |
| Galeggtica | HU 200B + IN 200B + CU 200B | HU 400B + IN 400B + CU 400B | HU 600B + IN 600B + CU 600B |
| Defihent | HU 1T + CU 1T + KI 1T | HU 2T + CU 2T + KI 2T | HU 3T + CU 3T + KI 3T |
| Voyegger | HU 5T + CU 10T + KI 5T | HU 10T + CU 20T + KI 10T | HU 15T + CU 25T + KI 15T |
| Henerprise | HU 10T + CU 15T + KI 10T | HU 15T + CU 20T + KI 15T + RE 10T | HU 25T + CU 25T + KI 25T + RE 20T |
| Atreggies | HU 20T + CU 25T + KI 20T | HU 30T + CU 40T + KI 30T + RE 20T | HU 75T + CU 50T + KI 75T + RE 40T |

Egg abbreviations: HU=Humility, IN=Integrity, CU=Curiosity, KI=Kindness, RE=Resilience

## Fuel Tank Configuration

Fuel tank upgrade levels and capacities:

| Level | Capacity |
|-------|----------|
| 1 | 2B |
| 2 | 200B |
| 3 | 10T |
| 4 | 100T |
| 5 | 200T |
| 6 | 300T |
| 7 | 400T |
| 8 | 500T |

## Epic Research Effects

### FTL Drive Upgrades (afx_mission_time)
- Effect: -1% mission duration per level (FTL ships only: Quintillion Chicken and above)
- Max Level: 60
- At max: 40% reduction in mission time

### Zero-g Quantum Containment (afx_mission_capacity)
- Effect: +5% capacity per level
- Max Level: 10
- At max: 50% increased capacity

## Quality Explained

Quality determines the rarity and tier of artifacts received:
- Higher quality = better chance of rare/legendary artifacts
- Quality increases with ship level
- Extended missions have highest base quality
- Each ship level adds the levelQualityBump to base quality

## Gem Costs

Based on the codebase analysis, virtue missions use virtue eggs as fuel rather than requiring gems to launch. The mission mechanics (duration, capacity, quality) remain the same between standard and virtue missions - only the fuel type changes.

Note: Gems may be used in-game to speed up or skip missions, but this data is not present in the available codebase files.

## Code References

- Ship list: `/lib/missions.ts:188-200`
- Ship names: `/lib/missions.ts:729-756`
- Ship icons: `/lib/missions.ts:758-785`
- Standard fuel data: `/lib/missions.ts:847-960`
- Virtue fuel data: `/lib/missions.ts:961-1092`
- Mission parameters: `/lib/eiafx-config.json`
- MissionType class: `/lib/missions.ts:427-545`

## Using in Code

```typescript
import { MissionType, spaceshipList, missionDurationTypeList } from 'lib';
import { ei } from 'lib';

// Create a mission type
const henShort = new MissionType(
  ei.MissionInfo.Spaceship.HENERPRISE,
  ei.MissionInfo.DurationType.SHORT
);

// Get properties
console.log(henShort.name);               // "Henerprise, Short"
console.log(henShort.defaultDurationDisplay); // "1d"
console.log(henShort.defaultCapacity);    // 45
console.log(henShort.defaultFuels);       // Standard fuel requirements
console.log(henShort.virtueFuels);        // Virtue fuel requirements
```
