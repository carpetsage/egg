import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';

/**
 * @param {!Build} build
 * @param {!Config} config
 * @returns {!Number}
 */
function maxInternalHatcheryRatePerMinPerHab(build, config) {
  return Math.floor(
    baseMaxInternalHatcheryRatePerMinPerHab(config) * internalHatcheryRateMultiplier(build, config)
  );
}

/**
 * @param {!Build} build
 * @param {!Config} config
 * @returns {!Number}
 */
function internalHatcheryRateMultiplier(build, config) {
  return multiplicativeEffect(build, config, [
    ArtifactSpec.Name.THE_CHALICE,
    ArtifactSpec.Name.LIFE_STONE,
  ]);
}

/**
 * @param {!Config} config
 * @returns {!Number}
 */
function baseMaxInternalHatcheryRatePerMinPerHab(config) {
  // Assume max common and epic research.
  return 7440;
}

export {
  maxInternalHatcheryRatePerMinPerHab,
  internalHatcheryRateMultiplier,
  baseMaxInternalHatcheryRatePerMinPerHab,
};
