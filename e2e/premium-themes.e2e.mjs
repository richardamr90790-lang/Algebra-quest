// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");
const KEY = "algebraQuestState_v1";
const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const themeAttr = () => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const buyOnce = async (id) => { await page.click(`[data-buy="${id}"]`); await page.click(`[data-buy="${id}"]`); await page.waitForTimeout(200); };

async function fresh(s) {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
  await page.evaluate(([k, st]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(st)); }, [KEY, { placementDismissed: true, ...s }]);
  await page.reload(); await page.waitForSelector(".topic-card");
}

await fresh({ xp: 2000 });
await page.click("#shopBtn"); await page.waitForSelector(".shop-grid");
const headings = await page.$$eval(".shop-h", (e) => e.map((x) => x.textContent));
ok(headings[0] === "Themes", "the shop has a Themes section");
ok((await page.$$(".theme-prev")).length === 3, "three premium themes, each with a preview picture");
const names = await page.$$eval(".shop-item .shop-name", (e) => e.map((x) => x.textContent));
ok(["Glam Paradise", "Mermaid Tide", "Holo Pop"].every((n) => names.includes(n)), "named Glam Paradise, Mermaid Tide and Holo Pop");
ok(!names.some((n) => /dreamhouse/i.test(n)), "and none uses a trademarked name");
ok((await text('[data-buy="glam"]')).includes("800") && (await text('[data-buy="holo"]')).includes("900"), "prices are shown");
const thumbs = await page.evaluate(() => Promise.all(["glam", "tide", "holo"].map((n) => fetch(`/themes/${n}-thumb.webp`).then((r) => r.ok && r.headers.get("content-type")))));
ok(thumbs.every((t) => t && t.includes("image/webp")), "the preview pictures load");

// ---- buy and equip ----
ok((await themeAttr()) === "clean", "starts on the free Clean theme");
await buyOnce("glam");
let s = await state();
ok(s.owned.includes("glam") && s.theme === "glam" && (await themeAttr()) === "glam", "buying Glam Paradise equips it right away");
ok((await text("#shopBalance")) === "1200", "balance drops by 800");
ok(s.xp === 2000, "level XP is untouched");
const bg = await page.$eval("body", (b) => getComputedStyle(b).backgroundImage);
ok(bg.includes("/themes/glam.webp"), "the theme's picture is the page background");
const full = await page.evaluate(() => fetch("/themes/glam.webp").then((r) => [r.ok, r.headers.get("content-type")]));
ok(full[0] && full[1].includes("image/webp"), "and it loads");

// ---- the theme picker ----
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#themeToggleBtn"); await page.waitForSelector("#themePanel");
const picks = await page.$$eval("[data-theme-pick]", (e) => e.map((x) => x.dataset.themePick));
ok(picks.includes("glam") && !picks.includes("tide") && !picks.includes("holo"), "the picker lists only the premium themes you own");
ok(["clean", "midnight", "neon", "forest", "sunset", "pink"].every((t) => picks.includes(t)), "and all six free themes");
await page.click('[data-theme-pick="forest"]'); await page.waitForTimeout(200);
ok((await themeAttr()) === "forest" && (await state()).owned.includes("glam"), "switching to a free theme keeps what you bought");
await page.click("#themeToggleBtn"); await page.click('[data-theme-pick="glam"]'); await page.waitForTimeout(200);
ok((await themeAttr()) === "glam", "and you can switch back to the premium one for free");

// ---- the shop's equip / unequip ----
await page.click("#shopBtn"); await page.waitForSelector(".shop-grid");
ok(await page.$eval('[data-unequip="glam"]', (b) => b.getAttribute("aria-pressed") === "true"), "the shop shows it as equipped");
await page.click('[data-unequip="glam"]'); await page.waitForTimeout(150);
ok((await themeAttr()) === "clean" && (await state()).theme === "clean", "unequipping goes back to Clean");
await page.click('[data-equip="glam"]'); await page.waitForTimeout(150);
ok((await themeAttr()) === "glam", "equipping brings it back");

// ---- budget ----
await buyOnce("tide");
ok((await text("#shopBalance")) === "400" && (await themeAttr()) === "tide", "a second theme: balance 400, Tide is now equipped");
ok(await page.$eval('[data-buy="holo"]', (b) => b.disabled), "the 900 XP theme is disabled when you can't afford it");

// ---- persistence, safety and reset ----
await page.reload(); await page.waitForSelector(".topic-card");
ok((await themeAttr()) === "tide", "the theme survives a reload");
await fresh({ theme: "holo", owned: [] });
ok((await themeAttr()) === "clean", "a premium theme you don't own falls back to Clean (e.g. after a restore or reset)");
await fresh({ xp: 1000 });
await page.click("#shopBtn"); await page.waitForSelector(".shop-grid");
await buyOnce("holo");
ok((await themeAttr()) === "holo", "Holo Pop can be bought and used");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#resetBtn"); await page.click("#resetBtn"); await page.waitForTimeout(250);
s = await state();
ok(s.owned.length === 0 && (await themeAttr()) === "clean", "reset removes purchases and returns to Clean");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
