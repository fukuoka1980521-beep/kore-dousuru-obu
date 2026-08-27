// Internal research/tooling vocabulary that must never leak into public
// data or public-facing markup. Shared by tests/public_data_hygiene.test.js
// and scripts/check_public_sync.js so the list has a single source of truth.
export const INTERNAL_MARKERS = [
  'WebFetch',
  'WebSearch',
  '本Run',
  'scratchpad',
  'fork-boilerplate',
  'Agent(',
  'Claude Code',
  'claude-in-chrome',
  'C:\\Users\\',
];

// Files that are actually copied into the public deploy repo / served on
// GitHub Pages. Keep this list in sync with what step 13 of the public-data
// hygiene workflow actually copies — deliberately narrow so internal dev
// docs (docs/, scripts/, artifacts/) are never treated as "public".
export const PUBLIC_SURFACE_FILES = [
  'index.html',
  'COPYRIGHT_NOTICE.md',
  'municipalities/obu/config.json',
  'municipalities/obu/data/waste_items.json',
  'municipalities/obu/data/procedures.json',
  'municipalities/obu/data/life_events.json',
  'municipalities/shared/core.js',
  'src/app/index.html',
  'src/app/app.js',
  'src/app/style.css',
];
