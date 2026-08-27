// Shared search logic — used by both the browser app and Node tests.
// No DOM, no municipality-specific code here.
//
// Match priority (spec: 曖昧語・表記揺れ・軽微な誤字から候補を出す検索):
//   ① exact display_name match      (strict normalize)
//   ② exact alias match             (strict normalize)
//   ③ exact match after loose normalize (long vowel mark / middle dot / punctuation stripped)
//   ④ partial (substring) match
//   ⑤ fuzzy / typo candidates       (levenshtein distance) — NEVER mixed into
//     the strong-match results returned by searchItems(); callers must present
//     these separately (as "もしかして" candidates) and require an explicit
//     user click before showing an official record. See fuzzySuggestItems().
//   ⑥ zero-result fail-safe is the caller's responsibility when both of the
//     above return nothing.

function normalize(s) {
  return (s || '')
    .toString()
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60)) // katakana -> hiragana
    .replace(/\s+/g, '')
    .trim();
}

// Loose normalize: additionally strips long vowel marks, middle dots, and
// common punctuation so that minor, meaning-preserving notation differences
// (e.g. "モバイルバッテリ" missing the trailing 長音符) resolve as the same
// term, without treating them as free-form fuzzy matches.
function normalizeLoose(s) {
  return normalize(s)
    .replace(/[ー\-‐‑‒–—―]/g, '')
    .replace(/[・･]/g, '')
    .replace(/[。、！？「」『』（）()]/g, '');
}

// Standard Levenshtein edit distance (insert/delete/substitute), O(n*m).
// Deliberately dependency-free — inputs here are always short JP words/aliases.
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function haystacksOf(it) {
  return [it.display_name, ...(it.aliases || [])];
}

// Tiers ①-④ only. Returns items ranked by match quality, best first.
// Empty query -> []. Never includes fuzzy/typo-only matches (tier ⑤) —
// those must be requested explicitly via fuzzySuggestItems().
export function searchItems(items, query) {
  const q = normalize(query);
  const qLoose = normalizeLoose(query);
  if (!q) return [];
  const scored = [];
  for (const it of items) {
    let score = 0;
    let isName = true;
    for (const raw of haystacksOf(it)) {
      const h = normalize(raw);
      if (!h) { isName = false; continue; }
      if (h === q) {
        score = Math.max(score, isName ? 100 : 95); // ① / ②
      } else if (normalizeLoose(raw) === qLoose && qLoose) {
        score = Math.max(score, 88); // ③
      } else if (h.startsWith(q) || q.startsWith(h) || h.includes(q) || q.includes(h)) {
        score = Math.max(score, isName ? 60 : 55); // ④
      }
      isName = false;
    }
    if (score > 0) scored.push({ item: it, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

// Tier ⑤. Returns up to `limit` items whose closest display_name/alias is
// within a small edit-distance ratio of the query, sorted by closeness.
// These are candidates only — callers must render them as selectable
// suggestions ("もしかして"), never as a resolved/confirmed answer.
export function fuzzySuggestItems(items, query, limit = 5) {
  const q = normalizeLoose(query);
  if (!q || q.length < 2) return [];
  const scored = [];
  for (const it of items) {
    let best = null;
    for (const raw of haystacksOf(it)) {
      const c = normalizeLoose(raw);
      if (!c) continue;
      const dist = levenshtein(q, c);
      const maxLen = Math.max(q.length, c.length);
      const ratio = maxLen ? dist / maxLen : 1;
      if (!best || ratio < best.ratio) best = { dist, ratio };
    }
    if (best && best.ratio <= 0.45 && best.dist <= 3) {
      scored.push({ item: it, ...best });
    }
  }
  scored.sort((a, b) => a.ratio - b.ratio || a.dist - b.dist);
  return scored.slice(0, limit).map((s) => s.item);
}

export { normalize, normalizeLoose, levenshtein };
