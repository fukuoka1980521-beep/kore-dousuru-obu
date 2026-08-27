import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRiskLevel, computeFreshness, isHighRiskStale } from '../src/lib/freshness.js';

test('recently checked item is CONFIRMED (fresh)', () => {
  const f = computeFreshness('2026-08-27', 'LOW', new Date('2026-08-28T00:00:00+09:00'));
  assert.equal(f.status, 'CONFIRMED');
});

test('item past its internal review interval becomes REVIEW_DUE', () => {
  const f = computeFreshness('2026-01-01', 'MEDIUM', new Date('2026-08-28T00:00:00+09:00'));
  assert.equal(f.status, 'REVIEW_DUE');
  assert.ok(f.daysOverdue > 0);
});

test('HIGH risk item stale triggers the fail-safe flag', () => {
  const risk = computeRiskLevel({ danger_notes: '発火の危険あり', category: '電池類' });
  assert.equal(risk, 'HIGH');
  const f = computeFreshness('2026-01-01', risk, new Date('2026-08-28T00:00:00+09:00'));
  assert.equal(f.status, 'REVIEW_DUE');
  assert.ok(isHighRiskStale(risk, f.status), 'HIGH + REVIEW_DUE must trip the stronger fail-safe');
});

test('LOW/MEDIUM stale does not trip the HIGH-risk fail-safe', () => {
  // LOW's review interval is a full year, so an item checked well over a
  // year ago is the one that actually goes REVIEW_DUE under LOW risk.
  const f = computeFreshness('2024-01-01', 'LOW', new Date('2026-08-28T00:00:00+09:00'));
  assert.equal(f.status, 'REVIEW_DUE');
  assert.equal(isHighRiskStale('LOW', f.status), false);
});

test('date-dependent items (rule changes across a boundary) are classified HIGH', () => {
  const risk = computeRiskLevel({ category: '粗大ごみ', danger_notes: '該当なし' }, { isDateDependent: true });
  assert.equal(risk, 'HIGH');
});

test('freshness policy is independent of valid_from/valid_to — it never even reads them', () => {
  // A record's official effective-period fields must have no bearing on
  // whether OUR confirmation of it is stale; computeFreshness only takes
  // source_checked_at + riskLevel, so this is true by construction, but we
  // assert it explicitly against a record shape that carries both concepts.
  const record = {
    source_checked_at: '2026-08-27',
    valid_from: '2026-10-01',
    valid_to: null,
    category: '粗大ごみ',
  };
  const risk = computeRiskLevel(record, { isDateDependent: true });
  const f = computeFreshness(record.source_checked_at, risk, new Date('2026-08-28T00:00:00+09:00'));
  assert.equal(f.status, 'CONFIRMED');
  assert.equal(Object.keys(f).includes('valid_from'), false);
});
