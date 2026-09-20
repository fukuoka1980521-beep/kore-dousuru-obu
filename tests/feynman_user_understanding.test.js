/**
 * OBU_FEYNMAN_USER_UNDERSTANDING_AUDIT_V0_1 (2026-09-12) regression guard.
 *
 * Fresh-read audit of Obu's own screens/data (not a copy of Nagoya's fix set).
 * Confirmed gaps, all presentation-only — no data field renamed, no fact,
 * exception, or safety note deleted, no source reinterpreted:
 *
 * 1. The only UNCONFIRMED waste item (obu-0006 LED照明器具) has category
 *    "分別区分未確認" (a data-quality placeholder, not a real disposal
 *    category). The old conclusion template always rendered
 *    "{category}として出してください", producing the self-contradictory
 *    instruction "分別区分未確認として出してください" — telling the user to
 *    sort the item AS "unconfirmed". Fixed by branching on status.
 * 2. All 48 obu waste_items.json records are single-version (rule_version
 *    "v1" on every record, no item_id repeated), yet 適用期間 unconditionally
 *    showed the internal "v1" slug on every item. Fixed to only render the
 *    row when a real second version exists (versionCount > 1), matching how
 *    resolveWasteDeepLink/isDateDependent already treat version count
 *    elsewhere in this same file, and dropping the internal slug from the
 *    row entirely when it does render.
 * 3. Home's "よく検索される品目" claimed search-frequency data this
 *    privacy-first static site never collects (no analytics anywhere in the
 *    UI layer) — the shown items were just the first 5 records in JSON file
 *    order. Relabeled to "特に注意が必要な品目" and backed by an actual
 *    filter on real danger_notes content.
 * 4. The search reference date is an implementation detail while Obu has no
 *    multi-version waste rules. It is now hidden by default and only appears
 *    when a real item_id has multiple rule versions.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const appSrc = readFileSync(path.join(ROOT, "src", "app", "app.js"), "utf-8");
const wasteItems = JSON.parse(
  readFileSync(path.join(ROOT, "municipalities", "obu", "data", "waste_items.json"), "utf-8")
);
const lifeEvents = JSON.parse(
  readFileSync(path.join(ROOT, "municipalities", "obu", "data", "life_events.json"), "utf-8")
);

test("sanity: exactly one UNCONFIRMED item exists and its category is the unresolved placeholder (this test file's premise)", () => {
  const unconfirmed = wasteItems.filter((i) => i.status === "UNCONFIRMED");
  assert.equal(unconfirmed.length, 1, "expected dataset shape has changed — revisit this test file");
  assert.equal(unconfirmed[0].category, "分別区分未確認");
});

test("sanity: this dataset still has zero multi-version item_ids (Obu has no real rule_version history yet)", () => {
  const counts = new Map();
  for (const it of wasteItems) counts.set(it.item_id, (counts.get(it.item_id) || 0) + 1);
  const multiVersionIds = [...counts.entries()].filter(([, c]) => c > 1);
  assert.equal(multiVersionIds.length, 0, "a real multi-version item now exists — revisit whether 適用期間 gating is still correct");
});

test("waste card conclusion branches on status === \"UNCONFIRMED\" instead of always using category as the grammatical subject", () => {
  const fnMatch = appSrc.match(/const conclusionHtml =\s*\n([\s\S]*?);\n\n\s*return `/);
  assert.ok(fnMatch, "conclusionHtml branch not found in renderWasteCard");
  assert.match(fnMatch[1], /it\.status === "UNCONFIRMED"/);
  // The fallback (non-unconfirmed) branch must still use category as the subject —
  // this fix must not change behavior for the other 47 confirmed/partial items.
  assert.match(fnMatch[1], /<strong>\$\{escapeHtml\(it\.category\)\}<\/strong>として出してください/);
});

test("the UNCONFIRMED branch never re-asserts the unresolved placeholder as a disposal instruction", () => {
  const fnMatch = appSrc.match(/const conclusionHtml =\s*\n([\s\S]*?);\n\n\s*return `/);
  assert.ok(fnMatch);
  const unconfirmedBranch = fnMatch[1].split("? `")[1].split("`\n        :")[0];
  assert.doesNotMatch(unconfirmedBranch, /として出してください/);
  assert.doesNotMatch(unconfirmedBranch, /\$\{escapeHtml\(it\.category\)\}/);
});

test("LED照明器具's conditions/notes text is still fully preserved (nothing deleted by the display fix)", () => {
  const it = wasteItems.find((i) => i.display_name === "LED照明器具");
  assert.ok(it.conditions && it.conditions.length > 0);
  assert.ok(it.notes && it.notes.length > 0);
  assert.match(it.notes, /大府市環境課/);
});

test("適用期間 (applicable-period) row only renders for items with real multi-version history, and the row never leaks the internal rule_version slug", () => {
  const rowMatch = appSrc.match(/\$\{versionCount > 1 \? `<div class="row"><dt>適用期間<\/dt>([\s\S]*?)`\s*: ""\}/);
  assert.ok(rowMatch, "conditional 適用期間 row not found");
  assert.doesNotMatch(rowMatch[1], /rule_version/);
});

test("every waste item still carries its real valid_from date in the data (the fix hides a UI row, it does not drop the underlying field)", () => {
  assert.ok(wasteItems.every((i) => !!i.valid_from));
});

test("home 'caution items' section is labeled honestly — not claimed as search-frequency data the app never tracks", () => {
  assert.doesNotMatch(appSrc, /よく検索される品目/);
  assert.match(appSrc, /特に注意が必要な品目/);
  assert.doesNotMatch(appSrc, /gtag\(|google-analytics|googletagmanager|hit_count|search_count/);
});

test("the '特に注意が必要な品目' home section is honest: it is filtered on real danger_notes content, not raw file order", () => {
  const fnMatch = appSrc.match(/const cautionItems = activeItems\.filter\(([\s\S]*?)\)\.slice\(0, 5\);/);
  assert.ok(fnMatch, "cautionItems filter not found in home view");
  assert.match(fnMatch[1], /danger_notes/);
  assert.match(fnMatch[1], /該当なし/);

  // Mirror the app's own logic against the live dataset (all items are currently
  // active — no valid_to values are set) to confirm the shown set is genuinely risky.
  const cautionItems = wasteItems.filter((i) => i.danger_notes && i.danger_notes !== "該当なし").slice(0, 5);
  assert.ok(cautionItems.length > 0);
  for (const it of cautionItems) {
    assert.ok(it.danger_notes && it.danger_notes !== "該当なし", `${it.item_id} shown under caution items but has no danger_notes`);
  }
});

test("search reference date stays hidden until real multi-version waste history exists", () => {
  assert.match(appSrc, /function hasMultiVersionWasteItems\(\)/);
  assert.match(appSrc, /if \(!hasMultiVersionWasteItems\(\)\) return ""/);
  assert.match(appSrc, /\$\{searchDatePickerHtml\(\)\}/);
  const rawVisiblePickers = appSrc.match(/検索基準日:/g) || [];
  assert.equal(rawVisiblePickers.length, 0, "old always-visible search-date label must not remain");
});

test("life event card renders the event-specific summary text (previously stored in data but never rendered)", () => {
  assert.ok(lifeEvents.every((e) => e.summary && e.summary.length > 0), "every life event should have a summary to show");
  assert.match(appSrc, /e\.summary \? `<div class="life-event-summary">\$\{escapeHtml\(e\.summary\)\}<\/div>` : ""/);
  // The general non-determinative caution line must still be shown alongside the
  // event-specific summary, not replaced by it — this is an addition, not a swap.
  assert.match(appSrc, /LIFE_EVENT_CAUTION/);
});
