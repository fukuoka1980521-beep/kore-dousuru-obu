# 行政問い合わせ機構（開発者専用）

公式情報だけでは住民向け案内を安全に確定できない場合に、開発者が自治体へ確認し、回答を追跡可能な根拠として残す仕組み。

## 公開側との境界
- 公開サイトには問い合わせ生成機能を表示しない。
- 自治体への問い合わせを自動送信しない。
- GitHub Actions の手動 workflow_dispatch または開発端末CLIからのみ問い合わせ票を生成する。
- Workflow実行はリポジトリ書込権限を持つ開発者向け。
- 回答取得だけでは公開データを変更しない。

## 状態
NEEDS_AUTHORITY_CONFIRMATION → PREPARED → 開発者が問い合わせ → ANSWER_RECORDED → LOCAL_ADMIN_SPECIAL_RULE_CHECK再評価 → PASS_RULES_MODELEDまたはSOURCE_CONFLICT → 実装・テスト・公開。

## CLI
`npm run inquiry:queue`

`npm run inquiry:prepare -- --municipality=chita --need=water_outage`

回答記録は `node scripts/authority_inquiry.mjs record ...` を使用。記録後も gate は `REVIEW_REQUIRED` のままで、自動的に公開可にはしない。

## 保存禁止
担当者個人の携帯番号、不要な氏名、個人案件の住所・氏名・相談内容など、一般ルール確認に不要な個人情報は保存しない。
