// server/src/services/ai/google.js
// Google AI (Gemini) provider — fetch-based adapter, no SDK dependency.

import { getPrompt, renderPrompt } from './prompts.js';
import { log } from '../../logger.js';

export function createGoogleProvider({ apiKey, model } = {}) {
  const modelId = model || process.env.GOOGLE_AI_MODEL || 'gemini-1.5-pro-latest';

  return {
    providerId:  'google',
    displayName: 'Google AI',
    modelId,

    supportsWorkflow(category) { return category === 'user_drafting'; },

    redactForLogging(req) {
      const { input, ...rest } = req || {};
      return { ...rest, input: input ? '[REDACTED]' : undefined };
    },

    async healthCheck() {
      if (!apiKey) return { ok: false, reason: 'missing_credentials' };
      return { ok: true };       // generative endpoint requires content; cheap probe omitted
    },

    async invoke({ promptId, content, parameters = {} }) {
      if (!apiKey) throw new Error('google: missing api key');
      const p = getPrompt(promptId);
      const t0 = Date.now();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body = {
        contents: [{ role: 'user', parts: [{ text: renderPrompt(promptId, { content }) }] }],
        generationConfig: {
          temperature:     parameters.temperature ?? 0.2,
          maxOutputTokens: parameters.max_tokens  ?? 800,
          responseMimeType: 'application/json'
        }
      };

      const r = await fetch(url, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify(body)
      });
      if (!r.ok) {
        log.error('google.error', { status: r.status, modelId, promptId });
        throw new Error(`google: generation failed (${r.status})`);
      }
      const j = await r.json();
      const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { /* leave raw */ }

      return {
        promptId,
        promptVersion: p.version,
        modelId,
        provider:      'google',
        output:        parsed ?? { raw: text },
        usage: {
          inputTokens:  j.usageMetadata?.promptTokenCount     ?? null,
          outputTokens: j.usageMetadata?.candidatesTokenCount ?? null
        },
        latencyMs: Date.now() - t0
      };
    }
  };
}
