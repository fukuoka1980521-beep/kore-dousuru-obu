import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchNeed } from "../scripts/build_coverage_matrix.mjs";
import { auditObjects } from "../scripts/municipality_pack.mjs";
import { pendingAuthoritySeeds } from "../scripts/authority_inquiry.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,"..");
const taxonomy=JSON.parse(fs.readFileSync(path.join(root,"tools","coverage","need-taxonomy.json"),"utf8"));
const seeds=JSON.parse(fs.readFileSync(path.join(root,"tools","municipality-packs","drafts","higashiura","source-seeds.draft.json"),"utf8"));
const drafts=JSON.parse(fs.readFileSync(path.join(root,"tools","municipality-packs","drafts","higashiura","procedures.draft.json"),"utf8"));
const manifest=JSON.parse(fs.readFileSync(path.join(root,"tools","municipality-packs","drafts","higashiura","manifest.json"),"utf8"));
const publicRecords=JSON.parse(fs.readFileSync(path.join(root,"municipalities","higashiura","data","procedures.json"),"utf8"));

test("Higashiura draft audit is terminal with two developer inquiries",()=>{
 const a=auditObjects({manifest,seeds,procedures:drafts,taxonomy});
 assert.equal(a.ready_to_promote,true);
 assert.equal(a.implementation_ready.length,27);
 assert.deepEqual(a.inquiry_candidates.sort(),["noise_odor_neighbor","water_outage"]);
 assert.deepEqual(a.errors,[]);
});

test("Higashiura public pack contains only verified routes",()=>{
 assert.equal(publicRecords.length,27);
 assert.ok(publicRecords.every(x=>x.status==="CONFIRMED_OFFICIAL"));
 assert.ok(publicRecords.every(x=>/^https:\/\/www\.town\.aichi-higashiura\.lg\.jp\//.test(x.official_url)));
});

test("Higashiura coverage stays fail-closed on unresolved routes",()=>{
 const results=taxonomy.map(need=>[need.need_id,matchNeed(need,publicRecords)]);
 const missing=results.filter(([,r])=>r.status!=="COVERED").map(([id])=>id).sort();
 assert.deepEqual(missing,["noise_odor_neighbor","water_outage"]);
});

test("draft authority items enter developer inquiry queue",()=>{
 const pending=pendingAuthoritySeeds(root).filter(x=>x.municipality_id==="higashiura").map(x=>x.need_id).sort();
 assert.deepEqual(pending,["noise_odor_neighbor","water_outage"]);
});

test("Higashiura requires no municipality hard-code in shared app or coverage engine",()=>{
 const app=fs.readFileSync(path.join(root,"src","app","app.js"),"utf8");
 const engine=fs.readFileSync(path.join(root,"scripts","build_coverage_matrix.mjs"),"utf8");
 assert.doesNotMatch(app,/higashiura/i);
 assert.doesNotMatch(engine,/higashiura/i);
});
