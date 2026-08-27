import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveItemsForDate } from '../src/lib/rules.js';
import {
  isValidDateString,
  sanitizeAsOfDate,
  resolveWasteDeepLink,
  resolveProcedureDeepLink,
} from '../src/lib/deeplink.js';

const ROOT = new URL('../', import.meta.url);
async function loadJSON(relPath) {
  return JSON.parse(await readFile(new URL(relPath, ROOT), 'utf-8'));
}

const wasteItems = await loadJSON('municipalities/obu/data/waste_items.json');
const procedures = await loadJSON('municipalities/obu/data/procedures.json');

// Bridges deeplink.js's injected resolver to rules.js's resolveItemsForDate,
// mirroring how municipalities/shared/core.js wires resolveActiveWasteItems.
function resolveActiveItems(items, asOfDate) {
  return resolveItemsForDate(items, asOfDate);
}

test('valid waste deep link resolves to the active record', () => {
  const anyItem = wasteItems[0];
  const r = resolveWasteDeepLink(wasteItems, anyItem.item_id, '2026-08-28', resolveActiveItems);
  assert.equal(r.ok, true);
  assert.equal(r.item.item_id, anyItem.item_id);
});

test('valid procedure deep link resolves', () => {
  const r = resolveProcedureDeepLink(procedures, procedures[0].procedure_id);
  assert.equal(r.ok, true);
  assert.equal(r.item.procedure_id, procedures[0].procedure_id);
});

test('unknown waste id fails safe instead of guessing', () => {
  const r = resolveWasteDeepLink(wasteItems, 'no-such-item-xyz', '2026-08-28', resolveActiveItems);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'UNKNOWN_ID');
});

test('unknown procedure id fails safe', () => {
  const r = resolveProcedureDeepLink(procedures, 'no-such-proc-xyz');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'UNKNOWN_ID');
});

test('asof date validation accepts real calendar dates only', () => {
  assert.equal(isValidDateString('2026-10-01'), true);
  assert.equal(isValidDateString('2026-13-40'), false);
  assert.equal(isValidDateString('2026-02-30'), false);
  assert.equal(isValidDateString('not-a-date'), false);
  assert.equal(isValidDateString(''), false);
});

test('invalid asof param is ignored, falling back to today rather than crashing', () => {
  assert.equal(sanitizeAsOfDate('garbage', '2026-08-28'), '2026-08-28');
  assert.equal(sanitizeAsOfDate('2026-10-01', '2026-08-28'), '2026-10-01');
});

test('deep link never reads the raw multi-version array directly for a date with no active record', () => {
  // Construct a synthetic item that only becomes valid in the future; a
  // deep link dated before that must fail safe, not fall back to whatever
  // record happens to be first in the raw array.
  const synthetic = [
    { item_id: 'future-item', valid_from: '2099-01-01', valid_to: null, rule_version: 'future' },
  ];
  const r = resolveWasteDeepLink(synthetic, 'future-item', '2026-08-28', resolveActiveItems);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'NO_ACTIVE_RECORD_FOR_DATE');
});

// Unlike the Nagoya reference dataset (which has a confirmed 2026-10-01
// oversized-waste size-rule change with real pre/post record pairs), no
// equivalent date-boundary rule change was found in Obu's official sources
// (see docs/internal/OBU_DIFFERENCE_FINDINGS_V0_1.md). Rather than fabricate
// one, Obu's waste_items.json has exactly one record per item_id. This test
// pins that invariant instead of a boundary-switch scenario.
test('every Obu waste item_id currently has exactly one record (no fabricated rule versions)', () => {
  const grouped = new Map();
  for (const it of wasteItems) {
    grouped.set(it.item_id, (grouped.get(it.item_id) || 0) + 1);
  }
  const multiVersion = [...grouped.entries()].filter(([, count]) => count > 1);
  assert.deepEqual(multiVersion, [], `unexpected multi-version item_id(s): ${multiVersion.map(([id]) => id).join(', ')}`);
});
