// Internal information-freshness policy — used by both the browser app and
// Node tests. This is NOT any municipality's official standard; it is this
// service's own operational policy for deciding when a record needs a human
// to re-check the source page. Deliberately independent of valid_from /
// valid_to (those describe an official rule's effective period; this module
// only ever answers "is our confirmation of this record stale").

export const REVIEW_INTERVAL_DAYS = Object.freeze({ HIGH: 30, MEDIUM: 90, LOW: 365 });

const HIGH_RISK_CATEGORIES = new Set(['電池類', '発火性危険物']);

// riskLevel is an internal classification, not something any municipality publishes.
export function computeRiskLevel(item, { isDateDependent = false } = {}) {
  if (item?.danger_notes && item.danger_notes !== '該当なし') return 'HIGH';
  if (HIGH_RISK_CATEGORIES.has(item?.category)) return 'HIGH';
  if (isDateDependent) return 'HIGH';
  if (item?.application_required || item?.category === '粗大ごみ') return 'MEDIUM';
  return 'LOW';
}

function toDate(d) {
  if (d instanceof Date) return d;
  return new Date(`${d}T00:00:00+09:00`);
}

// sourceCheckedAt: string (YYYY-MM-DD) | Date. riskLevel: 'HIGH'|'MEDIUM'|'LOW'.
export function computeFreshness(sourceCheckedAt, riskLevel, now = new Date()) {
  const checked = toDate(sourceCheckedAt);
  const intervalDays = REVIEW_INTERVAL_DAYS[riskLevel] ?? REVIEW_INTERVAL_DAYS.MEDIUM;
  const nextReviewAt = new Date(checked.getTime() + intervalDays * 86400000);
  const nowDate = toDate(now);
  const status = nowDate.getTime() > nextReviewAt.getTime() ? 'REVIEW_DUE' : 'CONFIRMED';
  const daysOverdue = status === 'REVIEW_DUE' ? Math.floor((nowDate - nextReviewAt) / 86400000) : 0;
  return { status, nextReviewAt, daysOverdue, riskLevel, intervalDays };
}

// HIGH-risk + stale is a distinct, stronger fail-safe: hide/weaken the
// instructive detail instead of continuing to assert a possibly-outdated
// disposal method for a dangerous item.
export function isHighRiskStale(riskLevel, freshnessStatus) {
  return riskLevel === 'HIGH' && freshnessStatus === 'REVIEW_DUE';
}
