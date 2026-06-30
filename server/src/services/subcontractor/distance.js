// server/src/services/subcontractor/distance.js
// Deterministic distance screening. A vendor can be marked "within radius" ONLY
// when its coordinates are VERIFIED. Unverified addresses/coordinates are never
// counted as within radius (anti-fabrication: no invented distances).

const R_MILES = 3958.7613; // mean Earth radius in miles

const isCoord = c => c && Number.isFinite(c.lat) && Number.isFinite(c.lon) &&
  Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180;

/** Great-circle (haversine) distance in miles between two {lat,lon} points. */
export function greatCircleMiles(a, b) {
  if (!isCoord(a) || !isCoord(b)) return null;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return round2(2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h))));
}

/**
 * Screen vendors against an origin within `radiusMiles`.
 * @param origin { lat, lon, verified }
 * @param vendors [{ id, coordinates:{lat,lon}, coordinatesVerified, routeDistanceMiles?, routeVerified? }]
 * @returns vendors annotated with { screeningDistanceMiles, distanceMethod, withinRadius }
 */
export function screenByRadius(origin, vendors, radiusMiles = 25) {
  const originVerified = origin && origin.verified && isCoord(origin);
  return (vendors || []).map(v => {
    // Prefer a verified route distance; else straight-line; else unknown.
    if (Number.isFinite(v.routeDistanceMiles) && v.routeVerified) {
      return annotate(v, v.routeDistanceMiles, 'verified_route_distance', v.routeDistanceMiles <= radiusMiles);
    }
    if (originVerified && v.coordinatesVerified && isCoord(v.coordinates)) {
      const d = greatCircleMiles(origin, v.coordinates);
      return annotate(v, d, 'straight_line_screening_distance', d != null && d <= radiusMiles);
    }
    // Coordinates not verified → cannot claim within radius.
    return annotate(v, null, 'unverified', false, 'coordinates_unverified');
  });
}

function annotate(v, distance, method, withinRadius, reason) {
  return {
    ...v,
    screeningDistanceMiles: distance,
    distanceMethod: method,
    withinRadius: !!withinRadius,
    ...(reason ? { distanceWarning: reason } : {})
  };
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
