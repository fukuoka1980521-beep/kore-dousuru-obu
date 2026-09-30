import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,"..");
const config=JSON.parse(fs.readFileSync(path.join(root,"municipalities","tokoname","config.json"),"utf8"));
const procedures=JSON.parse(fs.readFileSync(path.join(root,"municipalities","tokoname","data","procedures.json"),"utf8"));
const page=fs.readFileSync(path.join(root,"tokoname","index.html"),"utf8");

test("Tokoname uses shared app with no municipality-specific UI code",()=>{
  assert.equal(config.municipality_id,"tokoname");
  assert.equal(config.features.waste_enabled,false);
  assert.match(page,/KORE_DOUSURU_CONFIG_PATH="\.\.\/municipalities\/tokoname\/config\.json"/);
  assert.match(page,/\.\.\/src\/app\/app\.js/);
  assert.doesNotMatch(page,/authority[_-]inquiry|行政問い合わせ票/i);
});

test("Tokoname pack exposes resident-language entry points",()=>{
  assert.equal(procedures.length,29);
  assert.deepEqual(config.quick_queries,["道路の穴","子どもが熱","水が出ない","粗大ごみ"]);
});

test("Tokoname includes verified road, outage, noise and bulky-waste routes",()=>{
  const aliases=new Map();
  for(const record of procedures) for(const alias of record.aliases||[]) aliases.set(alias,record.procedure_id);
  assert.equal(aliases.get("道路の穴"),"tokoname-proc-roads");
  assert.equal(aliases.get("水が出ない"),"tokoname-proc-water-outage");
  assert.equal(aliases.get("騒音"),"tokoname-proc-noise");
  assert.equal(aliases.get("粗大ごみ"),"tokoname-proc-oversized");
});
