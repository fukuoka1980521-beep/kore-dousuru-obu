// Date-based rule selection — a single logical item can have multiple
// records (same item_id, different rule_version) with valid_from/valid_to
// windows, e.g. when a municipality changes a size/fee rule on a known date.
// Given a reference date, pick the record whose window contains it.

function toDate(d) {
  if (d instanceof Date) return Number.isFinite(d.getTime()) ? d : null;
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const calendarDate = new Date(`${d}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== d) {
    return null;
  }
  return new Date(`${d}T00:00:00+09:00`); // JST, matches Japanese municipal effective dates
}

// records: array sharing the same item_id, each with valid_from (string|null), valid_to (string|null)
// referenceDate: Date | string (YYYY-MM-DD), defaults to now
export function selectApplicableRecord(records, referenceDate = new Date()) {
  const ref = toDate(referenceDate);
  if (!ref) return null;
  const applicable = records.filter((r) => {
    const from = r.valid_from == null ? null : typeof r.valid_from === 'string' && toDate(r.valid_from);
    const to = r.valid_to == null ? null : typeof r.valid_to === 'string' && toDate(r.valid_to);
    if (r.valid_from != null && !from) return false;
    if (r.valid_to != null && !to) return false;
    if (from && to && from > to) return false;
    if (from && ref < from) return false;
    if (to && ref > to) return false;
    return true;
  });
  if (applicable.length === 0) return null;
  if (applicable.length === 1) return applicable[0];
  // Prefer the record with the latest valid_from when windows overlap.
  return applicable.sort((a, b) => {
    const af = a.valid_from ? toDate(a.valid_from).getTime() : -Infinity;
    const bf = b.valid_from ? toDate(b.valid_from).getTime() : -Infinity;
    return bf - af;
  })[0];
}

export function groupByItemId(items) {
  const map = new Map();
  for (const it of items) {
    if (!map.has(it.item_id)) map.set(it.item_id, []);
    map.get(it.item_id).push(it);
  }
  return map;
}

// Resolve a flat items array (possibly with multiple rule-version records per item_id)
// down to exactly one applicable record per item_id, for a given reference date.
export function resolveItemsForDate(items, referenceDate = new Date()) {
  const grouped = groupByItemId(items);
  const resolved = [];
  for (const [, records] of grouped) {
    const applicable = selectApplicableRecord(records, referenceDate);
    if (applicable) resolved.push(applicable);
  }
  return resolved;
}
