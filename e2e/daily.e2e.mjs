// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("algebraQuestState_v1")));
const DAY1 = "2026-10-02", DAY2 = "2026-10-03";

async function load() {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
}
async function questions() {
  const out = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector("#skipBtn");
    out.push((await text(".qtext")).replace(/\s+/g, " ").trim());
    await page.click("#skipBtn"); await page.click("#gotIt"); await page.waitForTimeout(900);
  }
  return out;
}

await page.clock.setFixedTime(new Date(`${DAY1}T10:00:00`));
await load();
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("algebraQuestState_v1", JSON.stringify({ placementDismissed: true })); });
await page.reload(); await page.waitForSelector(".topic-card");

ok((await text(".daily-card")).includes("Daily Challenge") && !!(await page.$("#dailyBtn")), "home offers the Daily Challenge");

// ---- same questions however many times you start it today ----
const firstLook = async () => { await page.click("#dailyBtn"); await page.waitForSelector(".dots"); return (await text(".qtext")).replace(/\s+/g, " ").trim(); };
const a = await firstLook();
ok((await text(".qtitle h2")).includes("Daily Challenge"), "challenge opens");
ok((await page.$$eval(".dots span", (e) => e.length)) === 5, "5 questions");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");
const b = await firstLook();
console.log("   first question:", JSON.stringify(a), "/ again:", JSON.stringify(b));
ok(a === b && a.length > 3, "leaving and coming back shows the same first question");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");

// ---- play it through ----
await page.click("#dailyBtn"); await page.waitForSelector(".dots");
const day1Qs = await questions();
await page.waitForSelector(".summary");
let s = await state();
ok(s.xp === 5 * 15 + 25, "XP = 15 per right answer + 25 bonus (100)");
ok(s.daily && s.daily.day === DAY1 && s.daily.correct === 5 && s.dailyCount === 1, "completion is recorded");
ok((await text(".summary")).includes("Daily Challenge bonus"), "summary mentions the bonus");
ok((await text(".summary .stats-row")).includes("+100"), "summary shows the XP actually earned");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
ok((await text(".daily-card")).includes("done") && (await text(".daily-card")).includes("5/5"), "card shows it's done, with the score");
ok(!(await page.$("#dailyBtn")), "no way to replay for XP the same day");
await page.reload(); await page.waitForSelector(".topic-card");
ok(!(await page.$("#dailyBtn")), "still done after a reload");

// ---- a new day brings a new challenge ----
await page.clock.setFixedTime(new Date(`${DAY2}T10:00:00`));
await page.reload(); await page.waitForSelector(".topic-card");
ok(!!(await page.$("#dailyBtn")), "next day: the challenge is available again");
await page.click("#dailyBtn"); await page.waitForSelector(".dots");
const day2Qs = await questions();
await page.waitForSelector(".summary");
ok(JSON.stringify(day1Qs) !== JSON.stringify(day2Qs), "and it has different questions");
s = await state();
ok(s.dailyCount === 2 && s.xp === 200, "second day completed: count 2, XP 200");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
