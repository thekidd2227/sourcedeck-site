// Cross-checks the backend's runtime enums against the published
// AI contract schema. If this test breaks, either the contract bumped
// without updating the code, or the code bumped without updating the
// contract — fix one or the other before merging.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { PROVIDER_IDS, WORKFLOW_CATEGORIES, CREDENTIAL_MODES, SUBSCRIPTION_TIERS } from '../src/services/ai/types.js';
import { EVENT_TYPES } from '../src/services/audit.js';
import { ROLES } from '../src/middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '..', '..', 'docs', 'schemas', 'ai-contract.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

function enumOf(name) {
  return new Set(schema.$defs[name].enum);
}

test('contract: ProviderId enum matches PROVIDER_IDS values', () => {
  const code = new Set(Object.values(PROVIDER_IDS));
  const doc  = enumOf('ProviderId');
  assert.deepEqual([...code].sort(), [...doc].sort());
});

test('contract: WorkflowCategory enum matches WORKFLOW_CATEGORIES values', () => {
  const code = new Set(Object.values(WORKFLOW_CATEGORIES));
  const doc  = enumOf('WorkflowCategory');
  assert.deepEqual([...code].sort(), [...doc].sort());
});

test('contract: CredentialMode enum matches CREDENTIAL_MODES values', () => {
  const code = new Set(Object.values(CREDENTIAL_MODES));
  const doc  = enumOf('CredentialMode');
  assert.deepEqual([...code].sort(), [...doc].sort());
});

test('contract: SubscriptionTier enum matches SUBSCRIPTION_TIERS values', () => {
  const code = new Set(Object.values(SUBSCRIPTION_TIERS));
  const doc  = enumOf('SubscriptionTier');
  assert.deepEqual([...code].sort(), [...doc].sort());
});

test('contract: Role enum matches RBAC ranks', () => {
  const code = new Set(ROLES);
  const doc  = enumOf('Role');
  assert.deepEqual([...code].sort(), [...doc].sort());
});

test('contract: EventType enum matches EVENT_TYPES values', () => {
  const code = new Set(Object.values(EVENT_TYPES));
  const doc  = enumOf('EventType');
  // The contract intentionally only enumerates AI-gateway events; ensure
  // every contract event exists in code (code may have additional
  // legacy event types — that's allowed).
  for (const t of doc) assert.ok(code.has(t), `code missing event type "${t}"`);
});

test('contract: schema parses as valid JSON Schema 2020-12 (structural sanity)', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.ok(schema.$defs.AiRequest);
  assert.ok(schema.$defs.AiResponse);
  assert.ok(schema.$defs.AuditEvent);
});
