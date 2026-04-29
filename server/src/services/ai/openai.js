// server/src/services/ai/openai.js
// OpenAI provider — fetch-based adapter, no SDK dependency.
// Stub implementation: builds and signs the request shape, but the
// network call is gated behind a runtime credential. In dev without a
// key, calling .invoke() throws — the gateway falls back to watsonx.

import { getPrompt, renderPrompt } from './prompts.js';
import { log } from '../../logger.js';

export function createOpenaiProvider({ apiKey, model } = {}) {
  const modelId = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  return {
    providerId:  'openai',
    displayName: 'OpenAI',
    modelId,

    supportsWorkflow(category) { return category === 'user_drafting'; },

    redactForLogging(req) {
      const { input, ...rest } = req || {};
      return { ...rest, input: input ? '[REDACTED]' : undefined };
    },

    async healthCheck() {
      if (!apiKey) return { ok: false, reason: 'missing_credentials' };
      // Health = list models; cheap.
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { authorization: `Bearer ${apiKey}` }
      }).catch(() => null);
      return { ok: !!(r && r.ok) };
    },

    async invoke({ promptId, content, parameters = {} }) {
      if (!apiKey) throw new Error('openai: missing api key');
      const p = getPrompt(promptId);
      const t0 = Date.now();
      const body = {
        model: modelId,
        messages: [
          { role: 'system', content: 'Return strict JSON only.' },
          { role: 'user',   content: renderPrompt(promptId, { content }) }
        ],
        temperature: parameters.temperature ?? 0.2,
        max_tokens:  parameters.max_tokens  ?? 800,
        response_format: { type: 'json_object' }
      };

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: {
          authorization:  `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        log.error('openai.error', { status: r.status, modelId, promptId });
        throw new Error(`openai: generation failed (${r.status})`);
      }
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content ?? '';
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { /* leave raw */ }

      return {
        promptId,
        promptVersion: p.version,
        modelId,
        provider:      'openai',
        output:        parsed ?? { raw: text },
        usage: {
          inputTokens:  j.usage?.prompt_tokens     ?? null,
          outputTokens: j.usage?.completion_tokens ?? null
        },
        latencyMs: Date.now() - t0
      };
    }
  };
}
