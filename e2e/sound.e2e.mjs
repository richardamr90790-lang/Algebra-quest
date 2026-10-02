// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");

// A fake AudioContext that records each oscillator's pitch and when it was scheduled. currentTime jumps by
// 1000 each time it is read, so every play() call gets its own start time and can be told apart.
await page.addInitScript(() => {
  window.__osc = [];
  let clock = 0;
  window.AudioContext = class {
    constructor() { this.state = "running"; this.destination = {}; }
    get currentTime() { clock += 1000; return clock; }
    resume() {}
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    createOscillator() {
      const o = { type: "", frequency: { value: 0 }, connect() {}, stop() {}, start(t) { window.__osc.push({ freq: o.frequency.value, t }); } };
      return o;
    }
  };
});
// Sounds played so far, as one list of pitches per play() call.
const plays = () => page.evaluate(() => {
  const groups = new Map();
  for (const o of window.__osc) { const k = Math.floor(o.t / 1000); (groups.get(k) || groups.set(k, []).get(k)).push(Math.round(o.freq * 100) / 100); }
  return [...groups.values()];
});
const clearPlays = () => page.evaluate(() => { window.__osc.length = 0; });

const KEY = "algebraQuestState_v1";
async function openTopic(topicId, extraState = {}) {
  await page.goto("http://localhost:3100/");
  await page.waitForSelector(".topic-card");
  await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, { placementDismissed: true, ...extraState }]);
  await page.reload(); await page.waitForSelector(".topic-card");
  await page.click(`.topic-card[data-topic="${topicId}"]`);
  await page.waitForTimeout(300);
  for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(200); } }
  await page.waitForSelector("#skipBtn");
}
const answer = async (right) => { await page.click("#skipBtn"); await page.click(right ? "#gotIt" : "#missedIt"); await page.waitForTimeout(900); };
const CORRECT = [659.25, 880], WRONG = [440, 329.63];
const last = async () => { const p = await plays(); return p[p.length - 1]; };

// ---- right / wrong ----  (First Steps is pre-earned so its badge chime does not overlap these checks)
const EARNED = { badges: { "first-answer": 1 } };
await openTopic(19, EARNED);
ok((await page.evaluate(() => localStorage.getItem("algebraQuestSound"))) !== "off", "sound is on by default");
await clearPlays();
await page.waitForSelector("#skipBtn");
await page.click("#skipBtn"); await page.click("#gotIt"); await page.waitForTimeout(100);
ok(JSON.stringify(await last()) === JSON.stringify(CORRECT), "a right answer plays the 'correct' ding");
await page.waitForTimeout(900); await page.waitForSelector("#skipBtn");
await clearPlays();
await page.click("#skipBtn"); await page.click("#missedIt"); await page.waitForTimeout(100);
ok(JSON.stringify(await last()) === JSON.stringify(WRONG), "a wrong answer plays the soft 'wrong' sound");
ok((await plays()).length === 1, "exactly one sound per answer");

// ---- level up (95 XP + a right answer = level 2) ----
await openTopic(19, { ...EARNED, xp: 95 });
await clearPlays();
await page.click("#skipBtn"); await page.click("#gotIt"); await page.waitForTimeout(100);
let l = await last();
ok(l.length === 4 && l[0] === 523.25 && l[3] === 1046.5, "crossing 100 XP plays the level-up arpeggio instead");

// ---- topic mastered (5 of 6 already done) ----
await openTopic(19, { ...EARNED, xp: 0, mastered: { 19: [0, 1, 2, 3, 4] } });
for (let i = 0; i < 5; i++) await answer(true);
await clearPlays();
await page.click("#skipBtn"); await page.click("#gotIt"); await page.waitForTimeout(100);
l = await last();
ok(l.length === 6 && l[0] === 523.25 && l[5] === 1567.98, "mastering a topic plays the big arpeggio");

// ---- a new badge gets its own chime ----
await openTopic(19);
await clearPlays();
await page.click("#skipBtn"); await page.click("#gotIt");
await page.waitForSelector(".badge-toast", { timeout: 3000 });
await page.waitForTimeout(700);
l = await plays();
ok(l.length === 2 && JSON.stringify(l[1]) === JSON.stringify([783.99, 1046.5, 1318.5]), "earning a badge plays a three-note chime after the answer sound");

// ---- mute is remembered and respected ----
await page.goto("http://localhost:3100/"); await page.waitForSelector(".topic-card");
await clearPlays();
await page.click("#soundBtn");
ok((await text("#soundBtn")).includes("Muted"), "button now reads Muted");
ok((await plays()).length === 0, "turning sound off makes no sound");
ok((await page.evaluate(() => localStorage.getItem("algebraQuestSound"))) === "off", "the choice is saved on this device");
await page.reload(); await page.waitForSelector(".topic-card");
ok((await text("#soundBtn")).includes("Muted"), "and survives a reload");
await page.click('.topic-card[data-topic="19"]'); await page.waitForTimeout(300);
for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(200); } }
await clearPlays();
await answer(true); await answer(false);
ok((await plays()).length === 0, "muted: right and wrong answers are silent");
await page.click("#backBtn"); await page.waitForSelector("#soundBtn");
await page.click("#soundBtn"); await page.waitForTimeout(100);
ok((await text("#soundBtn")).includes("Sound") && JSON.stringify(await last()) === JSON.stringify(CORRECT), "turning it back on plays a short preview");

// ---- check-in is quiet; the shop and daily challenge have their own sounds ----
await page.goto("http://localhost:3100/"); await page.waitForSelector(".topic-card");
await page.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({ placementDismissed: true })), [KEY]);
await page.reload(); await page.waitForSelector(".topic-card");
await page.click("#placementBtn"); await page.waitForSelector("#skipBtn");
await clearPlays();
await answer(true); await answer(false);
ok((await plays()).length === 0, "the check-in makes no answer sounds");

await page.goto("http://localhost:3100/"); await page.waitForSelector(".topic-card");
await page.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({ placementDismissed: true, xp: 400 })), [KEY]);
await page.reload(); await page.waitForSelector(".topic-card");
await page.click("#shopBtn"); await page.waitForSelector(".shop-grid");
await clearPlays();
await page.click('[data-buy="rocket"]'); await page.click('[data-buy="rocket"]'); await page.waitForTimeout(150);
l = await last();
ok(l && l[0] === 1318.5, "buying something plays the coin sound");

await page.goto("http://localhost:3100/"); await page.waitForSelector(".topic-card");
await page.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({ placementDismissed: true })), [KEY]);
await page.reload(); await page.waitForSelector(".topic-card");
await page.click("#dailyBtn"); await page.waitForSelector("#skipBtn");
for (let i = 0; i < 5; i++) await answer(true);
await page.waitForSelector(".summary");
l = await last();
ok(l && l.length === 6 && l[0] === 523.25 && l[1] === 523.25 && l[3] === 783.99, "finishing the Daily Challenge plays the fanfare");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
