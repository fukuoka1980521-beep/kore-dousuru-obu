import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const appSrc = readFileSync(path.join(ROOT, "src", "app", "app.js"), "utf-8");
const config = JSON.parse(readFileSync(path.join(ROOT, "municipalities", "obu", "config.json"), "utf-8"));

test("home priority navigation is phrased as resident intentions", () => {
  const labels = Object.fromEntries(config.priority_nav.map((x) => [x.key, x.label]));
  assert.equal(labels.gomi, "捨てたい");
  assert.equal(labels.hikkoshi, "引っ越した");
  assert.equal(labels.juminhyo, "住民票がほしい");
  assert.equal(labels.kosodate, "子どものこと");
});

test("mobile UI does not force-focus the search box", () => {
  assert.doesNotMatch(appSrc, /input\.focus\(\)/);
});

test("home offers natural-language quick searches", () => {
  for (const q of ["ソファ捨てたい", "住民票ほしい", "国保に入りたい", "子どもが生まれた"]) {
    assert.match(appSrc, new RegExp(`data-query="${q}"`));
  }
});

test("a single strong result is rendered directly instead of forcing an extra tap", () => {
  assert.match(appSrc, /totalStrongResults === 1/);
  assert.match(appSrc, /singleResultMode = true/);
  assert.match(appSrc, /すぐ答えを表示しています/);
});

test("procedure details are ordered around action before source metadata", () => {
  const actionIndex = appSrc.indexOf("まずすること");
  const placeIndex = appSrc.indexOf("📍 行く場所");
  const docsIndex = appSrc.indexOf("👜 持っていくもの");
  const deadlineIndex = appSrc.indexOf("⏰ いつまで");
  const officialIndex = appSrc.indexOf("問い合わせ先・公式情報を確認");
  assert.ok(actionIndex >= 0 && placeIndex > actionIndex && docsIndex > actionIndex && deadlineIndex > actionIndex);
  assert.ok(officialIndex > deadlineIndex, "source metadata should follow the actionable answer");
});
