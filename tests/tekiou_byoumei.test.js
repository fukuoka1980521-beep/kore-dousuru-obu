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

  const rows = master.drugs.map((raw, i) =>
    Array.isArray(raw)
      ? { id: i, name: raw[0] || "", kana: raw[1] || "", yj: raw[2] || "", generic: raw[3] || "", abolished: raw[4] || "" }
      : { ...raw, id: raw.code || i }
  );
  assert.ok(rows.every((d) => d.name), "every master row must have a medicine name");

  const names = new Set(rows.map((d) => d.name));
  assert.ok(names.has("ロキソニン錠６０ｍｇ") || names.has("ロキソニン錠60mg"));
  assert.ok(rows.some((d) => String(d.generic || "").includes("アムロジピン")));
});

test("unverified products route to official reference search instead of inferred medical data", () => {
  assert.match(html, /iyakusearch\.japic\.or\.jp\/package_insert\/result\?medical=/);
  assert.match(html, /医学情報を推測せず/);
});


test("Loxonin Tape is a separately verified dosage-form group", () => {
  assert.match(html, /id:"loxtape"/);
  assert.match(html, /"ロキソニンテープ50mg"/);
  assert.match(html, /"ロキソニンテープ100mg"/);
  assert.match(html, /"ロキソニンテープ"/);
  assert.match(html, /変形性関節症の消炎・鎮痛/);
  assert.match(html, /1日1回、患部に貼付する。/);
  assert.match(html, /ショック","アナフィラキシー/);
  assert.match(html, /850028_2649735S2024_1_14/);
});
