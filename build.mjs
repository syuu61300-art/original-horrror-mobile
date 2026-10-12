// =============================================================
//  build.mjs — 単体版 HTML の生成 (開発者用)
//   src/ の ES モジュール群と three.js / cannon-es を 1 つにまとめ、
//   ダブルクリックで開ける index.html (単体版) と、公開ページ用の dist/artifact.html を作る。
//   使い方:  npm install && npm run build      (デバッグ用に圧縮しない: npm run build:dev)
// =============================================================
import { build } from 'esbuild';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const FONTS = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600&family=Yuji+Syuku&family=Zen+Antique&display=swap';
const TITLE = '沈灯 ― 灯籠ヶ沢の祈り';
const BASE_CSS = ':root{color-scheme:dark}html,body{height:100%;margin:0;background:#050607;color:#d9d0bd;overflow:hidden;overscroll-behavior:none;-webkit-text-size-adjust:100%}canvas{touch-action:none}#app{position:fixed;inset:0}canvas{display:block}';

const minify = !process.argv.includes('--dev');
const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify,
  target: ['es2020'],
  write: false,
  legalComments: 'eof',
  charset: 'utf8',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/chinto.bundle.js', res.outputFiles[0].text);

const full = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>${TITLE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${BASE_CSS}</style>
</head>
<body>
<div id="app"></div>
<script>${js}</script>
</body>
</html>
`;
writeFileSync('index.html', full);

// 公開ページ用 (doctype/html/head/body はホスト側が付ける)
const art = `<title>${TITLE}</title>
<link rel="stylesheet" href="${FONTS}">
<style>${BASE_CSS}</style>
<div id="app"></div>
<script>${js}</script>
`;
writeFileSync('dist/artifact.html', art);
console.log('built', (full.length / 1024 / 1024).toFixed(2) + ' MB');
