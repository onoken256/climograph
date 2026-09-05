#!/usr/bin/env node
"use strict";
/*
 * 都道府県境界の実地形GeoJSON (data/raw/map/japan_high.geojson, 出典は
 * scripts/README等を参照) を簡略化し、SVGパス文字列に変換する。
 * AIの記憶からパスを書き起こすことは一切していない — 実データを
 * Douglas-Peuckerで間引いて座標変換しているだけ。
 *
 * 出典データ: https://github.com/dataofjapan/land (japan.geojson)
 *   47都道府県 = 47 Feature、各 properties.nam_ja が都道府県名（漢字）。
 *
 * 沖縄県だけ地理的に大きく離れているため、別枠（インセット）に
 * 独自スケールで描画する（本州以下と同一スケールだと豆粒になるため）。
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "data", "raw", "map", "japan_high.geojson");
const OUT = path.join(__dirname, "..", "data", "japan_map.json");

const geo = JSON.parse(fs.readFileSync(SRC, "utf8"));

// ---- Douglas-Peucker（度単位の座標に対して単純に実行。緯度補正はしない
//      —簡略化の目的だけなので十分） ----
function perpDist(p, a, b) {
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx, py = y1 + t * dy;
  return Math.hypot(x - px, y - py);
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

// 各都道府県のポリゴンを取り出し、小さすぎる島（面積が最大リングの
// MIN_RING_RATIO 未満）は間引く。ただし沖縄・鹿児島・東京・長崎など
// 離島県は最低限の島を残すため下限個数も設ける。
function extractRings(feature) {
  const geom = feature.geometry;
  const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  const rings = [];
  for (const poly of polys) rings.push(poly[0]); // 外環のみ（穴は無視して十分）
  return rings;
}

const MIN_RING_RATIO = 0.004; // 最大リング面積の0.4%未満の島は捨てる
const MAX_ISLANDS = 6; // 1都道府県あたり残す最大リング数（本土/主要島+離島）

function pickRings(rings) {
  const withArea = rings.map(r => ({ r, area: ringArea(r) })).sort((a, b) => b.area - a.area);
  const maxArea = withArea[0].area;
  const kept = withArea.filter((x, i) => i === 0 || (x.area >= maxArea * MIN_RING_RATIO && i < MAX_ISLANDS));
  return kept.map(x => x.r);
}

const EPSILON = 0.006; // 簡略化の許容誤差（度）

const prefectures = [];
for (const f of geo.features) {
  const nameJa = f.properties.nam_ja;
  const rings = pickRings(extractRings(f)).map(r => simplify(r, EPSILON));
  prefectures.push({ name: nameJa, id: f.properties.id, rings });
}

// ---- 投影: 本州以下(沖縄以外)は共通の等距円筒図法(経度をcos(緯度)で補正)
//      沖縄だけ別インセットで独自スケール ----
const LAT_REF = 36; // 日本付近の基準緯度（経度方向の縮尺補正用）
const cosRef = Math.cos(LAT_REF * Math.PI / 180);

function project(lon, lat) { return [lon * cosRef, -lat]; }

const mainPrefs = prefectures.filter(p => p.name !== "沖縄県");
const okinawaPref = prefectures.find(p => p.name === "沖縄県");

function bboxOf(prefs) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of prefs) for (const ring of p.rings) for (const [lon, lat] of ring) {
    const [x, y] = project(lon, lat);
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

const mainBox = bboxOf(mainPrefs);
const okiBox = bboxOf([okinawaPref]);

// SVG座標系: 幅960、高さは本土のアスペクト比に合わせる
const SVG_W = 960;
const pad = 10;
const mainW = mainBox.maxX - mainBox.minX, mainH = mainBox.maxY - mainBox.minY;
const scale = (SVG_W - pad * 2) / mainW;
const SVG_H = Math.ceil(mainH * scale + pad * 2);

function toSvgMain(lon, lat) {
  const [x, y] = project(lon, lat);
  return [(x - mainBox.minX) * scale + pad, (y - mainBox.minY) * scale + pad];
}

// 沖縄インセット: 画面左下に固定サイズの枠を置く
const OKI_BOX = { x: 14, y: SVG_H - 150, w: 230, h: 140 };
const okiScale = Math.min(
  (OKI_BOX.w - 10) / (okiBox.maxX - okiBox.minX),
  (OKI_BOX.h - 10) / (okiBox.maxY - okiBox.minY)
);
function toSvgOki(lon, lat) {
  const [x, y] = project(lon, lat);
  const w = (okiBox.maxX - okiBox.minX) * okiScale, h = (okiBox.maxY - okiBox.minY) * okiScale;
  const offX = OKI_BOX.x + (OKI_BOX.w - w) / 2, offY = OKI_BOX.y + (OKI_BOX.h - h) / 2;
  return [(x - okiBox.minX) * okiScale + offX, (y - okiBox.minY) * okiScale + offY];
}

function ringToPath(ring, toSvg) {
  return ring.map(([lon, lat], i) => {
    const [x, y] = toSvg(lon, lat);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

const out = { viewBox: [0, 0, SVG_W, SVG_H], okinawaInset: OKI_BOX, prefectures: [] };
for (const p of prefectures) {
  const isOki = p.name === "沖縄県";
  const toSvg = isOki ? toSvgOki : toSvgMain;
  const d = p.rings.map(r => ringToPath(r, toSvg)).join(" ");
  out.prefectures.push({ name: p.name, id: p.id, d, inset: isOki });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const kb = fs.statSync(OUT).size / 1024;
console.log(`wrote ${OUT} (${kb.toFixed(1)} KB), ${out.prefectures.length} prefectures, viewBox ${SVG_W}x${SVG_H}`);

let totalPts = 0;
for (const p of prefectures) for (const r of p.rings) totalPts += r.length;
console.log(`total points after simplify: ${totalPts}`);
