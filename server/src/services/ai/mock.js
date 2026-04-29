// server/src/services/ai/mock.js
// Mock AI provider for local development and tests. Deterministic outputs
// per task — no network, no credentials.

import { getPrompt } from './prompts.js';

export function createMockProvider() {
  return {
    name:    'mock',
    modelId: 'mock-deterministic-v1',

    async invoke({ promptId, content }) {
      const p = getPrompt(promptId);
      const t0 = Date.now();
      const output = mockOutput(p.task, content);
      return {
        promptId,
        promptVersion: p.version,
        modelId:       'mock-deterministic-v1',
        provider:      'mock',
        output,
        usage:         { inputChars: (content || '').length, outputChars: JSON.stringify(output).length },
        latencyMs:     Date.now() - t0
      };
    }
  };
}

function mockOutput(task, content) {
  const head = (content || '').slice(0, 80).replace(/\s+/g, ' ').trim();
  switch (task) {
    case 'summarize':
      return {
        summary: `[mock] Document begins: "${head}..."`,
        parties: ['Party A', 'Party B'],
        dates:   ['2026-01-01', '2027-01-01'],
        amounts: ['$10,000.00'],
        risks:   ['indemnification scope', 'unilateral termination clause']
      };
    case 'extract':
      return {
        title:           '[mock] Sample Agreement',
        effective_date:  '2026-01-01',
        expiration_date: '2027-01-01',
        parties:         ['Party A', 'Party B'],
        total_value:     '$10,000.00',
        governing_law:   'State of Delaware',
        signatories:     ['Jane Doe', 'John Roe']
      };
    case 'classify':
      return {
        classification: 'msa',
        confidence:     0.78,
        rationale:      '[mock] Contains master-services language and ordering structure.'
      };
    case 'checklist':
      return {
        items: [
          { name: 'Counter-sign MSA',           owner_role: 'admin',   due_offset_days: 1, evidence_required: true,  approval_required: true  },
          { name: 'File DPA exhibit',           owner_role: 'analyst', due_offset_days: 2, evidence_required: true,  approval_required: false },
          { name: 'Add to renewal calendar',    owner_role: 'analyst', due_offset_days: 3, evidence_required: false, approval_required: false }
        ]
      };
    default:
      return { note: '[mock] no template for task=' + task };
  }
}
