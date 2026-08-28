# 大府市版 公開実証ベータ デプロイ記録 v0.1

作成日: 2026-08-28
対象: KORE_DOUSURU_OBU_PUBLIC_BETA_DEPLOY_V0_1

---

## 1. デプロイ証跡

| 項目 | 値 |
|---|---|
| GitHub repository | https://github.com/fukuoka1980521-beep/kore-dousuru-obu （public） |
| Deployed commit SHA | `b47fd921be29c8d211fb9c0c4ae1941d10f85882`（ローカルHEAD `b47fd92` と一致） |
| GitHub Pages URL | https://fukuoka1980521-beep.github.io/kore-dousuru-obu/ |
| Pages配信方式 | branch `master`, path `/`（legacy build。名古屋市版と同一方式） |
| デプロイ日時（UTC） | 2026-08-28T00:03Z 頃（GitHub Pages build完了確認時刻） |
| https_enforced | true |
| ローカルテスト結果 | PASS 102/102（`node --test tests/*.test.js`） |

## 2. LIVE検証結果

デプロイされた成果物を実際にHTTPで取得して検証した（ローカル成功だけでCLOSEしていない）。

### アセット疎通（全て200、404なし）
`/`, `/src/app/index.html`, `/src/app/app.js`, `/src/app/style.css`,
`/municipalities/shared/core.js`, `/municipalities/obu/config.json`,
`/municipalities/obu/data/{waste_items,procedures,life_events}.json`

### 実データ機能検証（live取得したcore.js + JSONで、実際の検索ロジックを実行）

| 検索語 | 結果 |
|---|---|
| 蛍光灯 | WASTE: 蛍光灯・蛍光管（燃やせないごみ、CONFIRMED_OFFICIAL） |
| 自転車 | WASTE: 自転車（粗大ごみ、CONFIRMED_OFFICIAL） |
| テレビ | WASTE: テレビ（家電リサイクル法対象品・市収集対象外、CONFIRMED_OFFICIAL） |
| 住民票 | PROC: 住民票の写しの取得（CONFIRMED_OFFICIAL） |
| 転入 | EVENT: 大府市へ引っ越してきたとき／PROC: 転入届（CONFIRMED_OFFICIAL） |
| 児童手当 | PROC: 児童手当の申請（CONFIRMED_OFFICIAL） |
| LED照明器具 | WASTE: LED照明器具（分別区分未確認、**UNCONFIRMED**、fee=「公式情報で確認できませんでした。」） |

7件全てが期待どおりの結果に到達。LED照明器具は仕様どおりfail-closed表示を確認した。

### 公式リンク疎通（サンプル6件、全て200）
蛍光灯・自転車・テレビ・住民票・転入・児童手当それぞれの `official_url` を実際にHTTPで確認し、
全てcity.obu.aichi.jpドメインで200応答であることを確認した。

### 未実施の検証
ブラウザ自動操作ツールが今回の作業環境で接続できなかったため、実ブラウザでの
視覚的レンダリング・タップ操作・モバイル幅での崩れ確認は今回も実施できていない。
代替として、live取得した実アセット（JS/CSS/JSON）に対してNode.js上で実際の検索・データ読み込み
ロジックを実行し、機能面を検証した。CSSはソース変更していないため（`src/app/style.css`は
MVP作成時からバイト単位で無変更）、レイアウト崩れの新規発生リスクは低いと判断する。

## 3. Production Residual Audit（LIVE成果物）

デプロイ済みの実ファイル（source repositoryではなくGitHub Pagesから直接取得したもの）に対して実施。

- `名古屋` / `Nagoya` / `052-` / `OFFICIAL_CONFIRMATION_REQUIRED`: **0件**（全JS/JSONファイルを走査）
- リテラル `undefined` / `null`（JSONの正当なvalid_toフィールド値を除く） / `[object Object]`: **0件**

## 4. Public Data Safety Check

- `.env` / credentials / APIキー / token類似文字列: リポジトリ内に該当ファイルなし（`process.env.PORT`という無関係な環境変数参照、およびテストコード内の変数名 `RAW_TOKEN_RE` のみを検出したが、いずれも秘密情報ではない）
- `node_modules` / ビルド成果物: リポジトリに含まれていない
- 個人情報・ローカルパス・一時ファイル・開発用debug情報: `docs/internal/`・`docs/obu/`（内部専用）を除き、公開対象ファイルに含まれていないことを確認

## 5. Rollback可能性

- リモートリポジトリは新規作成のみで、既存リポジトリ（`kore-dousuru-nagoya`等）への変更は一切行っていない。
- GitHub Pagesは同リポジトリの`master`ブランチを参照しているため、問題が発覚した場合は
  `git revert`で該当コミットを打ち消してpushすれば、次回Pagesビルドで自動的に反映される。
  強制pushは行っていない。
- リポジトリ自体の削除・Pages無効化もOwner操作でいつでも可能（今回はどちらも実施していない）。

## 6. 未解決事項（公開後も残る既知の制約）

- ごみ品目48件中2件（毛布、タンス・机・椅子等の家具類）がPARTIAL、1件（LED照明器具）がUNCONFIRMED。
  いずれもfail-closedに表示されており、誤案内には該当しない。
- 実ブラウザでの視覚的モバイル表示確認は未実施（上記2節参照）。
- プラスチック製品「指定30品目」の個別リスト全件は、大府市公式ページが画像でのみ提示しているため未収録。
