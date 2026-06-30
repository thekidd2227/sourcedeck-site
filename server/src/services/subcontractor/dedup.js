// server/src/services/subcontractor/dedup.js
// Vendor deduplication by WEIGHTED IDENTITY. Records merge only on strong
// identity signals (UEI, CAGE, license number, email domain, normalized phone,
// exact normalized address). A similar company NAME alone never triggers a
// merge — it produces a "possible duplicate for human review". Merging preserves
// search evidence, notes, quotes, outreach status, and verification history.

const STRONG = ['uei', 'cage', 'licenseNumber'];

export function vendorIdentitySignals(v) {
  return {
    uei: norm(v.uei),
    cage: norm(v.cage),
    licenseNumber: norm(v.licenseNumber),
    domain: domainOf(v.website || v.email),
    phone: digits(v.phone),
    address: normAddress(v.address),
    name: norm(v.name)
  };
}

/** Do two vendors share a STRONG identity signal? */
export function sharesStrongIdentity(a, b) {
  const sa = vendorIdentitySignals(a), sb = vendorIdentitySignals(b);
  for (const k of STRONG) if (sa[k] && sb[k] && sa[k] === sb[k]) return { match: true, on: k };
  // domain/phone/exact-address are strong-enough to merge.
  for (const k of ['domain', 'phone', 'address']) if (sa[k] && sb[k] && sa[k] === sb[k]) return { match: true, on: k };
  return { match: false };
}

/**
 * @returns { unique: Vendor[], possibleDuplicates: [{ keptId, otherId, reason }] }
 */
export function dedupeVendors(list) {
  const unique = [];
  const possibleDuplicates = [];

  for (const v of list || []) {
    const hit = unique.find(u => sharesStrongIdentity(u, v).match);
    if (hit) {
      mergePreserving(hit, v);
      continue;
    }
    // Name-only similarity → flag, do NOT merge.
    const sa = vendorIdentitySignals(v);
    const nameTwin = unique.find(u => {
      const su = vendorIdentitySignals(u);
      return su.name && sa.name && nameSimilar(su.name, sa.name) && !sharesStrongIdentity(u, v).match;
    });
    if (nameTwin) {
      possibleDuplicates.push({ keptId: nameTwin.id, otherId: v.id,
        reason: 'similar_name_only_needs_human_review' });
    }
    unique.push({ ...v });
  }
  return { unique, possibleDuplicates };
}

function mergePreserving(target, src) {
  target._mergedFrom = (target._mergedFrom || []).concat(src.id);
  for (const field of ['evidence', 'notes', 'quotes', 'outreach', 'verificationHistory']) {
    if (Array.isArray(src[field])) target[field] = (target[field] || []).concat(src[field]);
  }
  // Fill missing scalar identity fields without overwriting verified ones.
  for (const k of ['uei', 'cage', 'licenseNumber', 'website', 'email', 'phone', 'address']) {
    if (!target[k] && src[k]) target[k] = src[k];
  }
}

function norm(s) { return s ? String(s).trim().toLowerCase().replace(/\s+/g, ' ') : ''; }
function digits(s) { return s ? String(s).replace(/\D/g, '') : ''; }
function domainOf(s) {
  if (!s) return '';
  const m = String(s).match(/@([^\s/]+)|https?:\/\/(?:www\.)?([^\s/]+)|^(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i);
  return norm((m && (m[1] || m[2] || m[3])) || '').replace(/^www\./, '');
}
function normAddress(s) { return s ? norm(s).replace(/[.,#]/g, '').replace(/\b(street|st|avenue|ave|road|rd|suite|ste)\b/g, '') : ''; }
function nameSimilar(a, b) {
  const ca = core(a), cb = core(b);
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}
function core(name) {
  return norm(name).replace(/\b(inc|llc|llp|ltd|co|corp|company|incorporated|services?|pest|control|the|and|&)\b/g, '').replace(/\s+/g, '');
}
