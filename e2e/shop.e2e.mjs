// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("algebraQuestState_v1")));
const frameAttr = () => page.evaluate(() => document.documentElement.getAttribute("data-frame"));
const markText = async () => (await text(".brand .mark")).trim();
const buyOnce = async (id) => { await page.click(`[data-buy="${id}"]`); await page.click(`[data-buy="${id}"]`); await page.waitForTimeout(150); };

await page.goto("http://localhost:3100/");
await page.waitForSelector(".topic-card");
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("algebraQuestState_v1", JSON.stringify({ xp: 400, placementDismissed: true })); });
await page.reload(); await page.waitForSelector(".topic-card");
ok((await text(".stats-bar, .stat-chip")).includes("Lv 5"), "starts at level 5 (400 XP)");

await page.click("#shopBtn"); await page.waitForSelector(".shop-grid");
ok((await text("#shopBalance")) === "400", "shop shows 400 XP to spend");

// buying takes two taps, and equips what you bought
await page.click('[data-buy="rocket"]');
ok((await text('[data-buy="rocket"]')).includes("Tap again"), "first tap asks to confirm");
ok((await state()).owned === undefined || !(await state()).owned.includes("rocket"), "nothing is bought by a single tap");
await page.click('[data-buy="rocket"]'); await page.waitForTimeout(150);
let s = await state();
ok(s.owned.includes("rocket") && s.avatar === "rocket", "second tap buys it and equips it");
ok((await text("#shopBalance")) === "250", "balance drops by the price (150)");
ok(s.xp === 400, "lifetime XP is untouched");
ok((await markText()) === "🚀", "the character badge now shows the rocket");
ok((await text(".shop-msg")).includes("Rocket is yours"), "a confirmation message appears");

// can't afford what costs more than the balance
ok(await page.$eval('[data-buy="astronaut"]', (b) => b.disabled), "an item above your balance is disabled");

// frames
await buyOnce("gold");
s = await state();
ok(s.owned.includes("gold") && s.frame === "gold" && (await frameAttr()) === "gold", "buying a frame equips it on the page");
ok((await text("#shopBalance")) === "0", "balance is now 0");
const shadow = await page.$eval(".brand .mark", (e) => getComputedStyle(e).boxShadow);
ok(shadow.includes("245, 197, 66"), "the gold ring is drawn around the badge");
await page.click('[data-unequip="gold"]');
ok((await frameAttr()) === null, "unequipping removes the ring");
await page.click('[data-equip="gold"]');
ok((await frameAttr()) === "gold", "and equipping brings it back");

// owned characters appear in the avatar picker and can be swapped out
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#avatarBtn");
ok(!!(await page.$('[data-avatar-pick="rocket"]')), "owned characters show up in the avatar picker");
ok(!(await page.$('[data-avatar-pick="shark"]')), "characters you don't own do not");
await page.click('[data-avatar-pick="fox"]');
ok((await markText()) === "🦊", "free characters still work");
await page.click("#shopBtn"); await page.waitForSelector(".shop-grid");
ok(await page.$eval('[data-equip="rocket"]', (b) => !!b), "the rocket can be equipped again for free");
ok((await text("#shopBalance")) === "0", "swapping costs nothing");

// persistence and level
await page.reload(); await page.waitForSelector(".topic-card");
s = await state();
ok(s.owned.length === 2 && (await frameAttr()) === "gold", "purchases and the equipped frame survive a reload");
ok((await text(".stat-chip")).includes("Lv 5"), "level is unchanged by spending");

// reset wipes purchases (the XP that paid for them is gone too)
await page.click("#resetBtn"); await page.click("#resetBtn"); await page.waitForTimeout(200);
s = await state();
ok(s.owned.length === 0 && s.frame === "" && (await frameAttr()) === null && (await markText()) === "√", "reset clears purchases, frame and character");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
