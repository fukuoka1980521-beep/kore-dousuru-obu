import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "handa", "coverage-gap-records.js"), "utf8"), context);
const records = context.window.__HANDA_COVERAGE_GAP_RECORDS__;
const index = fs.readFileSync(path.join(root, "handa", "index.html"), "utf8");

test("Handa loads researched gap records before UI initialization", () => {
  assert.ok(index.includes('<script src="./coverage-gap-records.js"></script>'));
  assert.ok(index.includes("window.__HANDA_COVERAGE_GAP_RECORDS__ || []"));
  assert.ok(index.includes("procedures.push({ ...record })"));
});

test("Handa only includes gaps whose resident route is verified", () => {
  assert.equal(records.length, 11);
  assert.equal(records.some((x) => /断水|水が出ない/.test(x.name)), false);
  assert.equal(records.some((x) => /騒音|悪臭/.test(x.name)), false);
  for (const record of records) {
    assert.equal(record.status, "CONFIRMED_OFFICIAL");
    assert.match(record.official_url, /^https:\/\/www\.city\.handa\.lg\.jp\//);
  }
});

test("Handa records contain the expected resident-language entry points", () => {
  const expected = [
    ["道路に穴", "hnd-gap-roads-damage"],
    ["水漏れ", "hnd-gap-water-leak"],
    ["年金払えない", "hnd-gap-pension-exemption"],
    ["高額療養費", "hnd-gap-high-cost-medical"],
    ["市営住宅", "hnd-gap-public-housing"],
    ["事件にあった", "hnd-gap-crime-victim"],
    ["給料未払い", "hnd-gap-labor"],
    ["ひきこもり", "hnd-gap-hikikomori"],
    ["不登校", "hnd-gap-school-refusal"],
    ["障害者相談", "hnd-gap-disability-support"],
    ["子どもの発達", "hnd-gap-development-support"]
  ];
  for (const [query, id] of expected) {
    const hit = records.find((r) => r.name.includes(query) || (r.aliases || []).includes(query));
    assert.equal(hit?.procedure_id, id, query);
  }
});

test("Handa high-cost medical route asks for insurer before routing", () => {
  const record = records.find((x) => x.procedure_id === "hnd-gap-high-cost-medical");
  assert.match(record.conclusion, /加入している健康保険/);
  assert.match(record.how_to, /国保以外|加入している健康保険/);
});
