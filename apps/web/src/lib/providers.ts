export type ProviderStatus = {
  id: string;
  label: string;
  status: 'not_configured' | 'managed_enabled';
  copy: string;
};

export const defaultProviderStatuses: ProviderStatus[] = [
  { id: 'openai', label: 'OpenAI', status: 'not_configured', copy: 'Add your own provider key to enable this integration.' },
  { id: 'anthropic', label: 'Anthropic / Claude', status: 'not_configured', copy: 'Add your own provider key to enable this integration.' },
  { id: 'ibm_watson', label: 'IBM Watson', status: 'not_configured', copy: 'Use your own IBM Watson credentials.' },
  { id: 'airtable', label: 'Airtable', status: 'not_configured', copy: 'Add your own provider key to enable this integration.' },
  { id: 'enrichment', label: 'Apollo / Hunter / SerpAPI', status: 'not_configured', copy: 'Add your own provider key to enable this integration.' },
  { id: 'buffer', label: 'Buffer', status: 'not_configured', copy: 'Add your own provider key to enable this integration.' }
];
