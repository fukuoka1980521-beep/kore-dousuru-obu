import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pendingAuthoritySeeds, inquiryPacket } from "../scripts/authority_inquiry.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");

test("authority inquiry queue is derived only from NEEDS_AUTHORITY_CONFIRMATION seeds", () => {
  const pending = pendingAuthoritySeeds(root);
  assert.ok(pending.length >= 7);
  assert.ok(pending.every((seed) => seed.local_gate === "NEEDS_AUTHORITY_CONFIRMATION"));
  assert.ok(pending.some((seed) => seed.municipality_id === "chita" && seed.need_id === "water_outage"));
});

test("developer packet includes executable contact text and evidence checklist", () => {
  const seed = pendingAuthoritySeeds(root).find((x) => x.municipality_id === "chita" && x.need_id === "water_outage");
  const packet = inquiryPacket(seed);
  assert.equal(packet.developer_only, true);
  assert.equal(packet.state, "PENDING");
  assert.match(packet.phone_script, /公式情報/);
  assert.match(packet.message_body, /正式な相談・受付窓口/);
  assert.ok(packet.evidence_to_record.includes("evidence_location"));
  assert.ok(packet.safety.some((x) => /公開実装しない/.test(x)));
});

test("developer inquiry workflow is manual-only", () => {
  const yml = fs.readFileSync(path.join(root, ".github", "workflows", "authority-inquiry.yml"), "utf8");
  assert.match(yml, /workflow_dispatch:/);
  assert.doesNotMatch(yml, /^\s*push:/m);
  assert.doesNotMatch(yml, /^\s*pull_request:/m);
  assert.match(yml, /permissions:\s*\n\s*contents: read/);
});

test("public UI never exposes authority inquiry mechanism", () => {
  const publicFiles = [
    "src/app/app.js", "src/app/index.html", "index.html", "tokai/index.html", "chita/index.html"
  ];
  for (const rel of publicFiles) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(text, /authority[_-]inquiry|行政問い合わせ票|developer inquiry/i);
  }
});

test("recording an answer cannot silently unlock the public gate", () => {
  const src = fs.readFileSync(path.join(root, "scripts", "authority_inquiry.mjs"), "utf8");
  assert.match(src, /gate_after_recording: "REVIEW_REQUIRED"/);
  assert.match(src, /LOCAL_ADMIN_SPECIAL_RULE_CHECK/);
});
