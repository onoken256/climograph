#!/usr/bin/env node
"use strict";
/*
 * 気象庁「世界の地点別平年値」(1991-2020) から選定した37か国・地域の
 * 代表都市の月別平均気温・月別降水量・緯度経度を、data/raw/world_pages/
 * (NrmMonth.php の個別ページ) から抽出する。
 *
 * たどり方: 気象庁トップ > 各種データ・資料 > 地球環境・気候 > 世界の天候
 *   > 世界の地点別平年値 > 領域・国別に探す > (大陸) > (国) > (地点)
 * このページ自体に地点名・国名・緯度経度・月別平年値が直接埋め込まれており、
 * 記憶からの補完は一切していない。
 *
 * 唯一 香港(45004) だけはこの経路で個別ページが取得できなかったため、
 * 気象庁「主な地点の平年値」ページ(world_stations_raw.json)の値を使う
 * （そちらも同じ気象庁の一次データ）。緯度経度はそちらのページに無いため
 * 不明として空欄にし、正直に報告する。
 */
const fs = require("fs");
const path = require("path");

const RAW_DIR = path.join(__dirname, "..", "data", "raw", "world_pages");
const MAINSTN_JSON = path.join(__dirname, "..", "data", "raw", "world_stations_raw.json");
const OUT_DIR = path.join(__dirname, "..", "data");

// country_jp, city_jp, stn(0埋め5桁 or ファイル名に合わせる), region(大陸グループ), note
const SELECTION = [
  ["北アメリカ", "アメリカ合衆国", "ニューヨーク", "72503"],
  ["北アメリカ", "カナダ", "トロント", "71508"],
  ["北アメリカ", "メキシコ", "メキシコシティ", "76680"],
  ["南アメリカ", "ブラジル", "サンパウロ", "83781"],
  ["南アメリカ", "アルゼンチン", "ブエノスアイレス", "87585"],
  ["南アメリカ", "チリ", "サンティアゴ", "85574"],
  ["南アメリカ", "ペルー", "リマ", "84628"],
  ["ヨーロッパ", "イギリス", "ロンドン", "03772", "ヒースロー空港（ロンドン中心部に観測所が無いための代替）"],
  ["ヨーロッパ", "フランス", "パリ", "07149", "オルリー空港"],
  ["ヨーロッパ", "イタリア", "トリノ", "16061", "気象庁データにローマの観測地点が無いための代替"],
  ["ヨーロッパ", "ドイツ", "ベルリン", "10384"],
  ["ヨーロッパ", "スペイン", "マドリード", "08222"],
  ["ヨーロッパ", "ポルトガル", "リスボン", "08535"],
  ["ヨーロッパ", "ロシア", "モスクワ", "27612"],
  ["ヨーロッパ", "ウクライナ", "キーウ", "33345"],
  ["ヨーロッパ", "ノルウェー", "オスロ", "01384"],
  ["ヨーロッパ", "フィンランド", "ヘルシンキ", "02974"],
  ["ヨーロッパ", "アイスランド", "レイキャビク", "04030"],
  ["ヨーロッパ", "トルコ", "アンカラ", "17130"],
  ["アフリカ", "エジプト", "カイロ", "62378", "ヘルワン（カイロ首都圏、気象庁の代表観測地点）"],
  ["アフリカ", "モロッコ", "カサブランカ", "60155"],
  ["アフリカ", "チュニジア", "チュニス", "60715"],
  ["アフリカ", "エチオピア", "アディスアベバ", "63450"],
  ["アフリカ", "ケニア", "ナイロビ", "63740"],
  ["アジア", "サウジアラビア", "リヤド", "40438"],
  ["アジア", "中国", "ペキン", "54511"],
  ["アジア", "香港", "ホンコン", "45004"],
  ["アジア", "韓国", "ソウル", "47108"],
  ["アジア", "モンゴル", "ウランバートル", "44292"],
  ["アジア", "インド", "ニューデリー", "42182"],
  ["アジア", "スリランカ", "コロンボ", "43466"],
  ["アジア", "パキスタン", "カラチ", "41780"],
  ["アジア", "タイ", "バンコク", "48455"],
  ["アジア", "マレーシア", "クアラルンプール", "48647"],
  ["アジア", "インドネシア", "ジャカルタ", "96749", "スカルノハッタ国際空港"],
  ["アジア", "カザフスタン", "アルマトイ", "36870"],
  ["オセアニア", "オーストラリア", "シドニー", "94767"],
];

function parseNrmPage(stn) {
  const file = path.join(RAW_DIR, `nrm_${stn}.html`);
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, "utf8");
  const text = html.replace(/<[^>]+>/g, " ").replace(/&deg;/g, "°").replace(/\s+/g, " ");

  const titleIdx = text.indexOf("平年値データ 平年値データ");
  const latIdx = text.indexOf("緯度：");
  if (titleIdx < 0 || latIdx < 0) return null;
  const nameCountry = text.slice(titleIdx + "平年値データ 平年値データ".length, latIdx).trim();
  const dashIdx = nameCountry.lastIndexOf(" - ");
  if (dashIdx < 0) return null;
  const stationName = nameCountry.slice(0, dashIdx).trim();
  const country = nameCountry.slice(dashIdx + 3).replace(/&nbsp;/g, "").trim();

  const latM = text.match(/緯度：([\d.]+)°([NS])/);
  const lonM = text.match(/経度：([\d.]+)°([EW])/);
  if (!latM || !lonM) return null;

  const nums = text.match(/月 平年値 月平均気温 ℃ 月降水量 mm([\s\S]+?)このサイト/);
  if (!nums) return null;
  const rows = nums[1].trim().split(/\s+/);
  const T = [], P = [];
  for (let m = 0; m < 12; m++) {
    const base = m * 3;
    const t = rows[base + 1], p = rows[base + 2];
    T.push(t === "-" ? null : parseFloat(t));
    P.push(p === "-" ? null : parseFloat(p));
  }
  const lat = Math.round(parseFloat(latM[1]) * (latM[2] === "S" ? -1 : 1) * 10000) / 10000;
  const lon = Math.round(parseFloat(lonM[1]) * (lonM[2] === "W" ? -1 : 1) * 10000) / 10000;
  return { stationName, country, lat, lon, T, P };
}

const mainstn = JSON.parse(fs.readFileSync(MAINSTN_JSON, "utf8"));
function fromMainstn(stn) {
  const rec = mainstn.find(r => r.wmoNo === String(Number(stn)));
  if (!rec) return null;
  return { stationName: rec.name, country: rec.country, lat: null, lon: null, T: rec.T, P: rec.P };
}

const result = [];
const problems = [];

for (const [region, country, city, stn, note] of SELECTION) {
  let parsed = parseNrmPage(stn);
  let latlonMissing = false;
  if (!parsed) {
    parsed = fromMainstn(stn);
    if (parsed) latlonMissing = true;
  }
  if (!parsed || parsed.T.some(v => v == null) || parsed.P.some(v => v == null)) {
    problems.push({ country, city, stn, reason: !parsed ? "取得失敗" : "欠測(---)を含む" });
    continue;
  }
  result.push({
    region, country, city, wmoNo: String(Number(stn)),
    lat: parsed.lat, lon: parsed.lon,
    T: parsed.T, P: parsed.P,
    pMax: [300, 600, 900, 1200].find(v => v >= Math.max(...parsed.P)) || 1800,
    hemi: parsed.lat != null ? (parsed.lat >= 0 ? "N" : "S") : (["ブラジル","アルゼンチン","チリ","ペルー","オーストラリア","ケニア"].includes(country) ? "S" : "N"),
    source: "気象庁 世界の地点別平年値(1991-2020)", period: "1991-2020",
    note: note || (latlonMissing ? "緯度経度は気象庁サイトから未取得（個別ページに未対応のため空欄）" : undefined),
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "world.json"), JSON.stringify(result, null, 2));

const csvLines = ["region,country,city,wmoNo,lat,lon," +
  Array.from({length:12},(_,i)=>`T${i+1}`).join(",") + "," +
  Array.from({length:12},(_,i)=>`P${i+1}`).join(",") + ",hemi,source,period,note"];
for (const r of result) {
  csvLines.push([
    r.region, r.country, r.city, r.wmoNo, r.lat ?? "", r.lon ?? "",
    ...r.T, ...r.P, r.hemi, r.source, r.period, r.note || "",
  ].join(","));
}
fs.writeFileSync(path.join(OUT_DIR, "world_check.csv"), csvLines.join("\n") + "\n");

console.log(`generated ${result.length} / ${SELECTION.length} world stations`);
if (problems.length) console.log("PROBLEMS:", JSON.stringify(problems, null, 2));

// 内部整合性チェック: 「主な地点の平年値」(103地点, 別スクレイプ)と一致するか
console.log("\n=== 「主な地点の平年値」との突き合わせ (別経路で取得した同一地点) ===");
for (const city of ["ニューヨーク", "モスクワ", "ペキン", "ニューデリー", "リヤド", "シドニー"]) {
  const gen = result.find(r => r.city === city);
  const ref = mainstn.find(r => r.name === city);
  if (!gen || !ref) { console.log(`${city}: 比較対象なし`); continue; }
  const tMatch = JSON.stringify(gen.T) === JSON.stringify(ref.T);
  const pMatch = JSON.stringify(gen.P) === JSON.stringify(ref.P);
  console.log(`${city}: T ${tMatch ? "OK" : "MISMATCH"} / P ${pMatch ? "OK" : "MISMATCH"}`);
  if (!tMatch) console.log("  new T:", gen.T, "\n  103list T:", ref.T);
  if (!pMatch) console.log("  new P:", gen.P, "\n  103list P:", ref.P);
}
