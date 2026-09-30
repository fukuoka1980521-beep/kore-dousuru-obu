# 知多市 横展開検証 V1

## 目的
Coverage Gap Engine を5自治体目へ適用し、4自治体目で残っていた「自治体IDをエンジンへ手登録する作業」まで除去できるか検証する。

## 結果
- 共通ニーズtaxonomy: 29件
- 知多市固有taxonomy追加: 0件
- 知多市公式確認済み住民導線: 27件
- LOCAL_ADMIN_SPECIAL_RULE_CHECK: 29/29
- PASS_RULES_MODELED: 27件
- NEEDS_AUTHORITY_CONFIRMATION: 2件
- 自動カバレッジ: 27/29
- 推測実装: 0件
- 共通UIの知多市専用改修: 0件
- 知多市専用UIコピー: 0件
- 全自動テスト: 174/174 PASS
- 実描画: 4検索語 × 4 viewport = 16/16 PASS
- viewport: 360 / 390 / 430 / 1440px
- 横overflow: 0件
- JavaScript page error: 0件

## 今回の基盤改善
Coverage Gap Engine を municipality ID のハードコード方式からローカルデータパック自動検出方式へ変更した。

追加自治体は原則として次を置けば自動で比較対象になる。
- municipalities/<municipality_id>/config.json
- municipalities/<municipality_id>/data/procedures.json
- municipalities/<municipality_id>/data/life_events.json
- tools/coverage/<municipality_id>-source-seeds.json

追加seedファイルも自動読込するため、6自治体目以降はCoverage Engineへの自治体別コード追加を不要とする。

## 知多市で残した行政確認
1. 平常時に急に水が出ない場合の恒常的な切り分け・連絡先
2. 騒音・振動・悪臭について、事業者由来の住民苦情窓口と家庭生活由来・民事問題の境界

## 観測された自治体差
- 道路破損: 知多市は市公式LINEの「道路の破損の通報」と土木課連絡先が公式ページで明示されているため即モデル化可能。
- 東海市: 同じ道路ニーズでも一般の市民通報フローを一つの公式ページで確定できず行政確認待ち。
- 騒音・悪臭: 東海市は家庭生活由来と事業者由来の境界を公式ページで明示。知多市は規制担当課は確認できるが、住民向けケース別境界は未確定。

## 判定
5自治体目で、横展開の主作業は共通コード改修から自治体データパック作成へ移行した。
6自治体目では「共通コード変更0」を目標KPIとし、データ・公式根拠・行政確認候補だけで追加できるか検証する。
