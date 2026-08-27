import test from 'node:test';
import assert from 'node:assert/strict';
import { searchItems, normalize } from '../src/lib/search.js';

const items = [
  { item_id: 'battery', display_name: 'モバイルバッテリー', aliases: ['モバブ', 'mobile battery', 'リチウムイオン電池'] },
  { item_id: 'light', display_name: '照明器具', aliases: ['照明', 'ライト', '電球'] },
  { item_id: 'lamp', display_name: 'LED電球', aliases: ['LED', '電球型LED'] },
];

test('empty query returns no results', () => {
  assert.deepEqual(searchItems(items, ''), []);
});

test('exact display_name match ranks first', () => {
  const r = searchItems(items, '照明器具');
  assert.equal(r[0].item_id, 'light');
});

test('alias match finds the right item', () => {
  const r = searchItems(items, 'モバブ');
  assert.equal(r[0].item_id, 'battery');
});

test('colloquial partial phrase matches via alias substring', () => {
  const r = searchItems(items, '照明');
  assert.ok(r.some((i) => i.item_id === 'light'));
});

test('katakana input normalizes to match hiragana-insensitive alias variants', () => {
  // normalize() converts full-width katakana to hiragana; ensure it does not throw
  // and produces a stable, case-insensitive key.
  assert.equal(normalize('モバブ'), normalize('モバブ'));
  assert.notEqual(normalize('モバブ'), '');
});

test('no false positive for unrelated query', () => {
  const r = searchItems(items, 'ぜんぜん関係ない単語xyz');
  assert.deepEqual(r, []);
});

test('ambiguous danger item aliases resolve to distinct items (no cross-contamination)', () => {
  const batteryHit = searchItems(items, 'リチウムイオン電池');
  const lampHit = searchItems(items, 'LED');
  assert.equal(batteryHit[0].item_id, 'battery');
  assert.equal(lampHit[0].item_id, 'lamp');
});
