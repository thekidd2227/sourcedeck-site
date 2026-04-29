// server/src/services/ai/metering.js
// Tier-cap enforcement for AI requests.
//
// Reads tier policy (tiers.js) for the daily request cap and the max
// input character count. Calls the bound usage repo (in-memory dev,
// Redis-backed prod) to read/increment counters atomically (well, atomic
// once a Redis adapter is bound — the in-memory adapter is single-process
// only).

import { getTierPolicy } from './tiers.js';
import { getUsageRepo } from '../persistence/index.js';
import { recordAuditEvent, EVENT_TYPES } from '../audit.js';

export class UsageCapError extends Error {
  constructor(msg, meta) { super(msg); this.code = 'usage_cap_exceeded'; this.meta = meta || {}; }
}
export class InputTooLargeError extends Error {
  constructor(msg, meta) { super(msg); this.code = 'input_too_large'; this.meta = meta || {}; }
}

/**
 * Pre-flight check before invoking the gateway. Throws on cap violation.
 *
 * @param {object} args
 * @param {string} args.tenantId
 * @param {string} args.userId
 * @param {string} args.subscriptionTier
 * @param {string} args.input              the document/text to send
 * @param {object} [args.correlationId]
 */
export async function preflight({ tenantId, userId, subscriptionTier, input, correlationId, workflowType }) {
  const tier = getTierPolicy(subscriptionTier);
  const inputLen = (input || '').length;

  if (tier.usage?.maxInputChars && inputLen > tier.usage.maxInputChars) {
    recordAuditEvent({
      type:          EVENT_TYPES.AI_REQUEST_FAILED,
      tenantId, userId, correlationId,
      status:        'denied',
      metadata: {
        reason:           'input_too_large',
        tier:             tier.tier,
        inputLen,
        capChars:         tier.usage.maxInputChars,
        workflowType
      }
    });
    throw new InputTooLargeError('input exceeds tier max characters', {
      tier: tier.tier, inputLen, capChars: tier.usage.maxInputChars
    });
  }

  if (tier.usage?.requestsPerDay) {
    const today = await getUsageRepo().countToday({ tenantId });
    if (today >= tier.usage.requestsPerDay) {
      recordAuditEvent({
        type:          EVENT_TYPES.AI_REQUEST_FAILED,
        tenantId, userId, correlationId,
        status:        'denied',
        metadata: {
          reason:    'daily_cap_exceeded',
          tier:      tier.tier,
          today,
          cap:       tier.usage.requestsPerDay,
          workflowType
        }
      });
      throw new UsageCapError('daily AI request cap exceeded', {
        tier: tier.tier, today, cap: tier.usage.requestsPerDay
      });
    }
  }
}

/** Record a successful (or attempted) request. Called after a request runs. */
export async function record({ tenantId, userId, workflowType, taskType, providerId, credentialMode }) {
  return getUsageRepo().record({ tenantId, userId, workflowType, taskType, providerId, credentialMode });
}

/** Tenant snapshot for the admin UI / health endpoints. */
export async function snapshot({ tenantId }) {
  return getUsageRepo().snapshot({ tenantId });
}
