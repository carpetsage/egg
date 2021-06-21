import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';

/**
 * @param {!Build} build
 * @param {!Config} config
 * @returns {!Number}
 */
function boostMultiplier(build, config) {
  return multiplicativeEffect(build, config, [ArtifactSpec.Name.DILITHIUM_MONOCLE]);
}

/**
 * @param {!Build} build
 * @param {!Config} config
 * @returns {!Number}
 */
function boostDurationMultiplier(build, config) {
  return multiplicativeEffect(build, config, [ArtifactSpec.Name.DILITHIUM_STONE]);
}

export { boostMultiplier, boostDurationMultiplier };
