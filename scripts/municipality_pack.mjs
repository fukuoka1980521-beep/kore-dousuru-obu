
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const TERMINAL = new Set(["PASS_RULES_MODELED","PASS_NONE_FOUND","NEEDS_AUTHORITY_CONFIRMATION","SOURCE_CONFLICT"]);

function readJson(file){ return JSON.parse(fs.readFileSync(file,"utf8")); }
function writeJson(file,value){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n"); }
function writeText(file,value){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,value.endsWith("\n")?value:value+"\n"); }

export function buildScaffold(opts){
  const id=opts.id, name=opts.name, officialBaseUrl=opts.officialBaseUrl, phone=opts.phone||"", taxonomy=opts.taxonomy;
  if(!/^[a-z0-9-]+$/.test(id)) throw new Error("invalid municipality id");
  const domain=new URL(officialBaseUrl).hostname;
  const manifest={
    generator_version:"v1",
    municipality_id:id,
    display_name:name,
    state:"DRAFT_RESEARCH",
    official_base_url:officialBaseUrl,
    official_domain:domain,
    representative_phone:phone,
    taxonomy_need_count:taxonomy.length,
    publish_policy:"terminal gate required; only PASS_RULES_MODELED becomes a public procedure"
  };
  const seeds=taxonomy.map(function(need){
    return {
      need_id:need.need_id, municipality_id:id,
      research_state:"OFFICIAL_RESEARCH_REQUIRED",
      local_gate:"OFFICIAL_RESEARCH_REQUIRED",
      checked_at:null, required_context:need.required_context||[],
      official_sources:[], authority_question:"", authority_contact:"",
      why_needed:"", notes:""
    };
  });
  const procedures=taxonomy.map(function(need){
    return {
      need_id:need.need_id,
      procedure_id:id+"-draft-"+need.need_id,
      municipality_id:id,
      name:need.label,
      aliases:(need.strong_terms||[]).slice(),
      conclusion:"", deadline:"", how_to:"",
      required_documents:[], fee:"", window_office:"",
      district_dependent:false, department_name:"", phone:"",
      business_hours:"", online_available:false, related_procedures:[],
      official_url:"", official_page_title:"", source_checked_at:null,
      status:"RESEARCH_PENDING", notes:""
    };
  });
  const lines=[
    "# "+name+" 公式調査計画","",
    "自治体ID: "+id,
    "公式ドメイン: "+domain,"",
    "> 29の住民ニーズごとに公式根拠・自治体固有条件・例外を確認する。未確認の推測実装は禁止。","",
    "| # | need_id | 住民ニーズ | 必要Context | 公式検索の起点 |",
    "|---:|---|---|---|---|"
  ];
  taxonomy.forEach(function(need,i){
    const q="site:"+domain+" "+name+" "+need.label;
    lines.push("| "+(i+1)+" | "+need.need_id+" | "+need.label+" | "+((need.required_context||[]).join(" / ")||"なし")+" | "+q+" |");
  });
  return {manifest:manifest,seeds:seeds,procedures:procedures,researchPlan:lines.join("\n")+"\n"};
}

export function auditObjects(data){
  const manifest=data.manifest, seeds=data.seeds, procedures=data.procedures, taxonomy=data.taxonomy;
  const errors=[], expected=new Set(taxonomy.map(function(x){return x.need_id;}));
  const seedIds=seeds.map(function(x){return x.need_id;});
  const duplicate=seedIds.filter(function(id,i){return seedIds.indexOf(id)!==i;});
  if(duplicate.length) errors.push("duplicate seeds: "+Array.from(new Set(duplicate)).join(", "));
  const missing=Array.from(expected).filter(function(id){return !seedIds.includes(id);});
  const extra=seedIds.filter(function(id){return !expected.has(id);});
  if(missing.length) errors.push("missing seeds: "+missing.join(", "));
  if(extra.length) errors.push("unknown seeds: "+extra.join(", "));
  const procByNeed=new Map(procedures.map(function(p){return [p.need_id,p];}));
  const counts={}, research_required=[], inquiry_candidates=[], source_conflicts=[], implementation_ready=[];
  seeds.forEach(function(seed){
    counts[seed.local_gate]=(counts[seed.local_gate]||0)+1;
    if(seed.local_gate==="OFFICIAL_RESEARCH_REQUIRED") research_required.push(seed.need_id);
    if(seed.local_gate==="NEEDS_AUTHORITY_CONFIRMATION"){
      inquiry_candidates.push(seed.need_id);
      ["authority_question","authority_contact","why_needed"].forEach(function(key){
        if(!String(seed[key]||"").trim()) errors.push(seed.need_id+": "+key+" required");
      });
    }
    if(seed.local_gate==="SOURCE_CONFLICT") source_conflicts.push(seed.need_id);
    if(seed.local_gate==="PASS_RULES_MODELED"){
      implementation_ready.push(seed.need_id);
      const p=procByNeed.get(seed.need_id);
      if(!p) errors.push(seed.need_id+": procedure draft required");
      else{
        if(p.status!=="CONFIRMED_OFFICIAL") errors.push(seed.need_id+": procedure must be CONFIRMED_OFFICIAL");
        if(!String(p.official_url||"").startsWith("https://")) errors.push(seed.need_id+": official_url required");
        if(!p.source_checked_at) errors.push(seed.need_id+": source_checked_at required");
      }
      if(!(seed.official_sources||[]).length) errors.push(seed.need_id+": official_sources required");
      if(!seed.checked_at) errors.push(seed.need_id+": checked_at required");
    }
    if(seed.local_gate!=="OFFICIAL_RESEARCH_REQUIRED" && !TERMINAL.has(seed.local_gate)){
      errors.push(seed.need_id+": unsupported local_gate "+seed.local_gate);
    }
  });
  return {
    municipality_id:manifest.municipality_id,
    display_name:manifest.display_name,
    taxonomy_need_count:taxonomy.length,
    seed_count:seeds.length,
    counts:counts,
    research_required:research_required,
    inquiry_candidates:inquiry_candidates,
    source_conflicts:source_conflicts,
    implementation_ready:implementation_ready,
    errors:errors,
    ready_to_promote:errors.length===0 && research_required.length===0
  };
}

export function buildPromotionArtifacts(data){
  const manifest=data.manifest, seeds=data.seeds, procedures=data.procedures, audit=data.audit;
  if(!audit.ready_to_promote) throw new Error("draft is not ready to promote");
  const allowed=new Set(seeds.filter(function(s){return s.local_gate==="PASS_RULES_MODELED";}).map(function(s){return s.need_id;}));
  const publicProcedures=procedures.filter(function(p){return allowed.has(p.need_id);}).map(function(p){
    const copy=Object.assign({},p); delete copy.need_id; return copy;
  });
  const id=manifest.municipality_id, name=manifest.display_name;
  const config={
    municipality_id:id, display_name:name, display_name_full:name+"版", app_title:"これどうする？",
    search_placeholder:"例：家賃払えない・子どもが熱・住民票ほしい",
    home_intro_title:"公開実証中｜"+name+"で困ったら、そのままの言葉で検索できます",
    home_intro_text:"行政の手続名が分からなくても、困りごとから次の公的な行動を確認できます。",
    features:{waste_enabled:false},
    priority_nav:[
      {key:"hikkoshi",label:"引っ越した",icon:"🏠",view:"procedures",query:"引っ越し"},
      {key:"juminhyo",label:"住民票がほしい",icon:"📄",view:"procedures",query:"住民票"},
      {key:"kosodate",label:"子どものこと",icon:"👶",view:"procedures",query:"子ども"},
      {key:"soudan",label:"相談したい",icon:"💬",view:"procedures",query:"相談"}
    ],
    quick_queries:["家賃払えない","子どもが熱","高額療養費","住民票"],
    contact:{name:name+"役場・役所（代表）",phone:manifest.representative_phone||"",hours:"最新の開庁時間は公式サイトで確認",url:manifest.official_base_url},
    data:{
      waste_items:"../municipalities/"+id+"/data/waste_items.json",
      procedures:"../municipalities/"+id+"/data/procedures.json",
      life_events:"../municipalities/"+id+"/data/life_events.json"
    },
    disclaimer:"本サイトは"+name+"の公式サイトではありません。最終的な判断は必ず"+name+"公式情報・窓口でご確認ください。",
    not_official_notice:name+"の市章・町章・公式キャラクターは使用していません。"
  };
  const page='<!doctype html>\n<html lang="ja"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n<title>これどうする？ '+name+'版｜非公式・実証版</title><link rel="stylesheet" href="../src/app/style.css" /></head><body><div id="app">読み込み中…</div>\n<script src="../municipalities/shared/core.js"></script><script>window.KORE_DOUSURU_CONFIG_PATH="../municipalities/'+id+'/config.json";</script><script src="../src/app/app.js"></script></body></html>\n';
  return {config:config,publicProcedures:publicProcedures,page:page,publishedSeeds:seeds};
}

function parseArgs(argv){
  const out={command:argv[0]||"audit"};
  argv.slice(1).forEach(function(arg){
    if(!arg.startsWith("--")) return;
    const parts=arg.slice(2).split("="), key=parts.shift().replace(/-/g,"_");
    out[key]=parts.join("=");
  });
  return out;
}
function draftDir(root,id){ return path.join(root,"tools","municipality-packs","drafts",id); }
function loadDraft(root,id){
  const dir=draftDir(root,id);
  return {
    manifest:readJson(path.join(dir,"manifest.json")),
    seeds:readJson(path.join(dir,"source-seeds.draft.json")),
    procedures:readJson(path.join(dir,"procedures.draft.json")),
    taxonomy:readJson(path.join(root,"tools","coverage","need-taxonomy.json"))
  };
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=parseArgs(process.argv.slice(2)), root=args.root?path.resolve(args.root):repoRoot;
  if(args.command==="scaffold"){
    ["id","name","official_base"].forEach(function(key){ if(!args[key]) throw new Error("scaffold requires --"+key.replace("_","-")); });
    const taxonomy=readJson(path.join(root,"tools","coverage","need-taxonomy.json"));
    const built=buildScaffold({id:args.id,name:args.name,officialBaseUrl:args.official_base,phone:args.phone||"",taxonomy:taxonomy});
    const dir=draftDir(root,args.id);
    if(fs.existsSync(dir) && args.force!=="true") throw new Error("draft already exists: "+dir);
    writeJson(path.join(dir,"manifest.json"),built.manifest);
    writeJson(path.join(dir,"source-seeds.draft.json"),built.seeds);
    writeJson(path.join(dir,"procedures.draft.json"),built.procedures);
    writeText(path.join(dir,"research-plan.md"),built.researchPlan);
    console.log(JSON.stringify({created:dir,needs:taxonomy.length},null,2));
  }else if(args.command==="audit"){
    if(!args.id) throw new Error("audit requires --id");
    const data=loadDraft(root,args.id), audit=auditObjects(data), dir=draftDir(root,args.id);
    writeJson(path.join(dir,"audit.json"),audit);
    console.log(JSON.stringify(audit,null,2));
    if(audit.errors.length) process.exitCode=2;
  }else if(args.command==="promote"){
    if(!args.id) throw new Error("promote requires --id");
    const data=loadDraft(root,args.id), audit=auditObjects(data), out=buildPromotionArtifacts(Object.assign({},data,{audit:audit}));
    const id=data.manifest.municipality_id;
    writeJson(path.join(root,"municipalities",id,"config.json"),out.config);
    writeJson(path.join(root,"municipalities",id,"data","procedures.json"),out.publicProcedures);
    writeJson(path.join(root,"municipalities",id,"data","life_events.json"),[]);
    writeJson(path.join(root,"municipalities",id,"data","waste_items.json"),[]);
    writeJson(path.join(root,"tools","coverage",id+"-source-seeds.json"),out.publishedSeeds);
    writeText(path.join(root,id,"index.html"),out.page);
    console.log(JSON.stringify({promoted:id,public_procedures:out.publicProcedures.length,inquiries:audit.inquiry_candidates.length,conflicts:audit.source_conflicts.length},null,2));
  }else throw new Error("unknown command: "+args.command);
}
