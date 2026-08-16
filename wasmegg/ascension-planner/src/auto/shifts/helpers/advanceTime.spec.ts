import { describe, expect, test } from 'vitest';
import { modifiersFromColleggtibleTiers } from 'lib/collegtibles';
import type { EngineState, SimulationContext } from '../../types';
import { advanceTimeWithBoundaries } from './advanceTime';
import { getNextEarningsBoostStart } from '@/lib/events';

function fakeState(overrides: Partial<EngineState> = {}): EngineState {
  return {
    currentEgg: 'curiosity',
    shiftCount: 0,
    te: 0,
    soulEggs: 0,
    bankValue: 0,
    habIds: [0, null, null, null],
    vehicles: [{ vehicleId: 0, trainLength: 1 }],
    researchLevels: {},
    siloCount: 2,
    tankLevel: 0,
    artifactLoadout: [],
    activeArtifactSet: null,
    artifactSets: { earnings: null, elr: null },
    fuelTankAmounts: {} as EngineState['fuelTankAmounts'],
    eggsDelivered: {} as EngineState['eggsDelivered'],
    teEarned: {} as EngineState['teEarned'],
    population: 1e18,
    lastStepTime: 0,
    activeSales: { research: false, hab: false, vehicle: false },
    earningsBoost: { active: false, multiplier: 1 },
    ...overrides,
  };
}

function fakeContext(overrides: Partial<SimulationContext> = {}): SimulationContext {
  return {
    epicResearchLevels: {},
    colleggtibleModifiers: modifiersFromColleggtibleTiers({}),
    ascensionStartTime: 0,
    planStartOffset: 0,
    assumeDoubleEarnings: false,
    deferForEarningsMode: false,
    ...overrides,
  };
}

describe('advanceTimeWithBoundaries defer for earnings mode', () => {
  // Anchor comfortably before the next Earnings Boost start (Monday 9am PT) so a ~2-day advance
  // is guaranteed to cross it.
  const anchor = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000; // a Monday, well clear of any boost window
  const boostStart = getNextEarningsBoostStart(anchor);
  const totalSeconds = boostStart - anchor + 3600; // land an hour into the boost

  test('inserts a modify_bank credit right before toggle_earnings_boost when defer for earnings mode is on', () => {
    const state = fakeState({ siloCount: 2, lastStepTime: 0 });
    const context = fakeContext({ ascensionStartTime: anchor, deferForEarningsMode: true });

    const actions: any[] = [];
    advanceTimeWithBoundaries(state, actions, 0, context, anchor, totalSeconds);

    const boostOnIdx = actions.findIndex(a => a.type === 'toggle_earnings_boost' && a.payload.active === true);
    expect(boostOnIdx).toBeGreaterThan(0);
    expect(actions[boostOnIdx - 1].type).toBe('modify_bank');
    expect(actions[boostOnIdx - 1].payload.delta).toBeGreaterThan(0);
    expect(actions[boostOnIdx - 1].bankDelta).toBeGreaterThan(0);
  });

  test('does NOT insert a modify_bank credit when defer for earnings mode is off', () => {
    const state = fakeState({ siloCount: 2, lastStepTime: 0 });
    const context = fakeContext({ ascensionStartTime: anchor, deferForEarningsMode: false });

    const actions: any[] = [];
    advanceTimeWithBoundaries(state, actions, 0, context, anchor, totalSeconds);

    expect(actions.some(a => a.type === 'modify_bank')).toBe(false);
    expect(actions.some(a => a.type === 'toggle_earnings_boost' && a.payload.active === true)).toBe(true);
  });
});
