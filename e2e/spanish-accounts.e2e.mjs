// Needs a production build WITH fake keys served on :3100, because Supabase is mocked in the browser:
//   NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next build && npx next start -p 3100
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium as pw } from "playwright";
const chromium = { launch: (o = {}) => pw.launch({ ...o, executablePath: process.env.CHROMIUM_PATH || undefined }) };

const db = { learners: [{ id: "L1", name: "Sam" }], progress: {}, upserts: 0 };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = () => `${b64({ alg: "HS256" })}.${b64({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })}.sig`;
const session = () => ({ access_token: jwt(), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "user-1", email: "mom@example.com", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" } });
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: JSON.stringify(body) });
async function wire(ctx) {
  await ctx.route("https://fake.supabase.co/**", async (route) => {
    const req = route.request(); const u = new URL(req.url());
    if (req.method() === "OPTIONS") return json(route, {});
    if (u.pathname.startsWith("/auth/v1/token") || u.pathname.startsWith("/auth/v1/signup")) return json(route, session());
    if (u.pathname.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    if (u.pathname.startsWith("/auth/v1/user")) return json(route, session().user);
    const wantsObject = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (u.pathname === "/rest/v1/learners" && req.method() === "GET") return json(route, db.learners);
    if (u.pathname === "/rest/v1/progress") {
      if (req.method() === "GET") {
        const id = u.searchParams.get("learner_id").replace("eq.", "");
        const row = db.progress[id] ? { state: db.progress[id] } : null;
        if (wantsObject) return row ? json(route, row) : json(route, { message: "none" }, 406);
        return json(route, row ? [row] : []);
      }
      if (req.method() === "POST") { const b = req.postDataJSON(); db.progress[b.learner_id] = b.state; db.upserts++; return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" } }); }
    }
    return json(route, {}, 404);
  });
}
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({});
const errs = [];
async function device(locale) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale });
  await wire(ctx);
  const page = await ctx.newPage();
  await page.route(/fonts\.g/, (r) => r.abort());
  page.on("pageerror", (e) => errs.push(String(e)));
  return page;
}
const signIn = async (page) => {
  await page.fill("#aq-email", "mom@example.com"); await page.fill("#aq-pass", "secret123");
  await page.click("button.shell-btn");
};

// ---- a Spanish phone: the sign-in screens are in Spanish, and so is the account bar ----
const A = await device("es-DO");
await A.goto("http://localhost:3100/");
await A.waitForSelector("#aq-email");
ok((await A.getAttribute("html", "lang")) === "es", "sign-in page is in Spanish on a Spanish device");
ok((await A.textContent("main")).includes("Iniciar sesión") && (await A.textContent("main")).includes("Jugar sin cuenta"), "sign-in buttons are Spanish");
await A.click("text=Crear una cuenta");
ok((await A.textContent(".lead")).includes("padre o madre"), "create-account text is Spanish");
await A.click("text=Ya tengo una cuenta");
await A.click(".lang-toggle");
await A.waitForFunction(() => document.documentElement.lang === "en");
ok((await A.textContent("main")).includes("Sign in"), "the toggle on the sign-in screen switches to English");
await A.click(".lang-toggle");
await A.waitForFunction(() => document.documentElement.lang === "es");
await signIn(A);
await A.waitForSelector("text=¿Quién va a jugar?");
ok((await A.textContent("main")).includes("Cerrar sesión"), "who's-playing screen is Spanish");
await A.click(".learner-btn >> text=Sam");
await A.waitForSelector(".topic-card");
ok((await A.textContent(".accountbar")).includes("Cambiar de jugador"), "account bar is Spanish");
ok((await A.textContent(".topic-card .ttitle")).includes("Reglas de los exponentes"), "Sam's game opens in Spanish");
await A.waitForFunction(() => true);
// Sam's own choice is saved to the server once they switch
await A.click("#langBtn"); await A.waitForFunction(() => document.documentElement.lang === "en");
await A.waitForFunction(() => document.querySelector(".accountbar .sync")?.textContent.includes("Saved"), null, { timeout: 8000 }).catch(() => {});
await A.waitForTimeout(2500);
ok(db.progress["L1"] && db.progress["L1"].lang === "en", "Sam's language choice is saved with their progress");
await A.click("#langBtn"); await A.waitForFunction(() => document.documentElement.lang === "es");
await A.waitForTimeout(2600);
ok(db.progress["L1"].lang === "es", "switching again updates the saved choice");

// ---- another device (English phone) picks up Sam's language from the server ----
const B = await device("en-US");
await B.goto("http://localhost:3100/");
await B.waitForSelector("#aq-email");
ok((await B.getAttribute("html", "lang")) === "en", "second device starts in English");
await signIn(B);
await B.waitForSelector(".learner-btn");
await B.click(".learner-btn >> text=Sam");
await B.waitForSelector(".topic-card");
await B.waitForFunction(() => document.documentElement.lang === "es", null, { timeout: 5000 }).catch(() => {});
ok((await B.getAttribute("html", "lang")) === "es", "Sam's saved language (Spanish) is used on the other device");
ok((await B.textContent(".topic-card .ttitle")).includes("Reglas de los exponentes"), "and the game is in Spanish there");
ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
await browser.close();
