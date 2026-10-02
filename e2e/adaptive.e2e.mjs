// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";
import { TOPICS } from "../src/game/data/topics.js";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const TOPIC = 19; // Functions & Function Notation: plain numeric answers
const topic = TOPICS.find((t) => t.id === TOPIC);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("algebraQuestState_v1")));
const dayPlus = (n) => page.evaluate((n) => { const d = new Date(); d.setDate(d.getDate() + n); const p = (x) => String(x).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }, n);

async function openTopic() {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("algebraQuestState_v1", JSON.stringify({ placementDismissed: true })); });
  await page.reload(); await page.waitForSelector(".topic-card");
  await page.click(`.topic-card[data-topic="${TOPIC}"]`);
  await page.waitForTimeout(300);
  for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(200); } }
  await page.waitForSelector("#answerInput");
}
const label = () => text(".questbar .sub");
const missBySkip = async () => { await page.click("#skipBtn"); await page.click("#missedIt"); await page.waitForTimeout(900); };

// ============ Struggling: two misses -> a warm-up ============
await openTopic();
await missBySkip();
ok(!(await text("#app")).includes("Warm-up"), "after one miss there is no warm-up");
await missBySkip();
await page.waitForSelector("#answerInput");
ok((await text("#app")).includes("Warm-up"), "after two misses in a row the next problem is a warm-up");
ok((await text(".warmup-note")).includes("warm-up"), "with a friendly note");
const hints = await page.$$eval(".hint-box", (e) => e.map((x) => x.textContent).join("|"));
ok(hints.includes("Remember") && hints.includes("First step"), "the rule and first step are already open");
ok(!(await page.$("#hintBtn")), "no extra hint button needed");
const dots = await page.$$eval(".dots span", (e) => e.length);
ok(dots === (topic.guided || []).length + topic.problems.length + 1, "exactly one extra step was added for the warm-up");
await missBySkip(); // miss the warm-up: streak resets, no second warm-up right away
await page.waitForSelector("#answerInput");
ok((await text("#app")).includes("Problem 3 of 6"), "next real problem is 'Problem 3 of 6' (warm-ups don't change the count)");
await missBySkip(); // problem 3
await page.waitForSelector("#answerInput");
ok(!(await text("#app")).includes("Warm-up"), "one miss after a warm-up does not trigger another");
await missBySkip(); // problem 4 -> second miss in a row
await page.waitForSelector("#answerInput");
ok((await text("#app")).includes("Warm-up"), "two more misses bring a second warm-up");
await missBySkip();            // warm-up 2
await missBySkip();            // problem 5
await missBySkip();            // problem 6 (last: nothing is inserted after the final problem)
await page.waitForSelector(".summary");
let s = await state();
ok(s.xp === 16, "XP matches what was earned (8 problems x 2 XP)");
ok(!(s.mastered[TOPIC] || []).length, "warm-ups and misses leave mastery untouched");
ok((await text(".summary .stats-row")).includes("+16"), "the summary shows the XP actually earned");
ok(s.review[TOPIC].box === 0, "a struggling run is scheduled for tomorrow");

// ============ Warm-up credit: a right warm-up gives XP but no mastery ============
await openTopic();
await missBySkip(); await missBySkip();
await page.waitForSelector(".warmup-note");
await page.click("#skipBtn"); await page.click("#gotIt"); await page.waitForTimeout(900);
s = await state();
ok(s.xp === 2 + 2 + 4, "a right warm-up earns 4 XP");
ok(!(s.mastered[TOPIC] || []).length, "and does not count toward mastery");

// ============ Cruising: a perfect typed run pushes the review out ============
async function typedRun({ useHint = false } = {}) {
  await openTopic();
  for (let i = 0; i < topic.problems.length; i++) {
    await page.waitForSelector("#answerInput");
    if (useHint && i === 0) await page.click("#hintBtn");
    await page.fill("#answerInput", topic.problems[i].a);
    await page.click("#checkBtn"); await page.waitForTimeout(250);
    await page.click("#nextBtn"); await page.waitForTimeout(900);
  }
  await page.waitForSelector(".summary");
  return state();
}
s = await typedRun();
ok(s.mastered[TOPIC].length === 6, "typing every answer right masters the topic");
ok(s.review[TOPIC].box === 1 && s.review[TOPIC].due === (await dayPlus(3)), "a perfect run skips ahead: next review in 3 days, not 1");
s = await typedRun({ useHint: true });
ok(s.review[TOPIC].box === 0 && s.review[TOPIC].due === (await dayPlus(1)), "using a hint keeps the normal schedule (tomorrow)");

// revealing an answer and self-marking it right is not a clean run
await openTopic();
for (let i = 0; i < topic.problems.length; i++) {
  await page.waitForSelector("#answerInput");
  if (i === 0) { await page.click("#skipBtn"); await page.click("#gotIt"); }
  else { await page.fill("#answerInput", topic.problems[i].a); await page.click("#checkBtn"); await page.waitForTimeout(250); await page.click("#nextBtn"); }
  await page.waitForTimeout(900);
}
await page.waitForSelector(".summary");
s = await state();
ok(s.review[TOPIC].box === 0, "revealing one answer first keeps the normal schedule");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
