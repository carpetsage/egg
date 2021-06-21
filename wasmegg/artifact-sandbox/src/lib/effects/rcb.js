import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { additiveEffect } from './common';

/**
 * @param {!Build} build
 * @param {!Config} config
 * @returns {!Number}
 */
function maxRunningChickenBonusMultiplier(build, config) {
  const maxRCBBase = baseMaxRunningChickenBonus(config);
  const maxRCB = maxRunningChickenBonus(build, config);
  return maxRCB / maxRCBBase;
}

/**
 * @param {!Build} build
 * @param {!Config} config
 * @returns {!Number}
 */
function maxRunningChickenBonus(build, config) {
  return (
    baseMaxRunningChickenBonus(config) +
    additiveEffect(build, config, [
      ArtifactSpec.Name.VIAL_MARTIAN_DUST,
      ArtifactSpec.Name.TERRA_STONE,
    ])
  );
}

/**
 * @param {!Config} config
 * @returns {!Number}
 */
function baseMaxRunningChickenBonus(config) {
  // Assume max common and epic research.
  return 540;
}

export { maxRunningChickenBonus, maxRunningChickenBonusMultiplier };
