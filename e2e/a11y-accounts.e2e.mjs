// Accessibility audit of the account screens (sign-in, create account, Who's playing, account bar).
// Needs a production build WITH fake Supabase keys served on :3100, because Supabase is mocked in the browser:
//   NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next build && npx next start -p 3100
// Set CHROMIUM_PATH if Playwright cannot find a browser.
import { chromium } from "playwright";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = () => `${b64({ alg: "HS256" })}.${b64({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })}.sig`;
const session = () => ({ access_token: jwt(), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "user-1", email: "mom@example.com", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" } });
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: JSON.stringify(body) });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const learners = [{ id: "L1", name: "Sam" }, { id: "L2", name: "Alex" }];
await ctx.route("https://fake.supabase.co/**", async (route) => {
  const req = route.request(); const u = new URL(req.url());
  if (req.method() === "OPTIONS") return json(route, {});
  if (u.pathname.startsWith("/auth/v1/token") || u.pathname.startsWith("/auth/v1/signup")) return json(route, session());
  if (u.pathname.startsWith("/auth/v1/user")) return json(route, session().user);
  if (u.pathname.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
  if (u.pathname === "/rest/v1/learners" && req.method() === "GET") return json(route, learners);
  if (u.pathname === "/rest/v1/progress" && req.method() === "GET") return json(route, []);
  if (u.pathname === "/rest/v1/progress") return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" } });
  return json(route, {}, 404);
});
const page = await ctx.newPage();
await page.route(/fonts\.g/, (r) => r.abort());
const errs = []; page.on("pageerror", (e) => errs.push(String(e)));

async function audit(name) {
  await page.evaluate(AXE);
  const res = await page.evaluate(() => axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } }));
  const lines = res.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  ok(res.violations.length === 0, `${name}: no accessibility violations${lines.length ? " - " + lines.join("; ") : ""}`);
}

await page.goto("http://localhost:3100/");
await page.waitForSelector("#aq-email");
await audit("sign-in");
await page.click("text=Create an account"); await page.waitForTimeout(200);
await audit("create account");
await page.click("text=I already have an account");
await page.click("text=Forgot password?"); await page.waitForTimeout(200);
await audit("forgot password");
await page.click("text=I already have an account");
await page.fill("#aq-email", "mom@example.com"); await page.fill("#aq-pass", "secret123");
await page.click("button.shell-btn");
await page.waitForSelector("text=Who's playing?");
await audit("who's playing");
await page.click(".learner-btn >> text=Sam");
await page.waitForSelector(".topic-card");
await audit("game with the account bar");
// the screen opened from a password-reset email
await page.goto("about:blank");
await page.goto(`http://localhost:3100/#access_token=${jwt()}&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery`);
await page.waitForSelector("#aq-newpass");
await audit("choose a new password");
ok(errs.length === 0, "no page errors");
await browser.close();
