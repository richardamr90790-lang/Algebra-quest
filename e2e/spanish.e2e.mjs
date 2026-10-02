// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errs = [];
const newPage = async (locale) => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale });
  const page = await ctx.newPage();
  // A stand-in for speech synthesis that records what would be spoken (headless Chromium has no voices).
  await page.addInitScript(() => {
    window.__spoken = [];
    const fake = { speaking: false, getVoices: () => [{ name: "Test Voice", lang: "es-US", localService: true }], cancel() { this.speaking = false; }, speak(u) { window.__spoken.push({ text: u.text, lang: u.lang }); }, addEventListener() {} };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });
  page.on("pageerror", (e) => errs.push(String(e)));
  return page;
};
const ENGLISH = /\b(the|and|your|you|to|of|is|are|for|with|back|map|start|next|answer|step|check|hint|example|examples|sound|shop|report|badges|dictionary|theme|review|daily|challenge|boss|battle|easy|hard|play|buy|equip|equipped|correct|streak|topic|topics|mastered|region|cleared|continue|reveal|skip|practice|guided|worked|terms|key|formulas|quick|reference|graded|not|typed|achievement|earned|spend|characters|frames|themes|right|nothing|flagged|recent|activity|when|what|score|print|save|export|import|reset|progress|name|choose|close|read|aloud|type|here|find|solve|let's|learn|before|see|going|warm-up|problem|rule|first|tap|again|confirm)\b/gi;
const leaks = async (page, where) => {
  const text = await page.evaluate(() => document.querySelector("#app").innerText);
  const hits = [...new Set((text.match(ENGLISH) || []).map((w) => w.toLowerCase()))];
  ok(hits.length === 0, `no English in ${where}${hits.length ? " — found: " + hits.join(", ") : ""}`);
};

// ---- a Spanish-language device starts in Spanish ----
let page = await newPage("es-DO");
await page.goto("http://localhost:3100/");
await page.waitForSelector(".topic-card");
ok((await page.getAttribute("html", "lang")) === "es", "html lang is es on a Spanish device");
ok((await page.textContent(".topic-card .ttitle")).includes("Reglas de los exponentes"), "topic titles are Spanish");
ok((await page.textContent("#dictionaryBtn")).includes("Diccionario"), "buttons are Spanish");
await leaks(page, "home");

// ---- toggling back to English, persistence, and the learner's own saved choice ----
await page.click("#langBtn");
await page.waitForFunction(() => document.documentElement.lang === "en");
ok((await page.textContent(".topic-card .ttitle")).includes("Exponent Rules"), "toggle back to English changes the topics");
ok((await page.textContent("#langBtn")).includes("Español"), "button now offers Español");
await page.reload(); await page.waitForSelector(".topic-card");
ok((await page.getAttribute("html", "lang")) === "en", "English choice survives a reload, even on a Spanish device");
const saved = await page.evaluate(() => ({ s: JSON.parse(localStorage.getItem("algebraQuestState_v1")), d: localStorage.getItem("algebraQuestLang") }));
ok(saved.s.lang === "en" && saved.d === "en", "choice saved with the learner and on the device");
await page.context().close();

// ---- an English device: switch to Spanish and use every screen ----
page = await newPage("en-US");
await page.goto("http://localhost:3100/");
await page.waitForSelector(".topic-card");
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("algebraQuestState_v1", JSON.stringify({ placementDismissed: true })); });
await page.reload(); await page.waitForSelector(".topic-card");
ok((await page.getAttribute("html", "lang")) === "en", "English device starts in English");
await page.click("#langBtn");
await page.waitForFunction(() => document.documentElement.lang === "es");
ok((await page.textContent(".topic-card .ttitle")).includes("Reglas de los exponentes"), "switch to Spanish translates the topics");
await leaks(page, "home after switching");

await page.click("#bossBtn");
await leaks(page, "boss menu");
await page.click("#bossBtn");

for (const [btn, name] of [["#dictionaryBtn", "dictionary"], ["#reportBtn", "report"], ["#badgesBtn", "badges"], ["#shopBtn", "shop"]]) {
  await page.click(btn); await page.waitForSelector("#homeBtn, #backBtn");
  await leaks(page, name);
  await page.click("#homeBtn, #backBtn"); await page.waitForSelector(".topic-card");
}

// ---- a topic: intro, examples, guided practice, practice ----
await page.click('[data-topic-open="1"]');
await page.waitForSelector("#toExamplesBtn");
await leaks(page, "topic intro");
await page.click("#toExamplesBtn"); await page.waitForSelector("#nextExBtn");
await leaks(page, "worked example");
await page.click("#skipExamplesBtn, #nextExBtn");
for (let i = 0; i < 4 && !(await page.$("#checkBlanksBtn")); i++) { await page.click("#nextExBtn").catch(() => {}); }
await page.waitForSelector("#checkBlanksBtn");
await leaks(page, "guided practice");
// answer a dropdown blank with the Spanish option, and read the Spanish step wording
const opts = await page.$$eval(".blankSelect option", (o) => o.map((x) => x.textContent));
ok(opts.includes("suma") || opts.length === 0 || opts.some((o) => /suma|resta|multiplica/.test(o)), "dropdown options are Spanish");
await page.click("#skipBtn"); await page.waitForSelector("#gotIt");
await leaks(page, "revealed guided answer");
await page.click("#gotIt"); await page.waitForTimeout(900);

// ---- typed answers: Spanish 'o' (either order), and the Spanish feedback ----
await page.click("#backBtn"); await page.waitForSelector(".topic-card");
const cards = await page.$$eval("[data-topic-open]", (b) => b.map((x) => [x.dataset.topicOpen, x.textContent]));
const quad = cards.find(([, t]) => t.includes("Resolver cuadráticas por factorización"));
ok(!!quad, "Spanish title found for quadratics by factoring");
const toPractice = async () => {
  await page.click(`[data-topic-open="${quad[0]}"]`);
  await page.click("#skipExamplesBtn");
  if (await page.$("#checkBlanksBtn")) await page.click("#skipGuidedBtn");
  await page.waitForSelector("#answerInput");
};
await toPractice();
const q1 = (await page.textContent(".qtext")).trim();
ok(/^Resuelve:/.test(q1), "practice questions are phrased in Spanish");
await page.click("#skipBtn"); await page.waitForSelector(".answer-box");
const key = (await page.textContent(".answer-box")).replace("Respuesta", "").replace(/\s+/g, " ").trim();
ok(/ o /.test(key) && !/ or /.test(key), `the answer key uses 'o': ${key}`);
await page.click("#gotIt"); await page.waitForTimeout(800);
await page.click("#backBtn"); await page.waitForSelector(".topic-card");
await toPractice();
ok((await page.textContent(".qtext")).trim() === q1, "same first problem on a second visit");
const [, A, B] = key.match(/x = (-?\d+|−\d+)\s+o\s+x = (-?\d+|−\d+)/).map((v) => v && v.replace("−", "-"));
await page.fill("#answerInput", `x=${B} o x=${A}`);
await page.click("#checkBtn"); await page.waitForSelector(".feedback");
ok((await page.textContent(".feedback")).includes("Correcto"), "typing the two answers with 'o' in the other order is accepted");
await page.click("#nextBtn");
await page.waitForSelector("#answerInput");
await page.fill("#answerInput", "x=99 o x=98");
await page.click("#checkBtn");
ok((await page.textContent(".feedback")).includes("Casi"), "a wrong answer gets the Spanish 'Casi' feedback");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");

// ---- reroll in Spanish, then back to English keeps mastery counts ----
await page.click("#backBtn").catch(() => {});
await page.waitForSelector(".topic-card");
await page.click('[data-topic-reroll="25"]'); await page.click('[data-topic-reroll="25"]');
await page.waitForTimeout(300);
const before = await page.evaluate(() => JSON.parse(localStorage.getItem("algebraQuestState_v1")).customProblems["25"].map((p) => p.q));
ok(before.some((q) => /Resuelve:/.test(q)), "rerolled problems are generated in Spanish");
await page.click("#langBtn"); await page.waitForFunction(() => document.documentElement.lang === "en");
const after = await page.evaluate(() => JSON.parse(localStorage.getItem("algebraQuestState_v1")).customProblems["25"].map((p) => p.q));
ok(after.length === before.length && after.some((q) => /Solve:/.test(q)) && !after.some((q) => /Resuelve:/.test(q)), "switching language regenerates rerolled problems in the new language");

// ---- read aloud in Spanish ----
await page.click("#langBtn"); await page.waitForFunction(() => document.documentElement.lang === "es");
await page.click('[data-topic-open="1"]'); await page.click("#skipExamplesBtn");
if (await page.$("#checkBlanksBtn")) await page.click("#skipGuidedBtn");
await page.waitForSelector("#answerInput");
await page.click("#playQBtn");
const spoken = await page.evaluate(() => window.__spoken.at(-1));
ok(!!spoken && /por|al cuadrado|al cubo|potencia|es igual a/.test(spoken.text) && !/\b(times|squared|cubed|equals)\b/.test(spoken.text), `the question is read in Spanish: "${spoken && spoken.text}"`);
ok(spoken && spoken.lang.startsWith("es"), "the speech voice language is Spanish");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");

// ---- the rest of the screens, with a rich Spanish profile ----
await page.evaluate(() => {
  const NOW = Date.now();
  localStorage.setItem("algebraQuestState_v1", JSON.stringify({
    lang: "es", name: "Sam", xp: 450, bestStreak: 9, dailyCount: 3, placementDismissed: false,
    mastered: { 19: [0, 1, 2, 3, 4, 5], 17: [0, 1] }, owned: ["rocket", "gold"], avatar: "rocket", frame: "gold",
    badges: { "first-answer": NOW, "master-1": NOW }, stats: { answers: 80, correct: 60, reviews: 2 },
    review: { 1: { box: 0, due: "2000-01-01", last: "x", at: 1, ok: false } },
    placement: { at: NOW, start: 20, regions: { foundations: { correct: 2, total: 2, level: "solid" }, expressions: { correct: 0, total: 2, level: "needs" } } },
    activity: [{ at: NOW - 3600000, mode: "topic", topicId: 19, title: "Functions & Function Notation", correct: 5, total: 6 },
               { at: NOW - 7200000, mode: "daily", title: "Daily Challenge", correct: 4, total: 5 }],
  }));
});
await page.reload(); await page.waitForSelector(".topic-card");
await leaks(page, "home with a rich profile (review card, daily card, check-in chips)");
await page.click("#themeToggleBtn"); await leaks(page, "theme menu"); await page.keyboard.press("Escape");
await page.click("#avatarBtn"); await leaks(page, "character menu"); await page.keyboard.press("Escape");
await page.click("#reportBtn"); await page.waitForSelector("#homeBtn");
await leaks(page, "report with activity and attention list");
ok((await page.textContent(".rp-table")).includes("Funciones y notación de funciones"), "report shows topic names in Spanish even for sessions saved in English");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#shopBtn"); await page.waitForSelector("#homeBtn"); await leaks(page, "shop with owned items"); await page.click("#homeBtn"); await page.waitForSelector(".topic-card");
await page.click("#reviewBtn"); await page.waitForSelector("#answerInput");
await leaks(page, "daily review question");
await page.fill("#answerInput", "0"); await page.click("#checkBtn"); await page.waitForSelector(".feedback");
await leaks(page, "wrong answer feedback and hint");
await page.click("#hintBtn").catch(() => {});
await leaks(page, "hints");
await page.click("#skipBtn"); await page.waitForSelector(".howto-box, .answer-box");
await leaks(page, "revealed answer with the step-by-step breakdown");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");
await page.click("#placementBtn"); await page.waitForSelector("#answerInput");
await leaks(page, "check-in question");
await page.click("#backBtn"); await page.waitForSelector(".topic-card");
await page.click("#dailyBtn"); await page.waitForSelector(".dots");
for (let i = 0; i < 5; i++) { await page.waitForSelector("#skipBtn"); await page.click("#skipBtn"); await page.click("#gotIt"); await page.waitForTimeout(900); }
await page.waitForSelector(".summary");
await leaks(page, "summary screen");
ok((await page.textContent(".summary")).includes("Bono del Reto diario"), "Daily Challenge bonus line is Spanish");
await page.click("#homeBtn"); await page.waitForSelector(".topic-card");

ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
await browser.close();
