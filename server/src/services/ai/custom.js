// server/src/services/ai/custom.js
// Custom future-provider placeholder.
//
// Disabled by default. Enabled only when CUSTOM_AI_ENDPOINT is set AND
// the gateway is explicitly configured to permit custom providers for a
// tenant. The wire format below assumes an OpenAI-compatible /v1/chat/
// completions endpoint; replace `invoke()` once a concrete provider is
// chosen. NEVER mark this provider as governed-eligible without a
// security review.

import { getPrompt, renderPrompt } from './prompts.js';
import { log } from '../../logger.js';

export function createCustomProvider({ apiKey, endpoint, model } = {}) {
  const modelId = model || process.env.CUSTOM_AI_MODEL || 'custom-default';

  return {
    providerId:  'custom',
    displayName: 'Custom (placeholder)',
    modelId,

    /** Custom providers are explicitly NOT eligible until reviewed. */
    supportsWorkflow(_category) { return false; },

    redactForLogging(req) {
      const { input, ...rest } = req || {};
      return { ...rest, input: input ? '[REDACTED]' : undefined };
    },

    async healthCheck() {
      if (!endpoint || !apiKey) return { ok: false, reason: 'missing_credentials' };
      return { ok: true };
    },

    async invoke({ promptId, content, parameters = {} }) {
      if (!endpoint || !apiKey) throw new Error('custom: missing endpoint or api key');
      const p = getPrompt(promptId);
      const t0 = Date.now();

      // TODO: replace with the real wire format for the chosen provider.
      const r = await fetch(endpoint.replace(/\/$/, '') + '/v1/chat/completions', {
        method:  'POST',
        headers: {
          authorization:  `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: renderPrompt(promptId, { content }) }],
          temperature: parameters.temperature ?? 0.2,
          max_tokens:  parameters.max_tokens  ?? 800
        })
      });
      if (!r.ok) {
        log.error('custom.error', { status: r.status, modelId, promptId });
        throw new Error(`custom: generation failed (${r.status})`);
      }
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content ?? '';
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { /* leave raw */ }

      return {
        promptId,
        promptVersion: p.version,
        modelId,
        provider:      'custom',
        output:        parsed ?? { raw: text },
        usage:         {},
        latencyMs:     Date.now() - t0
      };
    }
  };
}
