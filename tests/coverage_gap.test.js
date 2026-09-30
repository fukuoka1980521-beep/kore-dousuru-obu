import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchNeed } from "../scripts/build_coverage_matrix.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const taxonomy = JSON.parse(
  fs.readFileSync(path.resolve(testDir, "..", "tools", "coverage", "need-taxonomy.json"), "utf8")
);

test("coverage taxonomy keeps municipality-specific facts out of the common layer", () => {
  const text = JSON.stringify(taxonomy);
  assert.equal(/大府市|名古屋市|半田市/.test(text), false);
  const ids = taxonomy.map((x) => x.need_id);
  assert.equal(new Set(ids).size, ids.length);
  for (const required of ["roads_damage", "water_leak", "pension_exemption", "high_cost_medical", "public_housing"]) {
    assert.ok(ids.includes(required), `missing critical need: ${required}`);
  }
});

test("strong official match is COVERED", () => {
  const need = taxonomy.find((x) => x.need_id === "water_leak");
  const result = matchNeed(need, [{
    procedure_id: "x-1",
    name: "道路上の漏水の連絡",
    aliases: ["水道管破裂"],
    status: "CONFIRMED_OFFICIAL",
    __source_type: "procedure",
    __source_file: "fixture.json"
  }]);
  assert.equal(result.status, "COVERED");
  assert.equal(result.hit.id, "x-1");
});
test("weak or unverified match remains PARTIAL", () => {
  const need = taxonomy.find((x) => x.need_id === "public_housing");
  const weak = matchNeed(need, [{
    guide_id: "x-2",
    display_name: "住宅の相談",
    status: "CONFIRMED_OFFICIAL",
    __source_type: "support_guide",
    __source_file: "fixture.json"
  }]);
  assert.equal(weak.status, "PARTIAL");

  const unverified = matchNeed(need, [{
    guide_id: "x-3",
    display_name: "市営住宅の入居募集",
    status: "UNVERIFIED",
    __source_type: "support_guide",
    __source_file: "fixture.json"
  }]);
  assert.equal(unverified.status, "PARTIAL");
});

test("absence is MISSING_IN_APP, not a claim that the public service does not exist", () => {
  const need = taxonomy.find((x) => x.need_id === "pension_exemption");
  const result = matchNeed(need, []);
  assert.equal(result.status, "MISSING_IN_APP");
  assert.equal(result.hit, null);
});
