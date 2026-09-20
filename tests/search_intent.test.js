import test from "node:test";
import assert from "node:assert/strict";
import { searchItems } from "../src/lib/search.js";

const items = [
  { item_id: "sofa", display_name: "ソファー・ソファーベッド", aliases: ["ソファ"] },
  { item_id: "resident", display_name: "住民票の写しの取得", aliases: ["住民票"] },
  { item_id: "kokuho", display_name: "国民健康保険の加入手続き", aliases: ["国保に入る", "国保"] },
];

test("resident intent phrase: ソファ捨てたい reaches the sofa record", () => {
  const r = searchItems(items, "ソファ捨てたい");
  assert.equal(r[0]?.item_id, "sofa");
});

test("resident intent phrase: 住民票ほしい reaches the resident-certificate record", () => {
  const r = searchItems(items, "住民票ほしい");
  assert.equal(r[0]?.item_id, "resident");
});

test("resident intent phrase: 国保に入りたい reaches the insurance procedure", () => {
  const r = searchItems(items, "国保に入りたい");
  assert.equal(r[0]?.item_id, "kokuho");
});

test("an intent word by itself never becomes a resolved answer", () => {
  assert.deepEqual(searchItems(items, "捨てたい"), []);
  assert.deepEqual(searchItems(items, "ほしい"), []);
  assert.deepEqual(searchItems(items, "どうする"), []);
});
