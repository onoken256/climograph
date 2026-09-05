#!/usr/bin/env node
"use strict";
/*
 * Natural Earth 110m の国境GeoJSON (data/raw/map/world_countries.geojson,
 * https://github.com/nvkelso/natural-earth-vector) を簡略化し、SVGパスに
 * 変換する。AIの記憶からパスを書き起こすことは一切していない。
 *
 * data/world.json (フェーズ4で気象庁データから生成した37か国・地域) の
 * 各国と、このGeoJSONの地物をADM0_A3コード(ISO_A3にはフランス・
 * ノルウェー等で -99 が入る既知の癖があるため、より安定したADM0_A3を使う)
 * で対応付ける。
 *
 * 香港はこの解像度のデータでは独立した地物として存在しない(中国に含まれる
 * ため)。地図上では選択できないが、国名ボタンからは選択できる。
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "data", "raw", "map", "world_countries.geojson");
const OUT = path.join(__dirname, "..", "data", "world_map.json");
const WORLD_JSON = path.join(__dirname, "..", "data", "world.json");

const geo = JSON.parse(fs.readFileSync(SRC, "utf8"));
const worldClimate = JSON.parse(fs.readFileSync(WORLD_JSON, "utf8"));

// 気候データの国名(日本語) -> Natural EarthのADM0_A3コード
const ADM0 = {
  "アメリカ合衆国":"USA","カナダ":"CAN","メキシコ":"MEX","ブラジル":"BRA","アルゼンチン":"ARG","チリ":"CHL","ペルー":"PER",
  "イギリス":"GBR","フランス":"FRA","イタリア":"ITA","ドイツ":"DEU","スペイン":"ESP","ポルトガル":"PRT","ロシア":"RUS",
  "ウクライナ":"UKR","ノルウェー":"NOR","フィンランド":"FIN","アイスランド":"ISL","トルコ":"TUR",
  "エジプト":"EGY","モロッコ":"MAR","チュニジア":"TUN","エチオピア":"ETH","ケニア":"KEN",
  "サウジアラビア":"SAU","中国":"CHN","韓国":"KOR","モンゴル":"MNG","インド":"IND","スリランカ":"LKA",
  "パキスタン":"PAK","タイ":"THA","マレーシア":"MYS","インドネシア":"IDN","カザフスタン":"KAZ","オーストラリア":"AUS",
  // 香港はこの解像度のGeoJSONに独立した地物が無い(中国に統合されている)。
};

const missing = worldClimate.map(c => c.country).filter(c => !ADM0[c] && c !== "香港");
if (missing.length) console.log("WARNING: ADM0コード未設定:", missing);

// ---- Douglas-Peucker（フェーズ5の日本地図と同じ実装） ----
function perpDist(p, a, b) {
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}
function simplify(points, epsilon) {
  if (points.length < 3) return points.slice();
  let maxDist = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; idx = i; }
  }
  if (maxDist > epsilon) {
    const left = simplify(points.slice(0, idx + 1), epsilon);
    const right = simplify(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}
function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

const EPSILON = 0.08; // 度単位。世界地図は縮尺が小さいのでJapanより粗めでよい
const MIN_RING_RATIO = 0.01;
const MAX_RINGS = 4;

function extractRings(feature) {
  const geom = feature.geometry;
  const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  return polys.map(poly => poly[0]);
}
function pickRings(rings) {
  const withArea = rings.map(r => ({ r, area: ringArea(r) })).sort((a, b) => b.area - a.area);
  const maxArea = withArea[0].area;
  return withArea.filter((x, i) => i === 0 || (x.area >= maxArea * MIN_RING_RATIO && i < MAX_RINGS)).map(x => x.r);
}

// ---- 投影: 正距円筒図法（経度・緯度をそのままxy、緯度は上下反転） ----
const SVG_W = 1000;
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const featData = [];
for (const f of geo.features) {
  const adm0 = f.properties.ADM0_A3;
  const jaName = Object.keys(ADM0).find(k => ADM0[k] === adm0);
  const rings = pickRings(extractRings(f)).map(r => simplify(r, EPSILON));
  for (const ring of rings) for (const [lon, lat] of ring) {
    if (lon < minX) minX = lon; if (lat < minY) minY = lat;
    if (lon > maxX) maxX = lon; if (lat > maxY) maxY = lat;
  }
  featData.push({ name: jaName || f.properties.NAME, matched: !!jaName, rings });
}
const pad = 6;
const scale = (SVG_W - pad * 2) / (maxX - minX);
const SVG_H = Math.ceil((maxY - minY) * scale + pad * 2);
function toSvg(lon, lat) { return [(lon - minX) * scale + pad, (maxY - lat) * scale + pad]; }
function ringToPath(ring) {
  return ring.map(([lon, lat], i) => {
    const [x, y] = toSvg(lon, lat);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

const out = { viewBox: [0, 0, SVG_W, SVG_H], countries: [] };
for (const f of featData) {
  const d = f.rings.map(ringToPath).join(" ");
  out.countries.push({ name: f.name, matched: f.matched, d });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const kb = fs.statSync(OUT).size / 1024;
const matchedCount = out.countries.filter(c => c.matched).length;
console.log(`wrote ${OUT} (${kb.toFixed(1)} KB), ${out.countries.length} shapes, ${matchedCount} matched to world.json, viewBox ${SVG_W}x${SVG_H}`);

const mappedNames = new Set(out.countries.filter(c => c.matched).map(c => c.name));
const notOnMap = worldClimate.map(c => c.country).filter(c => !mappedNames.has(c));
console.log("world.jsonにあるが地図には無い(=ボタンからのみ選択可):", notOnMap);
