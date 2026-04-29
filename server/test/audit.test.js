import test from 'node:test';
import assert from 'node:assert/strict';
import { recordAuditEvent, audit, EVENT_TYPES } from '../services-test-shim.js';
import { hasRole } from '../src/middleware/auth.js';

test('audit: persists event with required keys; redacts forbidden metadata', () => {
  const captured = [];
  const orig = audit.sink;
  audit.sink = (e) => captured.push(e);
  try {
    const e = recordAuditEvent({
      type:          EVENT_TYPES.FILE_UPLOADED,
      tenantId:      't1',
      userId:        'u1',
      resourceType:  'file',
      resourceId:    'file_abc',
      correlationId: 'cid_1',
      ip:            '10.0.0.1',
      status:        'ok',
      // forbidden keys must be stripped:
      metadata: {
        contentType: 'application/pdf',
        document:    'SHOULD NOT APPEAR',
        prompt:      'SHOULD NOT APPEAR',
        sizeBytes:   42
      }
    });
    assert.match(e.eventId, /^evt_[a-f0-9]+$/);
    assert.equal(e.eventType, 'FILE_UPLOADED');
    assert.equal(e.tenantId, 't1');
    assert.equal(e.metadata.contentType, 'application/pdf');
    assert.equal(e.metadata.sizeBytes, 42);
    assert.equal(e.metadata.document, undefined);
    assert.equal(e.metadata.prompt, undefined);
    assert.equal(captured.length, 1);
    assert.equal(e.governance.schemaVersion, '1');
  } finally {
    audit.sink = orig;
  }
});

test('audit: rejects unknown event types', () => {
  const r = recordAuditEvent({ type: 'NOT_REAL' });
  assert.deepEqual(r, { error: 'invalid_type' });
});

test('audit: defaults status to ok when invalid', () => {
  const e = recordAuditEvent({ type: EVENT_TYPES.USER_LOGIN, status: 'lol' });
  assert.equal(e.status, 'ok');
});

test('rbac: hasRole respects ranks', () => {
  assert.equal(hasRole('owner',   'admin'),  true);
  assert.equal(hasRole('admin',   'admin'),  true);
  assert.equal(hasRole('analyst', 'admin'),  false);
  assert.equal(hasRole('viewer',  'analyst'), false);
  assert.equal(hasRole('owner',   'viewer'),  true);
});
