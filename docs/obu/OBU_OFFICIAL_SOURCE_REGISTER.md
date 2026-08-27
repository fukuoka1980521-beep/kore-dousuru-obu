# 大府市 公式ソース出典管理台帳

作成日: 2026-08-28
本ファイルは、`municipalities/obu/data/*.json` の各事実の根拠として、WebFetch/WebSearchで
アクセスした大府市公式ページ（city.obu.aichi.jp）等のURL一覧である（名古屋市版
`docs/nagoya/NAGOYA_OFFICIAL_SOURCE_REGISTER.md` と同形式）。

凡例:
- 取得方法「WebFetch」＝ページ本文をAIツールで直接取得・確認
- 取得方法「WebSearch」＝検索結果スニペット経由（本文直接取得はしていない、または限定的）

---

## 行政手続（procedures.json）関連ソース

| No | URL | ページタイトル | 取得方法 | 確認日 | 用途 |
|---|---|---|---|---|---|
| 1 | https://www.city.obu.aichi.jp/kurashi/todokede/idou/1011608.html | 転入届（市外→大府市）｜大府市 | WebFetch | 2026-08-28 | obu-proc-01 全項目 |
| 2 | https://www.city.obu.aichi.jp/kurashi/todokede/idou/1011523.html | 転出届（大府市→市外・海外）｜大府市 | WebFetch | 2026-08-28 | obu-proc-02 全項目 |
| 3 | https://www.city.obu.aichi.jp/kurashi/todokede/idou/1013471.html | 郵送による転出届｜大府市 | WebFetch | 2026-08-28 | obu-proc-02 郵送手続きの補足 |
| 4 | https://www.city.obu.aichi.jp/kurashi/todokede/idou/1011663.html | 転居届（大府市→大府市）｜大府市 | WebFetch | 2026-08-28 | obu-proc-03 全項目 |
| 5 | https://www.city.obu.aichi.jp/kurashi/todokede/jyuuminhyo/1001569/1001570.html | 住民票の写し等の申請方法｜大府市 | WebFetch | 2026-08-28 | obu-proc-04 全項目 |
| 6 | https://www.city.obu.aichi.jp/kurashi/todokede/jyuuminhyo/1001569/1001571.html | 住民票の写し 郵送申請（詳細）｜大府市 | WebSearch | 2026-08-28 | obu-proc-04 郵送手数料の補足（本文未確認・PARTIAL要素） |
| 7 | https://www.city.obu.aichi.jp/kurashi/todokede/mynumber/1001544.html | 証明書コンビニ交付サービスについて｜大府市 | WebFetch | 2026-08-28 | obu-proc-04/05/06 コンビニ交付手数料・時間 |
| 8 | https://www.city.obu.aichi.jp/kurashi/todokede/koseki/1001589/index.html | 全部（個人）事項証明・戸籍謄（抄）本等｜大府市 | WebFetch | 2026-08-28 | obu-proc-05 全項目 |
| 9 | https://www.city.obu.aichi.jp/kurashi/todokede/jyuuminhyo/1001573/index.html | 印鑑登録及び印鑑登録証明書｜大府市 | WebFetch | 2026-08-28 | obu-proc-06 全項目 |
| 10 | https://www.city.obu.aichi.jp/kurashi/todokede/koseki/1001593.html | 出生届｜大府市 | WebFetch | 2026-08-28 | obu-proc-07 全項目 |
| 11 | https://www.city.obu.aichi.jp/faq/kurashi/koseki/1001047.html | 出生届提出後の手続き（よくある質問）｜大府市 | WebSearch | 2026-08-28 | obu-proc-07 後続手続きの補足（summaryベース） |
| 12 | https://www.city.obu.aichi.jp/kosodate/seido_teate/jidoteate/1004280.html | 児童手当のご案内｜大府市 | WebFetch | 2026-08-28 | obu-proc-08 全項目（オンライン可否は確認不可） |
| 13 | https://www.city.obu.aichi.jp/kurashi/zeikin/kokuho/1014040.html | 郵送で国民健康保険に関する届出ができます｜大府市 | WebFetch | 2026-08-28 | obu-proc-09/obu-proc-10 |
| 14 | https://www.city.obu.aichi.jp/shisei/information/soshiki/1002365/1002372.html | 組織一覧（保険医療課）｜大府市 | WebFetch | 2026-08-28 | 保険医療課の実在確認 |
| 15 | https://www.city.obu.aichi.jp/kurashi/todokede/mynumber/index.html | マイナンバー｜大府市 | WebFetch | 2026-08-28 | obu-proc-11（専用の住所変更ページは未発見） |
| 16 | https://www.city.obu.aichi.jp/sodan/1022872/index.html | おくやみ窓口をご利用ください｜大府市 | WebFetch | 2026-08-28 | obu-proc-12 おくやみ窓口 |
| 17 | https://www.city.obu.aichi.jp/kurashi/todokede/koseki/1001594.html | 死亡届｜大府市 | WebSearch | 2026-08-28 | obu-proc-12 死亡届の期限 |
| 18 | https://www.city.obu.aichi.jp/kurashi/news_kurashi/1035806.html | 窓口時間・電話受付時間が変わりました｜大府市 | WebFetch | 2026-08-28 | 全手続き共通：開庁時間（2026年1月改定） |
| 19 | https://www.city.obu.aichi.jp/shisetsu/koukyou/shiyakusho/1005059/index.html | 施設案内 大府市役所｜大府市 | WebFetch | 2026-08-28 | 代表電話0562-47-2111、支所の有無調査 |

## 一般情報・利用条件

| No | URL/情報源 | 内容 | 扱い |
|---|---|---|---|
| 20 | https://www.city.obu.aichi.jp/ （フッター） | 著作権表記「Copyright © Obu City Office, All Rights Reserved」 | 確認済み。転載・二次利用の詳細ポリシーページは複数回の探索で発見できなかった |
| 21 | https://www.city.obu.aichi.jp/shisei/toukei_data/1027811.html | 大府市デジタルフォトブック（写真のオープンデータ、CC BY 4.0相当の情報あり） | 本文未確認（WebSearchのみ）。品目・手続データの著作権判断には使用していない |

---

## ごみ・資源データ（waste_items.json）関連ソース

| No | URL | ページタイトル | 取得方法 | 確認日 | 用途 |
|---|---|---|---|---|---|
| 22 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1029797.html | ごみ分別検索｜大府市 | WebFetch | 2026-08-28 | 品目横断の一次情報源（電球・カセットボンベ・自転車・傘・陶磁器・CD/DVDケース・携帯電話・刃物等、多数の個別品目） |
| 23 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001772/1001775.html | 燃やすしかないごみ・燃やせないごみの分け方・出し方｜大府市 | WebFetch | 2026-08-28 | 布団・毛布・革製品・灰・じゅうたん・木製家具類・台所ごみの区分 |
| 24 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001772/1008290.html | 粗大ごみ戸別収集｜大府市 | WebFetch | 2026-08-28 | 粗大ごみ料金（1個1,500円、令和7年4月改定）、申込方法 |
| 25 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001772/1001777.html | 庭木の剪定や粗大ごみ等の多量のごみの処理｜大府市 | WebFetch | 2026-08-28 | 剪定枝・多量ごみの自己搬入案内 |
| 26 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001810/1001812/index.html | 資源の分け方と出し方｜大府市 | WebFetch | 2026-08-28 | ペットボトル・びん・缶・古紙・プラスチック製容器包装・衣類・鍋類・スプレー缶等の資源区分 |
| 27 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001810/1001825.html | 使用済小型家電の回収にご協力ください｜大府市 | WebFetch | 2026-08-28 | 小型家電拠点回収（40品目、回収ボックス設置場所） |
| 28 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001810/1001830.html | テレビ、エアコン、洗濯機・衣類乾燥機、冷蔵庫・冷凍庫の処分｜大府市 | WebFetch | 2026-08-28 | 家電リサイクル法対象4品目（市収集対象外）、リサイクル料金目安 |
| 29 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001810/1001832.html | 家庭系パソコンの回収・リサイクル｜大府市 | WebFetch | 2026-08-28 | パソコン回収3方式（公民館・リネットジャパン・メーカー） |
| 30 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001810/1016498.html | 生ごみ分別収集事業｜大府市 | WebFetch | 2026-08-28 | 横根・北崎北尾地区限定の生ごみ分別収集（2023年10月開始） |
| 31 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001810/1031025.html | 電池類の分け方・出し方｜大府市 | WebFetch | 2026-08-28 | 乾電池・充電式電池（モバイルバッテリー等）・鉛蓄電池の区分、2026年4月の回収拠点480か所拡充 |
| 32 | https://www.city.obu.aichi.jp/faq/kankyo/gomi/1001331.html | よくある質問　水銀入り体温計や乾電池は、どのように処分したら良いでしょうか｜大府市 | WebFetch | 2026-08-28 | 水銀体温計・ボタン電池の扱い |
| 33 | https://www.city.obu.aichi.jp/faq/kankyo/gomi/1001336.html | よくある質問　花火やライターはどのように処分すれば良いですか｜大府市 | WebFetch | 2026-08-28 | ライターのガス抜き手順、花火・マッチの処理 |
| 34 | https://www.tobuchita.jp/pages/mochikomi/riyouannai/ | 利用案内（受入時間・使用料等）｜東部知多衛生組合 | WebFetch | 2026-08-28 | 東部知多クリーンセンターの自己搬入料金（10kgごとに200円）、受入時間、持込禁止物リスト |

### 公式情報で確認できなかった項目（UNCONFIRMED/PARTIALのまま採用した箇所、2026-08-28 LIGHT_AUDIT_V0_2時点）

- LED照明器具の分別区分（環境・ごみ・リサイクルFAQ一覧に該当項目なし、ごみ分別検索の静的取得内容にも記載なし。蛍光灯は下記「LIGHT_AUDIT_V0_2で解決した項目」で解決済み・別品目として区別）。
- CD・DVD本体、鉛蓄電池・ポータブル電源の処分料金の有無。
- マイナンバーカード住所変更（券面・電子証明書更新）固有の手数料・詳細必要書類（単体の専用ページが見つからない）。
- プラスチック製品30品目の具体的な個別リスト全件（画像のみで提示されており本文テキストとして取得不可。詳細は`docs/internal/OBU_OFFICIAL_SOURCE_CONFLICTS_V0_1.md`）。

これらは `municipalities/obu/data/{waste_items,procedures}.json` 上で `status: "UNCONFIRMED"` または `"PARTIAL"`、`fee: "OFFICIAL_CONFIRMATION_REQUIRED"` 等のfail-closedな値として明示している。

## LIGHT_AUDIT_V0_2（2026-08-28）で追加確認したソース

| No | URL | ページタイトル | 更新日 | 取得方法 | 用途 |
|---|---|---|---|---|---|
| 35 | https://www.city.obu.aichi.jp/faq/kankyo/gomi/1001338.html | よくある質問　陶器やガラス製品などはどのように処分したら良いですか｜大府市 | 2018-10-22 | WebFetch | obu-0005（蛍光灯）をCONFIRMED_OFFICIALへ更新 |
| 36 | https://www.city.obu.aichi.jp/faq/kankyo/gomi/1001340.html | よくある質問　自転車はどのようにごみに出せばよいですか｜大府市 | 2025-02-03 | WebFetch | obu-0020（自転車）をCONFIRMED_OFFICIALへ更新 |
| 37 | https://www.city.obu.aichi.jp/shisei/koho/pressrelease/1003447/1038806/1039057.html | 中東情勢の悪化に伴う原料供給不足を見据え市指定ごみ袋の素材を変更します｜大府市 | 2026-04-27 | WebFetch | 指定ごみ袋の価格決定方式（市は卸売価格のみ決定）を確認 |
| 38 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1001810/1001812/1001813.html | プラスチック類(対象となるもの)｜大府市 | 2025-04-14 | WebFetch | obu-0028を「指定30品目」でCONFIRMED_OFFICIALへ更新。画像キャプションに旧「20品目」表記残存を確認 |
| 39 | https://www.city.obu.aichi.jp/kurashi/gomi/recycle/1024239.html | 令和5年4月から資源となるプラスチックの回収方法が変わりました｜大府市 | 2025-04-15 | WebFetch | 「指定30品目」表記のクロスチェック |
| 40 | https://www.city.obu.aichi.jp/shinseisho/s_another/1035116.html | オンラインでできる行政手続き｜大府市 | 2025-09-24 | WebFetch | obu-proc-08（児童手当）のオンライン対応を確認しCONFIRMED_OFFICIALへ更新 |
| 41 | https://www.city.obu.aichi.jp/kurashi/zeikin/kokuho/1035960/index.html | 国民健康保険に関する届出｜大府市 | 2025-08-01 | WebFetch | obu-proc-09（国保加入）の14日以内期限を確認しCONFIRMED_OFFICIALへ更新。出典URLを本ページへ変更 |
| 42 | https://www.city.obu.aichi.jp/kurashi/todokede/mynumber/1026036.html | 便利な引越しワンストップサービスをご利用ください｜大府市 | 2024-01-04 | WebFetch | obu-proc-11の「オンラインで完結する」誤案内リスクを解消。出典URLを本ページへ変更 |
| 43 | https://www.city.obu.aichi.jp/faq/kankyo/gomi/index.html | ごみ・リサイクル・環境のよくある質問一覧｜大府市 | 記載なし | WebFetch | LED照明器具のFAQ項目が存在しないことを確認（UNCONFIRMED維持） |

不整合の詳細評価（20品目 vs 30品目、専用FAQ vs 一般案内ページの沈黙）は
`docs/internal/OBU_OFFICIAL_SOURCE_CONFLICTS_V0_1.md` を参照。
