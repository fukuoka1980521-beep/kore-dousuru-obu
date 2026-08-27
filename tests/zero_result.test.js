/**
 * Zero-result improvement feedback: static site, no automatic network
 * submission of what the user typed. The only allowed channel is an
 * explicit, user-initiated mailto: link (opens the mail app; nothing is
 * sent until the person presses send there).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const globalWindow = {};
const coreSrc = readFileSync(path.join(ROOT, 'municipalities', 'shared', 'core.js'), 'utf-8');
const fn = new Function('window', coreSrc + '\nreturn window.KoreDousuruCore;');
const { buildFeedbackMailto } = fn(globalWindow);

const appSrc = readFileSync(path.join(ROOT, 'src', 'app', 'app.js'), 'utf-8');

test('feedback link is a mailto: URL, not an HTTP request', () => {
  const url = buildFeedbackMailto('存在しないでたらめな品目名XYZ123');
  assert.match(url, /^mailto:/);
});

test('the searched term is carried in the mailto subject/body, not silently dropped', () => {
  const url = buildFeedbackMailto('もばいるばってり');
  assert.match(url, /subject=/);
  assert.match(url, /body=/);
  const decoded = decodeURIComponent(url);
  assert.match(decoded, /もばいるばってり/);
});

test('app.js never performs an automatic network submission of the search term', () => {
  // No fetch/XHR/sendBeacon/analytics call anywhere in the UI layer — the
  // only outbound "reporting" path is the user-initiated mailto: link.
  assert.doesNotMatch(appSrc, /XMLHttpRequest/);
  assert.doesNotMatch(appSrc, /sendBeacon/);
  assert.doesNotMatch(appSrc, /gtag\(|google-analytics|googletagmanager/);
  // fetch() is allowed only for loading our own static config/data JSON via
  // KoreDousuruCore.loadMunicipality — app.js itself must not call fetch.
  assert.doesNotMatch(appSrc, /\bfetch\(/);
});

test('app.js wires the zero-result feedback affordance as a plain link, not input/keyup auto-submit', () => {
  // The feedback URL is built via core.js's buildFeedbackMailto() (a
  // mailto: link) and rendered as a plain <a href>, so nothing fires until
  // the person clicks it and then presses send in their own mail client.
  assert.match(appSrc, /buildFeedbackMailto/);
  assert.match(appSrc, /feedback-link/);
});
