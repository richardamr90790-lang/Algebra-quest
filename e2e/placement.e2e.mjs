// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("algebraQuestState_v1")));

async function fresh() {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("algebraQuestState_v1", JSON.stringify({ tourDone: true })); });
  await page.reload(); await page.waitForSelector(".topic-card");
}
// pattern[i] = whether to mark question i right. Uses the self-mark buttons after revealing.
async function takeCheckin(pattern) {
  for (let i = 0; i < pattern.length; i++) {
    await page.waitForSelector("#skipBtn");
    await page.click("#skipBtn");
    await page.click(pattern[i] ? "#gotIt" : "#missedIt");
    await page.waitForTimeout(800);
  }
  await page.waitForSelector(".placement-summary");
}

// ---- Card is offered once and can be dismissed ----
await fresh();
ok((await text(".placement-card")).includes("Find your starting point"), "new learner is offered the check-in");
await page.click("#placementDismissBtn");
ok(!(await page.$(".placement-card")), "dismissing hides the card");
ok((await text("#placementBtn")).includes("Check-in"), "but a Check-in button stays on the home screen");
await page.reload(); await page.waitForSelector(".topic-card");
ok(!(await page.$(".placement-card")), "and the card stays dismissed after a reload");

// ---- The quiz itself ----
await page.click("#placementBtn");
await page.waitForSelector(".dots");
ok((await text(".qtitle h2")).includes("Check-in"), "check-in opens");
ok((await page.$$eval(".dots span", (e) => e.length)) === 16, "16 questions (2 per region)");
ok(!(await page.$("#hintBtn")), "no hint button during the check-in");
ok((await text("#skipBtn")).includes("don't know"), "skip is worded as 'I don't know this one'");
await page.fill("#answerInput", "zzz"); await page.click("#checkBtn"); await page.waitForTimeout(300);
ok(!!(await page.$("#nextBtn")) && !(await page.$("#answerInput")) && !!(await page.$(".you-typed")), "one attempt only: a wrong answer goes straight to the reveal (no retry)");
await page.click("#nextBtn"); await page.waitForTimeout(900); // mark that one wrong
// remaining 15: all wrong
await takeCheckin(Array(15).fill(false));
let s = await state();
ok(s.xp === 0 && s.bestStreak === 0, "the check-in gives no XP and no streak");
ok(Object.keys(s.placement.regions).length === 8 && Object.values(s.placement.regions).every((r) => r.level === "needs"), "all wrong: every region 'needs work'");
ok(s.placement.start === 1, "recommended start is the first topic of the first region");
ok((await text(".placement-summary")).includes("Exponent Rules"), "summary names the recommended topic");

// ---- Home reflects the result ----
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
ok((await page.$$(".placement-chip")).length === 8, "each region shows its result");
ok((await text('.topic-card[data-topic="1"]')).includes("Start here"), "recommended topic is tagged 'Start here'");
ok((await text("#placementBtn")).includes("Retake"), "button now offers a retake");
ok(!(await page.$(".placement-card")), "the offer card is gone after taking it");

// ---- All right: solid everywhere, no recommendation ----
await page.click("#placementBtn"); await page.waitForSelector(".dots");
await takeCheckin(Array(16).fill(true));
s = await state();
ok(Object.values(s.placement.regions).every((r) => r.level === "solid") && s.placement.start === null, "all right: solid everywhere, no start topic");
ok((await text(".placement-summary")).toLowerCase().includes("boss battle"), "and suggests a Boss Battle");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
ok(!(await page.$(".start-here")), "no 'Start here' tag when everything is solid");

// ---- Mixed: first region right, rest wrong -> start in the second region ----
await page.click("#placementBtn"); await page.waitForSelector(".dots");
await takeCheckin([true, true, ...Array(14).fill(false)]);
s = await state();
ok(s.placement.regions.foundations.level === "solid" && s.placement.regions.expressions.level === "needs", "per-region levels are right");
ok(s.placement.start === 20, "starts at the first topic of the first region that isn't solid");
await page.click("#startHereBtn"); await page.waitForTimeout(400);
ok(!(await page.$(".placement-summary")) && (await text(".questbar")).includes("Adding"), "the 'Start' button opens the recommended topic");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
