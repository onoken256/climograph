#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
気象庁「主な地点の平年値」ページ (世界103地点、1991-2020) をパースする。
出典: https://www.data.jma.go.jp/gmd/cpd/monitor/mainstn/nrmlist.php
      (辿り方: 気象庁トップ > 各種データ・資料 > 地球環境・気候 > 世界の天候
       > 世界の地点別平年値 > 主な地点の平年値)
数値は同ページのHTML表に直接埋め込まれており、記憶からの補完は一切していない。
"""
import re
import json
import sys

SRC = "/tmp/resp_nrmlist.php.html"
OUT = "/Users/tcsstaff/Documents/Claude/climograph/data/raw/world_stations_raw.json"

with open(SRC, encoding="utf-8") as f:
    html = f.read()

# 大陸グループの区切り (<a name="regN" /></a>\n<h3>大陸名</h3>)
region_pattern = re.compile(r'<a name="reg\d+"\s*/></a>\s*<h3>([^<]+)</h3>(.*?)(?=<a name="reg\d+"|\Z)', re.S)

station_pattern = re.compile(
    r'<tr><td rowspan=2><a href="[^"]*\?n=(\d+)&m=1"\s*>([^<]+)</td>'
    r'<td rowspan=2>([^<]*)</td>'
    r'<td>気温（℃）</td>((?:<td class="r">[^<]*</td>){12})'
    r'<tr><td>降水量（mm）</td>((?:<td class="r">[^<]*</td>){12})',
    re.S,
)

def parse_values(cell_block):
    vals = re.findall(r'<td class="r">([^<]*)</td>', cell_block)
    out = []
    for v in vals:
        v = v.strip()
        out.append(None if v == "---" else float(v))
    return out

regions = region_pattern.findall(html)
result = []
for region_name, body in regions:
    for m in station_pattern.finditer(body):
        wmo_no, name, country, t_block, p_block = m.groups()
        T = parse_values(t_block)
        P = parse_values(p_block)
        result.append({
            "region": region_name.strip(),
            "wmoNo": wmo_no,
            "name": name.strip(),
            "country": country.strip(),
            "T": T,
            "P": P,
        })

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"parsed {len(result)} stations", file=sys.stderr)
by_region = {}
for r in result:
    by_region.setdefault(r["region"], 0)
    by_region[r["region"]] += 1
print(json.dumps(by_region, ensure_ascii=False, indent=2), file=sys.stderr)
