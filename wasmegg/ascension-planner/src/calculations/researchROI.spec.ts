import { describe, expect, test } from 'vitest';
import { getSaleAwareTimeToSave } from './researchROI';
import { getNextSaleStart, getNextSaleEnd, isResearchSaleActive } from '@/lib/events';
import type { CommonResearch, ResearchCostModifiers } from './commonResearch';
import type { CalculationsSnapshot } from '@/types';

// A single research sale runs Friday 9 AM PT -> Saturday 9 AM PT (24h), weekly (see lib/events.ts).
const WEEK_SECONDS = 7 * 86400;
const SALE_DURATION_SECONDS = 86400;
const GAP_BETWEEN_SALES_SECONDS = WEEK_SECONDS - SALE_DURATION_SECONDS;

const mods: ResearchCostModifiers = { labUpgradeLevel: 0, researchCostMultiplier: 1, puzzleCubeMultiplier: 1 };

function fakeResearch(virtuePrice: number): CommonResearch {
  return {
    serial_id: 0,
    id: 'test_research',
    name: 'Test Research',
    type: 'common',
    tier: 1,
    categories: '',
    description: '',
    effect_type: '',
    levels: 5,
    per_level: 1,
    levels_compound: 'additive',
    prices: [0, 0, 0, 0, 0],
    virtue_prices: [virtuePrice],
  };
}

// Rigged so `getTimeToSave(price, snapshot, [])` returns exactly `price` seconds: population is
// already at habCapacity (no growth needed) and ratePerChickenPerSecond is large enough that the
// shipping cap (1 egg/sec) binds immediately, with elr/offlineEarnings chosen so each egg is worth
// exactly $1. That makes the test's expected wait times trivial to compute and verify by hand.
function fakeSnapshot(bankValue = 0): CalculationsSnapshot {
  return {
    eggValue: 1,
    habCapacity: 1e18,
    elr: 1,
    shippingCapacity: 1,
    layRate: 0,
    onlineEarnings: 0,
    offlineEarnings: 1,
    onlineIHR: 0,
    offlineIHR: 0,
    ratePerChickenPerSecond: 1e18,
    bankValue,
    currentEgg: 'edible' as CalculationsSnapshot['currentEgg'],
    shiftCount: 0,
    te: 0,
    soulEggs: 0,
    siloCount: 0,
    siloTimeMinutes: 0,
    tankLevel: 0,
    fuelTankAmounts: {} as CalculationsSnapshot['fuelTankAmounts'],
    eggsDelivered: {} as CalculationsSnapshot['eggsDelivered'],
    teEarned: {} as CalculationsSnapshot['teEarned'],
    population: 1e18,
    lastStepTime: 0,
    vehicles: [],
    habIds: [],
    researchLevels: {},
    artifactLoadout: [],
    activeArtifactSet: null,
    artifactSets: { earnings: null, elr: null },
    activeSales: { research: false, hab: false, vehicle: false },
    earningsBoost: { active: false, multiplier: 1 },
  };
}

describe('getSaleAwareTimeToSave', () => {
  test('waits for a LATER sale (not just the immediate next one) when saving spans multiple weekly cycles', () => {
    // Anchor 1 hour after some sale ends, so we're definitely not in a sale and the immediate next
    // sale is ~6 days away.
    const anchor = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
    const currentAbsoluteTime = getNextSaleEnd(anchor) + 3600;
    expect(isResearchSaleActive(currentAbsoluteTime)).toBe(false);

    // Sale price needs 12 days of saving (~1,036,800s) — more than fits in the immediate next sale's
    // 24h window (it starts in ~6 days and ends ~7 days out), so this must skip that sale entirely
    // and land in the one after it.
    const research = fakeResearch(Math.ceil(1_036_800 / 0.3));
    const snapshot = fakeSnapshot();

    const result = getSaleAwareTimeToSave(research, 0, mods, false, currentAbsoluteTime, snapshot, []);

    expect(result.duringSale).toBe(true);
    // Cheaper than paying full, undiscounted price with no sale at all.
    const fullPriceWait = research.virtue_prices[0];
    expect(result.waitSeconds).toBeLessThan(fullPriceWait);
    // Actually completes during a real sale window...
    const completesAt = currentAbsoluteTime + result.waitSeconds;
    expect(isResearchSaleActive(completesAt)).toBe(true);
    // ...and specifically NOT the immediate next one — this is the multi-cycle case the fix covers.
    expect(completesAt).toBeGreaterThan(getNextSaleEnd(currentAbsoluteTime));
  });

  test('buys at full price now, without waiting, when no sale is worth it for a cheap item', () => {
    const anchor = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
    const currentAbsoluteTime = getNextSaleEnd(anchor) + 3600;

    // Cheap enough that full price is affordable almost immediately — far faster than waiting ~6
    // days for the next sale to even start.
    const research = fakeResearch(1000);
    const snapshot = fakeSnapshot();

    const result = getSaleAwareTimeToSave(research, 0, mods, false, currentAbsoluteTime, snapshot, []);

    expect(result.duringSale).toBe(false);
    expect(result.waitSeconds).toBeCloseTo(1000, 0);
  });

  test('still buys during the immediate next sale when saving finishes within its window (happy path unchanged)', () => {
    const anchor = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
    const currentAbsoluteTime = getNextSaleEnd(anchor) + 3600;

    // Sale price needs ~6.9 days of saving — lands inside the immediate next sale's 24h window.
    const research = fakeResearch(Math.ceil(600_000 / 0.3));
    const snapshot = fakeSnapshot();

    const result = getSaleAwareTimeToSave(research, 0, mods, false, currentAbsoluteTime, snapshot, []);

    expect(result.duringSale).toBe(true);
    const completesAt = currentAbsoluteTime + result.waitSeconds;
    expect(completesAt).toBeLessThanOrEqual(getNextSaleEnd(currentAbsoluteTime));
  });

  test('currently in a sale that will end too soon: waits for a LATER sale instead of giving up on the discount', () => {
    const anchor = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
    const saleStart = getNextSaleStart(anchor);
    const currentAbsoluteTime = saleStart + 1000; // 1000s into an active sale
    expect(isResearchSaleActive(currentAbsoluteTime)).toBe(true);

    // At 30% off, needs ~12 days to save — won't finish before THIS sale ends (in ~23h), nor before
    // the NEXT one starts/ends either (only ~6 days later) — has to skip two sales and land on the
    // third.
    const research = fakeResearch(Math.ceil(1_036_800 / 0.3));
    const snapshot = fakeSnapshot();

    const result = getSaleAwareTimeToSave(research, 0, mods, true, currentAbsoluteTime, snapshot, []);

    expect(result.duringSale).toBe(true);
    const fullPriceWait = research.virtue_prices[0];
    expect(result.waitSeconds).toBeLessThan(fullPriceWait);
    const completesAt = currentAbsoluteTime + result.waitSeconds;
    expect(isResearchSaleActive(completesAt)).toBe(true);
    // Confirms it's not just re-using the current sale's own (already-too-short) window.
    expect(completesAt).toBeGreaterThan(getNextSaleEnd(currentAbsoluteTime));
  });
});

// Sanity check on the fixture's own assumed cadence, so the hand-computed expectations above stay
// honest if events.ts's schedule ever changes.
test('sale schedule fixture assumptions hold', () => {
  const anchor = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
  const start = getNextSaleStart(anchor);
  const end = getNextSaleEnd(anchor);
  expect(end - start).toBe(SALE_DURATION_SECONDS);
  const nextStart = getNextSaleStart(end);
  expect(nextStart - end).toBe(GAP_BETWEEN_SALES_SECONDS);
});
