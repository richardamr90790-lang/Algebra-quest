// Needs a production build WITHOUT Supabase keys served on :3100 (npx next build && npx next start -p 3100).
// Set CHROMIUM_PATH if Playwright cannot find a browser.
// Graph questions: the picture is hidden until asked for, "See it" draws it, "Try it on the graph" lets you click the
// answer, "Graph it" draws the real graph, and "Use my graph as my answer" fills the answer box (English and Spanish).
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errs = [];

async function open(lang, topicId) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 1100 }, locale: lang === "es" ? "es-DO" : "en-US" });
  const page = await ctx.newPage(); page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("http://localhost:3100/"); await page.waitForSelector(".topic-card");
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("algebraQuestState_v1", JSON.stringify({ tourDone: true, lang: l })); localStorage.setItem("algebraQuestLang", l); }, lang);
  await page.reload(); await page.waitForSelector(".topic-card");
  await page.click(`.topic-card[data-topic="${topicId}"]`); await page.waitForTimeout(300);
  for (const id of ["skipExamplesBtn", "skipGuidedBtn"]) { const el = await page.$("#" + id); if (el) { await el.click(); await page.waitForTimeout(250); } }
  await page.waitForSelector("#answerInput");
  return page;
}
const clickGrid = async (page, x, y) => { // click the grid point (x, y) inside the interactive svg
  const box = await page.locator("#gtPanel svg").boundingBox();
  await page.mouse.click(box.x + box.width * (120 + 14 * x) / 240, box.y + box.height * (120 - 14 * y) / 240);
};

for (const lang of ["en", "es"]) {
  const T = lang === "en" ? { try: "Try it on the graph", see: "See it", graph: "Graph it", use: "Use my graph as my answer" } : { try: "Pruébalo en la gráfica", see: "Verlo", graph: "Grafícalo", use: "Usar mi gráfica como respuesta" };
  // topic 17 practice opens with "find the slope and y-intercept" style graph questions
  let page = await open(lang, 17);
  ok(!(await page.$(".qtext .graph-wrap")), `${lang}: the picture is hidden until asked for`);
  ok((await page.textContent(".gtool")).includes(T.see), `${lang}: a See it button is offered`);
  ok(!!(await page.$("#gtTryBtn")) && (await page.textContent("#gtTryBtn")).includes(T.try), `${lang}: a Try it on the graph button is offered`);
  await page.click("#gtSeeBtn");
  ok(!!(await page.$("#gtPanel .graph-wrap svg")), `${lang}: See it draws the graph`);
  await page.click("#gtSeeBtn");
  ok(!(await page.$("#gtPanel .graph-wrap")), `${lang}: pressing it again hides the graph`);
  await page.click("#gtTryBtn");
  await page.waitForSelector("#gtPanel svg.graph-click");
  await clickGrid(page, 0, 3); await clickGrid(page, 1, 5);
  await page.click("#gtGraphBtn");
  ok((await page.textContent(".gtool-msg")).length > 0, `${lang}: Graph it gives feedback`);
  ok((await page.$$("#gtPanel svg circle")).length >= 2, `${lang}: the clicked dots are drawn`);
  const use = await page.$("#gtUseBtn");
  ok(!!use && (await use.textContent()).includes(T.use), `${lang}: the graph can be used as the answer`);
  await use.click();
  ok((await page.inputValue("#answerInput")).length > 0, `${lang}: the answer box is filled`);
  await page.click("#checkBtn"); await page.waitForTimeout(300);
  ok(!!(await page.$(".feedback")), `${lang}: Check still works after a graph answer`);
  await page.context().close();

  // inequality problems: click the line / above / below
  page = await open(lang, 30);
  ok(!!(await page.$("#gtSeeBtn")), `${lang}: inequality problems have the buttons too`);
  await page.context().close();
}
console.log("page errors:", errs);
await browser.close();
