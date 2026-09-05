#!/usr/bin/env node
"use strict";
/*
 * 気象庁 平年値(1991-2020) の公式一括ダウンロードファイル
 * (https://www.data.jma.go.jp/stats/data/mdrr/normal/index.html の
 *  「2020年平年値」→ 地上気象観測 月・年別平年値 normal_surface.zip)
 * を展開したもの (data/raw/normal_surface/normal_surface/) から、
 * 47都道府県庁所在地の気象官署の月別平均気温・月別降水量を抽出する。
 *
 * 要素番号は同梱の format_surface.pdf で確認済み:
 *   0500 = 気温 月・年平均 (0.1℃単位)
 *   4000 = 降水量 月・年合計 (0.1mm単位)
 * レコード形式: 11,地点番号,要素番号,資料年数,開始年,終了年,
 *               (1月値,RMK),(2月値,RMK),...,(12月値,RMK),(年値,RMK)
 *
 * 埼玉県・滋賀県庁所在地(さいたま市・大津市)には気象官署が無いため、
 * 一般的な代替地点である熊谷・彦根の値を使用する（他の資料でも通例）。
 */
const fs = require("fs");
const path = require("path");

const RAW = path.join(__dirname, "..", "data", "raw", "normal_surface", "normal_surface");
const OUT_DIR = path.join(__dirname, "..", "data");

const STATIONS = [
  ["北海道", "北海道", "札幌", "47412"],
  ["東北", "青森県", "青森", "47575"],
  ["東北", "岩手県", "盛岡", "47584"],
  ["東北", "宮城県", "仙台", "47590"],
  ["東北", "秋田県", "秋田", "47582"],
  ["東北", "山形県", "山形", "47588"],
  ["東北", "福島県", "福島", "47595"],
  ["関東", "茨城県", "水戸", "47629"],
  ["関東", "栃木県", "宇都宮", "47615"],
  ["関東", "群馬県", "前橋", "47624"],
  ["関東", "埼玉県", "熊谷", "47626", "さいたま市に気象官署が無いため熊谷を使用（通例の代替地点）"],
  ["関東", "千葉県", "千葉", "47682"],
  ["関東", "東京都", "東京", "47662"],
  ["関東", "神奈川県", "横浜", "47670"],
  ["中部", "新潟県", "新潟", "47604"],
  ["中部", "富山県", "富山", "47607"],
  ["中部", "石川県", "金沢", "47605"],
  ["中部", "福井県", "福井", "47616"],
  ["中部", "山梨県", "甲府", "47638"],
  ["中部", "長野県", "長野", "47610"],
  ["中部", "岐阜県", "岐阜", "47632"],
  ["中部", "静岡県", "静岡", "47656"],
  ["中部", "愛知県", "名古屋", "47636"],
  ["近畿", "三重県", "津", "47651"],
  ["近畿", "滋賀県", "彦根", "47761", "大津市に気象官署が無いため彦根を使用（通例の代替地点）"],
  ["近畿", "京都府", "京都", "47759"],
  ["近畿", "大阪府", "大阪", "47772"],
  ["近畿", "兵庫県", "神戸", "47770"],
  ["近畿", "奈良県", "奈良", "47780"],
  ["近畿", "和歌山県", "和歌山", "47777"],
  ["中国", "鳥取県", "鳥取", "47746"],
  ["中国", "島根県", "松江", "47741"],
  ["中国", "岡山県", "岡山", "47768"],
  ["中国", "広島県", "広島", "47765"],
  ["中国", "山口県", "山口", "47784"],
  ["四国", "徳島県", "徳島", "47895"],
  ["四国", "香川県", "高松", "47891"],
  ["四国", "愛媛県", "松山", "47887"],
  ["四国", "高知県", "高知", "47893"],
  ["九州・沖縄", "福岡県", "福岡", "47807"],
  ["九州・沖縄", "佐賀県", "佐賀", "47813"],
  ["九州・沖縄", "長崎県", "長崎", "47817"],
  ["九州・沖縄", "熊本県", "熊本", "47819"],
  ["九州・沖縄", "大分県", "大分", "47815"],
  ["九州・沖縄", "宮崎県", "宮崎", "47830"],
  ["九州・沖縄", "鹿児島県", "鹿児島", "47827"],
  ["九州・沖縄", "沖縄県", "那覇", "47936"],
];

function loadStationIndex() {
  const csv = fs.readFileSync(path.join(RAW, "surface_station_index_utf8.csv"), "utf8");
  const lines = csv.split(/\r?\n/).slice(2).filter(Boolean);
  const map = {};
  for (const line of lines) {
    const cols = line.split(",");
    const no = cols[0].trim();
    if (!no) continue;
    const latDeg = parseFloat(cols[4]), latMin = parseFloat(cols[5]);
    const lonDeg = parseFloat(cols[6]), lonMin = parseFloat(cols[7]);
    map[no] = {
      lat: Math.round((latDeg + latMin / 60) * 10000) / 10000,
      lon: Math.round((lonDeg + lonMin / 60) * 10000) / 10000,
    };
  }
  return map;
}

function readElement(stationNo, elementCode) {
  const file = path.join(RAW, "monthly", `nml_sfc_m_${stationNo}.csv`);
  const text = fs.readFileSync(file, "utf8");
  const line = text.split(/\r?\n/).find(l => l.startsWith(`11,${stationNo},${elementCode},`));
  if (!line) throw new Error(`element ${elementCode} not found for station ${stationNo}`);
  const cols = line.split(",");
  // cols[6],[8],...,[28] are the 12 monthly values (value,RMK pairs starting at index 6)
  const values = [];
  for (let m = 0; m < 12; m++) {
    const v = parseFloat(cols[6 + m * 2]);
    values.push(Math.round(v) / 10);
  }
  return values;
}

function pMaxFor(P) {
  const peak = Math.max(...P);
  return [300, 600, 900, 1200].find(v => v >= peak) || 1800;
}

const stationCoords = loadStationIndex();
const skipped = [];
const result = [];

for (const [region, pref, city, no, note] of STATIONS) {
  try {
    const T = readElement(no, "0500");
    const P = readElement(no, "4000");
    const coord = stationCoords[no];
    if (!coord) throw new Error(`no lat/lon for station ${no}`);
    result.push({
      region, pref, city, stationNo: no,
      lat: coord.lat, lon: coord.lon,
      T, P, pMax: pMaxFor(P),
      hemi: "N",
      source: "気象庁 平年値(1991-2020)", period: "1991-2020",
      note: note || undefined,
    });
  } catch (e) {
    skipped.push({ pref, city, no, reason: e.message });
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "japan.json"), JSON.stringify(result, null, 2));

// 人間が目視確認できるCSVを別途出力
const csvLines = ["region,pref,city,stationNo,lat,lon," +
  Array.from({length:12},(_,i)=>`T${i+1}`).join(",") + "," +
  Array.from({length:12},(_,i)=>`P${i+1}`).join(",") + ",source,period,note"];
for (const r of result) {
  csvLines.push([
    r.region, r.pref, r.city, r.stationNo, r.lat, r.lon,
    ...r.T, ...r.P, r.source, r.period, r.note || "",
  ].join(","));
}
fs.writeFileSync(path.join(OUT_DIR, "japan_check.csv"), csvLines.join("\n") + "\n");

console.log(`generated ${result.length} stations, skipped ${skipped.length}`);
if (skipped.length) console.log("SKIPPED:", JSON.stringify(skipped, null, 2));

// 東京・札幌・那覇を既存PRESETSと突き合わせて一致確認
const existing = {
  "東京": { T:[5.4,6.1,9.4,14.3,18.8,21.9,25.7,26.9,23.3,18.0,12.5,7.7], P:[59.7,56.5,116.0,133.7,139.7,167.8,156.2,154.7,224.9,234.8,96.3,57.9] },
  "札幌": { T:[-3.2,-2.7,1.1,7.3,13.0,17.0,21.1,22.3,18.6,12.1,5.2,-0.9], P:[108.4,91.9,77.6,54.6,55.5,60.4,90.7,126.8,142.2,109.9,113.8,114.5] },
  "那覇": { T:[17.3,17.5,19.1,21.5,24.2,27.2,29.1,29.0,27.9,25.5,22.5,19.0], P:[101.6,114.5,142.8,161.0,245.3,284.4,188.1,240.0,275.2,179.2,119.1,110.0] },
};
console.log("\n=== 既存PRESETSとの突き合わせ ===");
for (const city of Object.keys(existing)) {
  const gen = result.find(r => r.city === city);
  const tMatch = JSON.stringify(gen.T) === JSON.stringify(existing[city].T);
  const pMatch = JSON.stringify(gen.P) === JSON.stringify(existing[city].P);
  console.log(`${city}: T ${tMatch ? "OK" : "MISMATCH"} / P ${pMatch ? "OK" : "MISMATCH"}`);
  if (!tMatch) console.log("  gen T:", gen.T, "\n  old T:", existing[city].T);
  if (!pMatch) console.log("  gen P:", gen.P, "\n  old P:", existing[city].P);
}
