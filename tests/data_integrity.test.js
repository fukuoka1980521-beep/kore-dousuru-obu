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

// UNCONFIRMED items (e.g. LED照明器具 — see
// docs/internal/OBU_DIFFERENCE_FINDINGS_V0_1.md) must fail closed: no
// disposal instructions, no invented phone/fee, an explicit "確認できません"
// style notice in both how_to_dispose and fee rather than a plausible-looking
// but unverified number. The fee text is natural Japanese shown directly in
// the UI (src/app/app.js renders it verbatim), not an internal enum value —
// see PRE_DEPLOY_MICRO_CLOSE_V0_3, which replaced the earlier raw English
// sentinel strings (e.g. "OFFICIAL_CONFIRMATION_REQUIRED") that were leaking
// into the public card display.
const FAIL_CLOSED_FEE_RE = /確認できません|確認いただけ|依頼先|窓口でご確認|要問い合わせ/;
test('UNCONFIRMED waste items fail closed: no fabricated how_to_dispose/collection/fee', { skip: Boolean(wasteLoadError) }, () => {
  const unconfirmed = wasteItems.filter((it) => it.status === 'UNCONFIRMED');
  assert.ok(unconfirmed.length > 0, 'expected at least one UNCONFIRMED item (fail-closed path must be exercised)');
  for (const it of unconfirmed) {
    assert.match(it.how_to_dispose, /確認できませんでした/, `${it.item_id}.how_to_dispose must fail closed`);
    assert.match(it.fee, FAIL_CLOSED_FEE_RE, `${it.item_id}.fee must read as fail-closed natural-language text, got "${it.fee}"`);
    assert.doesNotMatch(it.fee, /^[A-Z_]+$/, `${it.item_id}.fee must not be a raw internal enum string, got "${it.fee}"`);
  }
});

// No fee field anywhere in the public data — regardless of status — may leak
// a raw internal enum/sentinel token (all-caps snake_case) into the UI. This
// pins the PRE_DEPLOY_MICRO_CLOSE_V0_3 fix so it cannot silently regress.
test('no fee field in public data is a raw internal sentinel token', { skip: Boolean(wasteLoadError || procLoadError) }, () => {
  const RAW_TOKEN_RE = /^[A-Z_]+$/;
  const badWaste = wasteItems.filter((it) => RAW_TOKEN_RE.test(it.fee || ''));
  const badProc = procedures.filter((p) => RAW_TOKEN_RE.test(p.fee || ''));
  assert.deepEqual(badWaste.map((o) => o.item_id), [], 'waste fee leaks a raw internal token');
  assert.deepEqual(badProc.map((o) => o.procedure_id), [], 'procedure fee leaks a raw internal token');
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

test('no waste item silently guesses a fee — UNCONFIRMED items read as fail-closed, not a concrete number', { skip: Boolean(wasteLoadError) }, () => {
  const suspicious = wasteItems.filter((it) => it.status === 'UNCONFIRMED' && !FAIL_CLOSED_FEE_RE.test(it.fee || ''));
  assert.deepEqual(suspicious.map((s) => s.item_id), [], 'UNCONFIRMED items must not carry a concrete-looking fee value');
});
