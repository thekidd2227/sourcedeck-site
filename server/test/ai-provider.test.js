import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { createAiProvider } from '../src/services/ai/index.js';
import { createMockProvider } from '../src/services/ai/mock.js';
import { getPrompt, renderPrompt, PROMPTS } from '../src/services/ai/prompts.js';

test('ai: dev default selects mock provider', () => {
  const cfg = loadConfig({});
  const p = createAiProvider(cfg);
  assert.equal(p.name, 'mock');
});

test('ai: watsonx without credentials falls back to mock in dev', () => {
  const cfg = loadConfig({ AI_PROVIDER: 'watsonx' });
  const p = createAiProvider(cfg);
  assert.equal(p.name, 'mock');
});

test('ai.mock: returns deterministic shapes per task', async () => {
  const m = createMockProvider();

  const summary = await m.invoke({ promptId: 'document_summary_v1', content: 'Sample contract.' });
  assert.equal(summary.provider, 'mock');
  assert.equal(summary.promptId, 'document_summary_v1');
  assert.ok(Array.isArray(summary.output.parties));

  const extract = await m.invoke({ promptId: 'key_field_extraction_v1', content: 'X' });
  assert.ok(extract.output.title);

  const cls = await m.invoke({ promptId: 'document_classification_v1', content: 'X' });
  assert.equal(typeof cls.output.classification, 'string');
  assert.ok(cls.output.confidence >= 0 && cls.output.confidence <= 1);

  const checklist = await m.invoke({ promptId: 'action_checklist_v1', content: 'X' });
  assert.ok(Array.isArray(checklist.output.items));
});

test('prompts: registry holds all four required prompts at v1', () => {
  for (const id of [
    'document_summary_v1',
    'key_field_extraction_v1',
    'document_classification_v1',
    'action_checklist_v1'
  ]) {
    const p = getPrompt(id);
    assert.equal(p.id, id);
    assert.equal(p.version, 1);
  }
});

test('prompts: render replaces {{content}} only, no eval', () => {
  const out = renderPrompt('document_summary_v1', { content: 'HELLO' });
  assert.ok(out.includes('HELLO'));
  // Should not interpolate non-declared vars.
  const out2 = renderPrompt('document_summary_v1', {});
  assert.ok(!out2.includes('{{'));
});

test('prompts: unknown id throws', () => {
  assert.throws(() => getPrompt('does_not_exist_v9'), /unknown id/);
});

test('prompts: PROMPTS object frozen', () => {
  assert.throws(() => { PROMPTS.evil = 1; });
});
