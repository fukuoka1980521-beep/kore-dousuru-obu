import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveItemsForDate, groupByItemId } from '../src/lib/rules.js';
import { searchItems } from '../src/lib/search.js';

const ROOT = new URL('../', import.meta.url);

async function loadJSON(relPath) {
  const raw = await readFile(new URL(relPath, ROOT), 'utf-8');
  return JSON.parse(raw);
}

// Reality-sample keywords (section 15 of the spec): common life questions a
// resident might type, plus a few tricky/edge items surfaced during Obu
// research (out-of-scope appliances, hazardous items, area-limited rules).
const REQUIRED_ITEM_KEYWORDS = [
  '電子レンジ', '布団', '蛍光灯', 'テレビ', '冷蔵庫', 'エアコン', '洗濯機',
  '乾電池', 'モバイルバッテリー', 'スプレー缶', 'ライター', '自転車', '傘',
  '古紙', 'ペットボトル', 'パソコン', '携帯電話', '粗大ごみ', '生ごみ',
];

let wasteItems = [];
let procedures = [];
let wasteLoadError = null;
let procLoadError = null;

test.before(async () => {
  try {
    wasteItems = await loadJSON('municipalities/obu/data/waste_items.json');
  } catch (e) { wasteLoadError = e; }
  try {
    procedures = await loadJSON('municipalities/obu/data/procedures.json');
  } catch (e) { procLoadError = e; }
});

test('waste_items.json exists and parses', () => {
  assert.equal(wasteLoadError, null, `waste_items.json missing/invalid: ${wasteLoadError}`);
  assert.ok(Array.isArray(wasteItems) && wasteItems.length > 0, 'waste_items.json must be a non-empty array');
});

test('procedures.json exists and parses', () => {
  assert.equal(procLoadError, null, `procedures.json missing/invalid: ${procLoadError}`);
  assert.ok(Array.isArray(procedures) && procedures.length > 0, 'procedures.json must be a non-empty array');
});

// Unlike the Nagoya baseline (122 items), Obu's count reflects what could
// actually be confirmed from official sources (spec section 7: do not pad
// with fabricated data). 30 is a floor for "sufficient everyday coverage",
// not a target to hit artificially.
test('at least 30 distinct waste item_ids', { skip: Boolean(wasteLoadError) }, () => {
  const grouped = groupByItemId(wasteItems);
  assert.ok(grouped.size >= 30, `expected >=30 distinct item_id, got ${grouped.size}`);
});

test('every waste record has municipality_id "obu"', { skip: Boolean(wasteLoadError) }, () => {
  for (const it of wasteItems) {
    assert.equal(it.municipality_id, 'obu', `item ${it.item_id} has wrong municipality_id`);
  }
});

test('every waste record has a status field with a valid value', { skip: Boolean(wasteLoadError) }, () => {
  const valid = new Set(['CONFIRMED_OFFICIAL', 'PARTIAL', 'UNCONFIRMED']);
  for (const it of wasteItems) {
    assert.ok(valid.has(it.status), `item ${it.item_id} has invalid status: ${it.status}`);
  }
});

test('CONFIRMED_OFFICIAL waste items cite a city.obu.aichi.jp source', { skip: Boolean(wasteLoadError) }, () => {
  const offenders = wasteItems.filter(
    (it) => it.status === 'CONFIRMED_OFFICIAL' && !(it.official_url || '').includes('city.obu.aichi.jp')
  );
  assert.deepEqual(offenders.map((o) => o.item_id), [], 'CONFIRMED_OFFICIAL items must cite city.obu.aichi.jp');
});

test('required tricky item keywords are searchable', { skip: Boolean(wasteLoadError) }, () => {
  const missing = [];
  for (const kw of REQUIRED_ITEM_KEYWORDS) {
    const hits = searchItems(wasteItems, kw);
    if (hits.length === 0) missing.push(kw);
  }
  assert.deepEqual(missing, [], `no match found for required keywords: ${missing.join(', ')}`);
});

// UNCONFIRMED items (e.g. 蛍光灯・蛍光管, LED照明器具 — see
// docs/internal/OBU_DIFFERENCE_FINDINGS_V0_1.md) must fail closed: no
// disposal instructions, no invented phone/fee, an explicit "確認できませんでした"
// style notice, and a fail-closed sentinel for fee where the true value is
// unknown rather than a plausible-looking but unverified number.
test('UNCONFIRMED waste items fail closed: no fabricated how_to_dispose/collection/fee', { skip: Boolean(wasteLoadError) }, () => {
  const unconfirmed = wasteItems.filter((it) => it.status === 'UNCONFIRMED');
  assert.ok(unconfirmed.length > 0, 'expected at least one UNCONFIRMED item (fail-closed path must be exercised)');
  const FEE_SENTINELS = new Set(['UNCONFIRMED', 'OFFICIAL_CONFIRMATION_REQUIRED', 'NOT_PUBLICLY_CONFIRMED']);
  for (const it of unconfirmed) {
    assert.match(it.how_to_dispose, /確認できませんでした/, `${it.item_id}.how_to_dispose must fail closed`);
    assert.ok(FEE_SENTINELS.has(it.fee), `${it.item_id}.fee must be a fail-closed sentinel, got "${it.fee}"`);
  }
});

test('at least 12 procedures defined', { skip: Boolean(procLoadError) }, () => {
  assert.ok(procedures.length >= 12, `expected >=12 procedures, got ${procedures.length}`);
});

test('every procedure has a non-empty phone field', { skip: Boolean(procLoadError) }, () => {
  const offenders = procedures.filter((p) => !p.phone || p.phone.trim() === '');
  assert.deepEqual(offenders.map((o) => o.procedure_id), [], `procedures missing a phone field: ${offenders.map((o) => o.procedure_id).join(', ')}`);
});

test('every procedure cites an official_url on city.obu.aichi.jp', { skip: Boolean(procLoadError) }, () => {
  const offenders = procedures.filter((p) => !p.official_url || !p.official_url.includes('city.obu.aichi.jp'));
  assert.deepEqual(offenders.map((o) => o.procedure_id), [], 'every procedure must cite a city.obu.aichi.jp source');
});

test('no waste item silently guesses a fee — unknown values use a fail-closed sentinel', { skip: Boolean(wasteLoadError) }, () => {
  const SENTINELS = new Set(['UNCONFIRMED', 'OFFICIAL_CONFIRMATION_REQUIRED', 'NOT_PUBLICLY_CONFIRMED']);
  const suspicious = wasteItems.filter((it) => it.status === 'UNCONFIRMED' && !SENTINELS.has(it.fee));
  assert.deepEqual(suspicious.map((s) => s.item_id), [], 'UNCONFIRMED items must not carry a concrete-looking fee value');
});
