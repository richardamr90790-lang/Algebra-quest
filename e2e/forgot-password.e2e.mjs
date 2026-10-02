// Needs a production build WITH fake Supabase keys served on :3100, because Supabase is mocked in the browser:
//   NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next build && npx next start -p 3100
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";

const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = () => `${b64({ alg: "HS256" })}.${b64({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })}.sig`;
const USER = { id: "user-1", email: "mom@example.com", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" };
const session = () => ({ access_token: jwt(), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: USER });
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: JSON.stringify(body) });

const calls = { recover: [], updateUser: [] };
let recoverMode = "ok"; // ok | limited
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
await ctx.route("https://fake.supabase.co/**", async (route) => {
  const req = route.request(); const u = new URL(req.url());
  if (req.method() === "OPTIONS") return json(route, {});
  if (u.pathname.startsWith("/auth/v1/recover")) {
    calls.recover.push({ body: req.postDataJSON(), redirectTo: u.searchParams.get("redirect_to") });
    return recoverMode === "limited" ? json(route, { code: 429, error_code: "over_email_send_rate_limit", msg: "Email rate limit exceeded" }, 429) : json(route, {});
  }
  if (u.pathname.startsWith("/auth/v1/user")) {
    if (req.method() === "PUT") { calls.updateUser.push(req.postDataJSON()); return json(route, USER); }
    return json(route, USER);
  }
  if (u.pathname.startsWith("/auth/v1/token")) return json(route, session());
  if (u.pathname.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
  if (u.pathname === "/rest/v1/learners" && req.method() === "GET") return json(route, [{ id: "L1", name: "Sam" }]);
  if (u.pathname === "/rest/v1/progress") return req.method() === "GET" ? json(route, []) : route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" } });
  return json(route, {}, 404);
});
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
const text = (sel) => page.textContent(sel).catch(() => "");

// Opening the emailed link is a fresh page load (a new tab), so leave the page first: changing only the #hash would not reload it.
const openResetLink = async () => {
  await page.goto("about:blank");
  await page.goto(`http://localhost:3100/#access_token=${jwt()}&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery`);
};

// ---- asking for a reset link ----
await page.goto("http://localhost:3100/");
await page.waitForSelector("#aq-email");
ok(await page.isVisible("text=Forgot password?"), "the sign-in screen offers 'Forgot password?'");
await page.click("text=Forgot password?");
ok(!(await page.$("#aq-pass")), "the forgot screen has no password box");
ok((await text(".shell-card")).includes("send a link"), "and explains what will happen");
await page.fill("#aq-email", "mom@example.com");
await page.click("button.shell-btn");
await page.waitForSelector(".shell-msg.ok");
ok(calls.recover.length === 1 && calls.recover[0].body.email === "mom@example.com", "asks the server to email a reset link to that address");
ok(calls.recover[0].redirectTo === "http://localhost:3100", "and the link will come back to this site");
ok((await text(".shell-msg")).includes("If that email has an account"), "the message doesn't reveal whether the address has an account");
await page.click("text=I already have an account");
ok(!!(await page.$("#aq-pass")), "there's a way back to the normal sign-in");

// ---- a failure (e.g. too many emails) is shown, not swallowed ----
recoverMode = "limited";
await page.click("text=Forgot password?");
await page.fill("#aq-email", "mom@example.com");
await page.click("button.shell-btn");
await page.waitForSelector(".shell-msg.err");
ok((await text(".shell-msg.err")).toLowerCase().includes("rate limit"), "if sending fails, the reason is shown");
recoverMode = "ok";

// ---- opening the link from the email ----
await openResetLink();
await page.waitForSelector("#aq-newpass", { timeout: 8000 });
ok((await text("h1")).includes("Choose a new password"), "the reset link opens a 'Choose a new password' screen");
ok(!(await page.$(".learner-btn")), "and does not skip ahead to 'Who's playing?'");
await page.click("button.shell-btn");   // empty form: the browser's own required-field check stops it
ok(calls.updateUser.length === 0, "an empty form isn't sent");
await page.fill("#aq-newpass", "abc"); await page.fill("#aq-newpass2", "abc");
await page.evaluate(() => document.querySelector("form").noValidate = true);
await page.click("button.shell-btn");
ok((await text(".shell-msg.err")).includes("at least 6"), "a too-short password is rejected");
await page.fill("#aq-newpass", "newsecret1"); await page.fill("#aq-newpass2", "different1");
await page.click("button.shell-btn");
ok((await text(".shell-msg.err")).includes("don't match") && calls.updateUser.length === 0, "mismatched passwords are rejected without contacting the server");
await page.fill("#aq-newpass2", "newsecret1");
await page.click("button.shell-btn");
await page.waitForSelector("text=Who's playing?");
ok(calls.updateUser.length === 1 && calls.updateUser[0].password === "newsecret1", "a good new password is saved");
ok((await page.evaluate(() => location.hash)) === "", "the tokens are cleared from the address bar");
ok(await page.isVisible(".learner-btn >> text=Sam"), "and you land on 'Who's playing?', signed in");

// ---- an expired or used link ----
await ctx.route("https://fake.supabase.co/auth/v1/user", async (route) => {
  if (route.request().method() === "PUT") return json(route, { code: 401, error_code: "session_not_found", msg: "Auth session missing!" }, 401);
  return route.fallback();
});
await openResetLink();
await page.waitForSelector("#aq-newpass");
await page.fill("#aq-newpass", "newsecret2"); await page.fill("#aq-newpass2", "newsecret2");
await page.click("button.shell-btn");
await page.waitForSelector(".shell-msg.err");
ok((await text(".shell-msg.err")).includes("expired"), "an expired link gives a plain explanation");
await page.click("text=Back to sign in");
await page.waitForSelector("#aq-email");
ok(true, "and 'Back to sign in' returns to the sign-in screen");

ok(errs.length === 0, "no page errors");
console.log("page errors:", errs);
await browser.close();
