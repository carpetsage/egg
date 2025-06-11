import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { colleggtibleShippingCapacityMultiplier } from './colleggtibles';

export function shippingCapacityMultiplier(build: Build, config: Config): number {
  return (
    multiplicativeEffect(build, config, [ArtifactSpec.Name.INTERSTELLAR_COMPASS, ArtifactSpec.Name.QUANTUM_STONE]) *
    colleggtibleShippingCapacityMultiplier(config)
  );
}

export function maxHourlyShippingCapacity(build: Build, config: Config): number {
  return baseMaxHourlyShippingCapacity(config) * shippingCapacityMultiplier(build, config);
}

function baseMaxHourlyShippingCapacity(_config: Config): number {
  // Hyperloop train base shipping rate: 50,000,000/min
  // Affected by the following researches:
  // {id, perLevel, maxLevels}
  // {"leafsprings", 0.05, 30},
  // {"lightweight_boxes", 0.1, 40},
  // {"driver_training", 0.05, 30},
  // {"super_alloy", 0.05, 50},
  // {"quantum_storage", 0.05, 20},
  // {"hover_upgrades", 0.05, 25},
  // {"dark_containment", 0.05, 25},
  // {"neural_net_refine", 0.05, 25},
  // {"hyper_portalling", 0.05, 25},
  // {"transportation_lobbyist", 0.05, 30}
  return (
    50_000_000 *
    (1 + 0.05 * 30) *
    (1 + 0.1 * 40) *
    (1 + 0.05 * 30) *
    (1 + 0.05 * 50) *
    (1 + 0.05 * 20) *
    (1 + 0.05 * 25) *
    (1 + 0.05 * 25) *
    (1 + 0.05 * 25) *
    (1 + 0.05 * 25) *
    (1 + 0.05 * 30) *
    // 10 cars per hyperloop train, 17 trains
    10 *
    17 *
    // 60 minutes
    60
  );
}
