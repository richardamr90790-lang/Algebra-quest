// Accessibility audit with axe-core across every screen and theme, plus phone-width layout checks.
// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser. Set A11Y_REPORT=1 to print every violation.
import { chromium } from "playwright";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const THEMES = ["clean", "midnight", "neon", "forest", "sunset", "pink", "glam", "tide", "holo"]; // the last three are premium shop themes
const KEY = "algebraQuestState_v1";
// A11Y_LANG=es runs the screen audits and layout checks in Spanish (the keyboard/touch checks below assert English text).
const LANG = process.env.A11Y_LANG || "";
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
await page.route(/fonts\.g/, (r) => r.abort());

const NOW = Date.now();
const rich = (theme) => ({
  theme, lang: LANG, name: "Sam", xp: 450, bestStreak: 9, dailyCount: 3, placementDismissed: false,
  mastered: { 19: [0, 1, 2, 3, 4, 5], 17: [0, 1] }, owned: ["rocket", "gold", theme], avatar: "rocket", frame: "gold",
  badges: { "first-answer": NOW, "master-1": NOW }, stats: { answers: 80, correct: 60, reviews: 2 },
  review: { 1: { box: 0, due: "2000-01-01", last: "x", at: 1, ok: false } },
  placement: { at: NOW, start: 20, regions: { foundations: { correct: 2, total: 2, level: "solid" }, expressions: { correct: 0, total: 2, level: "needs" } } },
  activity: [{ at: NOW - 3600000, mode: "topic", title: "Functions & Function Notation", correct: 5, total: 6 }],
});

async function load(theme, extra = {}) {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
  await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, { ...rich(theme), ...extra }]);
  await page.reload(); await page.waitForSelector(".topic-card");
  await page.waitForTimeout(400);
}
const click = async (sel) => { await page.click(sel); await page.waitForTimeout(350); };
const skipIntro = async () => { for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(200); } } };

// Each step takes the page from the home screen to the screen under test.
const SCREENS = {
  home: async () => {},
  "theme-menu": async () => click("#themeToggleBtn"),
  "avatar-menu": async () => click("#avatarBtn"),
  "boss-menu": async () => click("#bossBtn"),
  dictionary: async () => click("#dictionaryBtn"),
  shop: async () => click("#shopBtn"),
  badges: async () => click("#badgesBtn"),
  report: async () => click("#reportBtn"),
  "lesson-intro": async () => click('.topic-card[data-topic="19"]'),
  question: async () => { await click('.topic-card[data-topic="19"]'); await skipIntro(); await page.waitForSelector("#answerInput"); },
  hint: async () => { await click('.topic-card[data-topic="19"]'); await skipIntro(); await click("#hintBtn"); },
  "answer-revealed": async () => { await click('.topic-card[data-topic="19"]'); await skipIntro(); await page.fill("#answerInput", "0"); await click("#checkBtn"); await click("#skipBtn"); },
  summary: async () => {
    await click("#dailyBtn");
    for (let i = 0; i < 5; i++) { await page.waitForSelector("#skipBtn"); await page.click("#skipBtn"); await page.click("#gotIt"); await page.waitForTimeout(900); }
    await page.waitForSelector(".summary");
  },
  checkin: async () => click("#placementBtn"),
  "review-card": async () => {},
};

const found = new Map(); // "rule|screen" -> {themes:Set, nodes, help}
let screensChecked = 0;
for (const theme of THEMES) {
  for (const [name, go] of Object.entries(SCREENS)) {
    await load(theme);
    try { await go(); } catch (e) { console.log("could not reach", name, "in", theme, String(e).slice(0, 80)); continue; }
    await page.evaluate(AXE);
    const res = await page.evaluate(() => axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } }));
    screensChecked++;
    for (const v of res.violations) {
      const k = `${v.id}|${name}`;
      const e = found.get(k) || { id: v.id, screen: name, impact: v.impact, help: v.help, themes: new Set(), nodes: new Set() };
      e.themes.add(theme);
      v.nodes.slice(0, 6).forEach((n) => e.nodes.add(n.target.join(" ")));
      found.set(k, e);
    }
  }
}
console.log(`audited ${screensChecked} screen/theme combinations`);
const list = [...found.values()].sort((a, b) => a.id.localeCompare(b.id));
for (const e of list) {
  console.log(`  [${e.impact}] ${e.id} on ${e.screen} (${[...e.themes].join(",")}) - ${e.help}`);
  console.log("      ", [...e.nodes].slice(0, 5).join(" | "));
}
ok(screensChecked === THEMES.length * Object.keys(SCREENS).length, `every screen was reachable in every theme (${screensChecked})`);
ok(list.length === 0, "axe finds no accessibility violations on any screen in any theme");

// ---------- layout: nothing spills sideways, from small phones up to a tablet ----------
const LAYOUT_SCREENS = ["home", "shop", "badges", "report", "dictionary", "question", "answer-revealed", "summary"];
for (const [w, h] of [[320, 568], [360, 740], [390, 844], [768, 1024]]) {
  await page.setViewportSize({ width: w, height: h });
  const bad = [];
  for (const name of LAYOUT_SCREENS) {
    await load("clean");
    await SCREENS[name]();
    await page.waitForTimeout(250);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) bad.push(`${name} (+${over}px)`);
  }
  ok(bad.length === 0, `${w}px wide: no horizontal scrolling on ${LAYOUT_SCREENS.length} screens${bad.length ? " - " + bad.join(", ") : ""}`);
}
await page.setViewportSize({ width: 390, height: 844 });
if (LANG) {
  ok(errs.length === 0, "no page errors");
  await browser.close();
  process.exit(process.exitCode || 0);
}

// ---------- touch: buttons are big enough for a finger ----------
const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const tp = await touch.newPage();
await tp.route(/fonts\.g/, (r) => r.abort());
await tp.goto("http://localhost:3100/"); await tp.waitForSelector(".topic-card");
await tp.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, { ...rich("clean"), placementDismissed: true, tourDone: true }]);
await tp.reload(); await tp.waitForSelector(".topic-card");
const tooSmall = async (page_) => page_.evaluate(() => [...document.querySelectorAll("#app button, #app input:not([type=hidden]), #app select")]
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && (r.width < 36 || r.height < 36) && !e.classList.contains("topic-open"); })
  .map((e) => `${e.id || e.className}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
let small = await tooSmall(tp);
ok(small.length === 0, `touch: every button on the home screen is at least 36px${small.length ? " - " + small.slice(0, 5).join(", ") : ""}`);
await tp.click('.topic-card[data-topic="19"]'); await tp.waitForTimeout(300);
for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await tp.$("#" + id); if (el) { await el.click(); await tp.waitForTimeout(200); } }
await tp.waitForSelector("#answerInput");
small = await tooSmall(tp);
ok(small.length === 0, `touch: every button on a question screen is at least 36px${small.length ? " - " + small.slice(0, 5).join(", ") : ""}`);
await touch.close();

// ---------- keyboard only ----------
await load("clean", { placementDismissed: true, tourDone: true });
async function tabTo(predicate, max = 80) {
  for (let i = 0; i < max; i++) { await page.keyboard.press("Tab"); if (await page.evaluate(predicate)) return true; }
  return false;
}
ok(await tabTo(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.topicOpen === "1"), "Tab reaches the first topic");
await page.keyboard.press("Enter"); await page.waitForTimeout(400);
ok(await page.evaluate(() => document.activeElement && document.activeElement.tagName === "H2" && !!document.activeElement.closest(".qtitle")), "opening a screen moves focus to its heading");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");
ok(await page.evaluate(() => document.activeElement && document.activeElement.tagName === "H1"), "going back moves focus to the home heading");
await load("clean", { placementDismissed: true, tourDone: true });
await tabTo(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.topicOpen === "1");
const ring = await page.evaluate(() => getComputedStyle(document.activeElement.closest(".topic-card")).outlineStyle);
ok(ring === "solid", "the focused topic card shows a visible focus ring");
await page.keyboard.press("Enter"); await page.waitForTimeout(400);
ok((await page.$$(".dots")).length === 0 && (await page.textContent(".qtitle h2")).includes("Exponent Rules"), "Enter on a topic opens it (once)");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");
await tabTo(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.topicOpen === "2");
await page.keyboard.press("Space"); await page.waitForTimeout(400);
ok((await page.textContent(".qtitle h2")).includes("Scientific Notation"), "Space on a topic opens it too");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");
ok(await page.evaluate(() => [...document.querySelectorAll("[tabindex]")].every((e) => Number(e.getAttribute("tabindex")) <= 0)), "nothing jumps the natural tab order");
await page.focus("#themeToggleBtn"); await page.keyboard.press("Enter"); await page.waitForTimeout(250);
ok(!!(await page.$("#themePanel")) && (await page.evaluate(() => document.activeElement.closest("#themePanel") !== null)), "opening the theme menu from the keyboard moves focus into it");
await page.keyboard.press("Escape"); await page.waitForTimeout(250);
ok(!(await page.$("#themePanel")), "Escape closes it");

// a typed answer can be submitted with Enter, and the page announces results politely
await page.click('.topic-card[data-topic="19"]'); await page.waitForTimeout(300);
for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(200); } }
await page.focus("#answerInput"); await page.keyboard.type("16"); await page.keyboard.press("Enter"); await page.waitForTimeout(400);
ok(!!(await page.$("#nextBtn")), "Enter submits a typed answer");
await page.waitForTimeout(200);
ok((await page.textContent("#srAnnounce")).includes("Correct"), "a right answer is announced to screen readers");
ok((await page.evaluate(() => document.documentElement.lang)) === "en", "the page declares its language");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
