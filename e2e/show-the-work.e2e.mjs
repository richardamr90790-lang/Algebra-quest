// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
// Checks that worked solutions show every step: Step 1 restates the problem, bullets show the operation on both sides
// in the sign colours, the last step is the final answer, and there are no arrows (English and Spanish).
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errs = [];

async function open(lang, topicId) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 1000 }, locale: lang === "es" ? "es-DO" : "en-US" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("http://localhost:3100/"); await page.waitForSelector(".topic-card");
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("algebraQuestState_v1", JSON.stringify({ tourDone: true, lang: l })); localStorage.setItem("algebraQuestLang", l); }, lang);
  await page.reload(); await page.waitForSelector(".topic-card");
  await page.click(`.topic-card[data-topic="${topicId}"]`);
  await page.waitForTimeout(400);
  return page;
}

for (const lang of ["en", "es"]) {
  const L = lang === "en" ? { start: "Start with the problem", fin: "Final answer", step: "Step 1" } : { start: "Empieza con el problema", fin: "Respuesta final", step: "Paso 1" };

  const noNav = (t) => t.split("\n").filter((l) => !/Next|Siguiente|Skip|Saltar|Continue|Continuar|Start|Empezar|See |Ver /.test(l)).join("\n");

  // ---- a worked example (topic 5, |x − 3| = 7) ----
  let page = await open(lang, 5);
  await page.click("#toExamplesBtn"); await page.waitForTimeout(500);
  const ex = await page.textContent("#app");
  ok(ex.includes(L.step) && ex.includes(L.start) && ex.includes("|x − 3| = 7"), `${lang}: example Step 1 restates |x − 3| = 7`);
  ok(ex.includes("3a") && ex.includes("3b"), `${lang}: the two cases are Step 3a and Step 3b`);
  ok(!/→/.test(noNav(await page.$eval("#app", (el) => el.innerText))), `${lang}: no arrows between the steps of the example`);
  ok((await page.$$("#app .op-pos")).length >= 2, `${lang}: positive operations are coloured`);
  ok((await page.$$("#app .ex-bul li, #app li")).length >= 6, `${lang}: the moves are bullets`);
  ok(ex.includes(L.fin), `${lang}: the example ends with the final answer`);
  await page.context().close();

  // ---- the breakdown after a missed generated problem (topic 4: inequalities) ----
  page = await open(lang, 4);
  for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(250); } }
  await page.waitForSelector("#answerInput");
  for (let i = 0; i < 2 && !(await page.$(".howto-box")); i++) { await page.fill("#answerInput", "zzz"); await page.click("#checkBtn"); await page.waitForTimeout(300); }
  ok(!!(await page.$(".howto-box")), `${lang}: a missed problem shows the step-by-step breakdown`);
  const steps = await page.$$eval(".howto-steps > li", (els) => els.map((e) => e.innerText));
  ok(steps.length >= 3, `${lang}: the breakdown has several steps (${steps.length})`);
  ok(steps[0].includes(L.start), `${lang}: the breakdown starts by restating the problem`);
  ok(steps[steps.length - 1].includes(L.fin), `${lang}: the breakdown ends with the final answer`);
  ok(!steps.some((t) => /→/.test(t)), `${lang}: no arrows in the breakdown`);
  ok((await page.$$(".howto-steps .op-pos, .howto-steps .op-neg")).length >= 1, `${lang}: operations in the breakdown carry a sign colour`);
  await page.context().close();
}

console.log("page errors:", errs);
await browser.close();
