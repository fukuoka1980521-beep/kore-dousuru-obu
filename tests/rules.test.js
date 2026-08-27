import test from 'node:test';
import assert from 'node:assert/strict';
import { selectApplicableRecord, resolveItemsForDate } from '../src/lib/rules.js';

// Synthetic oversized-waste size rule change boundary: old rule through 2026-09-30,
// new rule from 2026-10-01. This mechanism (date-scoped rule versions) is the
// single most important safety behavior in the whole app (spec section 3/11) —
// a wrong answer here is a "重大誤案内". The fixture below is synthetic; whether
// any given municipality's real data actually has a date-boundary rule change
// is a data question, not a logic question — this test only pins the logic.
const sofaOld = {
  item_id: 'sofa', rule_version: 'pre-2026-10', valid_from: null, valid_to: '2026-09-30',
  size_rule: '30センチメートル角を超えるもの',
};
const sofaNew = {
  item_id: 'sofa', rule_version: '2026-10-new', valid_from: '2026-10-01', valid_to: null,
  size_rule: '容量45リットルの指定袋に入らないもの',
};

test('selects old rule on 2026-09-30', () => {
  const r = selectApplicableRecord([sofaOld, sofaNew], '2026-09-30');
  assert.equal(r.rule_version, 'pre-2026-10');
});

test('selects new rule on 2026-10-01', () => {
  const r = selectApplicableRecord([sofaOld, sofaNew], '2026-10-01');
  assert.equal(r.rule_version, '2026-10-new');
});

test('selects old rule well before the boundary', () => {
  const r = selectApplicableRecord([sofaOld, sofaNew], '2026-08-27');
  assert.equal(r.rule_version, 'pre-2026-10');
});

test('selects new rule well after the boundary', () => {
  const r = selectApplicableRecord([sofaOld, sofaNew], '2027-01-15');
  assert.equal(r.rule_version, '2026-10-new');
});

test('resolveItemsForDate collapses multi-version records to one per item_id', () => {
  const other = { item_id: 'futon', rule_version: 'v1', valid_from: null, valid_to: null };
  const resolved = resolveItemsForDate([sofaOld, sofaNew, other], '2026-10-15');
  const ids = resolved.map((r) => r.item_id).sort();
  assert.deepEqual(ids, ['futon', 'sofa']);
  assert.equal(resolved.find((r) => r.item_id === 'sofa').rule_version, '2026-10-new');
});

test('returns null when no record window covers the reference date', () => {
  const gapOnly = { item_id: 'x', valid_from: '2030-01-01', valid_to: null };
  const r = selectApplicableRecord([gapOnly], '2026-08-27');
  assert.equal(r, null);
});
