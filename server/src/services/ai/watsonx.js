// server/src/services/ai/watsonx.js
// IBM watsonx.ai provider via the Foundation Models text-generation REST API.
//
// Auth flow: trade IBM Cloud API key for an IAM bearer token, then call
// /ml/v1/text/generation. Token cached in-memory until ~60s before expiry.
//
// Hard rules:
//   - All credentials come from env via config — never hardcoded.
//   - Document content is sent in the request body but NOT logged.
//   - Audit events capture model id + prompt version + usage; not prompt body.
//   - Provider failures throw — caller decides whether to fall back.

import { log } from '../../logger.js';
import { getPrompt, renderPrompt } from './prompts.js';

let tokenCache = { token: null, expiresAt: 0 };

async function getIamToken(apiKey) {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt - 60_000 > now) return tokenCache.token;

  const body = new URLSearchParams({
    grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
    apikey:     apiKey
  });
  const r = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method:  'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'accept': 'application/json' },
    body
  });
  if (!r.ok) throw new Error(`watsonx: IAM token request failed (${r.status})`);
  const j = await r.json();
  tokenCache = {
    token:     j.access_token,
    expiresAt: now + (j.expires_in * 1000)
  };
  return tokenCache.token;
}

export function createWatsonxProvider(cfg) {
  if (!cfg?.apiKey || !cfg?.url || !(cfg.projectId || cfg.spaceId)) {
    throw new Error('watsonx: missing API_KEY, URL, or PROJECT_ID/SPACE_ID');
  }
  const modelId = cfg.modelId || 'ibm/granite-13b-chat-v2';

  return {
    name:    'watsonx',
    modelId,

    async invoke({ promptId, content, parameters = {} }) {
      const p = getPrompt(promptId);
      const prompt = renderPrompt(promptId, { content });
      const t0 = Date.now();

      const token = await getIamToken(cfg.apiKey);

      const url = `${cfg.url.replace(/\/$/, '')}/ml/v1/text/generation?version=2024-05-31`;
      const reqBody = {
        model_id:    modelId,
        input:       prompt,
        // only project_id OR space_id should be present
        ...(cfg.projectId ? { project_id: cfg.projectId } : { space_id: cfg.spaceId }),
        parameters: {
          decoding_method:    parameters.decoding_method    || 'greedy',
          max_new_tokens:     parameters.max_new_tokens     || 800,
          repetition_penalty: parameters.repetition_penalty || 1.05
        }
      };

      const r = await fetch(url, {
        method:  'POST',
        headers: {
          'authorization': `Bearer ${token}`,
          'content-type':  'application/json',
          'accept':        'application/json'
        },
        body: JSON.stringify(reqBody)
      });

      if (!r.ok) {
        // Do NOT log request body — may contain document content.
        log.error('watsonx.error', { status: r.status, modelId, promptId });
        throw new Error(`watsonx: generation failed (${r.status})`);
      }

      const j = await r.json();
      const generated = j.results?.[0]?.generated_text ?? '';
      let parsed = null;
      try { parsed = JSON.parse(generated); } catch { /* leave as raw text */ }

      return {
        promptId,
        promptVersion: p.version,
        modelId,
        provider:      'watsonx',
        output:        parsed ?? { raw: generated },
        usage: {
          inputTokens:  j.results?.[0]?.input_token_count  ?? null,
          outputTokens: j.results?.[0]?.generated_token_count ?? null
        },
        latencyMs: Date.now() - t0
      };
    }
  };
}
