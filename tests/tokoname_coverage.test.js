import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchNeed } from "../scripts/build_coverage_matrix.mjs";
import { pendingAuthoritySeeds } from "../scripts/authority_inquiry.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,"..");
const records=JSON.parse(fs.readFileSync(path.join(root,"municipalities","tokoname","data","procedures.json"),"utf8"));
const seeds=JSON.parse(fs.readFileSync(path.join(root,"tools","coverage","tokoname-source-seeds.json"),"utf8"));
const taxonomy=JSON.parse(fs.readFileSync(path.join(root,"tools","coverage","need-taxonomy.json"),"utf8"));

test("Tokoname has 29 verified routes and 29 PASS_RULES_MODELED gates",()=>{
  assert.equal(records.length,29);
  assert.equal(seeds.length,29);
  assert.equal(new Set(records.map(x=>x.procedure_id)).size,29);
  assert.equal(seeds.filter(x=>x.local_gate==="PASS_RULES_MODELED").length,29);
  assert.equal(seeds.filter(x=>x.local_gate==="NEEDS_AUTHORITY_CONFIRMATION").length,0);
});

test("Tokoname covers all common needs without taxonomy changes",()=>{
  const results=taxonomy.map(need=>[need.need_id,matchNeed(need,records)]);
  const missing=results.filter(([,result])=>result.status!=="COVERED").map(([id])=>id);
  assert.deepEqual(missing,[]);
});

test("Tokoname official sources stay municipality-bound",()=>{
  for(const record of records){
    assert.equal(record.status,"CONFIRMED_OFFICIAL");
    assert.match(record.official_url,/^https:\/\/www\.city\.tokoname\.aichi\.jp\//);
    assert.equal(record.source_checked_at,"2026-10-01");
  }
});

test("Tokoname adds no authority inquiry because current official guidance resolves all 29 needs",()=>{
  const pending=pendingAuthoritySeeds(root).filter(x=>x.municipality_id==="tokoname");
  assert.deepEqual(pending,[]);
  const outage=records.find(x=>x.procedure_id==="tokoname-proc-water-outage");
  assert.match(outage.how_to,/近所も断水/);
  assert.match(outage.how_to,/管理人/);
});

test("Tokoname addition requires no common app or coverage-engine edit",()=>{
  const app=fs.readFileSync(path.join(root,"src","app","app.js"),"utf8");
  const engine=fs.readFileSync(path.join(root,"scripts","build_coverage_matrix.mjs"),"utf8");
  assert.doesNotMatch(app,/tokoname/i);
  assert.doesNotMatch(engine,/tokoname/i);
});
