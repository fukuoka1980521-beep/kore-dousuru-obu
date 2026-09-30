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
  for (const required of ["roads_damage", "water_leak", "water_outage", "pension_exemption", "high_cost_medical", "public_housing"]) {
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


test("official source seeds are municipality-bound and only use official sources", () => {
  const seeds = JSON.parse(
    fs.readFileSync(path.resolve(testDir, "..", "tools", "coverage", "official-source-seeds.json"), "utf8")
  );
  assert.ok(seeds.length >= 21);
  const validMunicipalities = new Set(["handa", "nagoya", "obu"]);
  for (const seed of seeds) {
    assert.ok(validMunicipalities.has(seed.municipality_id));
    assert.ok(["PASS_RULES_MODELED", "PASS_NONE_FOUND", "NEEDS_AUTHORITY_CONFIRMATION", "SOURCE_CONFLICT"].includes(seed.local_gate));
    assert.ok(seed.official_sources.length >= 1);
    for (const source of seed.official_sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(["www.city.handa.lg.jp", "www.city.nagoya.jp", "www.water.city.nagoya.jp", "www.city.obu.aichi.jp", "www.nenkin.go.jp", "jsite.mhlw.go.jp"].includes(url.hostname));
      if (seed.municipality_id === "handa") assert.equal(/city\.nagoya\.jp|city\.obu\.aichi\.jp/.test(url.hostname), false);
      if (seed.municipality_id === "nagoya") assert.equal(/city\.handa\.lg\.jp|city\.obu\.aichi\.jp/.test(url.hostname), false);
      if (seed.municipality_id === "obu") assert.equal(/city\.handa\.lg\.jp|city\.nagoya\.jp/.test(url.hostname), false);
    }
  }
});

test("high-cost medical coverage always requires insurer context", () => {
  const need = taxonomy.find((x) => x.need_id === "high_cost_medical");
  assert.ok(need.required_context.includes("加入している健康保険"));
});

test("noise/odor remains fail-closed where resident routing is not fully verified", () => {
  const seeds = JSON.parse(
    fs.readFileSync(path.resolve(testDir, "..", "tools", "coverage", "official-source-seeds.json"), "utf8")
  );
  const byMunicipality = Object.fromEntries(seeds.filter((x) => x.need_id === "noise_odor_neighbor").map((x) => [x.municipality_id, x.local_gate]));
  assert.equal(byMunicipality.handa, "NEEDS_AUTHORITY_CONFIRMATION");
  assert.equal(byMunicipality.obu, "NEEDS_AUTHORITY_CONFIRMATION");
  assert.equal(byMunicipality.nagoya, "PASS_RULES_MODELED");
});


test("leak and outage are separate needs so one route cannot falsely cover the other", () => {
  const leak = taxonomy.find((x) => x.need_id === "water_leak");
  const outage = taxonomy.find((x) => x.need_id === "water_outage");
  assert.ok(leak && outage);
  assert.equal(leak.strong_terms.includes("断水"), false);
  assert.ok(outage.strong_terms.includes("断水"));
});


test("coverage CLI supports --key=value so the intended source worktree is not silently ignored", () => {
  const script = fs.readFileSync(path.resolve(testDir, "..", "scripts", "build_coverage_matrix.mjs"), "utf8");
  assert.match(script, /startsWith\("--nagoya-root="\)/);
  assert.match(script, /startsWith\("--out="\)/);
});


test("every authority-confirmation seed carries an executable question and contact", () => {
  const seeds = JSON.parse(
    fs.readFileSync(path.resolve(testDir, "..", "tools", "coverage", "official-source-seeds.json"), "utf8")
  );
  const pending = seeds.filter((x) => x.local_gate === "NEEDS_AUTHORITY_CONFIRMATION");
  assert.equal(pending.length, 3);
  for (const seed of pending) {
    assert.ok(seed.authority_question?.length > 20);
    assert.ok(seed.authority_contact?.length > 5);
    assert.ok(seed.why_needed?.length > 10);
  }
});


test("Nagoya coverage includes the natural-language support overlay", () => {
  const script = fs.readFileSync(path.resolve(testDir, "..", "scripts", "build_coverage_matrix.mjs"), "utf8");
  assert.match(script, /path\.join\(root, "src", "app", "support-overlay\.js"\)/);
  assert.match(script, /__KORE_DOUSURU_SUPPORT_OVERLAY__/);
});

test("generic neighbor dispute alone cannot falsely mark noise/odor as COVERED", () => {
  const need = taxonomy.find((x) => x.need_id === "noise_odor_neighbor");
  const result = matchNeed(need, [{
    procedure_id: "legal-only",
    name: "無料法律相談",
    aliases: ["近隣トラブル"],
    status: "CONFIRMED_OFFICIAL",
    __source_type: "support_overlay",
    __source_file: "fixture.js"
  }]);
  assert.equal(result.status, "PARTIAL");
});
