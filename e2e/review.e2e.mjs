// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const KEY = "algebraQuestState_v1";
const base = { xp: 0, bestStreak: 0, mastered: {}, customProblems: {}, theme: "clean", name: "", masteredDates: {}, avatar: "root", updatedAt: 1, resetAt: 0, topicResets: {}, tourDone: true };
const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const seed = (extra) => page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, { ...base, ...extra }]);

// Play through whatever session is open. mode "right" marks every problem correct, "wrong" marks each wrong.
async function playSession(mode) {
  for (let i = 0; i < 80; i++) {
    if (await page.$(".summary")) return;
    const mark = await page.$(mode === "right" ? "#gotIt" : "#missedIt");
    if (mark) { await mark.click(); await page.waitForTimeout(800); continue; }
    if (await page.$("#skipBtn")) { await page.click("#skipBtn"); await page.waitForTimeout(150); continue; }
    if (await page.$("#nextBtn")) { await page.click("#nextBtn"); await page.waitForTimeout(800); continue; }
    await page.waitForTimeout(200);
  }
  throw new Error("session did not finish");
}

// 1. Nothing scheduled yet: no review card.
await page.goto("http://localhost:3100/");
await page.waitForSelector(".topic-card");
ok(!(await page.$(".review-card")), "no review card before anything is scheduled");

// 2. Two topics overdue, one in the future.
await seed({ review: {
  1: { box: 0, due: "2000-01-01", last: "1999-12-31", at: 1 },
  2: { box: 1, due: "2000-01-02", last: "1999-12-30", at: 1 },
  3: { box: 0, due: "2999-01-01", last: "2026-10-01", at: 1 },
} });
await page.reload(); await page.waitForSelector(".topic-card");
ok((await page.textContent(".review-card")).includes("2 due"), "home shows how many topics are due");
ok((await page.textContent(".review-card")).includes("Exponent Rules"), "home names the due topics");

// 3. Run the review and get everything right.
await page.click("#reviewBtn");
await page.waitForSelector(".dots");
ok((await page.textContent(".qtitle h2")).includes("Daily Review"), "review session opens");
ok((await page.$$eval(".dots span", (e) => e.length)) === 4, "2 problems per due topic (4 total)");
await playSession("right");
let s = await stored();
const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
ok(s.review[1].box === 1 && s.review[1].due > today, "passed topic moved to a longer gap");
ok(s.review[2].box === 2 && s.review[2].due > today, "second passed topic moved up too");
ok(s.review[3].due === "2999-01-01", "topic that wasn't due was left alone");
ok(s.xp > 0, "review earned XP");
await page.click("#homeBtn");
await page.waitForSelector(".review-card");
ok((await page.textContent(".review-card")).includes("caught up"), "home shows all caught up afterwards");

// 4. Miss a review: topic returns tomorrow with box reset.
await seed({ review: { 4: { box: 3, due: "2000-01-01", last: "1999-12-01", at: 1 } } });
await page.reload(); await page.waitForSelector("#reviewBtn");
await page.click("#reviewBtn"); await page.waitForSelector(".dots");
await playSession("wrong");
s = await stored();
ok(s.review[4].box === 0, "missed review resets the topic to the shortest gap");
const tomorrow = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
ok(s.review[4].due === tomorrow, "and it is due tomorrow");

// 5. Finishing a normal topic schedules it; resetting it removes the schedule.
await seed({});
await page.reload(); await page.waitForSelector(".topic-card");
await page.click(".topic-card >> nth=0");
await page.waitForTimeout(300);
for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) await el.click(); }
await playSession("right");
s = await stored();
const scheduled = Object.keys(s.review || {});
ok(scheduled.length === 1 && s.review[scheduled[0]].due === (await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })), "finishing a topic schedules its first review for tomorrow");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("[data-topic-reset]");
await page.click("[data-topic-reset]").catch(() => {});
await page.waitForTimeout(300);
s = await stored();
ok(!(s.review && s.review[scheduled[0]]), "resetting a topic clears its review schedule");

// 6. Both ways of clearing a topic record a reset time, so another device can't undo them.
s = await stored();
ok(s.topicResets && s.topicResets[scheduled[0]] > 0, "topic reset records a timestamp for sync");
console.log("page errors:", errs);
await browser.close();
