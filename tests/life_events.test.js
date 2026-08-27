/**
 * 生活イベント（LIFE_EVENT_NAVIGATION）: 「制度名を知らない人でも生活の
 * 出来事から確認すべき手続候補へ到達できる」導線のデータ・ロジック検証。
 * UI層(app.js)からはmunicipalities/shared/core.jsの同等実装を使うため、
 * data_integrity.test.js / obu_app.test.js と同じ window スタブ手法で
 * core.js 側も検証する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchLifeEvents, fuzzySuggestLifeEvents, resolveLifeEventDeepLink } from "../src/lib/life_events.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const lifeEvents = JSON.parse(
  readFileSync(path.join(ROOT, "municipalities", "obu", "data", "life_events.json"), "utf-8")
);
const procedures = JSON.parse(
  readFileSync(path.join(ROOT, "municipalities", "obu", "data", "procedures.json"), "utf-8")
);

// municipalities/shared/core.js is written for a plain <script> load; stub a
// window and pull out window.KoreDousuruCore, same technique as
// obu_app.test.js / zero_result.test.js.
const globalWindow = {};
const coreSrc = readFileSync(path.join(ROOT, "municipalities", "shared", "core.js"), "utf-8");
const coreFn = new Function("window", coreSrc + "\nreturn window.KoreDousuruCore;");
const core = coreFn(globalWindow);

const appSrc = readFileSync(path.join(ROOT, "src", "app", "app.js"), "utf-8");

test("5 life events defined, each with a unique event_id", () => {
  assert.equal(lifeEvents.length, 5);
  const ids = new Set(lifeEvents.map((e) => e.event_id));
  assert.equal(ids.size, lifeEvents.length);
});

test("event exact match (src/lib)", () => {
  const r = searchLifeEvents(lifeEvents, "大府市へ引っ越してきたとき");
  assert.equal(r[0]?.event_id, "move-in");
});

test("event exact match (core.js)", () => {
  const r = core.searchLifeEvents("子どもが生まれたとき", lifeEvents);
  assert.equal(r[0]?.event_id, "birth");
});

test("event alias match", () => {
  assert.equal(searchLifeEvents(lifeEvents, "引っ越してきた")[0]?.event_id, "move-in");
  assert.equal(searchLifeEvents(lifeEvents, "赤ちゃんが生まれた")[0]?.event_id, "birth");
  assert.equal(searchLifeEvents(lifeEvents, "家族が亡くなった")[0]?.event_id, "death");
  assert.equal(core.searchLifeEvents("市内で引っ越し", lifeEvents)[0]?.event_id, "move-within-city");
  assert.equal(core.searchLifeEvents("転出する", lifeEvents)[0]?.event_id, "move-out");
});

test("event fuzzy is candidate only — never mixed into strong matches, never auto-selected", () => {
  // Strong search must not return anything for a typo/garbled query...
  const strong = searchLifeEvents(lifeEvents, "こどもがうまた"); // typo of 子どもが生まれた
  assert.equal(strong.length, 0);
  // ...but the dedicated fuzzy-candidate function still surfaces it as a suggestion.
  const fuzzy = fuzzySuggestLifeEvents(lifeEvents, "こどもがうまた", 5);
  assert.ok(fuzzy.some((e) => e.event_id === "birth"));
  // core.js side: same contract.
  const coreFuzzy = core.suggestSimilarLifeEvents("こどもがうまた", lifeEvents, 5);
  assert.ok(coreFuzzy.some((e) => e.event_id === "birth"));
});

test("event fuzzy suggestions do not fire on unrelated queries", () => {
  const fuzzy = fuzzySuggestLifeEvents(lifeEvents, "ぜんぜん関係ない単語xyz", 5);
  assert.deepEqual(fuzzy, []);
});

test("event deep link resolves a valid event_id", () => {
  const r = resolveLifeEventDeepLink(lifeEvents, "move-in");
  assert.equal(r.ok, true);
  assert.equal(r.item.event_id, "move-in");
  const coreR = core.resolveLifeEventDeepLink(lifeEvents, "birth");
  assert.equal(coreR.ok, true);
});

test("invalid event id fails safe instead of guessing", () => {
  const r = resolveLifeEventDeepLink(lifeEvents, "no-such-event-xyz");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "UNKNOWN_ID");
  const coreR = core.resolveLifeEventDeepLink(lifeEvents, "no-such-event-xyz");
  assert.equal(coreR.ok, false);
});

test("missing event id fails safe", () => {
  const r = resolveLifeEventDeepLink(lifeEvents, "");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "MISSING_ID");
});

test("every related procedure_id exists in procedures.json and is CONFIRMED_OFFICIAL or PARTIAL", () => {
  // PARTIAL is allowed here (unlike the Nagoya baseline): several Obu
  // procedures are correctly flagged PARTIAL because a sub-detail (e.g. online
  // application availability) could not be confirmed on the official page,
  // while the core conclusion/deadline/office/phone are still confirmed.
  const procIds = new Map(procedures.map((p) => [p.procedure_id, p]));
  const badStatus = [];
  for (const e of lifeEvents) {
    for (const rel of e.related_procedures) {
      const p = procIds.get(rel.procedure_id);
      assert.ok(p, `${e.event_id} references unknown procedure_id ${rel.procedure_id}`);
      if (p.status === "UNCONFIRMED") badStatus.push(`${e.event_id}->${rel.procedure_id}`);
    }
  }
  assert.deepEqual(badStatus, [], `relations to UNCONFIRMED procedures: ${badStatus.join(", ")}`);
});

test("every related_procedures entry carries a condition_label", () => {
  for (const e of lifeEvents) {
    for (const rel of e.related_procedures) {
      assert.ok(rel.condition_label && rel.condition_label.length > 0, `${e.event_id}->${rel.procedure_id} missing condition_label`);
    }
  }
});

// Single Source of Truth (spec section 10): life_events.json must reference
// procedures by ID only — deadline/phone/fee/required_documents must be read
// live from procedures.json at render time, never copied into the event data.
test("life_events.json does not duplicate procedure facts (deadline/phone/fee/required_documents)", () => {
  const forbiddenKeys = ["deadline", "phone", "fee", "required_documents", "how_to", "window_office"];
  for (const e of lifeEvents) {
    for (const key of Object.keys(e)) {
      assert.ok(!forbiddenKeys.includes(key), `${e.event_id} duplicates procedure field "${key}"`);
    }
    for (const rel of e.related_procedures) {
      for (const key of Object.keys(rel)) {
        assert.ok(!forbiddenKeys.includes(key), `${e.event_id}->${rel.procedure_id} duplicates procedure field "${key}"`);
      }
    }
  }
});

test("app.js reads deadline live from state.procedures for the life-event checklist, not from life_events.json", () => {
  assert.match(appSrc, /renderLifeEventCard/);
  assert.match(appSrc, /p\.deadline/);
});

test("move-in references transfer-in, insurance, My Number, and childcare allowance procedures", () => {
  const e = lifeEvents.find((x) => x.event_id === "move-in");
  const ids = e.related_procedures.map((r) => r.procedure_id);
  assert.ok(ids.includes("obu-proc-01"), "transfer-in (obu-proc-01)");
  assert.ok(ids.includes("obu-proc-09"), "national health insurance enrollment (obu-proc-09)");
  assert.ok(ids.includes("obu-proc-11"), "My Number address change (obu-proc-11)");
  assert.ok(ids.includes("obu-proc-08"), "childcare allowance (obu-proc-08)");
  assert.equal(e.show_waste_link, true);
});

test("birth references 出生届, 児童手当, and 国民健康保険加入", () => {
  const e = lifeEvents.find((x) => x.event_id === "birth");
  const ids = e.related_procedures.map((r) => r.procedure_id);
  assert.ok(ids.includes("obu-proc-07"), "出生届 (obu-proc-07)");
  assert.ok(ids.includes("obu-proc-08"), "児童手当 (obu-proc-08)");
  assert.ok(ids.includes("obu-proc-09"), "国民健康保険加入 (obu-proc-09)");
});

test("death references the bereavement procedure and insurance withdrawal", () => {
  const e = lifeEvents.find((x) => x.event_id === "death");
  const ids = e.related_procedures.map((r) => r.procedure_id);
  assert.ok(ids.includes("obu-proc-12"), "おくやみ窓口・死亡届 (obu-proc-12)");
  assert.ok(ids.includes("obu-proc-10"), "国民健康保険脱退 (obu-proc-10)");
});

test("no event asserts a procedure is unconditionally mandatory for everyone", () => {
  // Prohibited absolute phrasing (spec section 15): "全て必要です" / "しなければなりません".
  const forbidden = [/全て必要/, /しなければなりません/, /必ず.*てください/];
  for (const e of lifeEvents) {
    for (const text of [e.summary, ...e.related_procedures.map((r) => r.condition_label)]) {
      for (const re of forbidden) {
        assert.doesNotMatch(text, re, `${e.event_id}: "${text}" uses prohibited absolute phrasing`);
      }
    }
  }
});
