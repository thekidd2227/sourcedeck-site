// server/src/services/ai/byokIbmSecretsManager.js
// IBM Cloud Secrets Manager-backed BYOK store.
//
// Adapter skeleton — exchanges an IBM Cloud API key for an IAM token,
// then stores user/tenant BYOK keys as Secrets Manager arbitrary
// secrets. Secret name pattern:
//
//   sourcedeck/byok/<tenantId>/<userId>/<providerId>
//
// Security notes:
//   - The IBM_CLOUD_API_KEY used here MUST be a service-ID key with
//     scope limited to the dedicated Secrets Manager instance and only
//     to the prefix above (Secrets Manager supports per-prefix policies).
//   - Never log raw keys, IAM tokens, or secret payloads.
//   - This adapter is wired into the BYOK module via `bindExternalStore`;
//     until you call that, the in-memory dev store remains active.
//
// Env contract (passed in via `cfg.ibmSecretsManager`):
//   IBM_SECRETS_MANAGER_URL          required (e.g. https://<instance>.<region>.secrets-manager.appdomain.cloud)
//   IBM_SECRETS_MANAGER_API_KEY      required
//   IBM_SECRETS_MANAGER_GROUP_ID     optional (defaults to "default")
//
// To activate at boot:
//
//   import { bindExternalStore } from './byok.js';
//   import { createIbmSecretsManagerByokStore } from './byokIbmSecretsManager.js';
//   bindExternalStore(createIbmSecretsManagerByokStore({
//     url:    process.env.IBM_SECRETS_MANAGER_URL,
//     apiKey: process.env.IBM_SECRETS_MANAGER_API_KEY,
//     groupId: process.env.IBM_SECRETS_MANAGER_GROUP_ID
//   }));

import { log } from '../../logger.js';

let tokenCache = { token: null, expiresAt: 0 };

async function iamToken(apiKey) {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt - 60_000 > now) return tokenCache.token;
  const r = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method:  'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body:    new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey:     apiKey
    })
  });
  if (!r.ok) throw new Error(`secrets_manager: IAM token failed (${r.status})`);
  const j = await r.json();
  tokenCache = { token: j.access_token, expiresAt: now + (j.expires_in * 1000) };
  return tokenCache.token;
}

function secretName({ tenantId, userId, providerId }) {
  // Validate keys defensively — these become URL path components.
  for (const v of [tenantId, userId, providerId]) {
    if (!v || /[^a-zA-Z0-9_-]/.test(v)) throw new Error('secrets_manager: invalid identifier');
  }
  return `sourcedeck/byok/${tenantId}/${userId}/${providerId}`;
}

export function createIbmSecretsManagerByokStore({ url, apiKey, groupId } = {}) {
  if (!url || !apiKey) throw new Error('secrets_manager: missing url or api key');
  const base    = url.replace(/\/$/, '');
  const group   = groupId || 'default';

  async function call(method, path, body) {
    const tok = await iamToken(apiKey);
    const r = await fetch(`${base}${path}`, {
      method,
      headers: {
        authorization:  `Bearer ${tok}`,
        accept:         'application/json',
        'content-type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return r;
  }

  return {
    name:       'ibm_secrets_manager',
    isInMemory: false,

    async put({ tenantId, userId, providerId, apiKey: secretValue }) {
      const name = secretName({ tenantId, userId, providerId });
      // Secrets Manager v2 — Arbitrary secret type.
      const r = await call('POST', `/api/v2/secrets`, {
        secret_type:        'arbitrary',
        name,
        secret_group_id:    group,
        labels:             [`tenant:${tenantId}`, `user:${userId}`, `provider:${providerId}`],
        custom_metadata:    { tenantId, userId, providerId, source: 'sourcedeck' },
        payload:            secretValue
      });
      if (r.status === 409) {
        // Secret exists — create a new version instead.
        const id = await this._lookupId({ tenantId, userId, providerId });
        const r2 = await call('POST', `/api/v2/secrets/${id}/versions`, { payload: secretValue });
        if (!r2.ok) {
          log.error('secrets_manager.update_failed', { status: r2.status });
          throw new Error('secrets_manager: update failed');
        }
        return { ok: true };
      }
      if (!r.ok) {
        log.error('secrets_manager.put_failed', { status: r.status });
        throw new Error('secrets_manager: put failed');
      }
      return { ok: true };
    },

    async get({ tenantId, userId, providerId }) {
      const id = await this._lookupId({ tenantId, userId, providerId }).catch(() => null);
      if (!id) return null;
      const r = await call('GET', `/api/v2/secrets/${id}`);
      if (r.status === 404) return null;
      if (!r.ok) {
        log.error('secrets_manager.get_failed', { status: r.status });
        throw new Error('secrets_manager: get failed');
      }
      const j = await r.json();
      return j?.payload ?? null;
    },

    async remove({ tenantId, userId, providerId }) {
      const id = await this._lookupId({ tenantId, userId, providerId }).catch(() => null);
      if (!id) return { ok: true };
      const r = await call('DELETE', `/api/v2/secrets/${id}`);
      if (!r.ok && r.status !== 404) {
        log.error('secrets_manager.remove_failed', { status: r.status });
        throw new Error('secrets_manager: delete failed');
      }
      return { ok: true };
    },

    async list({ tenantId, userId }) {
      // List is best-effort: walks the secret-group filtered by labels.
      const labels = encodeURIComponent(`tenant:${tenantId},user:${userId}`);
      const r = await call('GET', `/api/v2/secrets?labels=${labels}&secret_types=arbitrary&limit=200`);
      if (!r.ok) return [];
      const j = await r.json();
      return (j?.secrets || []).map(s => ({
        providerId: s?.custom_metadata?.providerId || null,
        addedAt:    s?.created_at || null,
        masked:     '****'
      })).filter(x => !!x.providerId);
    },

    /** Resolve a secret name → id. Used internally. */
    async _lookupId({ tenantId, userId, providerId }) {
      const name = secretName({ tenantId, userId, providerId });
      const r = await call('GET', `/api/v2/secrets?search=${encodeURIComponent(name)}&secret_types=arbitrary&limit=10`);
      if (!r.ok) throw new Error(`secrets_manager: lookup failed (${r.status})`);
      const j = await r.json();
      const found = (j?.secrets || []).find(s => s.name === name);
      if (!found) throw new Error('secrets_manager: not found');
      return found.id;
    }
  };
}
