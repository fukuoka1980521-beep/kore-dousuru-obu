import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INTERNAL_MARKERS, PUBLIC_SURFACE_FILES } from '../scripts/internal_markers.js';

const ROOT = new URL('../', import.meta.url);

async function loadText(relPath) {
  return readFile(new URL(relPath, ROOT), 'utf-8');
}

for (const relPath of PUBLIC_SURFACE_FILES) {
  test(`public surface file has no internal tool markers: ${relPath}`, async () => {
    let text;
    try {
      text = await loadText(relPath);
    } catch (e) {
      assert.fail(`could not read public surface file ${relPath}: ${e}`);
      return;
    }
    const hits = INTERNAL_MARKERS.filter((marker) => text.includes(marker));
    assert.deepEqual(hits, [], `${relPath} contains internal marker(s): ${hits.join(', ')}`);
  });
}

test('waste_items.json notes/effective_rule fields carry no internal markers', async () => {
  const items = JSON.parse(await loadText('municipalities/obu/data/waste_items.json'));
  const offenders = [];
  for (const it of items) {
    for (const field of ['notes', 'effective_rule', 'size_rule', 'conditions', 'danger_notes']) {
      const val = it[field];
      if (typeof val !== 'string') continue;
      if (INTERNAL_MARKERS.some((m) => val.includes(m))) offenders.push(`${it.item_id}.${field}`);
    }
  }
  assert.deepEqual(offenders, [], `internal markers leaked into public-safe fields: ${offenders.join(', ')}`);
});

test('procedures.json notes field carries no internal markers', async () => {
  const procedures = JSON.parse(await loadText('municipalities/obu/data/procedures.json'));
  const offenders = [];
  for (const p of procedures) {
    const val = p.notes;
    if (typeof val !== 'string') continue;
    if (INTERNAL_MARKERS.some((m) => val.includes(m))) offenders.push(p.procedure_id);
  }
  assert.deepEqual(offenders, [], `internal markers leaked into procedures notes: ${offenders.join(', ')}`);
});
