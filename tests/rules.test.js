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

test('invalid reference dates cannot select any rule', () => {
  const unbounded = { item_id: 'x', valid_from: null, valid_to: null };
  const invalidDates = [
    new Date(NaN), null, false, 0, {}, '', 'garbage',
    '2026-02-29', '2026-02-30', '2026-04-31', '1900-02-29',
    '2026-00-01', '2026-13-01', '2026-01-00', '2026-01-32',
    '2026-1-01', '2026-01-1', ' 2026-01-01', '2026-01-01\n',
    '2026-01-01T00:00:00Z',
  ];
  for (const referenceDate of invalidDates) {
    const records = [unbounded, sofaOld, sofaNew];
    assert.equal(selectApplicableRecord(records, referenceDate), null);
    assert.deepEqual(resolveItemsForDate(records, referenceDate), []);
  }
});

test('malformed boundaries reject the record without hiding a valid fallback', () => {
  const fallback = { item_id: 'x', valid_from: null, valid_to: null };
  const invalidBounds = [
    '', false, true, 0, 20261001, {}, [], new Date('2026-01-01'), new Date(NaN),
    'garbage', '2026-02-29', '2026-04-31', '1900-02-29',
    '2026-13-01', '2026-00-01', '2026-01-00', '2026-01-32',
    '2026-1-01', '2026-01-1', ' 2026-01-01', '2026-01-01\n',
    '2026-01-01T00:00:00Z',
  ];
  for (const boundary of ['valid_from', 'valid_to']) {
    for (const value of invalidBounds) {
      const malformed = { ...fallback, [boundary]: value };
      assert.equal(selectApplicableRecord([malformed], '2026-10-01'), null);
      assert.equal(selectApplicableRecord([malformed, fallback], '2026-10-01'), fallback);
      assert.deepEqual(resolveItemsForDate([malformed, fallback], '2026-10-01'), [fallback]);
    }
  }
});

test('valid leap days and four-digit calendar years remain supported', () => {
  for (const referenceDate of ['2024-02-29', '2000-02-29', '0000-02-29', '0099-01-01', '9999-12-31']) {
    const record = { item_id: 'x', valid_from: referenceDate, valid_to: referenceDate };
    assert.equal(selectApplicableRecord([record], referenceDate), record);
  }
});

test('Date references retain inclusive JST midnight boundaries', () => {
  const records = [sofaOld, sofaNew];
  assert.equal(selectApplicableRecord(records, new Date('2026-09-29T15:00:00Z')), sofaOld);
  assert.equal(selectApplicableRecord(records, new Date('2026-09-29T15:00:00.001Z')), null);
  assert.equal(selectApplicableRecord(records, new Date('2026-09-30T14:59:59.999Z')), null);
  assert.equal(selectApplicableRecord(records, new Date('2026-09-30T15:00:00Z')), sofaNew);
  const bounded = { item_id: 'x', valid_from: '2026-10-01', valid_to: '2026-10-02' };
  assert.equal(selectApplicableRecord([bounded], new Date('2026-10-01T15:00:00Z')), bounded);
  assert.equal(selectApplicableRecord([bounded], new Date('2026-10-01T15:00:00.001Z')), null);
});

test('rejects reversed windows and retains open bounds and overlap preference', () => {
  const reversed = { item_id: 'x', valid_from: '2026-10-02', valid_to: '2026-10-01' };
  for (const referenceDate of ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']) {
    assert.equal(selectApplicableRecord([reversed], referenceDate), null);
  }
  const missingBounds = { item_id: 'x' };
  assert.equal(selectApplicableRecord([missingBounds], '2026-10-01'), missingBounds);
  assert.equal(selectApplicableRecord([missingBounds]), missingBounds);
  const earlier = { item_id: 'x', valid_from: '2026-01-01', valid_to: null };
  const later = { item_id: 'x', valid_from: '2026-10-01', valid_to: null };
  const records = [later, missingBounds, earlier];
  assert.equal(selectApplicableRecord(records, '2026-10-01'), later);
  assert.deepEqual(records, [later, missingBounds, earlier]);
});
