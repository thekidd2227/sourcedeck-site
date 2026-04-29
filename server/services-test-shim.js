// Re-export audit helpers at a stable test-only path so tests survive
// future refactors of the src/services/audit.js layout.
export { recordAuditEvent, audit, EVENT_TYPES } from './src/services/audit.js';
