
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildScaffold,auditObjects,buildPromotionArtifacts } from "../scripts/municipality_pack.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,"..");
const taxonomy=JSON.parse(fs.readFileSync(path.join(root,"tools","coverage","need-taxonomy.json"),"utf8"));

test("scaffold creates one draft row per common need",function(){
  const s=buildScaffold({id:"example-town",name:"例町",officialBaseUrl:"https://www.example.go.jp/",phone:"000",taxonomy:taxonomy});
  assert.equal(s.seeds.length,taxonomy.length);
  assert.equal(s.procedures.length,taxonomy.length);
  assert.equal(new Set(s.seeds.map(function(x){return x.need_id;})).size,taxonomy.length);
  assert.ok(s.seeds.every(function(x){return x.local_gate==="OFFICIAL_RESEARCH_REQUIRED";}));
  assert.match(s.researchPlan,/site:www\.example\.go\.jp/);
});

test("fresh scaffold cannot be promoted",function(){
  const s=buildScaffold({id:"example-town",name:"例町",officialBaseUrl:"https://www.example.go.jp/",taxonomy:taxonomy});
  const a=auditObjects({manifest:s.manifest,seeds:s.seeds,procedures:s.procedures,taxonomy:taxonomy});
  assert.equal(a.ready_to_promote,false);
  assert.equal(a.research_required.length,taxonomy.length);
});

test("fully researched scaffold can be promoted",function(){
  const s=buildScaffold({id:"example-town",name:"例町",officialBaseUrl:"https://www.example.go.jp/",taxonomy:taxonomy});
  s.seeds.forEach(function(seed){
    seed.local_gate="PASS_RULES_MODELED"; seed.research_state="OFFICIAL_SOURCE_FOUND"; seed.checked_at="2026-10-01";
    seed.official_sources=[{url:"https://www.example.go.jp/x",title:"official",role:"LOCAL_PRIMARY"}];
  });
  s.procedures.forEach(function(p){p.status="CONFIRMED_OFFICIAL";p.source_checked_at="2026-10-01";p.official_url="https://www.example.go.jp/x";});
  const a=auditObjects({manifest:s.manifest,seeds:s.seeds,procedures:s.procedures,taxonomy:taxonomy});
  assert.equal(a.ready_to_promote,true);
  const out=buildPromotionArtifacts({manifest:s.manifest,seeds:s.seeds,procedures:s.procedures,taxonomy:taxonomy,audit:a});
  assert.equal(out.publicProcedures.length,taxonomy.length);
  assert.match(out.page,/municipalities\/example-town\/config\.json/);
  assert.doesNotMatch(out.page,/authority[_-]inquiry|行政問い合わせ票/i);
});

test("authority confirmation stays fail-closed",function(){
  const s=buildScaffold({id:"example-town",name:"例町",officialBaseUrl:"https://www.example.go.jp/",taxonomy:taxonomy});
  s.seeds.forEach(function(seed){
    seed.local_gate="PASS_RULES_MODELED"; seed.research_state="OFFICIAL_SOURCE_FOUND"; seed.checked_at="2026-10-01";
    seed.official_sources=[{url:"https://www.example.go.jp/x",title:"official",role:"LOCAL_PRIMARY"}];
  });
  s.procedures.forEach(function(p){p.status="CONFIRMED_OFFICIAL";p.source_checked_at="2026-10-01";p.official_url="https://www.example.go.jp/x";});
  const target=s.seeds[0];
  target.local_gate="NEEDS_AUTHORITY_CONFIRMATION";
  target.authority_question="正式な窓口はどこか";
  target.authority_contact="例町 担当課 000";
  target.why_needed="公式ページだけでは境界を確定できない";
  const a=auditObjects({manifest:s.manifest,seeds:s.seeds,procedures:s.procedures,taxonomy:taxonomy});
  assert.equal(a.ready_to_promote,true);
  const out=buildPromotionArtifacts({manifest:s.manifest,seeds:s.seeds,procedures:s.procedures,taxonomy:taxonomy,audit:a});
  assert.equal(out.publicProcedures.length,taxonomy.length-1);
});


test("municipality pack workflow remains developer-triggered only",function(){
  const yml=fs.readFileSync(path.join(root,".github","workflows","municipality-pack.yml"),"utf8");
  assert.match(yml,/workflow_dispatch:/);
  assert.doesNotMatch(yml,/^\s*push:/m);
  assert.doesNotMatch(yml,/^\s*pull_request:/m);
  assert.match(yml,/permissions:\s*\n\s*contents: read/);
});

test("shared public app does not expose municipality pack controls",function(){
  const app=fs.readFileSync(path.join(root,"src","app","app.js"),"utf8");
  assert.doesNotMatch(app,/municipality:scaffold|municipality_pack|Municipality Pack \(developer only\)/i);
});
