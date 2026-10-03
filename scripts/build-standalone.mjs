// Builds ONE self-contained HTML file (game + styles + fonts + backgrounds + both languages) that works offline
// from a downloaded file. There are no accounts or syncing in it: progress is saved in that browser only.
// Usage: npx next build && node scripts/build-standalone.mjs   ->  dist/algebra-quest.html
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(path.join(root, p));
const mime = { jpg: "image/jpeg", webp: "image/webp", png: "image/png", svg: "image/svg+xml", woff2: "font/woff2" };
const dataUri = (file) => `data:${mime[file.split(".").pop()]};base64,${readFileSync(file).toString("base64")}`;

// 1. The game, bundled into one script (the Spanish text table is bundled in too).
const entry = `
import * as g from "./src/game/app.js";
import { setLang, deviceLang } from "./src/game/i18n.js";
setLang(deviceLang());
g.loadLearner({ key: g.LEGACY_STORAGE_KEY });
`;
writeFileSync(path.join(root, ".standalone-entry.js"), entry);
const js = (await build({ entryPoints: [path.join(root, ".standalone-entry.js")], bundle: true, write: false, format: "iife", minify: true, target: "es2020", logLevel: "error" })).outputFiles[0].text;

// 2. Styles, with backgrounds and flag images inlined.
let css = ["globals.css", "game.css"].map((f) => read("src/app/" + f).toString()).join("\n");
css = css.replace(/url\("\/(themes|flags)\/([^"]+)"\)/g, (m, dir, f) => `url("${dataUri(path.join(root, "public", dir, f))}")`);

// 3. Fonts: the Latin subset of Baloo 2 and Nunito that the site already downloaded at build time (covers á é í ó ú ñ ¿ ¡).
const cssDir = path.join(root, ".next/static/chunks");
const fontCssFile = readdirSync(cssDir).filter((f) => f.endsWith(".css")).find((f) => readFileSync(path.join(cssDir, f), "utf8").includes("@font-face"));
const fontCss = readFileSync(path.join(cssDir, fontCssFile), "utf8");
const faces = [...fontCss.matchAll(/@font-face\{[^}]*\}/g)].map((m) => m[0]).filter((b) => /unicode-range:U\+0-FF,/.test(b));
const fonts = faces.map((b) => b.replace(/url\(\.\.\/media\/([^)]+)\)/, (m, f) => `url(${dataUri(path.join(root, ".next/static/media", f))})`)).join("\n");
const vars = `:root{--font-baloo:"Baloo 2";--font-nunito:"Nunito"}`;

const flagImgs = ["do", "us"].map((f) => [f, dataUri(path.join(root, "public/flags", f + ".svg"))]);
const flagFix = `<script>window.AQ_FLAGS=${JSON.stringify(Object.fromEntries(flagImgs))}</script>`;

const html = `<!doctype html>
<html lang="en" data-theme="clean">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Algebra Quest</title>
<style>${fonts}\n${vars}\n${css}</style>
</head>
<body>
<div id="srAnnounce" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
<main id="app"></main>
<canvas id="confettiCanvas" aria-hidden="true"></canvas>
${flagFix}
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>`;
mkdirSync(path.join(root, "dist"), { recursive: true });
writeFileSync(path.join(root, "dist/algebra-quest.html"), html);
console.log(`dist/algebra-quest.html  ${(html.length / 1048576).toFixed(1)} MB`);
