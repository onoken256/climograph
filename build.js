#!/usr/bin/env node
"use strict";
// src/ の各パーツを結合して単一の climograph.html を生成する。
// 依存パッケージなし。`node build.js` で実行。
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");

const scriptFiles = ["app.js"];

const head = fs.readFileSync(path.join(SRC, "head.html"), "utf8").trim();
const style = fs.readFileSync(path.join(SRC, "style.css"), "utf8").trim();
const body = fs.readFileSync(path.join(SRC, "body.html"), "utf8").trim();
const script = scriptFiles
  .map(f => fs.readFileSync(path.join(SRC, f), "utf8").trim())
  .join("\n\n");

const out = `${head}
<style>
${style}
</style>

${body}

<script>
${script}
</script>
`;

const outPath = path.join(ROOT, "climograph.html");
fs.writeFileSync(outPath, out);
console.log(`built ${path.relative(ROOT, outPath)} (${(out.length / 1024).toFixed(1)} KB)`);
