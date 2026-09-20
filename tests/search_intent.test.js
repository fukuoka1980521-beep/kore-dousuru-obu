import test from "node:test";
import assert from "node:assert/strict";
import { searchItems } from "../src/lib/search.js";

const items = [
  { item_id: "sofa", display_name: "ソファー・ソファーベッド", aliases: ["ソファ"] },
  { item_id: "resident", display_name: "住民票の写しの取得", aliases: ["住民票", "住民票が欲しい"] },
  { item_id: "join", display_name: "国民健康保険の加入手続き", aliases: ["国保に入る", "国保", "国民健康保険加入"] },
  { item_id: "leave", display_name: "国民健康保険の脱退手続き", aliases: ["国保をやめる", "国保", "国民健康保険脱退"] },
];

test("resident intent phrase: ソファ捨てたい reaches the sofa record", () => {
  const r = searchItems(items, "ソファ捨てたい");
  assert.equal(r[0]?.item_id, "sofa");
});

test("resident intent phrase: 住民票ほしい reaches the resident-certificate record", () => {
  const r = searchItems(items, "住民票ほしい");
  assert.deepEqual(r.map((x) => x.item_id), ["resident"]);
});

test("directional intent: 国保に入りたい resolves to join, not both join and leave", () => {
  const r = searchItems(items, "国保に入りたい");
  assert.deepEqual(r.map((x) => x.item_id), ["join"]);
});

test("directional intent: 国保やめたい resolves to leave, not both join and leave", () => {
  const r = searchItems(items, "国保やめたい");
  assert.deepEqual(r.map((x) => x.item_id), ["leave"]);
});

test("generic intent words by themselves never become a resolved answer even when they occur inside aliases", () => {
  for (const q of ["捨てたい", "ほしい", "欲しい", "入りたい", "やめたい", "どうする"]) {
    assert.deepEqual(searchItems(items, q), [], q);
  }
});

test("broad noun query can still return multiple relevant records", () => {
  const r = searchItems(items, "国保");
  assert.deepEqual(r.map((x) => x.item_id), ["join", "leave"]);
});
