import test from 'node:test';
import assert from 'node:assert/strict';
import { searchItems, fuzzySuggestItems } from '../src/lib/search.js';

const items = [
  { item_id: 'battery', display_name: 'モバイルバッテリー', aliases: ['モバブー', 'スマホ 充電器 電池'], danger_notes: '発火の危険あり' },
  { item_id: 'light', display_name: '照明器具', aliases: ['照明', 'ライト', '電球'] },
];

test('① exact display_name match', () => {
  const r = searchItems(items, 'モバイルバッテリー');
  assert.equal(r[0].item_id, 'battery');
});

test('② exact alias match', () => {
  const r = searchItems(items, 'モバブー');
  assert.equal(r[0].item_id, 'battery');
});

test('③ normalized(loose) exact match — missing trailing 長音符', () => {
  // "モバイルバッテリ" (no trailing ー) should resolve via loose-normalize,
  // not via the fuzzy/typo path.
  const r = searchItems(items, 'モバイルバッテリ');
  assert.equal(r[0]?.item_id, 'battery');
});

test('④ minor typo is NOT a strong match (missing small っ)', () => {
  // "モバイルバテリー" drops the small tsu — not exact/alias/loose-normalized,
  // so the strong search must NOT resolve it as an answer.
  const r = searchItems(items, 'モバイルバテリー');
  assert.equal(r.length, 0);
});

test('⑤ minor typo IS a fuzzy candidate, ranked above unrelated items', () => {
  const r = fuzzySuggestItems(items, 'モバイルバテリー');
  assert.ok(r.length > 0);
  assert.equal(r[0].item_id, 'battery');
});

test('low-confidence fuzzy candidates are never auto-selected as an answer', () => {
  // fuzzySuggestItems only ever returns a list of candidates; it is a
  // separate function from searchItems (the "confirmed answer" path), so a
  // caller cannot accidentally treat a fuzzy hit as a resolved result.
  const strong = searchItems(items, 'モバイルバテリー');
  const fuzzy = fuzzySuggestItems(items, 'モバイルバテリー');
  assert.equal(strong.length, 0, 'strong search must stay empty for a typo-only query');
  assert.ok(fuzzy.length > 0, 'fuzzy candidates must still be offered');
});

test('a dangerous item reached only via fuzzy typo is not auto-selected', () => {
  // One-character substitution (る→ろ) vs. the phonetic hiragana reading of
  // モバイルバッテリー — a genuine typo, not just a notation difference.
  const typo = 'もばいろばってり';
  const fuzzy = fuzzySuggestItems(items, typo);
  const hit = fuzzy.find((i) => i.item_id === 'battery');
  assert.ok(hit, 'expected the dangerous item to appear as a candidate');
  assert.ok(hit.danger_notes, 'sanity: this is indeed the dangerous item');
  // The contract is structural: fuzzySuggestItems() never returns from
  // searchItems()'s strong-match code path, so nothing downstream can
  // mistake this candidate for a confirmed record without an explicit
  // selection step.
  assert.equal(searchItems(items, typo).length, 0);
});

test('fuzzy suggestions do not fire on very short or unrelated queries', () => {
  assert.deepEqual(fuzzySuggestItems(items, 'あ'), []);
  assert.deepEqual(fuzzySuggestItems(items, 'ぜんぜん関係ない単語xyz123'), []);
});
