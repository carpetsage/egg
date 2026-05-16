import { createBaseEngineState, getSimulationContext } from '../src/engine/adapter';
import { runAscension } from '../src/auto/shifts';
import { getNextPacificTime } from '../src/lib/events';

// Mock context for testing
const context = getSimulationContext();
const absStartTime = Math.floor(Date.now() / 1000);
context.ascensionStartTime = absStartTime;

// Build phase ends after first sale
const nextSaleStart = getNextPacificTime(5, 9, absStartTime);
const buildPhaseEnd = nextSaleStart + 86400;

const baseState = createBaseEngineState(null);
baseState.currentEgg = 'curiosity';
baseState.population = 1;
baseState.bankValue = 0;
baseState.te = 400; // High TE to ensure immediate spending

console.log('Running Integration Test: Full Build Phase (C1 -> K3)');
const { actions, summary } = runAscension(baseState, context, buildPhaseEnd, absStartTime);

console.log('\n--- Ascension Summary ---');
console.log(`Duration: ${summary.totalDurationSeconds}s (${(summary.totalDurationSeconds / 3600).toFixed(1)} hrs)`);
console.log(`Peak ELR: ${summary.maxELR * 3600} eggs/hr`);
console.log(`TE Gained: ${summary.teGained}`);
console.log(`SE Cost: ${summary.totalShiftCost}`);

const shiftActions = actions.filter(a => a.type === 'shift');
console.log(`\nShifts Executed (${shiftActions.length}):`);
shiftActions.forEach((a, i) => {
    console.log(`${i+1}. ${a.payload.fromEgg} -> ${a.payload.toEgg} (Cost: ${a.cost})`);
});

const researchCount = actions.filter(a => a.type === 'buy_research').length;
const vehicleCount = actions.filter(a => a.type === 'buy_vehicle').length;
const habCount = actions.filter(a => a.type === 'buy_hab').length;

console.log(`\nAction Counts:`);
console.log(`- Research: ${researchCount}`);
console.log(`- Vehicles: ${vehicleCount}`);
console.log(`- Habs: ${habCount}`);

// Verify order of specific key actions
const order = actions.map(a => a.type);
const firstHab = order.indexOf('buy_hab');
const firstVehicle = order.indexOf('buy_vehicle');

if (firstHab !== -1 && firstVehicle !== -1) {
    console.log(`\nSequence Verification:`);
    console.log(`- First Hab at index ${firstHab}`);
    console.log(`- First Vehicle at index ${firstVehicle}`);
}
