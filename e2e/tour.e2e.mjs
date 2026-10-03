// Needs a production build WITHOUT Supabase keys served on :3100. Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("algebraQuestState_v1")));

await page.goto("http://localhost:3100/"); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForSelector(".tour-card");
ok((await page.textContent(".tour-card h2")).includes("Welcome"), "a brand-new learner sees the tour on first load");
ok((await page.evaluate(() => document.activeElement.id)) === "tourNext", "focus starts on the Next button");
let n = 1;
while (await page.$("#tourNext")) {
  const label = await page.textContent("#tourNext");
  if (label.includes("Let's go")) { await page.click("#tourNext"); break; }
  await page.click("#tourNext"); n++;
}
ok(n === 9, `the tour has 9 steps (${n})`);
await page.waitForSelector(".tour-card", { state: "detached" });
ok((await state()).tourDone === true, "finishing marks the tour as seen");
await page.reload(); await page.waitForSelector(".topic-card");
ok(!(await page.$(".tour-card")), "it doesn't come back on the next visit");

await page.click("#tourBtn"); await page.waitForSelector(".tour-card");
await page.click("#tourNext"); await page.click("#tourPrev");
ok((await page.textContent(".tour-card h2")).includes("Welcome"), "Back works");
await page.keyboard.press("Escape");
ok(!(await page.$(".tour-card")), "Escape closes it, and the ❓ button reopens it any time");

// Spanish, and not shown to a learner who has already played
await page.click("#langBtn"); await page.waitForFunction(() => document.documentElement.lang === "es");
await page.click("#tourBtn"); await page.waitForSelector(".tour-card");
ok((await page.textContent(".tour-card h2")).includes("Bienvenido"), "the tour is in Spanish");
await page.keyboard.press("Escape");
await page.evaluate(() => { localStorage.setItem("algebraQuestState_v1", JSON.stringify({ xp: 120 })); });
await page.reload(); await page.waitForSelector(".topic-card");
ok(!(await page.$(".tour-card")), "no automatic tour for someone who already has progress");
ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
await browser.close();
