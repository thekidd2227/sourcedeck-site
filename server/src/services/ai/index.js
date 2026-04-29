// server/src/services/ai/index.js
// Public surface of the AI module. New code should use the Gateway.
//
//   import { createAiGateway } from './gateway.js';
//
// `createAiProvider(cfg)` is preserved for backwards-compat with the
// existing /api/v1/process route and tests; it returns the watsonx
// adapter directly when configured, otherwise the mock. All policy +
// audit decisions are made by the Gateway.

import { createMockProvider }    from './mock.js';
import { createWatsonxProvider } from './watsonx.js';
import { createAiGateway }       from './gateway.js';
import { log } from '../../logger.js';

export { createAiGateway } from './gateway.js';
export { createMockProvider }    from './mock.js';
export { createWatsonxProvider } from './watsonx.js';
export { decideProvider, listAllowedProviders } from './policy.js';
export { resolveWorkflow, WORKFLOWS } from './workflows.js';
export { TIER_POLICY, getTierPolicy } from './tiers.js';
export * from './types.js';

/** Legacy: returns the *default* (watsonx-or-mock) provider. */
export function createAiProvider(cfg) {
  if (cfg.ai.provider === 'watsonx') {
    try {
      return createWatsonxProvider(cfg.ai.watsonx);
    } catch (err) {
      if (cfg.isProduction) throw err;
      log.warn('ai.fallback_to_mock', { reason: err.message });
      return createMockProvider();
    }
  }
  return createMockProvider();
}
