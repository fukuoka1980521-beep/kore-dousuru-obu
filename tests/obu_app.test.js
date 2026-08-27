/**
 * 大府市版「これどうする？」アプリ層テスト（municipalities/shared/core.js 経由）。
 * data_integrity.test.js / rules.test.js / search.test.js（src/lib）と重複しない観点を補完する:
 * 手続の名称網羅、危険物の個別分類、UI層が使う core.js のAPI自体の検証。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// municipalities/shared/core.js は素の <script> 用に書かれているため、
// window スタブを与えて読み込み、window.KoreDousuruCore を取り出す。
const globalWindow = {};
const coreSrc = readFileSync(path.join(ROOT, "municipalities", "shared", "core.js"), "utf-8");
const fn = new Function("window", coreSrc + "\nreturn window.KoreDousuruCore;");
const { resolveActiveWasteItems, searchWasteItems, searchProcedures, suggestSimilar } = fn(globalWindow);

const wasteItems = JSON.parse(
  readFileSync(path.join(ROOT, "municipalities", "obu", "data", "waste_items.json"), "utf-8")
);
const procedures = JSON.parse(
  readFileSync(path.join(ROOT, "municipalities", "obu", "data", "procedures.json"), "utf-8")
);

test("30品目以上、実データ（水増しなし・display_name一意）", () => {
  assert.ok(wasteItems.length >= 30, `actual ${wasteItems.length}`);
  const unique = new Set(wasteItems.map((i) => i.display_name));
  assert.equal(unique.size, wasteItems.length);
});

test("生活者語・別名検索: モバイルバッテリー / 電子レンジ / 携帯電話", () => {
  assert.ok(searchWasteItems("モバイルバッテリー", wasteItems).length > 0);
  const renge = searchWasteItems("レンジ", wasteItems);
  assert.equal(renge[0]?.display_name, "電子レンジ");
  const keitai = searchWasteItems("スマホ", wasteItems);
  assert.equal(keitai[0]?.display_name, "携帯電話・スマートフォン");
});

test("危険物・発火性危険物の分類が誤らない", () => {
  const catOf = (q) => searchWasteItems(q, wasteItems)[0]?.category;
  assert.equal(catOf("モバイルバッテリー"), "電池類");
  assert.equal(catOf("乾電池"), "電池類");
  assert.equal(catOf("スプレー缶"), "発火性危険物");
  assert.equal(catOf("カセットボンベ"), "発火性危険物");
  assert.equal(catOf("ライター"), "発火性危険物");
  const dangerousItems = wasteItems.filter((i) =>
    ["モバイルバッテリー・リチウムイオン電池", "スプレー缶", "カセットボンベ", "ライター", "花火・マッチ"].includes(i.display_name)
  );
  assert.equal(dangerousItems.length, 5);
  assert.ok(dangerousItems.every((i) => i.danger_notes && i.danger_notes !== "該当なし"));
});

test("家電リサイクル法対象品（テレビ・冷蔵庫・エアコン・洗濯機）は市収集対象外と明確に案内される", () => {
  for (const name of ["テレビ", "冷蔵庫・冷凍庫", "エアコン", "洗濯機・衣類乾燥機"]) {
    const it = wasteItems.find((i) => i.display_name === name);
    assert.ok(it, `${name} not found`);
    assert.match(it.category, /市収集対象外/);
    assert.equal(it.application_required, true);
  }
});

test("行政手続12件、全て具体的な結論(conclusion)を持つ", () => {
  assert.equal(procedures.length, 12);
  const required = [
    "転入届", "転出届", "転居届", "住民票", "戸籍証明書", "印鑑登録", "出生届",
    "児童手当", "国民健康保険の加入", "国民健康保険の脱退", "マイナンバーカード", "死亡時",
  ];
  for (const key of required) {
    const hit = procedures.find((p) => p.name.includes(key));
    assert.ok(hit, `procedure for "${key}" not found`);
    assert.ok(hit.conclusion && hit.conclusion.length > 10, `"${key}" lacks a concrete conclusion`);
  }
});

test("生活者語検索で行政手続に到達（住民票コンビニ／引っ越した）", () => {
  assert.ok(searchProcedures("住民票 コンビニ", procedures).length > 0);
  assert.ok(searchProcedures("引っ越してきた", procedures).length > 0);
});

test("公式出典（city.obu.aichi.jp）、確認日あり", () => {
  const confirmed = wasteItems.filter((i) => i.status === "CONFIRMED_OFFICIAL");
  assert.ok(confirmed.length > 0);
  assert.ok(confirmed.every((i) => i.official_url?.includes("city.obu.aichi.jp")));
  assert.ok(procedures.every((p) => p.official_url?.includes("city.obu.aichi.jp")));
  assert.ok(wasteItems.every((i) => !!i.source_checked_at));
});

test("担当課が判明している結果には電話番号フィールドがある", () => {
  assert.ok(wasteItems.every((i) => i.phone && i.phone !== ""));
  assert.ok(procedures.every((p) => p.phone && p.phone !== ""));
});

test("不明品目はfail-safe：推測せずゼロ件+候補提示", () => {
  const nonsense = searchWasteItems("存在しないでたらめな品目名XYZ123", wasteItems);
  assert.equal(nonsense.length, 0);
  const suggestions = suggestSimilar("もばいるばってり", wasteItems, 6);
  assert.ok(suggestions.length > 0);
});

test("statusは仕様の3値のみ", () => {
  const valid = new Set(["CONFIRMED_OFFICIAL", "PARTIAL", "UNCONFIRMED"]);
  assert.ok(wasteItems.every((i) => valid.has(i.status)));
  assert.ok(procedures.every((p) => valid.has(p.status)));
});

test("LED照明器具は公式情報で確認できず、分別方法を断定しない（fail-closed）", () => {
  const it = wasteItems.find((i) => i.display_name === "LED照明器具");
  assert.ok(it, "LED照明器具 not found");
  assert.equal(it.status, "UNCONFIRMED");
  assert.match(it.how_to_dispose, /確認できませんでした/);
});

test("蛍光灯・蛍光管は専用FAQで確認済み（燃やせないごみ、fail-closedではない）", () => {
  const it = wasteItems.find((i) => i.display_name === "蛍光灯・蛍光管");
  assert.ok(it, "蛍光灯・蛍光管 not found");
  assert.equal(it.status, "CONFIRMED_OFFICIAL");
  assert.equal(it.category, "燃やせないごみ");
  assert.doesNotMatch(it.how_to_dispose, /確認できませんでした/);
});
