# 自治体パック生成基盤

自治体横展開を、共通コード改修ではなく公式根拠と自治体差分のデータ生産工程にする。

## コマンド
- `npm run municipality:scaffold -- --id=higashiura --name=東浦町 --official-base=https://www.town.aichi-higashiura.lg.jp/ --phone=0562-83-3111`
- `npm run municipality:audit -- --id=higashiura`
- `npm run municipality:promote -- --id=higashiura`

## Gate
- `PASS_RULES_MODELED`: 公式根拠付きprocedureだけ公開候補。
- `PASS_NONE_FOUND`: 制度なし確認済み。procedureは公開しない。
- `NEEDS_AUTHORITY_CONFIRMATION`: 公開procedureは作らず、開発者問い合わせキューへ。
- `SOURCE_CONFLICT`: 公開procedureは作らず停止。
- `OFFICIAL_RESEARCH_REQUIRED`: promote不可。

## 開発者専用
GitHub Actionsの `Municipality Pack (developer only)` は `workflow_dispatch` のみ。一般利用者の公開ページからは到達できない。
