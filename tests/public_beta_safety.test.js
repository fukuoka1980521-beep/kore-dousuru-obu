/**
 * Public beta hardening checks: OGP non-official labeling, feedback privacy
 * warning, and a no-open-source-license rights notice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function readRoot(relPath) {
  return readFileSync(path.join(ROOT, relPath), 'utf-8');
}

const rootIndex = readRoot('index.html');
const appIndex = readRoot(path.join('src', 'app', 'index.html'));
const appSrc = readRoot(path.join('src', 'app', 'app.js'));

for (const [label, html] of [
  ['root index.html', rootIndex],
  ['src/app/index.html', appIndex],
]) {
  test(`${label} has required OGP/meta tags`, () => {
    assert.match(html, /<title>[^<]*非公式[^<]*<\/title>/, `${label}: title should mark 非公式`);
    assert.match(html, /<meta name="description" content="[^"]+"/, `${label}: missing description`);
    assert.match(html, /<meta property="og:title" content="[^"]+"/, `${label}: missing og:title`);
    assert.match(html, /<meta property="og:description" content="[^"]+"/, `${label}: missing og:description`);
    assert.match(html, /<meta property="og:url" content="[^"]+"/, `${label}: missing og:url`);
    assert.match(html, /<meta name="twitter:card" content="[^"]+"/, `${label}: missing twitter:card`);
  });

  test(`${label} OGP title/description do not claim official Obu-city status`, () => {
    assert.doesNotMatch(html, /大府市公式サービス/);
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    assert.ok(ogTitleMatch, `${label}: og:title not found`);
    assert.match(ogTitleMatch[1], /非公式/);
  });
}

test('app header renders an unofficial/beta badge', () => {
  assert.match(appSrc, /非公式・実証版/);
  assert.match(appSrc, /unofficial-badge/);
});

test('home view shows a non-diminishing public-beta notice', () => {
  assert.match(appSrc, /beta-notice/);
  assert.match(appSrc, /公開実証中/);
  // Forbidden self-deprecating phrasing (section 13 of the hardening spec).
  assert.doesNotMatch(appSrc, /未完成です/);
  assert.doesNotMatch(appSrc, /バグだらけ/);
  assert.doesNotMatch(appSrc, /自己責任で使/);
});

test('zero-result feedback box warns against submitting personal information', () => {
  assert.match(appSrc, /個人情報は記載しないでください/);
  assert.match(appSrc, /氏名・住所・電話番号・マイナンバー/);
});

test('site does not claim a registered trademark (®) it does not hold', () => {
  assert.doesNotMatch(appSrc, /®/);
  assert.doesNotMatch(rootIndex, /®/);
});

test('COPYRIGHT_NOTICE.md exists, reserves rights, and does not grant an OSS license', () => {
  const notice = readRoot('COPYRIGHT_NOTICE.md');
  assert.match(notice, /All Rights Reserved/);
  // MIT/Apache/GPL may be *named* only to disclaim them, never to grant one.
  assert.doesNotMatch(notice, /(MIT|Apache|GPL)\s*(ライセンス)?\s*(を(付与|採用)|license)/i);
  assert.match(notice, /オープンソースライセンス.*(は付与していません|付与していません)/);
});
