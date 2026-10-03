// Needs a production build WITHOUT Supabase keys served on :3100. Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errs = [];

// normal browser: no warning
let page = await (await browser.newContext({ viewport: { width: 420, height: 800 }, locale: "en-US" })).newPage();
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto("http://localhost:3100/"); await page.evaluate(() => localStorage.setItem("algebraQuestState_v1", JSON.stringify({ tourDone: true }))); await page.reload();
await page.waitForSelector(".topic-card");
await page.click("#bossBtn"); await page.click("#bossBtn");
ok(!(await page.$("#saveWarning")), "no warning when saving works");

// a browser that refuses to store anything (like some private windows or locked-down school computers)
const ctx = await browser.newContext({ viewport: { width: 420, height: 800 }, locale: "en-US" });
await ctx.addInitScript(() => {
  const real = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { if (String(k).startsWith("algebraQuestState") || String(k).startsWith("aq:")) throw new DOMException("blocked", "QuotaExceededError"); return real.call(this, k, v); };
});
page = await ctx.newPage();
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto("http://localhost:3100/"); await page.waitForSelector(".topic-card");
await page.waitForSelector("#saveWarning");
ok((await page.textContent("#saveWarning")).includes("isn't being saved"), "a blocked browser shows the warning right away");
ok((await page.getAttribute("#saveWarning", "role")) === "alert", "the warning is announced to screen readers");
await page.keyboard.press("Escape"); // close the welcome tour
ok(await page.isVisible(".topic-card"), "the game still works underneath it");
await page.click("#langBtn"); await page.waitForFunction(() => document.documentElement.lang === "es");
ok((await page.textContent("#saveWarning")).includes("no se está guardando"), "the warning switches to Spanish with the language");
ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
await browser.close();
