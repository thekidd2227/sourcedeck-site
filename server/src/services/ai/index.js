// server/src/services/ai/index.js
// AI provider selection. In dev, missing watsonx config falls back to mock.
// In production, missing config throws — fail loud.

import { createMockProvider } from './mock.js';
import { createWatsonxProvider } from './watsonx.js';
import { log } from '../../logger.js';

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
