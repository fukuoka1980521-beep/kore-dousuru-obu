# 大府市版差分メモ（構造変更の要否監査）

作成日: 2026-08-28
対象: `kore-dousuru-nagoya`（参照実装）から `kore-dousuru-obu` を作成するにあたり、
自治体固有分岐（`if city === obu` 等）を追加する必要が生じたかどうかの監査記録。

## 結論

**コード側の構造変更は不要だった。** 名古屋市版の設計時点（`municipalities/obu/README.md`
参照）で既に「自治体固有分岐を持たない」ことを前提に共通層（`municipalities/shared/core.js`、
`src/lib/*.js`）とアプリ層（`src/app/app.js`）が分離されていたため、大府市版の追加は
以下の2種類の変更のみで完結した。

1. **データ追加**: `municipalities/obu/config.json` と
   `municipalities/obu/data/{waste_items,procedures,life_events}.json` を新規作成。
2. **文言の脱ハードコード**: `src/app/app.js` と `municipalities/shared/core.js` の中に、
   名古屋市版を作った際の実装漏れとして「名古屋市」という文字列が直接埋め込まれている
   箇所が3点あった（後述）。これはロジック分岐ではなく、`state.config.display_name` を
   使うべきところを固定文字列にしていた表示バグであり、大府市版を作る過程で修正した。

## 共通化されていた部分（変更不要だった箇所）

- 検索ロジック（完全一致→alias→表記揺れ→部分一致→fuzzy候補、`municipalities/shared/core.js`
  / `src/lib/search.js`）: 品目名・手続き名・生活イベント名のいずれも `display_name`/`aliases`
  という同一の形なので、大府市データを流し込むだけでそのまま動作した。
- 日付ルール解決（`valid_from`/`valid_to`/`rule_version` による有効レコード選択、
  `src/lib/rules.js`）: 大府市データに複数バージョンレコードが無くても（後述）問題なく動作する
  （1件しかなければ常にそれを返す設計）。
- 情報鮮度判定（`computeRiskLevel`/`computeFreshness`、`src/lib/freshness.js`）:
  `category` 名が `"電池類"` `"発火性危険物"` `"粗大ごみ"` の場合にHIGH/MEDIUM扱いする実装。
  大府市データのカテゴリ命名をこれに合わせたため、そのまま機能した（詳細は下記「注意点」）。
- Deep Link解決・共有URL生成・ゼロ件時のフォールバック・生活イベント検索: すべて
  自治体非依存のまま動作。
- UIレイアウト・配色・カード構造（`src/app/style.css`）: 完全に無変更で流用。

## ハードコードされていて修正した3箇所（app.js / core.js）

| 箇所 | 修正前 | 修正後 |
|---|---|---|
| `app.js` 情報鮮度バナー（通常）| `名古屋市公式の基準ではありません`固定文字列 | `${state.config.display_name}公式の基準ではありません` |
| `app.js` 情報鮮度バナー（高リスク失効時）| `名古屋市公式の基準ではなく` 固定文字列 | `${state.config.display_name}公式の基準ではなく` |
| `app.js` 生活イベント画面のごみ導線ボタン | `名古屋市のごみ・資源の出し方を確認` 固定文字列 | `${state.config.display_name}のごみ・資源の出し方を確認` |
| `core.js` フィードバックメール件名 `buildFeedbackMailto` | `[これどうする？名古屋市版]` 固定文字列 | 呼び出し側(`app.js`)が `state.config.display_name` から組み立てて渡す `serviceLabel` 引数を追加 |

これらは新機能ではなく、名古屋市版実装時に見落とされていた「本来 config から読むべき値を
決め打ちしていた」バグの是正である。2自治体目を作ったことで初めて表面化した。

## 注意点・将来の3自治体目で問題になりうる部分

1. **カテゴリ名がロジックと結合している**: `src/lib/freshness.js` の
   `HIGH_RISK_CATEGORIES = new Set(["電池類", "発火性危険物"])` と、粗大ごみ判定の
   `item?.category === "粗大ごみ"` は、カテゴリの**文字列**に依存している。大府市データは
   同じカテゴリ名を採用したため問題は起きなかったが、3自治体目が「危険ごみ」のように
   異なるカテゴリ命名をした場合、このハイリスク判定が機能しなくなる。将来的には
   `category` ではなく品目データ側に `risk_category: "battery"|"flammable"|null` のような
   自治体非依存の正規化フィールドを持たせる方が安全。ただし今回3自治体目は無いため、
   過剰な抽象化を避け、変更は見送った。
2. **粗大ごみサイズ基準の日付切替（`valid_from`/`valid_to`複数バージョン）は名古屋市固有の
   実データに依存した機能**: 名古屋市データには2026年10月の粗大ごみサイズ基準変更に伴う
   同一 `item_id` の複数バージョンレコード（4件）があり、これに対応する
   `?asof=` パラメータのテストが `tests/deeplink.test.js` に組み込まれていた。大府市の
   公式情報からは同種の日付切替ルールが確認できなかったため、大府市版データには複数
   バージョンレコードを持たせていない（架空のルール変更をでっち上げていない）。このため
   大府市版の `tests/deeplink.test.js` からは、複数バージョン存在を前提とする2件のテストを
   除外した。ロジック自体（`resolveItemsForDate`/`selectApplicableRecord`）は1バージョンでも
   正しく動作するため、機能上の問題はない。
3. **`ward_list_url`（区役所一覧）は大府市に存在しない概念**: 名古屋市は16区に分かれ、
   手続きごとに窓口（区役所・支所）が異なるため `config.json` に `ward_list_url` と
   `district_dependent` フラグを持つ。大府市は単一市役所（大府市役所）が窓口の中心であり、
   「区」という行政区分自体が存在しない。`config.json` の `ward_list_url` フィールドは
   大府市版でも維持し（大府市公式サイトの窓口一覧ページを指す）、`district_dependent` は
   大府市の各手続きの実態に応じて `true`/`false` を個別に設定した。フィールド自体を
   自治体固有の分岐にはしていない。

## 3自治体目追加時、コード変更なしで済むか（評価）

`docs/internal/MUNICIPALITY_SECOND_CITY_FINDINGS_V0_1.md` に詳細評価を記載する。結論だけ
記すと、**データ追加のみで対応可能である可能性が高い**。ただし上記1の
`risk_category` の正規化は、3自治体目のカテゴリ命名が名古屋市・大府市と異なった時点で
着手を検討すべき負債として記録しておく。
