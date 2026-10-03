// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";
import { ACHIEVEMENTS, earnedNow } from "../src/game/achievements.js";
import { TOPICS } from "../src/game/data/topics.js";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");
const KEY = "algebraQuestState_v1";
const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const TOTAL = ACHIEVEMENTS.length;

async function fresh(extra = {}) {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
  await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, { placementDismissed: true, tourDone: true, ...extra }]);
  await page.reload(); await page.waitForSelector(".topic-card");
}
async function enterTopic(id) {
  await page.click(`.topic-card[data-topic="${id}"]`); await page.waitForTimeout(300);
  for (const b of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + b); if (el) { await el.click(); await page.waitForTimeout(200); } }
  await page.waitForSelector("#skipBtn");
}
const answer = async (right) => { await page.click("#skipBtn"); await page.click(right ? "#gotIt" : "#missedIt"); await page.waitForTimeout(900); };

// ---- existing progress is credited quietly ----
const old = { xp: 450, bestStreak: 12, mastered: { 19: [0, 1, 2, 3, 4, 5] }, dailyCount: 8, owned: ["rocket"], placement: { at: 1, regions: {}, start: null }, stats: { answers: 150, correct: 120, reviews: 0, perfect: 0, bosses: 0, bossPerfect: 0 } };
await fresh(old);
const expected = earnedNow({ ...old }, TOPICS, () => 6).sort();
ok(expected.length >= 8, `the seeded progress qualifies for ${expected.length} badges`);
await page.waitForTimeout(600);
ok(!(await page.$(".badge-toast")), "no pop-up for badges earned before");
let s = await state();
ok(JSON.stringify(Object.keys(s.badges).sort()) === JSON.stringify(expected), "all of them are recorded");
ok((await text("#badgesBtn")).includes(`${expected.length}/${TOTAL}`), "the home button shows the count");
await page.click("#badgesBtn"); await page.waitForSelector(".badge-grid");
ok((await page.$$(".badge-tile")).length === TOTAL, `badge screen lists all ${TOTAL}`);
ok((await page.$$(".badge-tile.earned")).length === expected.length, "earned ones are marked");
ok((await text(".badge-tile.earned")).match(/\d{4}/) !== null, "earned badges show the date");
ok((await text(".badge-tile.locked")).length > 10 && (await page.$$eval(".badge-tile.locked .badge-icon", (e) => e.every((x) => x.textContent === "🔒"))), "locked ones show a lock and what to do");
ok((await text("#badgeCount")) === String(expected.length), "header counts them");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");

// ---- a new badge pops up when earned, and counters tick ----
await fresh();
ok(Object.keys((await state()).badges || {}).length === 0, "a new learner starts with no badges");
await enterTopic(5);
await page.click("#skipBtn"); await page.click("#gotIt");
await page.waitForSelector(".badge-toast", { timeout: 3000 });
ok((await text(".badge-toast")).includes("First Steps") && (await text(".badge-toast")).includes("Badge earned"), "first right answer pops up 'First Steps'");
await page.waitForTimeout(900);
await page.click(".badge-toast");
ok(!(await page.$(".badge-toast")), "tapping the pop-up dismisses it");
await answer(false).catch(() => {});
s = await state();
ok(s.stats.answers === 2 && s.stats.correct === 1, "answers and right answers are counted");
ok(!!s.badges["first-answer"], "the badge is saved");

// ---- the check-in does not count as answers ----
await fresh();
await page.click("#placementBtn"); await page.waitForSelector("#skipBtn");
await answer(true); await answer(true);
s = await state();
ok((s.stats && s.stats.answers || 0) === 0, "check-in answers are not counted");

// ---- review and daily challenge badges ----
await fresh({ review: { 1: { box: 0, due: "2000-01-01", last: "x", at: 1 } } });
await page.click("#reviewBtn"); await page.waitForSelector("#skipBtn");
await answer(true); await answer(true);
await page.waitForSelector(".summary");
s = await state();
ok(s.stats.reviews === 1 && !!s.badges["review-1"], "finishing a review counts and earns 'Remember When'");
await fresh();
await page.click("#dailyBtn"); await page.waitForSelector("#skipBtn");
for (let i = 0; i < 5; i++) await answer(true);
await page.waitForSelector(".summary");
s = await state();
ok(!!s.badges["daily-1"] && !!s.badges["first-answer"], "finishing the Daily Challenge earns 'Daily Starter'");

// ---- boss battle ----
await fresh();
await page.click("#bossBtn"); await page.waitForSelector("[data-boss-level]");
await page.click("[data-boss-level]"); await page.waitForSelector("#skipBtn");
let n = 0;
while (!(await page.$(".summary")) && n++ < 40) { await page.click("#skipBtn"); await page.click("#gotIt"); await page.waitForTimeout(900); }
s = await state();
ok(s.stats.bosses === 1 && s.stats.bossPerfect === 1, "a perfect Boss Battle counts as finished and perfect");
ok(!!s.badges["boss-1"] && !!s.badges["boss-perfect"], "and earns Boss Battler and Boss Slayer");

// ---- shop and reset ----
await fresh({ xp: 400 });
await page.click("#shopBtn"); await page.waitForSelector(".shop-grid");
await page.click('[data-buy="rocket"]'); await page.click('[data-buy="rocket"]');
await page.waitForSelector(".badge-toast");
ok((await text(".badge-toast")).includes("First Purchase"), "buying in the shop earns 'First Purchase'");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#resetBtn"); await page.click("#resetBtn"); await page.waitForTimeout(200);
s = await state();
ok(Object.keys(s.badges).length === 0 && s.stats.correct === 0, "reset clears badges and counters");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
