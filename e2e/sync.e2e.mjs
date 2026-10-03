// Needs a production build WITH fake keys served on :3100, because Supabase is mocked in the browser:
//   NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next build && npx next start -p 3100
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import os from "node:os";
import path from "node:path";
import { chromium as pw } from "playwright";
const TMP = os.tmpdir() + path.sep;
const chromium = { launch: (o = {}) => pw.launch({ ...o, executablePath: process.env.CHROMIUM_PATH || undefined }) };

// ---- tiny in-memory Supabase (auth + PostgREST) shared by both "devices" ----
const db = { learners: [], progress: {}, upserts: 0 };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = () => `${b64({ alg: "HS256" })}.${b64({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })}.sig`;
const session = () => ({ access_token: jwt(), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "user-1", email: "mom@example.com", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" } });
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: JSON.stringify(body) });

async function wire(ctx) {
  await ctx.route("https://fake.supabase.co/**", async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (req.method() === "OPTIONS") return json(route, {});
    if (u.pathname.startsWith("/auth/v1/token") || u.pathname.startsWith("/auth/v1/signup")) return json(route, session());
    if (u.pathname.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    if (u.pathname.startsWith("/auth/v1/user")) return json(route, session().user);
    const wantsObject = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (u.pathname === "/rest/v1/learners") {
      if (req.method() === "GET") return json(route, db.learners.map(({ id, name }) => ({ id, name })));
      if (req.method() === "POST") {
        const row = { id: "L" + (db.learners.length + 1), ...req.postDataJSON() };
        db.learners.push(row);
        return json(route, wantsObject ? row : [row], 201);
      }
      if (req.method() === "DELETE") { const id = u.searchParams.get("id").replace("eq.", ""); db.learners = db.learners.filter((l) => l.id !== id); delete db.progress[id]; return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }); }
    }
    if (u.pathname === "/rest/v1/progress") {
      if (req.method() === "GET") {
        const id = u.searchParams.get("learner_id").replace("eq.", "");
        const row = db.progress[id] ? { state: db.progress[id] } : null;
        if (wantsObject) return row ? json(route, row) : json(route, { message: "none" }, 406);
        return json(route, row ? [row] : []);
      }
      if (req.method() === "POST") { const b = req.postDataJSON(); db.progress[b.learner_id] = b.state; db.upserts++; return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" } }); }
    }
    return json(route, { error: "unmocked " + req.method() + " " + u.pathname }, 404);
  });
}

const browser = await chromium.launch({});
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };

// ===== Device A: has old local progress, signs up, adds a learner =====
const ctxA = await browser.newContext();
await wire(ctxA);
const A = await ctxA.newPage();
const errA = []; A.on("pageerror", (e) => errA.push(String(e)));
await A.addInitScript(() => { if (!localStorage.getItem("algebraQuestState_v1")) localStorage.setItem("algebraQuestState_v1", JSON.stringify({ xp: 230, bestStreak: 2, mastered: { 1: [0, 1] }, theme: "clean", name: "", customProblems: {}, masteredDates: {}, avatar: "root" })); });
await A.goto("http://localhost:3100/");
await A.waitForSelector("text=Sign in");
ok(await A.isVisible("#aq-email"), "signed-out visitors see the sign-in screen");
ok(!(await A.isVisible(".topic-card")), "game is hidden until a learner is chosen");
await A.fill("#aq-email", "mom@example.com"); await A.fill("#aq-pass", "secret123");
await A.click("button.shell-btn");
await A.waitForSelector("text=Who's playing?");
await A.waitForSelector("text=Bring the progress already saved on this device", {timeout:3000}).then(()=>ok(true,"offers to bring this device's progress along"), ()=>ok(false,"offers to bring this device's progress along"));
await A.fill("#aq-learner", "Sam");
await A.click("button.shell-btn");
await A.waitForSelector(".topic-card");
ok((await A.textContent(".stat-chip")).includes("Lv 3"), "device progress came into Sam's profile (Lv 3)");
ok((await A.textContent(".accountbar .who")).includes("Sam"), "account bar shows who is playing");
await A.waitForFunction(() => document.querySelector(".accountbar .sync")?.textContent?.includes("Saved"), null, { timeout: 8000 });
ok(db.progress["L1"] && db.progress["L1"].xp === 230, "progress uploaded to the server");
ok(db.progress["L1"].name === "Sam", "learner name seeded into the game");

// change something and see it sync (debounced)
await A.click("#themeToggleBtn"); await A.click(".theme-swatch:nth-child(3)");
await A.waitForFunction(() => document.querySelector(".accountbar .sync")?.textContent?.includes("Saved"), null, { timeout: 8000 });
await A.waitForTimeout(2600);
ok(db.progress["L1"].theme === "neon", "a change made while playing syncs to the server");

// ===== Device B: fresh browser, signs in, gets Sam's progress =====
const ctxB = await browser.newContext();
await wire(ctxB);
const B = await ctxB.newPage();
const errB = []; B.on("pageerror", (e) => errB.push(String(e)));
await B.goto("http://localhost:3100/");
await B.fill("#aq-email", "mom@example.com"); await B.fill("#aq-pass", "secret123");
await B.click("button.shell-btn");
await B.waitForSelector("text=Who's playing?");
await B.waitForTimeout(500); ok(!(await B.isVisible("text=Bring the progress already saved")), "no 'bring progress' offer on a clean device");
await B.click(".learner-btn >> text=Sam");
await B.waitForSelector(".topic-card");
ok((await B.textContent(".stat-chip")).includes("Lv 3"), "second device loads Sam's progress from the server");
ok(await B.evaluate(() => document.documentElement.dataset.theme) === "neon", "theme follows the learner");

// ===== Offline edits sync later; server failure shows status, no data loss =====
await ctxB.route("**/rest/v1/progress*", (r) => r.request().method() === "POST" ? r.abort() : r.fallback());
await B.click("#themeToggleBtn"); await B.click(".theme-swatch:nth-child(5)");
await B.waitForFunction(() => document.querySelector(".accountbar .sync")?.textContent?.includes("Offline"), null, { timeout: 9000 });
ok(true, "failed upload is shown as 'Offline · will sync'");
ok((await B.evaluate(() => JSON.parse(localStorage.getItem("aq:user-1:L1")).theme)) === "sunset", "progress still saved locally while offline");
ok(!(await B.isVisible(".save-warning")), "no big warning for a brief hiccup");
await B.waitForSelector(".save-warning", { timeout: 25000 });
ok((await B.textContent(".save-warning")).includes("Can't reach your account"), "a lasting failure to reach the account shows a clear warning");

// switch player / sign out / local play
await B.click("text=Switch player");
await B.waitForSelector("text=Who's playing?");
ok(await B.isVisible(".learner-btn >> text=Sam"), "picker lists existing learners");
await B.click("text=Sign out");
await B.waitForSelector("#aq-email");
ok(true, "sign out returns to sign-in");
await B.click("text=Play without an account");
await B.waitForSelector(".topic-card");
ok((await B.textContent(".accountbar .who")).includes("this device"), "local play is labelled as device-only");

console.log("page errors:", errA, errB);
await browser.close();
