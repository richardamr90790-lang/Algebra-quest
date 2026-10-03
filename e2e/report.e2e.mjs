// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");
const KEY = "algebraQuestState_v1";
const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const NOW = Date.now();

async function fresh(s) {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
  await page.evaluate(([k, st]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(st)); }, [KEY, { placementDismissed: true, tourDone: true, ...s }]);
  await page.reload(); await page.waitForSelector(".topic-card");
}

const seeded = {
  name: "Sam", xp: 450, bestStreak: 9, dailyCount: 3,
  mastered: { 19: [0, 1, 2, 3, 4, 5], 17: [0, 1] },
  stats: { answers: 80, correct: 60, reviews: 2, perfect: 1, bosses: 0, bossPerfect: 0 },
  placement: { at: NOW - 86400000, start: 20, regions: { foundations: { correct: 2, total: 2, level: "solid" }, expressions: { correct: 0, total: 2, level: "needs" }, graphing: { correct: 1, total: 2, level: "getting" } } },
  review: {
    1: { box: 0, due: "2999-01-01", last: "2026-10-01", at: 1, ok: false },
    5: { box: 1, due: "2000-01-01", last: "2026-09-01", at: 1, ok: true },
  },
  activity: [
    { at: NOW - 3600000, mode: "topic", title: "Functions & Function Notation", correct: 5, total: 6 },
    { at: NOW - 90000000, mode: "review", title: "Daily Review", correct: 3, total: 4 },
    { at: NOW - 200000000, mode: "boss", title: "Boss Battle — Easy", correct: 7, total: 10 },
  ],
};

await fresh(seeded);
await page.click("#reportBtn"); await page.waitForSelector(".report");
ok((await text(".report-head h1")).includes("Progress report") && (await text(".report-head h1")).includes("Sam"), "report opens with the learner's name");
const tiles = await page.$$eval(".rp-tile", (e) => e.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
ok(tiles.some((t) => t.includes("Lv 5")) && tiles.some((t) => t.includes("450")), "level and XP are shown");
ok(tiles.some((t) => t.startsWith("1/34")), "topics mastered: 1 of 34");
ok(tiles.some((t) => t.startsWith("60")), "right answers from the counters");
ok((await text(".report-head p")).toLowerCase().includes("last played today"), "last played comes from the activity log");

const areas = await page.$$(".rp-area");
ok(areas.length === 8, "all 8 areas are listed");
const graphing = await page.$$eval(".rp-area", (e) => e.map((x) => ({ t: x.textContent.replace(/\s+/g, " "), w: x.querySelector(".rp-bar-fill").style.width })).find((x) => x.t.includes("Graphing")));
ok(graphing.t.includes("1/4") && graphing.w === "25%", "Graphing shows 1/4 topics and a 25% bar");
ok((await text(".rp-areas")).includes("Needs work") && (await text(".rp-areas")).includes("Solid"), "check-in levels appear as chips on the areas");

const attention = await page.$$eval(".rp-list li", (e) => e.map((x) => x.textContent));
ok(/Exponent Rules.*missed/.test(attention[0]), "first to help with: the topic missed in the last review");
ok(attention.some((a) => /Expressions.*needs work/i.test(a)), "areas the check-in flagged are listed");
ok(attention.some((a) => /Absolute Value Equations.*due/.test(a)), "overdue reviews are listed");
ok((await text(".report")).includes("Adding & Subtracting Polynomials"), "the suggested starting point is shown");
ok((await text(".report")).includes("1 topic due now"), "reviews due are summarised");

const rows = await page.$$eval(".rp-table tbody tr", (e) => e.map((x) => x.textContent.replace(/\s+/g, " ")));
ok(rows.length === 3 && rows[0].includes("Functions") && rows[0].includes("5/6"), "recent activity lists sessions newest first with scores");
ok(rows[1].includes("Daily Review") && !rows[1].includes("Daily Review: Daily Review"), "a review row isn't labelled twice");
ok(rows[2].includes("Boss Battle — Easy") && !rows[2].includes("Boss Battle: Boss"), "nor is a boss row");

// ---- print: plain page, no controls ----
await page.emulateMedia({ media: "print" });
await page.waitForTimeout(800); // the theme colour fades, so give it a moment
ok(await page.$eval(".report-actions", (b) => getComputedStyle(b).display === "none"), "print hides the buttons");
ok(await page.$eval("body", (b) => getComputedStyle(b).backgroundColor === "rgb(255, 255, 255)" && getComputedStyle(b).backgroundImage === "none"), "print uses a plain white page");
ok(await page.$eval(".rp-tiles", (b) => getComputedStyle(b).display !== "none"), "the report itself still prints");
await page.emulateMedia({ media: "screen" });
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");

// ---- finishing a session adds it to the log ----
await fresh({ name: "Sam" });
await page.click('.topic-card[data-topic="19"]'); await page.waitForTimeout(300);
for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(200); } }
for (let i = 0; i < 6; i++) { await page.waitForSelector("#skipBtn"); await page.click("#skipBtn"); await page.click(i === 2 ? "#missedIt" : "#gotIt"); await page.waitForTimeout(900); }
await page.waitForSelector(".summary");
let s = await state();
ok(s.activity.length === 1 && s.activity[0].mode === "topic" && s.activity[0].correct === 5 && s.activity[0].total === 6, "a finished topic is logged with 5/6 (guided steps are not counted)");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#reportBtn"); await page.waitForSelector(".rp-table");
ok((await text(".rp-table tbody tr")).includes("Functions & Function Notation") && (await text(".rp-table tbody tr")).includes("5/6"), "and it shows in the report straight away");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");

// ---- a miss in review is flagged ----
await fresh({ review: { 1: { box: 2, due: "2000-01-01", last: "x", at: 1, ok: true } } });
await page.click("#reviewBtn"); await page.waitForSelector("#skipBtn");
await page.click("#skipBtn"); await page.click("#missedIt"); await page.waitForTimeout(900);
await page.click("#skipBtn"); await page.click("#missedIt"); await page.waitForTimeout(900);
await page.waitForSelector(".summary");
s = await state();
ok(s.review[1].ok === false && s.activity[0].mode === "review" && s.activity[0].correct === 0, "a missed review is remembered and logged");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#reportBtn"); await page.waitForSelector(".rp-list");
ok((await text(".rp-list")).includes("Exponent Rules: missed in the last review"), "so the report says where to help");

// ---- reset clears the log ----
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#resetBtn"); await page.click("#resetBtn"); await page.waitForTimeout(200);
s = await state();
ok(s.activity.length === 0, "reset clears the activity log");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
