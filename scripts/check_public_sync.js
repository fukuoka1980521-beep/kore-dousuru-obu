// Pre-deploy-sync guard.
//
// Run before copying files from this dev repo into the public deploy repo:
//   node scripts/check_public_sync.js [path-to-deploy-repo]
//
// It does two things, both read-only:
//   1. Scans this repo's public-surface files for internal tool/process
//      markers (WebFetch, 本Run, scratchpad, ...) and FAILs if any are found.
//   2. If a deploy repo path is given (default: ../kore-dousuru-obu-deploy),
//      diffs each public-surface file against the deploy copy and reports
//      which files differ, so a human can review before overwriting a
//      deploy file that may have already been hand-cleaned.
//
// It never edits or deletes anything. A detected marker is a FAIL to be
// fixed by a human/dev run, not something this script rewrites — a blind
// string replace could corrupt a legitimate official quote.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { INTERNAL_MARKERS, PUBLIC_SURFACE_FILES } from './internal_markers.js';

const DEV_ROOT = fileURLToPath(new URL('../', import.meta.url));
const deployArg = process.argv[2];
const DEPLOY_ROOT = path.resolve(deployArg || path.join(DEV_ROOT, '..', 'kore-dousuru-obu-deploy'));

async function readOrNull(root, relPath) {
  try {
    return await readFile(path.join(root, relPath), 'utf-8');
  } catch {
    return null;
  }
}

let failed = false;

console.log(`[check_public_sync] scanning ${PUBLIC_SURFACE_FILES.length} public-surface files in ${DEV_ROOT}`);
for (const relPath of PUBLIC_SURFACE_FILES) {
  const text = await readOrNull(DEV_ROOT, relPath);
  if (text === null) {
    console.error(`  FAIL  ${relPath}: file not found in dev repo`);
    failed = true;
    continue;
  }
  const hits = INTERNAL_MARKERS.filter((m) => text.includes(m));
  if (hits.length > 0) {
    console.error(`  FAIL  ${relPath}: internal marker(s) found: ${hits.join(', ')}`);
    failed = true;
  } else {
    console.log(`  ok    ${relPath}`);
  }
}

console.log(`\n[check_public_sync] diffing against deploy repo: ${DEPLOY_ROOT}`);
for (const relPath of PUBLIC_SURFACE_FILES) {
  const devText = await readOrNull(DEV_ROOT, relPath);
  const deployText = await readOrNull(DEPLOY_ROOT, relPath);
  if (deployText === null) {
    console.log(`  NEW   ${relPath}: not present in deploy repo yet`);
  } else if (devText !== deployText) {
    console.log(`  DIFF  ${relPath}: dev and deploy differ — review before syncing`);
  } else {
    console.log(`  same  ${relPath}`);
  }
}

if (failed) {
  console.error('\n[check_public_sync] FAIL — fix internal markers in the dev repo before syncing to deploy.');
  process.exit(1);
}
console.log('\n[check_public_sync] PASS — no internal markers found in public-surface files.');
