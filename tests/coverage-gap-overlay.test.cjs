const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const context = {
  window: {
    KoreDousuruCore: {
      loadMunicipality: async () => ({ config: {}, wasteItems: [], procedures: [], lifeEvents: [] }),
      searchProcedures: () => []
    }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("src/app/support-overlay.js", "utf8"), context);
vm.runInContext(fs.readFileSync("src/app/coverage-gap-overlay.js", "utf8"), context);

const overlay = context.window.__KORE_DOUSURU_COVERAGE_GAP_OVERLAY__;
assert(overlay, "coverage gap overlay missing");
assert.strictEqual(overlay.records.length, 13);

const expected = {
  "道路に穴": "obu-gap-roads-damage",
  "側溝が壊れた": "obu-gap-roads-damage",
  "水漏れ": "obu-gap-water-leak",
  "道路から水が出ている": "obu-gap-water-leak",
  "断水": "obu-gap-water-outage",
  "急に水が出ない": "obu-gap-water-outage",
  "年金払えない": "obu-gap-pension-exemption",
  "高額療養費": "obu-gap-high-cost-medical",
  "入院費が高い": "obu-gap-high-cost-medical",
  "市営住宅": "obu-gap-public-housing",
  "事件にあった": "obu-gap-crime-victim",
  "給料未払い": "obu-gap-labor",
  "ひきこもり": "obu-gap-hikikomori",
  "障害者相談": "obu-gap-disability-support",
  "子どもの発達": "obu-gap-development-support",
  "子どもが熱": "obu-gap-pediatric-emergency",
  "粗大ごみ収集": "obu-gap-oversized-waste"
};
for (const [query, id] of Object.entries(expected)) {
  const result = overlay.search(query);
  assert(result.length, "no result: " + query);
  assert.strictEqual(result[0].id, id, query + " -> " + (result[0] && result[0].id));
}

const highCost = overlay.records.find((x) => x.procedure_id === "obu-gap-high-cost-medical");
assert(highCost.conclusion.includes("どの健康保険に加入しているか"));
assert(highCost.how_to.includes("職場の保険"));
assert.strictEqual(overlay.records.some((x) => /騒音|悪臭/.test(x.name)), false);

console.log("coverage gap overlay: " + Object.keys(expected).length + "/" + Object.keys(expected).length + " PASS");
