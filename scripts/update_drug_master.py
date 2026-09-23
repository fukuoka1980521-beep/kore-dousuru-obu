#!/usr/bin/env python3
"""
支払基金の最新「医薬品全件マスター」を取得し、
適応病名ナビ用の軽量検索索引 JSON を生成する。

出典:
https://www.ssk.or.jp/seikyushiharai/tensuhyo/kihonmasta/kihonmasta_04.html

医薬品マスターの現行レイアウト（2026-05版）:
3 医薬品コード
5 医薬品名・規格名（漢字名称）
7 カナ名称
28 剤形
30 変更年月日
31 廃止年月日
32 薬価基準収載医薬品コード
35 基本漢字名称
37 一般名コード
38 一般名処方の標準的な記載
"""

from __future__ import annotations

import csv
import io
import json
import re
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

INDEX_URL = "https://www.ssk.or.jp/seikyushiharai/tensuhyo/kihonmasta/kihonmasta_04.html"
BASE_URL = "https://www.ssk.or.jp/seikyushiharai/tensuhyo/kihonmasta/kihonmasta_04.files/"
OUT = Path("tools/tekiou-byoumei/drug-master.json")
EXPECTED_MIN = 15000


def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 tekiou-byoumei-navi/1.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def latest_zip_url() -> tuple[str, str]:
    html = fetch(INDEX_URL).decode("utf-8", errors="replace")
    names = re.findall(r'href=["\']([^"\']*y_ALL(\d{8})\.zip)["\']', html, re.I)
    if not names:
        # HTML構造が変わっても、ファイル名そのものが残っていれば拾う
        names2 = re.findall(r'(y_ALL(\d{8})\.zip)', html, re.I)
        if not names2:
            raise RuntimeError("最新全件ZIPをページから検出できません")
        file_name, date = max(names2, key=lambda x: x[1])
        return BASE_URL + file_name, date
    href, date = max(names, key=lambda x: x[1])
    if href.startswith("http"):
        return href, date
    file_name = href.rsplit("/", 1)[-1]
    return BASE_URL + file_name, date


def decode_csv(raw: bytes) -> str:
    for enc in ("cp932", "shift_jis", "utf-8-sig"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    raise RuntimeError("CSVの文字コードを判定できません")


def clean(s: str) -> str:
    return (s or "").replace("\u3000", " ").strip()


def main() -> None:
    zip_url, source_date = latest_zip_url()
    zbytes = fetch(zip_url)
    with zipfile.ZipFile(io.BytesIO(zbytes)) as zf:
        csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        if not csv_names:
            raise RuntimeError("ZIP内にCSVがありません")
        # 全件ZIPは通常1CSV。複数なら最大ファイルを採用。
        csv_name = max(csv_names, key=lambda n: zf.getinfo(n).file_size)
        text = decode_csv(zf.read(csv_name))

    rows = []
    malformed = 0
    for row in csv.reader(io.StringIO(text)):
        if not row:
            continue
        if len(row) < 38:
            malformed += 1
            continue
        # 「Y」行だけを対象。万一ヘッダー等が入っても除外できる。
        if clean(row[1]).upper() != "Y":
            continue

        item = {
            "code": clean(row[2]),
            "name": clean(row[4]),
            "kana": clean(row[6]),
            "form": clean(row[27]),
            "changed": clean(row[29]),
            "abolished": clean(row[30]),
            "yj": clean(row[31]),
            "base": clean(row[34]),
            "generic_code": clean(row[36]),
            "generic": clean(row[37]),
        }
        if not item["code"] or not item["name"]:
            malformed += 1
            continue
        rows.append(item)

    # 医薬品コードで一意化。入力順を保持。
    dedup = {}
    for item in rows:
        dedup[item["code"]] = item
    rows = list(dedup.values())

    if len(rows) < EXPECTED_MIN:
        raise RuntimeError(
            f"抽出件数が少なすぎます: {len(rows)}件（最低{EXPECTED_MIN}件）"
        )

    payload = {
        "meta": {
            "source": "社会保険診療報酬支払基金 医薬品マスター",
            "source_url": INDEX_URL,
            "source_date": source_date,
            "count": len(rows),
            "malformed_rows": malformed,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "drugs": rows,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"OK source={source_date} count={len(rows)} malformed={malformed} "
        f"out={OUT} bytes={OUT.stat().st_size}"
    )


if __name__ == "__main__":
    main()
