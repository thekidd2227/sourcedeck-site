// server/src/services/subcontractor/license/registry.js
// JurisdictionLicenseProviderRegistry — selects applicable license providers by
// jurisdiction + requirement, with NO Texas-specific assumption. When no
// automated provider supports a jurisdiction/requirement, it produces a guided
// manual-verification plan instead of failing.

import { coverageFor, getCatalogEntry } from './catalog.js';
import { isValidJurisdiction, normalizeLicenseResult } from './contract.js';

export class JurisdictionLicenseProviderRegistry {
  constructor() { this._adapters = []; }

  register(adapter) {
    if (typeof adapter.supportsJurisdiction !== 'function') {
      throw new Error('license provider must implement supportsJurisdiction()');
    }
    this._adapters.push(adapter);
    return this;
  }

  /** All adapters that support this jurisdiction + requirement. */
  selectProviders({ jurisdiction, requirementType = null, occupation = null, naics = null }) {
    const j = String(jurisdiction || '').toUpperCase();
    return this._adapters.filter(a =>
      a.supportsJurisdiction(j) &&
      (!a.supportsRequirement || a.supportsRequirement(requirementType, occupation, naics)));
  }

  /**
   * Verify a vendor's license in a jurisdiction. Uses the first matching
   * automated provider; otherwise returns a manual-verification plan. Never
   * fabricates a result.
   */
  async verify({ jurisdiction, requirementType, occupation, naics, vendor, now = null }) {
    if (!isValidJurisdiction(jurisdiction)) {
      return { ok: false, jurisdiction, reason: 'unknown_jurisdiction',
        plan: this.buildManualVerificationPlan({ jurisdiction, occupation, requirementType, now }) };
    }
    const providers = this.selectProviders({ jurisdiction, requirementType, occupation, naics });
    for (const p of providers) {
      const method = p.getVerificationMethod ? p.getVerificationMethod() : 'unavailable';
      if (method === 'manual_official_verification' || method === 'unavailable') continue; // not automated
      const fn = vendor?.holderType === 'individual' && p.verifyIndividualLicense
        ? p.verifyIndividualLicense.bind(p) : (p.verifyBusinessLicense?.bind(p));
      if (!fn) continue;
      const raw = await fn({ jurisdiction, occupation, vendor, now });
      if (raw) return { ok: true, result: normalizeLicenseResult(raw), provider: p.id };
    }
    // No automated provider succeeded → guided manual verification.
    return { ok: false, jurisdiction, reason: 'no_automated_provider',
      plan: this.buildManualVerificationPlan({ jurisdiction, occupation, requirementType, now }) };
  }

  buildManualVerificationPlan({ jurisdiction, occupation, requirementType, now = null }) {
    const cov = coverageFor(jurisdiction, occupation);
    const entry = getCatalogEntry(jurisdiction, occupation);
    return {
      type: 'guided_manual_verification',
      jurisdiction: String(jurisdiction || '').toUpperCase(),
      requirementType: requirementType || null,
      authority: cov.authority || 'Unknown official authority — confirm the governing authority',
      officialLookupUrl: entry?.website || null,
      whatToSearch: `${occupation || 'the required'} license/registration for the vendor's legal business name`,
      evidenceUpload: 'attach the official lookup result or license document',
      resultLabel: 'manual_official_verification (records verifier + timestamp)',
      createdAt: now,
      note: 'Automation unavailable for this authority — verify against the official source and attach evidence. Do NOT mark automatically verified.'
    };
  }
}
