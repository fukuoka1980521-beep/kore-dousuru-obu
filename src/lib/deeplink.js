// Deep-link parameter validation and resolution — used by both the browser
// app and Node tests. A deep link (?waste=<item_id>[&asof=YYYY-MM-DD] or
// ?procedure=<procedure_id>) must resolve through the same date-window
// resolution as the normal search/list view. It must never read a raw,
// unresolved record straight out of the multi-version array — that was the
// exact bug class fixed in 988903b (detail view ignoring the search date).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Strict calendar-date validation (rejects e.g. 2026-13-40, 2026-02-30).
// Returns the string unchanged if valid, or null if not — callers should
// fall back to "today" on null rather than erroring out.
export function isValidDateString(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function sanitizeAsOfDate(raw, todayStr) {
  return isValidDateString(raw) ? raw : todayStr;
}

// resolveActiveItems: (items, asOfDate) => items[] — inject rules.js's
// resolveItemsForDate (or the municipalities/shared/core.js equivalent) so
// this module stays dependency-free.
export function resolveWasteDeepLink(wasteItemsAll, itemId, asOfDate, resolveActiveItems) {
  if (!itemId) return { ok: false, reason: 'MISSING_ID' };
  const exists = wasteItemsAll.some((it) => it.item_id === itemId);
  if (!exists) return { ok: false, reason: 'UNKNOWN_ID' };
  const active = resolveActiveItems(wasteItemsAll, asOfDate);
  const record = active.find((it) => it.item_id === itemId);
  if (!record) return { ok: false, reason: 'NO_ACTIVE_RECORD_FOR_DATE' };
  return { ok: true, item: record };
}

export function resolveProcedureDeepLink(procedures, procedureId) {
  if (!procedureId) return { ok: false, reason: 'MISSING_ID' };
  const record = procedures.find((p) => p.procedure_id === procedureId);
  if (!record) return { ok: false, reason: 'UNKNOWN_ID' };
  return { ok: true, item: record };
}
