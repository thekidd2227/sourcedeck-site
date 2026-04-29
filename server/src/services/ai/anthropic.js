// server/src/services/ai/anthropic.js
// Anthropic provider — fetch-based adapter, no SDK dependency.

import { getPrompt, renderPrompt } from './prompts.js';
import { log } from '../../logger.js';

export function createAnthropicProvider({ apiKey, model } = {}) {
  const modelId = model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

  return {
    providerId:  'anthropic',
    displayName: 'Anthropic',
    modelId,

    supportsWorkflow(category) { return category === 'user_drafting'; },

    redactForLogging(req) {
      const { input, ...rest } = req || {};
      return { ...rest, input: input ? '[REDACTED]' : undefined };
    },

    async healthCheck() {
      if (!apiKey) return { ok: false, reason: 'missing_credentials' };
      // Health = a tiny ping via the messages endpoint (1-token).
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'x-api-key':       apiKey,
          'anthropic-version': '2023-06-01',
          'content-type':    'application/json'
        },
        body: JSON.stringify({ model: modelId, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] })
      }).catch(() => null);
      return { ok: !!(r && r.ok) };
    },

    async invoke({ promptId, content, parameters = {} }) {
      if (!apiKey) throw new Error('anthropic: missing api key');
      const p = getPrompt(promptId);
      const t0 = Date.now();
      const body = {
        model:       modelId,
        max_tokens:  parameters.max_tokens ?? 800,
        temperature: parameters.temperature ?? 0.2,
        system:      'Return strict JSON only.',
        messages:    [{ role: 'user', content: renderPrompt(promptId, { content }) }]
      };
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        log.error('anthropic.error', { status: r.status, modelId, promptId });
        throw new Error(`anthropic: generation failed (${r.status})`);
      }
      const j = await r.json();
      const text = j.content?.[0]?.text ?? '';
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { /* leave raw */ }

      return {
        promptId,
        promptVersion: p.version,
        modelId,
        provider:      'anthropic',
        output:        parsed ?? { raw: text },
        usage: {
          inputTokens:  j.usage?.input_tokens  ?? null,
          outputTokens: j.usage?.output_tokens ?? null
        },
        latencyMs: Date.now() - t0
      };
    }
  };
}
