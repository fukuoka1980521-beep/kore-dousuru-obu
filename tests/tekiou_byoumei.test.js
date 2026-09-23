import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("tools/tekiou-byoumei/index.html", "utf8");
const master = JSON.parse(fs.readFileSync("tools/tekiou-byoumei/drug-master.json", "utf8"));

test("verified medication summaries require exact product-name match", () => {
  assert.match(html, /const ms=D\.filter\(d=>d\.n\.some\(n=>norm\(n\)===z\)\);/);
  assert.doesNotMatch(html, /"ロキソニン","ロキソプロフェン"/);
  assert.doesNotMatch(html, /"カロナール","アセトアミノフェン"/);
  assert.doesNotMatch(html, /"アレグラ","フェキソフェナジン"/);
});

test("SSK drug master is complete enough for production search", () => {
  assert.ok(master.meta);
  assert.ok(master.meta.count >= 15000, "drug master unexpectedly small");
  assert.equal(master.meta.count, master.drugs.length);
  assert.equal(master.meta.malformed_rows, 0);

  const codes = new Set(master.drugs.map((d) => d.code));
  assert.equal(codes.size, master.drugs.length, "drug codes must be unique");

  const names = new Set(master.drugs.map((d) => d.name));
  assert.ok(names.has("ロキソニン錠６０ｍｇ") || names.has("ロキソニン錠60mg"));
  assert.ok(master.drugs.some((d) => String(d.generic || "").includes("アムロジピン")));
});

test("unverified products route to official reference search instead of inferred medical data", () => {
  assert.match(html, /iyakusearch\.japic\.or\.jp\/package_insert\/result\?medical=/);
  assert.match(html, /医学情報を推測せず/);
});
