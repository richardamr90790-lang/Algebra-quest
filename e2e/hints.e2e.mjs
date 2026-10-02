// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");

async function openFirstPractice(topicId) {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForSelector(".topic-card");
  await page.click(`.topic-card[data-topic="${topicId}"]`);
  await page.waitForTimeout(300);
  for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(200); } }
  await page.waitForSelector("#answerInput");
}
const answer = async (v) => { await page.fill("#answerInput", v); await page.click("#checkBtn"); await page.waitForTimeout(250); };

// ---- Hint ladder (topic 5: |x + 4| = 9) ----
await openFirstPractice(5);
ok((await text("#app")).includes("|x + 4| = 9"), "first practice problem is open");
ok(!(await page.$(".hint-box")), "no hint is shown until asked for");
await page.fill("#answerInput", "x=");           // half-typed answer must survive the re-render
await page.click("#hintBtn");
ok((await text(".hint-box")).includes("Remember"), "first hint shows the rule");
ok((await page.inputValue("#answerInput")) === "x=", "typed text is kept when a hint opens");
await page.click("#hintBtn");
ok((await page.$$eval(".hint-box", (e) => e.map((x) => x.textContent).join("|"))).includes("First step"), "second hint shows the first step");
ok(!(await page.$("#hintBtn")), "no more hints after the last one");

// ---- Only one of two solutions ----
await page.fill("#answerInput", "x = 5"); await page.click("#checkBtn"); await page.waitForTimeout(250);
ok((await text(".feedback-bad")).includes("this problem has 2"), "giving one of two solutions says so");
await answer("x = 5");
ok((await text(".mistake-note")).includes("this problem has 2"), "the reveal screen repeats the note");
ok((await text(".answer-box")).includes("−13"), "and shows the full answer");

// ---- A miss shows the rule automatically; sign slip (topic 19: f(3) = 16) ----
await openFirstPractice(19);
ok(!(await page.$(".hint-box")), "fresh problem has no hint");
await answer("-16");
ok((await text(".feedback-bad")).toLowerCase().includes("signs"), "opposite answer is called out as a sign slip");
ok(!!(await page.$(".hint-box")), "a wrong first try opens the rule hint on its own");
await answer("15");
ok((await text(".mistake-note")).toLowerCase().includes("arithmetic"), "off-by-one is called out on the reveal screen");

// ---- Guesses nothing when there is nothing to say; correct answers get no note ----
await openFirstPractice(19);
await answer("banana");
ok((await text(".feedback-bad")).includes("Give it one more try"), "no diagnosis falls back to the plain message");
await answer("16");
ok(!(await page.$(".mistake-note")), "a correct answer shows no mistake note");

// ---- Hints reset for the next problem ----
await page.click("#nextBtn"); await page.waitForTimeout(900);
await page.waitForSelector("#answerInput");
ok(!(await page.$(".hint-box")), "next problem starts with no hint open");
ok(!!(await page.$("#hintBtn")), "and offers the hint button again");

console.log("page errors:", errs);
await browser.close();
