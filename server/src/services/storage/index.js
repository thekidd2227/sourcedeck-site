// server/src/services/storage/index.js
// Storage provider selection. Falls back to local in non-production when
// the configured provider is unreachable, so local dev never breaks.

import { createLocalStorage } from './local.js';
import { createIbmCosStorage } from './ibmCos.js';
import { log } from '../../logger.js';

export async function createStorage(cfg) {
  if (cfg.storage.provider === 'ibm_cos') {
    try {
      return await createIbmCosStorage(cfg.storage.ibmCos);
    } catch (err) {
      if (cfg.isProduction) throw err;
      log.warn('storage.fallback_to_local', { reason: err.message });
      return createLocalStorage(cfg.storage.local);
    }
  }
  return createLocalStorage(cfg.storage.local);
}
