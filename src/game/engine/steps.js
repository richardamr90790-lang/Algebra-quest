/* ===================== STEP BUILDERS =====================
   English-only builders for fully worked solutions. They follow docs/step-style.md: Step 1 restates the problem, one
   idea per step, every operation is shown on BOTH sides, the sign colours come from {p:…} / {n:…}, and the last step is
   "Final answer: …". Spanish is produced from the finished English text by src/game/step-es.js, so nothing here is
   translated by hand. Each builder returns an array of step strings (a step is a sentence followed by "\n• " bullets). */

const M = "−";
export const st = (text, ...bul) => text + bul.map((b) => "\n• " + b).join("");
const P_ = (x) => `{p:${x}}`;
const N_ = (x) => `{n:${x}}`;
export const num = (n) => (n < 0 ? `${M}${Math.abs(n)}` : String(n));
export const par = (n) => (n < 0 ? `(${M}${Math.abs(n)})` : String(n));
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const lin = (m, v = "x") => (m < 0 ? M : "") + (Math.abs(m) === 1 ? "" : String(Math.abs(m))) + v;
export const lk = (m, k, v = "x") => {
  const s = m !== 0 ? lin(m, v) : "";
  if (k === 0) return s || "0";
  if (s === "") return num(k);
  return `${s} ${k > 0 ? "+" : M} ${Math.abs(k)}`;
};
export const cancel = (c) => (c > 0 ? ["−", c] : ["+", -c]);                       // the operation that removes constant c
export const frac = (n, d) => `<span class='frac'><span class='frac-num'>${n}</span><span class='frac-den'>${d}</span></span>`;
export const fr = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); n /= g; d /= g; return d === 1 ? num(n) : `${num(n)}/${d}`; };
export const divisors = (n) => { const o = []; for (let d = 1; d <= n; d++) if (n % d === 0) o.push(d); return o; };
export const SUPX = { 0: "", 1: "x", 2: "x²", 3: "x³", 4: "x⁴" };
const SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const sup = (n) => String(n).split("").map((c) => (c === "-" ? "⁻" : SUPD[+c])).join("");
const SUBD = "₀₁₂₃₄₅₆₇₈₉";
export const sub = (n) => String(n).split("").map((c) => SUBD[+c]).join("");
export const termsStr = (ts) => {
  let out = "";
  for (const [c, v] of ts) {
    if (c === 0) continue;
    const a = Math.abs(c), body = (a === 1 && v ? "" : String(a)) + v;
    out += out === "" ? (c < 0 ? M : "") + body : (c < 0 ? " − " : " + ") + body;
  }
  return out || "0";
};
export const tstr = (c, d) => (d > 0 ? termsStr([[c, SUPX[d]]]) : num(c));
export const pfac = (c, d) => { const s = tstr(c, d); return c < 0 ? `(${s})` : s; };
export const polyStr = (co) => {
  const ds = Object.keys(co).map(Number).sort((a, b) => b - a).filter((d) => co[d] !== 0);
  return ds.length ? termsStr(ds.map((d) => [co[d], SUPX[d]])) : "0";
};
const opWord = (sg) => (sg === "+" ? "Add" : "Subtract");
const prep = (sg) => (sg === "+" ? "to" : "from");
const opTxt = (sg, mag) => (sg === "+" ? P_(`+ ${mag}`) : N_(`− ${mag}`));
const sgn = (n) => (n > 0 ? "+" : "−");
export const start = (q) => st("Start with the problem: " + q);
export const fin = (a) => st("Final answer: " + a);

/* ---- one-variable equations and inequalities ---- */
// A·var + K cmp C. Returns { steps, cmp, x } with the "remove K" and "divide by A" moves shown on both sides.
export function solveSteps(A, K, cmp, C, v = "x", opts = {}) {
  const out = []; const rhs = C - K; const lhs = lk(A, K, v);
  const eq = cmp === "=";
  if (K !== 0) {
    const [sg, mag] = cancel(K); const o = opTxt(sg, mag);
    out.push(st(`Get the ${lin(A, v)} term alone. ${opWord(sg)} ${mag} ${prep(sg)} BOTH sides.`, `${lhs} ${o} ${cmp} ${num(C)} ${o}`,
      `Left side: ${num(K)} ${sg === "+" ? "+" : M} ${mag} = 0, so ${lin(A, v)} is left`, `Right side: ${num(C)} ${sg === "+" ? "+" : M} ${mag} = ${num(rhs)}`,
      `So ${lin(A, v)} ${cmp} ${num(rhs)}`));
  }
  let x = rhs, fc = cmp;
  if (A !== 1) {
    x = rhs / A;
    const o = A > 0 ? P_(`÷ ${A}`) : N_(`÷ (${num(A)})`);
    const bl = [`${lin(A, v)} ${o} ${cmp} ${num(rhs)} ${o}`, `Left side: ${lin(A, v)} ÷ ${par(A)} = ${v}`, `Right side: ${num(rhs)} ÷ ${par(A)} = ${num(x)}`];
    if (!eq) {
      if (A < 0) { fc = FLIP[cmp]; bl.push(`We divided by a NEGATIVE number, so the sign FLIPS: ${v} ${cmp} ${num(x)} becomes ${v} ${fc} ${num(x)}`); }
      else bl.push(`Dividing by a positive number, so the sign stays the same: ${v} ${cmp} ${num(x)}`);
    } else bl.push(`So ${v} = ${num(x)}`);
    out.push(st(`Get ${v} alone. Divide BOTH sides by ${num(A)}.`, ...bl));
  }
  return { steps: out, cmp: fc, x };
}
export const FLIP = { "<": ">", ">": "<", "≤": "≥", "≥": "≤" };
export const solveIneqSteps = (A, K, cmp, C, v = "x", q) => {
  const r = solveSteps(A, K, cmp, C, v);
  const steps = [start(q ?? `${lk(A, K, v)} ${cmp} ${num(C)}`), ...r.steps];
  if (!r.steps.length) steps.push(st(`${v} is already alone.`));
  const ans = `${v} ${r.cmp} ${num(r.x)}`; steps.push(fin(ans)); return { steps, ans };
};
export const solveEqSteps = (A, K, C, v = "x", q) => {
  const r = solveSteps(A, K, "=", C, v);
  const steps = [start(q ?? `${lk(A, K, v)} = ${num(C)}`), ...r.steps]; const ans = `${v} = ${num(r.x)}`; steps.push(fin(ans)); return { steps, ans, x: r.x };
};

// low c1 (m x + b) c2 high, solved in all three parts. Returns { steps, ans } (steps include start and final).
export function compoundSteps(low, m, b, high, c1, c2, q) {
  const mid = lk(m, b); const out = [start(q ?? `${num(low)} ${c1} ${mid} ${c2} ${num(high)}`)];
  let lo = low, hi = high;
  if (b !== 0) {
    const [sg, mag] = cancel(b); const o = opTxt(sg, mag); const lo2 = low - b, hi2 = high - b; const opm = `${sg === "+" ? "+" : M}${mag}`;
    out.push(st(`Get the ${lin(m)} term alone in the middle. ${opWord(sg)} ${mag} ${prep(sg)} ALL THREE parts — watch it happen:###BAL:${num(low)},${mid},${num(high)};${c1},${c2};${opm},${opm},${opm};${num(lo2)},${lin(m)},${num(hi2)}###`,
      `${num(low)} ${o} ${c1} ${mid} ${o} ${c2} ${num(high)} ${o}`, `Left part: ${num(low)} ${sg === "+" ? "+" : M} ${mag} = ${num(lo2)}`,
      `Middle part: ${num(b)} ${sg === "+" ? "+" : M} ${mag} = 0, so ${lin(m)} is left`, `Right part: ${num(high)} ${sg === "+" ? "+" : M} ${mag} = ${num(hi2)}`,
      `So ${num(lo2)} ${c1} ${lin(m)} ${c2} ${num(hi2)}`));
    lo = lo2; hi = hi2;
  }
  if (m !== 1) {
    const o = m > 0 ? P_(`÷ ${m}`) : N_(`÷ (${num(m)})`); const lo2 = lo / m, hi2 = hi / m;
    const bl = [`${num(lo)} ${o} ${c1} ${lin(m)} ${o} ${c2} ${num(hi)} ${o}`, `Left part: ${num(lo)} ÷ ${par(m)} = ${num(lo2)}`, `Middle part: ${lin(m)} ÷ ${par(m)} = x`, `Right part: ${num(hi)} ÷ ${par(m)} = ${num(hi2)}`];
    if (m < 0) {
      bl.push(`We divided by a NEGATIVE number, so BOTH signs FLIP: ${c1} becomes ${FLIP[c1]} and ${c2} becomes ${FLIP[c2]}`, `That gives ${num(lo2)} ${FLIP[c1]} x ${FLIP[c2]} ${num(hi2)}`);
      out.push(st(`Get x alone in the middle. Divide ALL THREE parts by ${num(m)} — watch it happen:###BAL:${num(lo)},${lin(m)},${num(hi)};${c1},${c2};÷${num(m)},÷${num(m)},÷${num(m)};${num(lo2)},x,${num(hi2)};${FLIP[c1]},${FLIP[c2]}###`, ...bl));
      out.push(st("Turn the statement around so the smaller number comes first. When you swap the two ends, each sign points the other way again.", `${num(lo2)} ${FLIP[c1]} x ${FLIP[c2]} ${num(hi2)} turned around is ${num(hi2)} ${c2} x ${c1} ${num(lo2)}`));
      const ans = `${num(hi2)} ${c2} x ${c1} ${num(lo2)}`; out.push(fin(ans)); return { steps: out, ans };
    }
    bl.push(`Dividing by a positive number, so the signs stay the same: ${num(lo2)} ${c1} x ${c2} ${num(hi2)}`);
    out.push(st(`Get x alone in the middle. Divide ALL THREE parts by ${m} — watch it happen:###BAL:${num(lo)},${lin(m)},${num(hi)};${c1},${c2};÷${m},÷${m},÷${m};${num(lo2)},x,${num(hi2)}###`, ...bl));
    lo = lo2; hi = hi2;
  }
  const ans = `${num(lo)} ${c1} x ${c2} ${num(hi)}`; out.push(fin(ans)); return { steps: out, ans };
}

// |a x + b| = c (c > 0)
export function absSteps(a, b, c, q) {
  const inner = lk(a, b);
  const out = [start(q ?? `|${inner}| = ${c}`),
    st("Because of the absolute value bars, this splits into TWO equations. The bars drop. In the first equation the right side stays the same. In the second equation the sign of the right side flips.", `Positive case: ${inner} = ${c}`, `Negative case: ${inner} = ${M}${c}`)];
  const sols = [];
  for (const [name, rhs] of [["positive", c], ["negative", -c]]) {
    out.push(st(`Solve the ${name} case: ${inner} = ${num(rhs)}`));
    const r = solveSteps(a, b, "=", rhs); out.push(...r.steps); sols.push(r.x);
    if (!r.steps.length) out.push(st(`x is already alone: x = ${num(rhs)}`));
  }
  const ans = `x = ${num(sols[0])} or x = ${num(sols[1])}`; out.push(fin(ans)); return { steps: out, ans, sols };
}
// |a x + b| < c or > c (type "less" / "more")
export function absIneqSteps(a, b, c, cmp, q) {
  const inner = lk(a, b); const less = "<≤".includes(cmp);
  const WORD = { "<": "less than", "≤": "less than or equal to", ">": "greater than", "≥": "greater than or equal to" };
  const out = [start(q ?? `|${inner}| ${cmp} ${c}`)];
  if (less) {
    out.push(st(`The bars mean distance from 0. '|${inner}| ${cmp} ${c}' says the inside is ${WORD[cmp]} ${c} away from 0, so the inside is BETWEEN ${M}${c} and ${c}. The bars drop and the problem becomes one between-statement.`,
      `The inside, ${inner}, is ${cmp === "<" ? "greater than" : "greater than or equal to"} ${M}${c} AND ${cmp === "<" ? "less than" : "less than or equal to"} ${c}`, `Write it as one statement: ${M}${c} ${cmp} ${inner} ${cmp} ${c}`));
    const r = compoundSteps(-c, a, b, c, cmp, cmp); out.push(...r.steps.slice(1, -1));
    if (a === 1 && b === 0) out.push(st("The middle is already x, so there is nothing more to solve."));
    out.push(fin(r.ans)); return { steps: out, ans: r.ans };
  }
  const neg = { ">": "<", "≥": "≤" }[cmp];
  out.push(st(`The bars mean distance from 0. '|${inner}| ${cmp} ${c}' says the inside is ${WORD[cmp]} ${c}, in either direction. The bars drop and the problem splits into TWO inequalities joined by OR. In the second one the number ${c} becomes ${M}${c} and the symbol turns around.`,
    `Positive case: ${inner} ${cmp} ${c}`, `Negative case: ${inner} ${neg} ${M}${c}`));
  const res = [];
  for (const [name, cm, rhs] of [["positive", cmp, c], ["negative", neg, -c]]) {
    out.push(st(`Solve the ${name} case: ${inner} ${cm} ${num(rhs)}`));
    const r = solveSteps(a, b, cm, rhs); out.push(...r.steps);
    if (!r.steps.length) out.push(st(`x is already alone: x ${cm} ${num(rhs)}`));
    res.push([r.cmp, r.x]);
  }
  const ans = `x ${res[0][0]} ${num(res[0][1])} or x ${res[1][0]} ${num(res[1][1])}`; out.push(fin(ans)); return { steps: out, ans };
}

/* ---- systems ---- */
const joinParts = (parts) => parts.filter((p) => p.body !== "").reduce((s, p, i) => s + (i === 0 ? (p.neg ? M : "") : p.neg ? " − " : " + ") + p.body, "") || "0";
const part = (c, body) => ({ neg: c < 0, body });
const sysText = (a, b, c) => `${termsStr([[a, "x"], [b, "y"]])} = ${num(c)}`;
// y = m x + k substituted into  a x + b y = C  (b is +1 or −1)
export function substSteps(m, k, a, b, C, order = 0) {
  const ye = lk(m, k); const orig = sysText(a, b, C); const A = a + b * m, K = b * k;
  const yEq = `y = ${ye}`;
  const eq1 = order === 0 ? yEq : orig, eq2 = order === 0 ? orig : yEq;
  const s = [st("Start with the system.", eq1, eq2),
    st(`One equation already tells us what y equals: y = ${ye}. Substitute (${ye}) in for y in the OTHER equation.`, `The other equation: ${orig}`, `Replace y with (${ye}): ${termsStr([[a, "x"]])} ${b > 0 ? "+" : "−"} (${ye}) = ${num(C)}`)];
  const expanded = termsStr([[a, "x"], [b * m, "x"], [b * k, ""]]);
  s.push(b === 1 ? st("Remove the parentheses.", `${termsStr([[a, "x"]])} + (${ye}) = ${expanded}`)
    : st("Distribute the negative sign. It changes the sign of every term inside the parentheses.", `${termsStr([[a, "x"]])} − (${ye}) = ${expanded}`));
  if (m !== 0) s.push(st("Combine the like terms.", `${lin(a)} ${b * m >= 0 ? "+" : "−"} ${lin(Math.abs(b * m))} = ${lin(A)}`, `So the equation is ${lk(A, K)} = ${num(C)}`));
  const r = solveSteps(A, K, "=", C); s.push(...r.steps); const x = r.x; const y = m * x + k;
  const xs = num(x); const head = m === 1 ? xs : m === -1 ? (x < 0 ? `−(${xs})` : `−${xs}`) : `${m}(${xs})`;
  const sub1 = k === 0 ? head : `${head} ${k > 0 ? "+" : "−"} ${Math.abs(k)}`;
  const bl = [`y = ${sub1}`];
  if (Math.abs(m) !== 1 && k !== 0) bl.push(`y = ${num(m * x)} ${k > 0 ? "+" : "−"} ${Math.abs(k)}`);
  bl.push(`y = ${num(y)}`);
  s.push(st(`Plug x = ${xs} back into y = ${ye} to find y.`, ...bl), fin(`x = ${num(x)}, y = ${num(y)}`));
  return { steps: s, ans: `x = ${num(x)}, y = ${num(y)}`, x, y };
}
// elimination: eq = [a, b, c] meaning a x + b y = c. One variable must have equal or opposite coefficients.
export function elimSteps(eq1, eq2) {
  const [a1, b1, c1] = eq1, [a2, b2, c2] = eq2; const t1 = sysText(a1, b1, c1), t2 = sysText(a2, b2, c2);
  let v, add;
  if (b1 === -b2) [v, add] = ["y", true]; else if (b1 === b2) [v, add] = ["y", false]; else if (a1 === -a2) [v, add] = ["x", true]; else [v, add] = ["x", false];
  const keep = v === "y" ? "x" : "y";
  const [ca1, ca2] = keep === "x" ? [a1, a2] : [b1, b2]; const [cv1, cv2] = v === "y" ? [b1, b2] : [a1, a2];
  const s = [st("Start with the system.", t1, t2),
    st(`Look at the ${v} terms: ${lin(cv1, v)} in the first equation and ${lin(cv2, v)} in the second. They are ${add ? "opposites" : "the same (matching)"}, so we ${add ? "ADD" : "SUBTRACT"} the equations to make the ${v} terms cancel.`, `Equation 1: ${t1}`, `Equation 2: ${t2}`)];
  const l1 = t1.split(" = ")[0], l2 = t2.split(" = ")[0]; let csum, rs;
  if (add) {
    csum = ca1 + ca2; rs = c1 + c2;
    s.push(st("ADD the two equations. Add the left sides together and add the right sides together.", `(${l1}) + (${l2}) = ${num(c1)} + ${num(c2)}`,
      `${keep} terms: ${lin(ca1, keep)} ${ca2 >= 0 ? "+" : "−"} ${lin(Math.abs(ca2), keep)} = ${lin(csum, keep)}`, `${v} terms: ${lin(cv1, v)} ${cv2 >= 0 ? "+" : "−"} ${lin(Math.abs(cv2), v)} = 0`,
      `Right side: ${num(c1)} + ${num(c2)} = ${num(rs)}`, `So ${lin(csum, keep)} = ${num(rs)}`));
  } else {
    csum = ca1 - ca2; rs = c1 - c2;
    s.push(st("SUBTRACT the second equation from the first. Subtract the left sides and subtract the right sides.", `(${l1}) − (${l2}) = ${num(c1)} − ${num(c2)}`,
      ca1 !== ca2 ? `${keep} terms: ${lin(ca1, keep)} ${ca2 >= 0 ? "−" : "+"} ${lin(Math.abs(ca2), keep)} = ${lin(csum, keep)}` : `${keep} terms: ${lin(ca1, keep)} − ${lin(ca2, keep)} = 0`,
      cv1 !== cv2 ? `${v} terms: ${lin(cv1, v)} ${cv2 >= 0 ? "−" : "+"} ${lin(Math.abs(cv2), v)} = ${lin(cv1 - cv2, v)}` : `${v} terms: ${lin(cv1, v)} − ${lin(cv2, v)} = 0`,
      `Right side: ${num(c1)} − ${num(c2)} = ${num(rs)}`, `So ${csum !== 0 ? lin(csum, keep) : lin(cv1 - cv2, v)} = ${num(rs)}`));
  }
  let lv, coef; if (!add && csum === 0) [lv, coef] = [v, cv1 - cv2]; else [lv, coef] = [keep, csum];
  const val = rs / coef;
  if (coef !== 1) {
    const o = coef > 0 ? P_(`÷ ${coef}`) : N_(`÷ (${num(coef)})`);
    s.push(st(`Get ${lv} alone. Divide BOTH sides by ${num(coef)}.`, `${lin(coef, lv)} ${o} = ${num(rs)} ${o}`, `Left side: ${lin(coef, lv)} ÷ ${par(coef)} = ${lv}`, `Right side: ${num(rs)} ÷ ${par(coef)} = ${num(val)}`, `So ${lv} = ${num(val)}`));
  }
  // plug back into the first equation
  const other = lv === "x" ? "y" : "x"; const [kc, oc] = lv === "x" ? [a1, b1] : [b1, a1]; const K = kc * val; const rem = c1 - K;
  const kTerm = Math.abs(kc) === 1 ? `(${num(val)})` : `${Math.abs(kc)}(${num(val)})`;
  const ordered = (kPart, oPart) => (lv === "x" ? [kPart, oPart] : [oPart, kPart]);
  const replaced = joinParts(ordered({ neg: kc < 0, body: kTerm }, part(oc, lin(Math.abs(oc), other))));
  const pl = [`Use the equation ${t1}`, `Replace ${lv} with ${num(val)}: ${replaced} = ${num(c1)}`];
  if (Math.abs(kc) !== 1) pl.push(`Multiply: ${kc} × ${par(val)} = ${num(K)}`);
  const kBody = K === 0 ? "" : String(Math.abs(K)); const eqTxt = joinParts(ordered(part(K, kBody), part(oc, lin(Math.abs(oc), other))));
  pl.push(`So the equation is ${eqTxt} = ${num(c1)}`);
  if (K !== 0) {
    const [sg, mag] = cancel(K); const o = opTxt(sg, mag);
    pl.push(`${opWord(sg)} ${mag} ${prep(sg)} BOTH sides: ${eqTxt} ${o} = ${num(c1)} ${o}`, `Left side: ${num(K)} ${sg === "+" ? "+" : M} ${mag} = 0, so ${lin(oc, other)} is left`, `Right side: ${num(c1)} ${sg === "+" ? "+" : M} ${mag} = ${num(rem)}`);
  }
  pl.push(`So ${lin(oc, other)} = ${num(rem)}`);
  const ov = rem / oc;
  if (oc !== 1) { const o = oc > 0 ? P_(`÷ ${oc}`) : N_(`÷ (${num(oc)})`); pl.push(`Divide BOTH sides by ${num(oc)}: ${lin(oc, other)} ${o} = ${num(rem)} ${o}`, `So ${other} = ${num(rem)} ÷ ${par(oc)} = ${num(ov)}`); }
  s.push(st(`Plug ${lv} = ${num(val)} back into one of the original equations to find ${other}.`, ...pl));
  const [X, Y] = lv === "x" ? [val, ov] : [ov, val]; const ans = `x = ${num(X)}, y = ${num(Y)}`; s.push(fin(ans));
  return { steps: s, ans, x: X, y: Y };
}

/* ---- polynomials and factoring ---- */
export function distributeSteps(c, p, B, C) {
  const tri = [[1, 2], [B, 1], [C, 0]];
  const first = tri.map(([k, d]) => [c * k, d + 1]), second = tri.map(([k, d]) => [p * k, d]);
  const triS = polyStr({ 2: 1, 1: B, 0: C });
  const prod = (fc, fd, k, d, rc, rd) => `${pfac(fc, fd)} · ${pfac(k, d)} = ${tstr(rc, rd)}`;
  const s = [start(`(${lk(c, p)})(${triS})`),
    st(`Distribute the first term, ${tstr(c, 1)}, across EVERY term of the trinomial.`, ...tri.map(([k, d], i) => prod(c, 1, k, d, first[i][0], first[i][1])), `So ${tstr(c, 1)}(${triS}) = ${termsStr(first.map(([k, d]) => [k, SUPX[d]]))}`),
    st(`Distribute the second term, ${num(p)}, across EVERY term of the trinomial.`, ...tri.map(([k, d], i) => prod(p, 0, k, d, second[i][0], second[i][1])), `So ${num(p)}(${triS}) = ${termsStr(second.map(([k, d]) => [k, SUPX[d]]))}`)];
  const all = [...first, ...second];
  s.push(st("Write both results together.", termsStr(all.map(([k, d]) => [k, SUPX[d]]))));
  const co = {}, bl = []; const nm = { 3: "x³", 2: "x²", 1: "x", 0: "Constant" };
  for (const d of [3, 2, 1, 0]) {
    const ks = all.filter(([, dd]) => dd === d).map(([k]) => k); if (!ks.length) continue;
    co[d] = ks.reduce((a, b) => a + b, 0);
    bl.push(ks.length > 1 ? `${nm[d]} terms: ${termsStr(ks.map((k) => [k, SUPX[d]]))} = ${co[d] !== 0 ? tstr(co[d], d) : "0"}` : `${nm[d]} term: only ${tstr(ks[0], d)}, nothing to combine`);
  }
  s.push(st("Combine the like terms (terms with the same power of x).", ...bl));
  const ans = polyStr(co); s.push(fin(ans)); return { steps: s, ans };
}
// A x^d1 (+|−) B x^d2 with d1 > d2 ≥ 1
export function gcfSteps(A, B, d1, d2, sign) {
  const sg = sign > 0 ? "+" : "−"; const top = `${tstr(A, d1)} ${sg} ${tstr(B, d2)}`;
  const g = gcd(A, B), dm = Math.min(d1, d2); const G = (g !== 1 ? String(g) : "") + SUPX[dm];
  const q1 = [A / g, d1 - dm], q2 = [sign * (B / g), d2 - dm];
  const inside = termsStr([[q1[0], SUPX[q1[1]]], [q2[0], SUPX[q2[1]]]]);
  const s = [start(top),
    st("Find the greatest number that divides BOTH coefficients evenly.", `Factors of ${A}: ${divisors(A).join(", ")}`, `Factors of ${B}: ${divisors(B).join(", ")}`, `The biggest number in both lists is ${g}`),
    st("Find the smallest power of x that appears in BOTH terms.", `${tstr(A, d1)} has ${SUPX[d1]}`, `${tstr(B, d2)} has ${SUPX[d2]}`, `The smaller power is ${SUPX[dm]}`),
    st("Put the two parts together to get the GCF.", `GCF = ${g} · ${SUPX[dm]} = ${G}`),
    st(`Divide each term by the GCF, ${G}.`, `${tstr(A, d1)} ÷ ${G} = ${tstr(q1[0], q1[1])}`, `${tstr(sign * B, d2)} ÷ ${G} = ${tstr(q2[0], q2[1])}`),
    st("Write the GCF out front, with what is left inside parentheses.", `${G}(${inside})`),
    st("Check by multiplying the GCF back in.", `${G} · ${pfac(q1[0], q1[1])} = ${tstr(A, d1)}`, `${G} · ${pfac(q2[0], q2[1])} = ${tstr(sign * B, d2)}`, `Together: ${top}, which matches the problem`),
    fin(`${G}(${inside})`)];
  return { steps: s, ans: `${G}(${inside})` };
}
// (k x)² − c²
export function dosSteps(k, c) {
  const sq = k > 1 ? `${k * k}x²` : "x²"; const top = `${sq} − ${c * c}`; const ax = lin(k, "x");
  const s = [start(top),
    st("Check that it is a difference of squares: two perfect squares with a minus sign between them. Write each one as something squared.", k > 1 ? `${sq} = (${ax})²` : "x² = (x)²", `${c * c} = ${c}²`),
    st("Find a and b. They are the square roots of the two squares.", `a = √${sq} = ${ax}`, `b = √${c * c} = ${c}`),
    st("Put a and b into the pattern a² − b² = (a − b)(a + b).", `(${ax} − ${c})(${ax} + ${c})`),
    st("Check by multiplying the two factors (FOIL).", `(${ax} − ${c})(${ax} + ${c}) = ${k > 1 ? `${k * k}x²` : "x²"} + ${k * c === 1 ? "x" : `${k * c}x`} − ${k * c === 1 ? "x" : `${k * c}x`} − ${c * c}`, `The middle terms cancel, which leaves ${top}, so it matches the problem`),
    fin(`(${ax} − ${c})(${ax} + ${c})`)];
  return { steps: s, ans: `(${ax} − ${c})(${ax} + ${c})` };
}
const binStr = (p, q) => `(${lk(p, q)})`;
function pairList(prod, tsum) {
  const ps = [];
  if (prod > 0) { const sg = tsum > 0 ? 1 : -1; for (const p of divisors(prod)) { const q = prod / p; if (p <= q) ps.push([sg * p, sg * q]); } }
  else for (const p of divisors(-prod)) { const q = -prod / p; if (p <= q) { ps.push([p, -q]); if (p !== q) ps.push([-p, q]); } }
  const lines = ps.map(([p, q]) => `${par(p)} × ${par(q)} = ${num(prod)}, and ${par(p)} + ${par(q)} = ${num(p + q)}${p + q === tsum ? " (this pair works)" : ""}`);
  return { lines, good: ps.find(([p, q]) => p + q === tsum) };
}
// a x² + b x + c by splitting the middle term and grouping
export function acSteps(a, b, c, q) {
  const ac = a * c; const { lines, good } = pairList(ac, b);
  let n1, n2, g1, bx, bc, g2;
  for (const [x1, x2] of [good, [good[1], good[0]]]) {
    const gg = gcd(a, Math.abs(x1)); const bxx = a / gg, bcc = x1 / gg;
    if (x2 % bxx === 0 && c % bcc === 0 && x2 / bxx === c / bcc) { n1 = x1; n2 = x2; g1 = gg; bx = bxx; bc = bcc; break; }
  }
  g2 = n2 / bx; const top = polyStr({ 2: a, 1: b, 0: c }); const b1 = binStr(bx, bc); const second = termsStr([[g1, "x"], [g2, ""]]);
  const fs = [[bx, bc], [g1, g2]].sort((u, v) => v[0] - u[0] || v[1] - u[1]); const fa = `(${lk(...fs[0])})(${lk(...fs[1])})`;
  const foil = [[a, 2], [fs[0][0] * fs[1][1], 1], [fs[0][1] * fs[1][0], 1], [fs[0][1] * fs[1][1], 0]];
  const s = [start(q ?? `Factor: ${top}`),
    st("Write down a, b and c, then multiply a × c.", `a = ${a}, b = ${num(b)}, c = ${num(c)}`, `a × c = ${a} × ${par(c)} = ${num(ac)}`),
    st(`Find two numbers that MULTIPLY to ${num(ac)} and ADD to ${num(b)}. Try the pairs.`, ...lines),
    st("Split the middle term into two terms using those numbers.", `${num(b)}x = ${num(n1)}x ${n2 > 0 ? "+" : "−"} ${Math.abs(n2)}x`, `So ${top} = ${termsStr([[a, "x²"], [n1, "x"], [n2, "x"], [c, ""]])}`),
    st("Group the four terms into two pairs.", `(${termsStr([[a, "x²"], [n1, "x"]])}) + (${termsStr([[n2, "x"], [c, ""]])})`),
    st("Factor the GCF out of each pair.", `First pair: ${termsStr([[a, "x²"], [n1, "x"]])} = ${lin(g1, "x")}${b1}`, `Second pair: ${termsStr([[n2, "x"], [c, ""]])} = ${num(g2)}${b1}`),
    st(`Both pairs now have the same binomial, ${b1}. Factor it out.`, `${lin(g1, "x")}${b1} ${g2 > 0 ? "+" : "−"} ${Math.abs(g2)}${b1} = ${b1}(${second})`),
    st("Check by multiplying the two factors back together.", `${fa} = ${termsStr(foil.map(([k, d]) => [k, SUPX[d]]))}`,
      `Combine the middle terms: ${termsStr([[foil[1][0], "x"]])} ${foil[2][0] >= 0 ? "+" : "−"} ${termsStr([[Math.abs(foil[2][0]), "x"]])} = ${tstr(b, 1)}`, `So the product is ${top}, which matches the problem`),
    fin(fa)];
  return { steps: s, ans: fa };
}
// x² + b x + c with the two numbers found by listing pairs
export function tri1Steps(b, c, q) {
  const { lines, good: [n1, n2] } = pairList(c, b);
  const [first, second] = c > 0 ? [n1, n2].sort((u, v) => Math.abs(u) - Math.abs(v)) : [n1, n2].sort((u, v) => Math.abs(v) - Math.abs(u));
  const top = polyStr({ 2: 1, 1: b, 0: c }); const fa = `(x ${first > 0 ? "+" : "−"} ${Math.abs(first)})(x ${second > 0 ? "+" : "−"} ${Math.abs(second)})`;
  const foil = [[1, 2], [second, 1], [first, 1], [first * second, 0]];
  const s = [start(q ?? `Factor: ${top}`),
    st("For x² + bx + c, find two numbers that MULTIPLY to c and ADD to b.", `b = ${num(b)} and c = ${num(c)}`, `We need two numbers that multiply to ${num(c)} and add to ${num(b)}`),
    st(`Try the pairs of numbers that multiply to ${num(c)}.`, ...lines),
    st("Write each number after an x, keeping its own sign.", fa),
    st("Check by multiplying the factors back together (FOIL).", `${fa} = ${termsStr(foil.map(([k, d]) => [k, SUPX[d]]))}`,
      `The middle terms combine: ${termsStr([[second, "x"]])} ${first >= 0 ? "+" : "−"} ${termsStr([[Math.abs(first), "x"]])} = ${tstr(b, 1)}`, `So the product is ${top}, which matches the problem`),
    fin(fa)];
  return { steps: s, ans: fa };
}
export function group4Steps(A, B, q) {
  const top = termsStr([[1, "x³"], [A, "x²"], [B, "x"], [A * B, ""]]); const b1 = `(x ${A > 0 ? "+" : "−"} ${Math.abs(A)})`; const Bs = B;
  const s = [start(q ?? `Factor by grouping: ${top}`),
    st("There are four terms, so group them into two pairs.", `(${termsStr([[1, "x³"], [A, "x²"]])}) + (${termsStr([[B, "x"], [A * B, ""]])})`),
    st("Factor the GCF out of each pair. Divide each term by the GCF.", `First pair: x² is the GCF. x³ ÷ x² = x and ${tstr(A, 2)} ÷ x² = ${num(A)}, so ${termsStr([[1, "x³"], [A, "x²"]])} = x²${b1}`,
      `Second pair: ${Bs} is the GCF. ${Bs}x ÷ ${Bs} = x and ${num(A * B)} ÷ ${Bs} = ${num(A)}, so ${termsStr([[B, "x"], [A * B, ""]])} = ${Bs}${b1}`),
    st(`Both pairs now have the same leftover factor, ${b1}. The GCFs x² and ${Bs} can be different. It is the leftover that has to match.`, `x²${b1} + ${Bs}${b1}`),
    st(`Factor out ${b1}.`, `x²${b1} + ${Bs}${b1} = ${b1}(x² + ${Bs})`),
    st("Check by multiplying back together.", `${b1}(x² + ${Bs}) = x³ + ${Bs}x ${A > 0 ? "+" : "−"} ${Math.abs(A)}x² ${A * B > 0 ? "+" : "−"} ${Math.abs(A * B)}`, `Put the terms in order: ${top}, which matches the problem`),
    fin(`${b1}(x² + ${Bs})`)];
  return { steps: s, ans: `${b1}(x² + ${Bs})` };
}
// perfect square trinomial x² ± 2k x + k²
export function psSteps(b, c, q) {
  const k = Math.round(Math.sqrt(c)); const sg = b > 0 ? "+" : "−"; const top = polyStr({ 2: 1, 1: b, 0: c }); const fa = `(x ${sg} ${k})²`; const m = `x ${sg} ${k}`;
  const s = [start(q ?? `Factor: ${top}`),
    st("A perfect square trinomial has a first term and a last term that are perfect squares. Find their square roots.", "√x² = x", `√${c} = ${k}`),
    st("Check the middle term. It should be 2 × (first root) × (last root).", `2 × x × ${k} = ${2 * k}x`, `The middle term of the problem is ${num(b)}x, so it matches (the sign tells us which way)`),
    st(`Write the factored form ${fa}. The sign inside is the sign of the middle term.`, `(${m})² means (${m})(${m})`),
    st("Check by multiplying the two factors (FOIL).", `(${m})(${m}) = x² ${sg} ${k}x ${sg} ${k}x + ${c}`, `Combine the middle terms: ${num(b / 2)}x ${b > 0 ? "+" : "−"} ${Math.abs(b / 2)}x = ${num(b)}x`, `So the product is ${top}, which matches the problem`),
    fin(fa)];
  return { steps: s, ans: fa };
}
export function cubesSteps(k, isSum, q) {
  const kc = k === 1 ? "" : String(k); const k2c = k * k === 1 ? "" : String(k * k); const c = k ** 3;
  const top = `x³ ${isSum ? "+" : "−"} ${c}`; const s1 = isSum ? "+" : "−", s2 = isSum ? "−" : "+"; const fa = `(x ${s1} ${k})(x² ${s2} ${kc}x + ${k * k})`;
  const s = [start(q ?? `Factor: ${top}`),
    st("Check that both terms are perfect CUBES. Find each cube root.", "∛x³ = x", `∛${c} = ${k}, because ${k} × ${k} × ${k} = ${c}`),
    st(`Use the pattern for a ${isSum ? "sum" : "difference"} of cubes.`, isSum ? "a³ + b³ = (a + b)(a² − ab + b²)" : "a³ − b³ = (a − b)(a² + ab + b²)", "The middle sign in the second factor is the OPPOSITE of the sign in the first factor"),
    st("Identify a and b.", "a = x", `b = ${k}`),
    st("Fill in the first factor.", `(a ${s1} b) = (x ${s1} ${k})`),
    st("Fill in the second factor.", "a² = x²", `ab = x × ${k} = ${kc}x`, `b² = ${k}² = ${k * k}`, `(a² ${s2} ab + b²) = (x² ${s2} ${kc}x + ${k * k})`),
    st("Check by multiplying the factors.", `${fa} = x³ ${isSum ? "−" : "+"} ${kc}x² + ${k2c}x ${isSum ? "+" : "−"} ${kc}x² ${isSum ? "−" : "+"} ${k2c}x ${s1} ${c}`, `The x² terms cancel and the x terms cancel, which leaves ${top}`),
    fin(fa)];
  return { steps: s, ans: fa };
}
export function foilSteps(c1, p, c2, q, question) {
  const t1 = lin(c1, "x"), t2 = lin(c2, "x"); const A = c1 * c2, O = c1 * q, I = p * c2, Lq = p * q, B = O + I;
  const prob = `(${lk(c1, p)})(${lk(c2, q)})`; const pf = (s) => (String(s).startsWith("−") ? `(${s})` : String(s)); const r = (a, b) => `${pf(a)} · ${pf(b)}`;
  const items = [[A, 2], [O, 1], [I, 1], [Lq, 0]];
  const s = [start(question ?? prob),
    st("FOIL means First, Outer, Inner, Last. Multiply each pair of terms. First: the first term in each set of parentheses.", `${r(t1, t2)} = ${tstr(A, 2)}`),
    st("Outer: the two terms on the outside.", `${r(t1, num(q))} = ${tstr(O, 1)}`),
    st("Inner: the two terms on the inside.", `${r(num(p), t2)} = ${tstr(I, 1)}`),
    st("Last: the last term in each set of parentheses.", `${r(num(p), num(q))} = ${num(Lq)}`),
    st("Write the four results together.", termsStr(items.map(([k, d]) => [k, SUPX[d]])))];
  s.push(st("Combine the like terms. The Outer and Inner results both have x.", `${termsStr([[O, "x"]])} ${I >= 0 ? "+" : "−"} ${termsStr([[Math.abs(I), "x"]])} = ${B !== 0 ? tstr(B, 1) : "0"}${B === 0 ? " (they cancel!)" : ""}`));
  const ans = polyStr({ 2: A, 1: B, 0: Lq }); s.push(fin(ans)); return { steps: s, ans };
}
export function polyOpSteps(p1, p2, op, q) {
  const P1 = polyStr(p1), P2 = polyStr(p2); const degs = [...new Set([...Object.keys(p1), ...Object.keys(p2)].map(Number))].sort((a, b) => b - a);
  const desc = (p) => Object.keys(p).map(Number).sort((a, b) => b - a);
  const s = [start(q ?? `(${P1}) ${op} (${P2})`)];
  const neg = {}; for (const d of desc(p2)) neg[d] = -p2[d];
  const second = op === "+" ? p2 : neg;
  const lst = (p) => desc(p).map((d) => [p[d], SUPX[d]]);
  if (op === "+") s.push(st("Remove the parentheses. Adding does not change any signs.", `(${P1}) + (${P2}) = ${termsStr([...lst(p1), ...lst(p2)])}`));
  else s.push(st("Distribute the negative sign. A minus in front of parentheses flips EVERY sign inside.", `−(${P2}) = ${polyStr(neg)}`, `So the problem becomes ${termsStr([...lst(p1), ...lst(neg)])}`));
  const order = [...desc(p1).map((d) => [p1[d], d]), ...desc(second).map((d) => [second[d], d])];
  const groups = degs.map((d) => [d, order.filter(([k, dd]) => dd === d && k !== 0).map(([k]) => k)]); const tot = {};
  for (const [d, ks] of groups) tot[d] = ks.reduce((a, b) => a + b, 0);
  s.push(st("Group the like terms. Like terms have the SAME variable part (same x and same exponent).", groups.filter(([, ks]) => ks.length).map(([d, ks]) => `(${termsStr(ks.map((k) => [k, SUPX[d]]))})`).join(" + ")));
  const nm = { 3: "x³", 2: "x²", 1: "x", 0: "Number" }; const bl = [];
  for (const [d, ks] of groups) { if (ks.length > 1) bl.push(`${nm[d]} terms: ${termsStr(ks.map((k) => [k, SUPX[d]]))} = ${tot[d] !== 0 ? tstr(tot[d], d) : "0"}`); else if (ks.length === 1) bl.push(`${nm[d]} term: ${tstr(ks[0], d)} has nothing to combine with`); }
  s.push(st("Combine each group.", ...bl)); const ans = polyStr(tot); s.push(fin(ans)); return { steps: s, ans };
}

/* ---- quadratics ---- */
const isqrt = (n) => Math.floor(Math.sqrt(n + 1e-9));
export function sqrtSplit(D) { let s = 1; for (let k = isqrt(D); k > 1; k--) if (D % (k * k) === 0) { s = k; break; } return [s, D / (s * s)]; }
// x² + b x + c = 0 by completing the square (b even)
export function ctsSteps(b, c, q) {
  const half = b / 2, sq = half * half, rhs = -c, rhs2 = rhs + sq; const lhs0 = termsStr([[1, "x²"], [b, "x"]]);
  const top = `${termsStr([[1, "x²"], [b, "x"], [c, ""]])} = 0`; const perf = rhs2 >= 0 && isqrt(rhs2) ** 2 === rhs2;
  const [sg, mag] = cancel(c); const o = opTxt(sg, mag); const inner = `x ${half > 0 ? "+" : "−"} ${Math.abs(half)}`;
  const s = [start(q ?? top),
    st(`Move the constant to the other side. ${opWord(sg)} ${mag} ${prep(sg)} BOTH sides.`, `${termsStr([[1, "x²"], [b, "x"], [c, ""]])} ${o} = 0 ${o}`, `Left side: ${num(c)} ${sg === "+" ? "+" : M} ${mag} = 0, so only ${lhs0} is left`, `Right side: 0 ${sg === "+" ? "+" : M} ${mag} = ${num(rhs)}`, `So ${lhs0} = ${num(rhs)}`),
    st("Find the number that completes the square. Take HALF of the x-coefficient, then square it.", `Half of ${num(b)}: ${num(b)} ÷ 2 = ${num(half)}`, `Square it: ${par(half)}² = ${sq}`),
    st(`Add ${sq} to BOTH sides.`, `${lhs0} ${P_("+ " + sq)} = ${num(rhs)} ${P_("+ " + sq)}`, `Left side: ${termsStr([[1, "x²"], [b, "x"], [sq, ""]])}`, `Right side: ${num(rhs)} + ${sq} = ${num(rhs2)}`),
    st("The left side is now a perfect square. Write it as (x + half)².", `${termsStr([[1, "x²"], [b, "x"], [sq, ""]])} = (${inner})²`, `So (${inner})² = ${rhs2}`)];
  const [sgc, magc] = half > 0 ? ["−", half] : ["+", -half]; const oc = opTxt(sgc, magc); let ans;
  if (perf) {
    const r = isqrt(rhs2);
    s.push(st("Take the square root of BOTH sides. Remember that a square root can be positive or negative (±).", `${inner} = ±√${rhs2}`, `√${rhs2} = ${r}`, `So ${inner} = ±${r}`));
    const sols = [];
    for (const [name, val] of [["positive", r], ["negative", -r]]) {
      const x = val - half; sols.push(x);
      s.push(st(`Solve the ${name} case: ${inner} = ${num(val)}`, `${opWord(sgc)} ${magc} ${prep(sgc)} BOTH sides: ${inner} ${oc} = ${num(val)} ${oc}`, `Left side: ${num(half)} ${sgc === "−" ? "−" : "+"} ${magc} = 0, so x is left`, `Right side: ${num(val)} ${sgc === "−" ? "−" : "+"} ${magc} = ${num(x)}`, `So x = ${num(x)}`));
    }
    ans = `x = ${num(sols[0])} or x = ${num(sols[1])}`;
  } else {
    s.push(st(`Take the square root of BOTH sides. Remember ±. ${rhs2} is not a perfect square, so the radical stays.`, `${inner} = ±√${rhs2}`));
    s.push(st("Get x alone.", `${opWord(sgc)} ${magc} ${prep(sgc)} BOTH sides: ${inner} ${oc} = ±√${rhs2} ${oc}`, `Left side: ${num(half)} ${sgc === "−" ? "−" : "+"} ${magc} = 0, so x is left`, `So x = ${num(-half)} ± √${rhs2}`));
    ans = `x = ${num(-half)} ± √${rhs2}`;
  }
  s.push(fin(ans)); return { steps: s, ans };
}
const decs = (n, d) => { const v = n / d; return Number.isInteger(v) ? num(v) : (v < 0 ? M : "") + String(Math.abs(v)); };
export function qfSteps(a, b, c, q, dec = true) {
  const D = b * b - 4 * a * c; const top = `${termsStr([[a, "x²"], [b, "x"], [c, ""]])} = 0`;
  const s = [start(q ?? top),
    st("Write the quadratic formula. It solves ANY equation of the form ax² + bx + c = 0.", "x = (−b ± √(b² − 4ac)) / (2a)"),
    st("Compare the equation with ax² + bx + c = 0 to find a, b and c. Watch the signs.", `a = ${num(a)}`, `b = ${num(b)}`, `c = ${num(c)}`),
    st("Find the discriminant, b² − 4ac, one piece at a time.", `b² = ${par(b)}² = ${b * b}`, `4ac = 4 × ${par(a)} × ${par(c)} = ${num(4 * a * c)}`, `b² − 4ac = ${b * b} − ${par(4 * a * c)} = ${num(D)}`)];
  let ans;
  if (isqrt(D) ** 2 === D) {
    const r = isqrt(D);
    s.push(st("Take the square root of the discriminant.", `√${D} = ${r}`));
    s.push(st("Plug a, b and the square root into the formula.", `−b = −${par(b)} = ${num(-b)}`, `2a = 2 × ${par(a)} = ${num(2 * a)}`, `x = (${num(-b)} ± ${r}) / ${num(2 * a)}`));
    const vals = [];
    for (const [name, sg] of [["plus", "+"], ["minus", "−"]]) {
      const topv = sg === "+" ? -b + r : -b - r; const bl = [`x = (${num(-b)} ${sg} ${r}) / ${num(2 * a)}`, `Top: ${num(-b)} ${sg} ${r} = ${num(topv)}`, `x = ${num(topv)} / ${num(2 * a)}`];
      if (topv % (2 * a) !== 0) bl.push(`Reduce: ${num(topv)} / ${num(2 * a)} = ${fr(topv, 2 * a)}${dec ? ` = ${decs(topv, 2 * a)}` : ""}`); else bl.push(`x = ${num(topv / (2 * a))}`);
      s.push(st(`Solve the ${name} case (${sg}).`, ...bl)); vals.push(dec ? decs(topv, 2 * a) : fr(topv, 2 * a));
    }
    ans = `x = ${vals[0]} or x = ${vals[1]}`;
  } else {
    const [sq, rad] = sqrtSplit(D);
    s.push(st("The discriminant is not a perfect square, so simplify the radical instead of using a decimal.", sq > 1 ? `√${D} = √(${sq * sq} × ${rad}) = √${sq * sq} × √${rad} = ${sq}√${rad}` : `√${D} stays as √${D}`));
    s.push(st("Plug a, b and the simplified root into the formula.", `−b = ${num(-b)}`, `2a = ${num(2 * a)}`, `x = (${num(-b)} ± ${sq}√${rad}) / ${num(2 * a)}`));
    const g = gcd(gcd(Math.abs(b), sq), 2 * Math.abs(a)); const A2 = (2 * a) / g, B2 = -b / g, S2 = sq / g; const rt = (S2 !== 1 ? String(S2) : "") + `√${rad}`;
    if (g > 1) s.push(st(`Simplify. ${g} divides every number in the fraction, so divide the top terms and the bottom by ${g}.`, `${num(-b)} ÷ ${g} = ${num(B2)}`, `${sq} ÷ ${g} = ${S2}`, `${num(2 * a)} ÷ ${g} = ${num(A2)}`));
    ans = A2 === 1 ? (B2 !== 0 ? `x = ${num(B2)} ± ${rt}` : `x = ± ${rt}`) : `x = (${num(B2)} ± ${rt}) / ${A2}`;
  }
  s.push(fin(ans)); return { steps: s, ans };
}
const rootFactor = (r) => (r === 0 ? "x" : r > 0 ? `(x − ${r})` : `(x + ${-r})`);
// x² + b x + c = 0 solved by factoring (roots r1, r2 are the solutions)
export function factorSolveSteps(r1, r2, q) {
  const B = -(r1 + r2), C = r1 * r2; const lhs = polyStr({ 2: 1, 1: B, 0: C }); const f1 = rootFactor(r1), f2 = rootFactor(r2);
  const fl = [f1, f2]; let fb, fac;
  if (r1 === 0 || r2 === 0) {
    const other = r1 === 0 ? r2 : r1, bn = -other;
    fb = ["Both terms have the common factor x", `x² ÷ x = x and ${lin(bn, "x")} ÷ x = ${num(bn)}`, `So ${lhs} = x(x ${bn > 0 ? "+" : "−"} ${Math.abs(bn)})`]; fac = `x(x ${bn > 0 ? "+" : "−"} ${Math.abs(bn)})`;
  } else if (B === 0) {
    const k = Math.abs(r1); fac = `(x − ${k})(x + ${k})`;
    fb = [`${lhs} is a difference of squares: x² − ${k}²`, `Pattern: a² − b² = (a − b)(a + b), with a = x and b = ${k}`, `So ${lhs} = ${fac}`];
  } else {
    const { lines } = pairList(C, B); fac = `${f1}${f2}`;
    fb = [`Find two numbers that MULTIPLY to ${num(C)} and ADD to ${num(B)}`, ...lines, `The numbers are ${num(-r1)} and ${num(-r2)}`, `So ${lhs} = ${fac}`];
  }
  const s = [start(q ?? `Solve: ${lhs} = 0`), st("The equation already equals 0 on one side, so factor the other side.", ...fb),
    st("Rewrite the equation with the factored form.", `${fac} = 0`),
    st("Use the Zero Product Property. If two things multiply to give 0, at least one of them must be 0. So set EACH factor equal to 0.", `${fl[0].replace(/[()]/g, "")} = 0`, `${fl[1].replace(/[()]/g, "")} = 0`)];
  for (const [r, idx] of [[r1, "first"], [r2, "second"]]) {
    const f = rootFactor(r).replace(/[()]/g, "");
    if (r === 0) s.push(st(`Solve the ${idx} equation: x = 0`, "x is already alone", "So x = 0"));
    else { const res = solveSteps(1, -r, "=", 0); s.push(st(`Solve the ${idx} equation: ${f} = 0`, ...res.steps[0].split("\n• ").slice(1))); }
  }
  s.push(fin(`x = ${num(r1)} or x = ${num(r2)}`)); return { steps: s, ans: `x = ${num(r1)} or x = ${num(r2)}` };
}

/* ---- lines, functions, parabolas ---- */
export const lineq = (m, b) => "y = " + lk(m, b);
const lineEq = lineq;
export function readSteps(m, b, eqtext, q) {
  const mtxt = m === 1 ? "No number is written in front of x, so it is 1x and the slope is 1" : m === -1 ? "There is only a minus sign in front of x, so it is −1x and the slope is −1" : `The number multiplying x is ${num(m)}`;
  return [start(q ?? eqtext), st("Compare the equation with slope-intercept form, y = mx + b.", "m is the number multiplying x (the slope)", "b is the number added or subtracted on its own (the y-intercept)"),
    st("Find the slope, m.", `In ${eqtext}: ${mtxt}`, `So m = ${num(m)}`),
    st("Find the y-intercept, b.", `In ${eqtext}: the number on its own is ${num(b)}${b < 0 ? " (the minus sign goes with the number)" : ""}`, `So b = ${num(b)}`),
    fin(`m = ${num(m)}, b = ${num(b)}`)];
}
export function evalLineSteps(m, b, x0, q) {
  const y = m * x0 + b; const mm = `${num(m)}(${num(x0)})`;
  const sub1 = "y = " + mm + (b !== 0 ? ` ${b > 0 ? "+" : "−"} ${Math.abs(b)}` : ""); const mx = m * x0;
  return [start(q), st("Write the equation of the line using y = mx + b.", `m = ${num(m)} and b = ${num(b)}`, lineEq(m, b)),
    st(`Substitute x = ${num(x0)} into the equation.`, sub1),
    st("Multiply first.", `${par(m)} × ${par(x0)} = ${num(mx)}`, `y = ${num(mx)} ${b >= 0 ? "+" : "−"} ${Math.abs(b)}`),
    st("Add or subtract.", `${num(mx)} ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${num(y)}`), fin(`y = ${num(y)}`)];
}
export function twoPointSlope(x1, y1, x2, y2) {
  const dy = y2 - y1, dx = x2 - x1;
  return { steps: [st("Use the slope formula.", "m = (y₂ − y₁) ÷ (x₂ − x₁)", "The slope is the change in y divided by the change in x"),
    st("Label the two points.", `(x₁, y₁) = (${num(x1)}, ${num(y1)})`, `(x₂, y₂) = (${num(x2)}, ${num(y2)})`),
    st("Find the change in y and the change in x.", `Change in y: ${num(y2)} − ${par(y1)} = ${num(dy)}`, `Change in x: ${num(x2)} − ${par(x1)} = ${num(dx)}`),
    st("Divide the change in y by the change in x.", `m = ${num(dy)} ÷ ${par(dx)} = ${fr(dy, dx)}`)], m: fr(dy, dx), dy, dx };
}
export function slopeSteps(x1, y1, x2, y2, q) { const r = twoPointSlope(x1, y1, x2, y2); return [start(q), ...r.steps, fin(`m = ${r.m}`)]; }
export function ptSlopeSteps(x0, y0, m, q, full = true) {
  const pre = full ? [start(q)] : [];
  if (x0 === 0) return { steps: [...pre, st(`The point (0, ${num(y0)}) has x = 0, so it sits on the y-axis. That makes it the y-intercept.`, `b = ${num(y0)}`), st("Write the equation using y = mx + b.", lineEq(m, y0)), fin(lineEq(m, y0))], b: y0 };
  const K = m * x0, b = y0 - K; const [sg, mag] = K !== 0 ? cancel(K) : ["−", 0];
  const mm = `${num(m)}(${num(x0)})`;
  const mult = `${num(m)}(${num(x0)}) = ${num(K)}`;
  const o = opTxt(sg, mag);
  const s = [...pre, st(`Use slope-intercept form, y = mx + b. We know m = ${num(m)} and a point on the line, x = ${num(x0)} and y = ${num(y0)}. Substitute them in.`, `${num(y0)} = ${mm} + b`),
    st("Multiply first.", mult, `So ${num(y0)} = ${num(K)} + b`),
    st(`Get b alone. ${opWord(sg)} ${mag} ${prep(sg)} BOTH sides.`, `${num(K)} + b ${o} = ${num(y0)} ${o}`, `Left side: ${num(K)} ${sg === "+" ? "+" : M} ${mag} = 0, so b is left`, `Right side: ${num(y0)} ${sg === "+" ? "+" : M} ${mag} = ${num(b)}`, `So b = ${num(b)}`),
    st("Write the equation using m and b.", lineEq(m, b)), fin(lineEq(m, b))];
  return { steps: s, b };
}
export const parallelSteps = (m, b, q) => [start(q), st("Read the slope of the given line.", "In y = mx + b, m is the number multiplying x", `In ${lineEq(m, b)}, m = ${num(m)}`),
  st("Parallel lines never meet, which means they lean the same amount. So they have the SAME slope.", `The parallel slope is ${num(m)}`), fin(`m = ${num(m)}`)];
export const perpSteps = (m, b, q) => [start(q), st("Read the slope of the given line.", `In ${lineEq(m, b)}, m = ${num(m)}`),
  st("Perpendicular slopes are NEGATIVE RECIPROCALS. That takes two moves: flip the fraction, then change the sign.", `Write ${num(m)} as a fraction: ${num(m)} = ${num(m)}/1`),
  st("Flip the fraction (swap top and bottom).", `${num(m)}/1 flipped is 1/${par(m)}${m < 0 ? `, which is written ${fr(1, m)}` : ""}`),
  st("Change the sign.", `${fr(1, m)} with its sign changed is ${fr(-1, m)}`), fin(`m = ${fr(-1, m)}`)];
// f(x) = a x² + b x + c at x0 (co: {2:a,1:b,0:c})
export function evalFSteps(co, x0, q) {
  const a = co[2] || 0, b = co[1] || 0, c = co[0] || 0; const X = x0 < 0 ? par(x0) : String(x0); const pieces = [], vals = [];
  for (const [coef, deg] of [[a, 2], [b, 1], [c, 0]]) {
    if (coef === 0) continue; let body, v, calc = null;
    if (deg === 2) {
      body = (Math.abs(coef) !== 1 ? String(Math.abs(coef)) : "") + `${X}²`; v = coef * x0 * x0;
      calc = Math.abs(coef) === 1 ? (x0 < 0 ? `${X}² = ${par(x0)} × ${par(x0)} = ${num(x0 * x0)}` : `${X}² = ${num(x0 * x0)}`) : `${Math.abs(coef)} × ${X}² = ${Math.abs(coef)} × ${x0 * x0} = ${num(Math.abs(coef) * x0 * x0)}`;
    } else if (deg === 1) {
      body = Math.abs(coef) !== 1 ? `${Math.abs(coef)}(${num(x0)})` : `(${num(x0)})`; v = coef * x0;
      calc = Math.abs(coef) !== 1 ? `${Math.abs(coef)}(${num(x0)}) = ${num(Math.abs(coef) * x0)}` : `${coef > 0 ? "" : "−"}(${num(x0)}) = ${num(v)}`;
    } else { body = String(Math.abs(coef)); v = coef; }
    pieces.push([coef, body]); vals.push([v, calc]);
  }
  const subs = pieces.reduce((s, [coef, body], i) => s + (i === 0 ? (coef < 0 ? M : "") + body : (coef < 0 ? " − " : " + ") + body), "");
  const calcs = vals.map(([, c2]) => c2).filter(Boolean); const total = a * x0 * x0 + b * x0 + c;
  const allv2 = termsStr(vals.map(([v]) => [v, ""]));
  const s = [start(q), st("Write the rule of the function and the input.", `f(x) = ${polyStr(co)}`, `Input: x = ${num(x0)}`), st(`Substitute ${num(x0)} in place of EVERY x.`, `f(${num(x0)}) = ${subs}`)];
  if (calcs.length) s.push(st("Work out each part with the order of operations: powers and multiplying come first.", ...calcs));
  s.push(st("Combine the numbers by adding or subtracting.", `f(${num(x0)}) = ${allv2}`, `${allv2} = ${num(total)}`), fin(num(total)));
  return s;
}
export const domainSteps = (k, q) => {
  const [sg, mag] = cancel(k); const o = opTxt(sg, mag); const x = -k; const expr = lk(1, k);
  return [start(q), st("A fraction is undefined when its denominator is 0. So find the x-value that makes the denominator 0.", `The denominator is ${expr}`, `Set it to 0: ${expr} = 0`,
    `${opWord(sg)} ${mag} ${prep(sg)} BOTH sides: ${expr} ${o} = 0 ${o}`, `So x = ${num(x)}`),
    st("That x-value is not allowed. Every other number works.", `x = ${num(x)} is excluded`), fin(`all real numbers except x = ${num(x)}`)];
};
export const rangeSqSteps = (q) => [start(q), st("The range is every output (every value of f(x)) the function can make. Try some allowed inputs, x ≥ 0.", "0² = 0", "1² = 1", "2² = 4", "3² = 9"),
  st("Look for the pattern. The outputs start at 0 and keep growing.", "The smallest output is 0, when x = 0"),
  st("Squaring a number that is 0 or more can never give a negative number, so no output is below 0."), fin("y ≥ 0")];
const vertexExpl = (h) => {
  const inner = h !== 0 ? `x ${h > 0 ? "−" : "+"} ${Math.abs(h)}` : "x";
  const lines = [h !== 0 ? `Compare (x − h)² with (${inner})²` : "Compare (x − h)² with x², which is the same as (x − 0)²"];
  if (h > 0) lines.push(`x − h = x − ${h}, so h = ${h}`);
  else if (h < 0) lines.push(`(${inner}) is the same as (x − (${num(h)}))`, `So h = ${num(h)}. The sign flips: the parentheses show + ${Math.abs(h)}, but h = ${num(h)}`);
  else lines.push("x − h = x − 0, so h = 0");
  return lines;
};
export const vertexSteps = (h, k, q) => [start(q), st("Vertex form is y = a(x − h)² + k. The vertex is the point (h, k).", "h goes with the x inside the parentheses", "k is the number added or subtracted at the end"),
  st("Find h.", ...vertexExpl(h)), st("Find k. It is the number added or subtracted outside the parentheses.", `The number at the end is ${k >= 0 ? "+" : "−"} ${Math.abs(k)}, so k = ${num(k)}`), fin(`h = ${num(h)}, k = ${num(k)}`)];
export const axisSteps = (h, q) => [start(q), st("The axis of symmetry is the vertical line that runs through the vertex. Its equation is x = h."), st("Find h.", ...vertexExpl(h)), fin(`x = ${num(h)}`)];
export const opensSteps = (a, q) => {
  const why = a === -1 ? "There is only a minus sign in front of the squared part, which means a = −1" : a === 1 ? "There is no number in front of the squared part, so a = 1" : `The number multiplying the squared part is ${num(a)}, so a = ${num(a)}`;
  const d = a > 0 ? "up" : "down";
  return [start(q), st("In vertex form y = a(x − h)² + k, the number a is the number multiplying the squared part.", "If a is positive (a > 0), the parabola opens UP", "If a is negative (a < 0), the parabola opens DOWN"),
    st("Find a.", why), st("Decide the direction.", `a = ${num(a)} is ${a > 0 ? "greater" : "less"} than 0, so it is ${a > 0 ? "positive" : "negative"}`, `So the parabola opens ${d}`), fin(d)];
};

/* ---- rational expressions and radicals ---- */
function zeroBullets(m, d, where = "The original denominator") {
  const expr = lk(m, d); const bl = [`${where} is ${expr}. It cannot equal 0, so we find the x-value that makes ${expr} = 0.`, `Set it to 0: ${expr} = 0`]; let cur = 0;
  if (d !== 0) { const [sg, mag] = cancel(d); const o = opTxt(sg, mag); cur = -d; bl.push(`${opWord(sg)} ${mag} ${prep(sg)} BOTH sides: ${expr} ${o} = 0 ${o}`, `So ${lin(m)} = ${num(cur)}`); }
  const x = m !== 1 ? cur / m : cur;
  if (m !== 1) bl.push(`Divide BOTH sides by ${m}: ${lin(m)} ${P_("÷ " + m)} = ${num(cur)} ${P_("÷ " + m)}`, `So x = ${num(x)}`);
  if (d === 0 && m === 1) bl.push("So x = 0");
  return { bl, x };
}
function ratSimplify(top, denM, denD, fac, can, left, factorBullets) {
  const den = lk(denM, denD); const { bl, x } = zeroBullets(denM, denD); const ans = `${left}, where x ≠ ${num(x)}`;
  return { steps: [start(frac(top, den)), st("Factor the top (the numerator).", ...factorBullets), st("Rewrite the fraction with the top factored.", frac(fac, den)),
    st("Cancel the factor that appears on BOTH the top and the bottom.", `${can} ÷ ${can} = 1`, `What is left on top: ${left}`, "What is left on the bottom: 1"),
    st("Find the restriction. It always comes from the ORIGINAL denominator, before anything was cancelled.", ...bl, `So x cannot be ${num(x)}`), fin(ans)], ans };
}
export function ratDiffSq(k, plus) {
  const top = `x² − ${k * k}`; const fac = `(x − ${k})(x + ${k})`; const can = `(x ${plus ? "+" : "−"} ${k})`; const left = `x ${plus ? "−" : "+"} ${k}`;
  return ratSimplify(top, 1, plus ? k : -k, fac, can, left, [`${top} is a difference of squares: x² − ${k}²`, `Pattern: a² − b² = (a − b)(a + b), with a = x and b = ${k}`, `So ${top} = ${fac}`]);
}
export function ratGcf(g, c) {
  const top = termsStr([[g, "x²"], [g * c, "x"]]); const gx = lin(g); const fac = `${gx}(x ${c > 0 ? "+" : "−"} ${Math.abs(c)})`;
  return ratSimplify(top, g, 0, fac, gx, `x ${c > 0 ? "+" : "−"} ${Math.abs(c)}`, [`Both terms have the factor ${gx}`, `${termsStr([[g, "x²"]])} ÷ ${gx} = x`, `${termsStr([[g * c, "x"]])} ÷ ${gx} = ${num(c)}`, `So ${top} = ${fac}`]);
}
export function ratTrinom(r1, r2) {
  const B = -(r1 + r2), C = r1 * r2; const top = termsStr([[1, "x²"], [B, "x"], [C, ""]]); const n1 = -r1, n2 = -r2;
  const fac = `(x ${n2 > 0 ? "+" : "−"} ${Math.abs(n2)})(x ${n1 > 0 ? "+" : "−"} ${Math.abs(n1)})`; const can = `(x ${n1 > 0 ? "+" : "−"} ${Math.abs(n1)})`; const left = `x ${n2 > 0 ? "+" : "−"} ${Math.abs(n2)}`;
  return ratSimplify(top, 1, n1, fac, can, left, [`Find two numbers that MULTIPLY to ${num(C)} and ADD to ${num(B)}`, `The numbers are ${num(n2)} and ${num(n1)}: ${num(n2)} × ${num(n1)} = ${num(C)} and ${num(n2)} + ${num(n1)} = ${num(B)}`, `So ${top} = ${fac}`]);
}
const reduceBul = (n, d) => { const g = gcd(n, d); return g === 1 ? (d !== 1 ? [`${n}/${d} is already in simplest form`] : []) : [`The biggest number that divides both ${n} and ${d} is ${g}`, `${n} ÷ ${g} = ${n / g} and ${d} ÷ ${g} = ${d / g}`, `So ${n}/${d} = ${fr(n, d)}`]; };
export function ratMulSteps(kind, q, k) {
  const s = [start(q)]; let left, x;
  const sgn1 = (K) => (K > 0 ? "+" : "−");
  if (kind === "mulbin") {
    const { K, M: Mm } = k; const b1 = `(x ${sgn1(K)} ${Math.abs(K)})`; left = `x/${Mm}`;
    s.push(st("Multiply the tops together and multiply the bottoms together.", `Top: x · ${b1} = x${b1}`, `Bottom: ${b1} · ${Mm} = ${Mm}${b1}`, `So the product is ${frac("x" + b1, Mm + b1)}`),
      st(`Find a factor that appears on BOTH the top and the bottom. It is ${b1}. Cancel it.`, `${b1} ÷ ${b1} = 1`, "What is left on top: x", `What is left on the bottom: ${Mm}`, `So the result is ${frac("x", Mm)}`));
    const z = zeroBullets(1, K, "The denominator of the first fraction"); x = z.x;
    s.push(st("Find the restriction. It comes from the ORIGINAL denominators, before anything was cancelled.", ...z.bl, `The other denominator, ${Mm}, is never 0`, `So x cannot be ${num(x)}`));
  } else if (kind === "mulx") {
    const { c1, c2 } = k; left = fr(c1, c2);
    s.push(st("Multiply the tops together and multiply the bottoms together.", `Top: ${c1} · x = ${c1}x`, `Bottom: x · ${c2} = ${c2}x`, `So the product is ${frac(c1 + "x", c2 + "x")}`),
      st("Find a factor on BOTH the top and the bottom. It is x. Cancel it.", "x ÷ x = 1", `What is left on top: ${c1}`, `What is left on the bottom: ${c2}`, `So the result is ${frac(c1, c2)}`));
    if (gcd(c1, c2) > 1) s.push(st("Reduce the fraction to simplest form.", ...reduceBul(c1, c2)));
    s.push(st("Find the restriction. It comes from the ORIGINAL denominator, before anything was cancelled.", "The original denominator is x", "Set it to 0: x = 0", "So x cannot be 0")); x = 0;
  } else if (kind === "divx") {
    const { c1, c2 } = k; left = fr(c1, c2);
    s.push(st("Dividing means flip the second fraction and multiply. The reciprocal of the second fraction swaps its top and bottom.", `${frac(c2, "x")} flipped is ${frac("x", c2)}`, `So ${frac(c1, "x")} ÷ ${frac(c2, "x")} becomes ${frac(c1, "x")} × ${frac("x", c2)}`),
      st("Multiply the tops together and multiply the bottoms together.", `Top: ${c1} · x = ${c1}x`, `Bottom: x · ${c2} = ${c2}x`, `So the product is ${frac(c1 + "x", c2 + "x")}`),
      st("Find a factor on BOTH the top and the bottom. It is x. Cancel it.", "x ÷ x = 1", `What is left on top: ${c1}`, `What is left on the bottom: ${c2}`, `So the result is ${frac(c1, c2)}`));
    if (gcd(c1, c2) > 1) s.push(st("Reduce the fraction to simplest form.", ...reduceBul(c1, c2)));
    s.push(st("Find the restriction. It comes from the ORIGINAL denominators AND from the fraction you flipped, since its top becomes a bottom.", "The original denominators are x and x. The flipped fraction has x on the bottom too.", "Set x to 0: x = 0", "So x cannot be 0")); x = 0;
  } else {
    const { K, M: Mm, N } = k; const b1 = `(x ${sgn1(K)} ${Math.abs(K)})`; left = fr(N, Mm);
    s.push(st("Dividing means flip the second fraction and multiply.", `${frac(b1, N)} flipped is ${frac(N, b1)}`, `So the problem becomes ${frac(b1, Mm)} × ${frac(N, b1)}`),
      st("Multiply the tops together and multiply the bottoms together.", `Top: ${b1} · ${N} = ${N}${b1}`, `Bottom: ${Mm} · ${b1} = ${Mm}${b1}`, `So the product is ${frac(N + b1, Mm + b1)}`),
      st(`Find a factor on BOTH the top and the bottom. It is ${b1}. Cancel it.`, `${b1} ÷ ${b1} = 1`, `What is left on top: ${N}`, `What is left on the bottom: ${Mm}`, `So the result is ${frac(N, Mm)}`));
    if (gcd(N, Mm) > 1) s.push(st("Reduce the fraction to simplest form.", ...reduceBul(N, Mm)));
    const z = zeroBullets(1, K, "The denominator of the flipped fraction"); x = z.x;
    s.push(st("Find the restriction. When you flip a fraction, its top becomes a bottom, so it cannot be 0 either.", `The original denominators are ${Mm} and ${N}, and they are never 0`, ...z.bl, `So x cannot be ${num(x)}`));
  }
  const ans = `${left}, where x ≠ ${num(x)}`; s.push(fin(ans)); return { steps: s, ans };
}
export function ratAddSteps(kind, q, k) {
  const s = [start(q)]; let left;
  if (kind === "add") {
    const m = k.m; left = `(${m} + x)/${m}x`;
    s.push(st(`The denominators are different (x and ${m}), so find a common denominator. Multiply them.`, `Common denominator: x · ${m} = ${m}x`),
      st("Rewrite each fraction with that denominator. Multiply the top and bottom of each fraction by the missing factor. This multiplies by 1, so the value does not change.",
        `${frac(1, "x")}: multiply top and bottom by ${m} to get ${frac("1 · " + m, "x · " + m)} = ${frac(m, m + "x")}`, `${frac(1, m)}: multiply top and bottom by x to get ${frac("1 · x", m + " · x")} = ${frac("x", m + "x")}`),
      st("Add the numerators. Keep the common denominator.", `${frac(m, m + "x")} + ${frac("x", m + "x")} = ${frac(m + " + x", m + "x")}`));
  } else {
    const { c1, c2 } = k; const d = c1 - c2; left = `${d}/x`;
    s.push(st("The denominators are the same (both x), so no common denominator work is needed. Subtract the numerators and keep the denominator.", `Numerators: ${c1} − ${c2} = ${d}`, `Keep the denominator: ${frac(d, "x")}`));
  }
  s.push(st("Find the restriction. It comes from the ORIGINAL denominators.", "One original denominator is x", "Set it to 0: x = 0", "So x cannot be 0"));
  const ans = `${left}, where x ≠ 0`; s.push(fin(ans)); return { steps: s, ans };
}
export const radAddSteps = (c1, c2, r, subt, q) => {
  const v = subt ? c1 - c2 : c1 + c2; const res = (v !== 1 ? String(v) : "") + `√${r}`;
  return { steps: [start(q), st("Check that the radicals are LIKE radicals (the same number under the root).", `Both are √${r}, so they are like radicals`),
    st(`Treat √${r} like a variable. ${subt ? "Subtract" : "Add"} the coefficients (the numbers in front).`, `${c1} ${subt ? "−" : "+"} ${c2} = ${v}`),
    st(`Keep the radical √${r} and write the new coefficient in front.`, v !== 1 ? `${v}√${r}` : `√${r}`), fin(res)], ans: res };
};
export const radMulSteps = (m, n, q) => { const pr = m * n, s = isqrt(pr);
  return { steps: [start(q), st("Multiply the numbers under the roots. Put the product under ONE root.", `√${m} × √${n} = √(${m} × ${n})`, `${m} × ${n} = ${pr}`, `So √(${m} × ${n}) = √${pr}`),
    st("Take the square root.", `${s} × ${s} = ${pr}, so √${pr} = ${s}`), fin(String(s))], ans: String(s) }; };
export const radRatSteps = (r, q) => ({ steps: [start(q), st(`A radical should not stay in the denominator. Multiply the top and the bottom by √${r}. This multiplies by 1, so the value does not change.`, `1/√${r} × √${r}/√${r}`),
  st("Multiply the tops together and the bottoms together.", `Top: 1 × √${r} = √${r}`, `Bottom: √${r} × √${r} = ${r}, because a square root times itself gives the number under it`),
  st("Write the new fraction.", `√${r}/${r}`), fin(`√${r}/${r}`)], ans: `√${r}/${r}` });
export function sqrtSteps(n, q) {
  const sqs = []; for (let k = 2; k * k <= n; k++) sqs.push(k * k); const dv = sqs.filter((s) => n % s === 0); const best = Math.max(...dv), k = isqrt(best), r = n / best;
  return { steps: [start(q ?? `√${n}`), st(`Find the largest perfect square that divides ${n} evenly.`, `Perfect squares up to ${n}: ${sqs.join(", ")}`, `The ones that divide ${n} evenly: ${dv.map((s) => `${s} (${n} ÷ ${s} = ${n / s})`).join(", ")}`, `The largest is ${best}, so ${n} = ${best} × ${r}`),
    st("Split the root into two roots.", `√${n} = √(${best} × ${r})`, `√(${best} × ${r}) = √${best} × √${r}`), st("Take the square root of the perfect square.", `√${best} = ${k}`, `${k} × √${r} = ${k}√${r}`), fin(`${k}√${r}`)], ans: `${k}√${r}` };
}

/* ---- exponents, scientific notation, word problems ---- */
export function expSteps(type, v) {
  const X = (n) => `x${sup(n)}`;
  if (type === "mul") { const { a, b } = v; return [start(`${X(a)} · ${X(b)}`), st("Same base, multiplying: ADD the exponents.", `${X(a)} · ${X(b)} = x^(${a} + ${b})`), st("Add the exponents.", `${a} + ${b} = ${a + b}`, `So x^(${a} + ${b}) = ${X(a + b)}`), fin(X(a + b))]; }
  if (type === "pow") { const { a, b } = v; return [start(`(${X(a)})${sup(b)}`), st("Power to a power: MULTIPLY the exponents.", `(${X(a)})${sup(b)} = x^(${a} × ${b})`), st("Multiply the exponents.", `${a} × ${b} = ${a * b}`, `So x^(${a} × ${b}) = ${X(a * b)}`), fin(X(a * b))]; }
  if (type === "div") { const { a, b } = v; return [start(`${X(a)} ÷ ${X(b)}`), st("Same base, dividing: SUBTRACT the exponents.", `${X(a)} ÷ ${X(b)} = x^(${a} − ${b})`), st("Subtract the exponents.", `${a} − ${b} = ${a - b}`, `So x^(${a} − ${b}) = ${X(a - b)}`), fin(X(a - b))]; }
  if (type === "zero") { const { c } = v; return [start(`${c}x⁰`), st("Anything except 0 raised to the power 0 is 1 (as long as x ≠ 0).", "x⁰ = 1"), st("Put the 1 in place of x⁰.", `${c}x⁰ = ${c} × 1`), st("Multiply.", `${c} × 1 = ${c}`), fin(String(c))]; }
  if (type === "neg") { const { a } = v; return [start(`x${sup(-a)}`), st("A negative exponent means flip it into a fraction.", `x${sup(-a)} = 1/x${sup(a)}`), st(`The base moved to the bottom, so the exponent changed from −${a} to +${a}.`), fin(`1/x${sup(a)}`)]; }
  const { c1, c2, a, b } = v;
  return [start(`(${c1}${X(a)})(${c2}${X(b)})`), st("Multiply the numbers in front (the coefficients).", `${c1} × ${c2} = ${c1 * c2}`),
    st("Multiply the powers of x. Same base, multiplying, so ADD the exponents.", `${X(a)} · ${X(b)} = x^(${a} + ${b})`, `${a} + ${b} = ${a + b}`, `So x^(${a} + ${b}) = ${X(a + b)}`),
    st("Put the two parts together.", `${c1 * c2} · ${X(a + b)} = ${c1 * c2}${X(a + b)}`), fin(`${c1 * c2}${X(a + b)}`)];
}
// big/small number to scientific notation: digits d1.d2, e places. dpBig/dpSmall are the ###DP markers
export function sciToSteps(big, d1, d2, e, numText, dpMarker) {
  const lead = big ? `${d1}.${d2}` : `${d1}.${d2}`; const hops = [];
  if (big) {
    const digits = String(Math.round((d1 * 10 + d2) * 10 ** (e - 1))); let pos = digits.length;
    hops.push(`${numText} = ${digits}.`);
    for (let i = 1; i <= e; i++) { pos--; const t = digits.slice(0, pos) + "." + digits.slice(pos); hops.push(`Hop ${i}: ${t}${i === e ? `, which is ${d1}.${d2}` : ""}`); }
  } else {
    const z = "0".repeat(e - 1); const dig = `${z}${d1}${d2}`;
    for (let i = 1; i <= e; i++) { const t = "0." + dig.slice(i); hops.push(`Hop ${i}: ${i === e ? `${d1}.${d2}` : t}`); }
  }
  const s = [start(`Write ${numText} in scientific notation.`)];
  if (big) s.push(st("A whole number has its decimal point at the very end. Write it out.", hops[0]));
  const real = big ? hops.slice(1) : hops;
  s.push(st(`Move the decimal ${big ? "LEFT" : "RIGHT"} one place at a time until exactly one ${big ? "digit" : "nonzero digit"} is in front of it.${dpMarker}`, ...real),
    st(`Count the hops. The decimal moved ${e} places to the ${big ? "left" : "right"}. ${big ? "A big number gets a POSITIVE exponent" : "A tiny number gets a NEGATIVE exponent"}, so the 10 gets the exponent ${big ? "+" : "−"}${e}.`),
    st("Write it as the front number times a power of 10.", `${lead} × 10${sup(big ? e : -e)}`), fin(`${lead} × 10${sup(big ? e : -e)}`));
  return s;
}
export function sciFromSteps(big, d1, d2, e, resultText, dpMarker) {
  const sciT = `${d1}.${d2} × 10${sup(big ? e : -e)}`; const hops = [];
  if (big) { const digits = String(d1) + String(d2) + "0".repeat(e - 1); for (let i = 1; i <= e; i++) hops.push(`Hop ${i}: ${digits.slice(0, i + 1)}.`); }
  else for (let i = 1; i <= e; i++) hops.push(`Hop ${i}: 0.${"0".repeat(i - 1)}${d1}${d2}`);
  const s = [start(`Write ${sciT} in standard form.`),
    st(`The exponent is ${big ? "+" : "−"}${e}, so move the decimal ${big ? "RIGHT" : "LEFT"} ${e} places, adding zeros where there are no digits.${dpMarker}`, ...hops)];
  if (big && resultText.includes(",")) s.push(st("Write the number with a comma where it belongs.", `${resultText.replace(/,/g, "")} = ${resultText}`));
  s.push(fin(resultText)); return s;
}
export function sciOpSteps(mul, c1, c2, a1, b1) {
  const front = mul ? c1 * c2 : c1 / c2, ex = mul ? a1 + b1 : a1 - b1;
  return [start(`(${c1} × 10${sup(a1)}) ${mul ? "" : "÷ "}(${c2} × 10${sup(b1)})`.replace(") (", ")(")),
    st(`${mul ? "Multiply" : "Divide"} the front numbers.`, `${c1} ${mul ? "×" : "÷"} ${c2} = ${front}`),
    st(`${mul ? "Multiply" : "Divide"} the powers of 10. Same base, ${mul ? "multiplying, so ADD" : "dividing, so SUBTRACT"} the exponents.`, `10${sup(a1)} ${mul ? "·" : "÷"} 10${sup(b1)} = 10^(${a1} ${mul ? "+" : "−"} ${b1})`, `${mul ? "Add" : "Subtract"} them: ${a1} ${mul ? "+" : "−"} ${b1} = ${ex}`, `So 10^(${a1} ${mul ? "+" : "−"} ${b1}) = 10${sup(ex)}`),
    st("Put the pieces together.", `${front} × 10${sup(ex)}`), fin(`${front} × 10${sup(ex)}`)];
}

export const pctOffSteps = (item, P, pct) => { const pay = 100 - pct, dec = pay / 100, res = P * dec;
  return [start(`A $${P} ${item} is ${pct}% off. Sale price?`), st(`${pct}% off means you take ${pct}% away from the price. Find the percent you actually PAY.`, `100% − ${pct}% = ${pay}%`),
    st("Write that percent as a decimal. Divide by 100.", `${pay}% = ${pay} ÷ 100 = ${dec.toFixed(2)}`), st("Multiply the original price by the decimal.", `Sale price = ${P} × ${dec.toFixed(2)}`, `${P} × ${dec.toFixed(2)} = ${+res.toFixed(2)}`), fin(`$${+res.toFixed(2)}`)]; };
export const pctIncSteps = (old, nw) => { const inc = nw - old, d = inc / old;
  return [start(`Wage goes from $${old} to $${nw}. Percent increase?`), st("Percent increase = (new − old) ÷ old. First find how much it went up.", `New − old = ${nw} − ${old} = ${inc}`),
    st("Divide the increase by the OLD amount.", `${inc} ÷ ${old} = ${d.toFixed(2)}`), st("Write the decimal as a percent. Multiply by 100.", `${d.toFixed(2)} × 100 = ${Math.round(d * 100)}%`), fin(`${Math.round(d * 100)}%`)]; };
export const rateSteps = (dist, t1, t2) => { const r = dist / t1, res = r * t2;
  return [start(`A car goes ${dist} mi in ${t1} hrs. At that rate, how far in ${t2} hrs?`), st("Find the rate (the speed). Divide the distance by the time.", `${dist} ÷ ${t1} = ${r} miles per hour`),
    st("Multiply the rate by the new time.", `${r} × ${t2} = ${res}`), fin(`${res} miles`)]; };
export const interestSteps = (P, rp, t) => { const r = rp / 100, i1 = P * r, res = i1 * t;
  return [start(`$${P} at ${rp}% simple interest for ${t} years. Interest earned?`), st("Simple interest = Principal × rate × time. Write the rate as a decimal first.", `${rp}% = ${rp} ÷ 100 = ${r.toFixed(2)}`),
    st("Put the numbers into the formula.", `Interest = ${P} × ${r.toFixed(2)} × ${t}`), st("Multiply from left to right.", `${P} × ${r.toFixed(2)} = ${+i1.toFixed(2)}`, `${+i1.toFixed(2)} × ${t} = ${+res.toFixed(2)}`), fin(`$${+res.toFixed(2)}`)]; };
const NAMES = { 2: "Two", 3: "Three" };
export function consecSteps(k, d, total) {
  const kind = d === 2 ? "EVEN integers" : "integers"; const K = Array.from({ length: k }, (_, i) => i * d).reduce((a, b) => a + b, 0);
  const ints = Array.from({ length: k }, (_, i) => (i === 0 ? "x" : `x + ${i * d}`)); const eq = ints.map((v) => (v.includes(" ") ? `(${v})` : v)).join(" + ");
  const s = [start(`${NAMES[k]} consecutive ${kind} sum to ${total}. Find them.`), st("Let x be the first integer. Write each next integer in terms of x.", ...ints.map((v, i) => `Integer ${i + 1}: ${v}`)),
    st(`Translate "the sum is ${total}" into an equation.`, `${eq} = ${total}`),
    st("Combine the like terms.", `x terms: ${Array(k).fill("x").join(" + ")} = ${k}x`, k === 2 ? `Numbers: only ${K}` : `Numbers: ${Array.from({ length: k - 1 }, (_, i) => (i + 1) * d).join(" + ")} = ${K}`, `So the equation is ${k}x + ${K} = ${total}`)];
  const r = solveSteps(k, K, "=", total); s.push(...r.steps); const x = r.x; const vals = Array.from({ length: k }, (_, i) => x + i * d);
  s.push(st("Find the other integers by adding to x.", ...vals.map((v, i) => (i === 0 ? `Integer 1: ${v}` : `Integer ${i + 1}: ${x} + ${i * d} = ${v}`))));
  const ans = vals.join(", "); s.push(fin(ans)); return { steps: s, ans };
}

/* ---- graphing inequalities, variation, growth, sequences, statistics ---- */
const WORD = { "<": "less than", "≤": "less than or equal to", ">": "greater than", "≥": "greater than or equal to" };
export const nlCircleSteps = (q, cmp, n) => { const inc = "≤≥".includes(cmp);
  return [start(q), st("Read the symbol.", `The symbol is ${cmp}, which means ${WORD[cmp]}`, inc ? "'Or equal to' means the number itself IS a solution" : "There is no 'equal to', so the number itself is NOT a solution"),
    st(`Decide the circle at ${num(n)}.`, inc ? `${num(n)} is included, so the circle is filled in (closed)` : `${num(n)} is not included, so the circle is left empty (open)`, "The rule: ≤ and ≥ use a closed circle. < and > use an open circle"), fin(inc ? "closed" : "open")]; };
export const lineStyleSteps = (q, eq, cmp) => { const inc = "≤≥".includes(cmp);
  return [start(q), st("Read the symbol.", `In ${eq} the symbol is ${cmp}, which means ${WORD[cmp]}`, inc ? "'Or equal to' means points ON the line are solutions" : "There is no 'equal to', so points ON the line are NOT solutions"),
    st("Decide how to draw the boundary line.", inc ? "The line is included, so draw it solid" : "The line is not included, so draw it dashed (broken)", "The rule: ≤ and ≥ use a solid line. < and > use a dashed line"), fin(inc ? "solid" : "dashed")]; };
export const shadeSteps = (q, eq, cmp) => { const above = ">≥".includes(cmp);
  return [start(q), st("Read the symbol and look at the y.", `In ${eq} the inequality starts with y ${cmp}`, `y ${cmp} means the y-values are ${WORD[cmp]} the line`),
    st("Decide which side to shade.", above ? "Bigger y-values are higher up, so shade ABOVE the line" : "Smaller y-values are lower down, so shade BELOW the line", "The rule: y > or y ≥ shades above. y < or y ≤ shades below"), fin(above ? "above" : "below")]; };
export function directSteps(y1, x1, given, find, q) {
  const k = y1 / x1;
  const s = [start(q), st("Direct variation means y = kx, where k is a fixed number.", "As x goes up, y goes up by the same factor", "To find k, divide y by x: k = y ÷ x"),
    st("Find k using the pair you were given.", `y = ${y1} and x = ${x1}`, `k = ${y1} ÷ ${x1}`, `${y1} ÷ ${x1} = ${k}`, `So k = ${k}`), st("Write the equation with k filled in.", `y = ${k}x`)];
  if (find === "y") { const v = k * given; s.push(st(`Substitute x = ${given} into the equation.`, `y = ${k} × ${given}`), st("Multiply.", `${k} × ${given} = ${v}`), fin(`y = ${v}`)); return { steps: s, ans: `y = ${v}` }; }
  const v = given / k; const o = P_(`÷ ${k}`);
  s.push(st(`Substitute y = ${given} into the equation.`, `${given} = ${k}x`), st(`Get x alone. Divide BOTH sides by ${k}.`, `${k}x ${o} = ${given} ${o}`, `Left side: ${k}x ÷ ${k} = x`, `Right side: ${given} ÷ ${k} = ${v}`, `So x = ${v}`), fin(`x = ${v}`));
  return { steps: s, ans: `x = ${v}` };
}
export function inverseSteps(x1, y1, x2, q) {
  const k = x1 * y1, v = k / x2;
  return { steps: [start(q), st("Inverse variation means y = k ÷ x, where k is a fixed number.", "As x goes up, y goes DOWN", "To find k, multiply x and y: k = x × y"),
    st("Find k using the pair you were given.", `x = ${x1} and y = ${y1}`, `k = ${x1} × ${y1}`, `${x1} × ${y1} = ${k}`, `So k = ${k}`), st("Write the equation with k filled in.", `y = ${k} ÷ x`),
    st(`Substitute x = ${x2} into the equation.`, `y = ${k} ÷ ${x2}`), st("Divide.", `${k} ÷ ${x2} = ${v}`), fin(`y = ${v}`)], ans: `y = ${v}` };
}
export function workersSteps(w1, h1, w2, q, ansText) {
  const k = w1 * h1, v = k / w2;
  return [start(q), st("Decide if it is direct or inverse variation.", "More workers means the job takes LESS time", "One goes up while the other goes down, so this is inverse variation"),
    st("Find k. For inverse variation, multiply the two quantities: k = workers × hours.", `k = ${w1} × ${h1}`, `${w1} × ${h1} = ${k}`, `So k = ${k}`), st("Write the equation with k filled in.", `hours = ${k} ÷ workers`),
    st(`Substitute ${w2} workers into the equation.`, `hours = ${k} ÷ ${w2}`), st("Divide.", `${k} ÷ ${w2} = ${v}`), fin(ansText)];
}
const dstr = (n) => String(+n.toFixed(6));
export function growthSteps(P, pct, t, decay, q, ansText) {
  const r = pct / 100, f = decay ? 1 - r : 1 + r, fs = f.toFixed(2), pw = f ** t, tot = P * pw;
  const s = [start(q), st(`This ${decay ? "loses" : "gains"} the same percent every year, so use the ${decay ? "decay" : "growth"} formula.`, decay ? "y = a(1 − r)ᵗ" : "y = a(1 + r)ᵗ", "a is the starting amount, r is the rate as a decimal, t is the number of years"),
    st("List what you know.", `a = ${P}`, `r = ${pct}% = ${pct} ÷ 100 = ${r.toFixed(2)}`, `t = ${t}`), st(`Find the ${decay ? "decay" : "growth"} factor, ${decay ? "1 − r" : "1 + r"}.`, `1 ${decay ? "−" : "+"} ${r.toFixed(2)} = ${fs}`),
    st("Put the numbers into the formula.", `y = ${P}(${fs})${sup(t)}`)];
  if (t === 1) s.push(st("Work out the power. Anything to the power 1 is itself.", `(${fs})¹ = ${fs}`));
  else s.push(st(`Work out the power first. Multiply the factor by itself ${t} times.`, `(${fs})${sup(t)} = ${Array(t).fill(fs).join(" × ")}`, `${fs} × ${fs} = ${dstr(f * f)}${t === 3 ? `; ${dstr(f * f)} × ${fs} = ${dstr(pw)}` : ""}`));
  s.push(st("Multiply the starting amount by the power.", `y = ${P} × ${dstr(pw)}`, `${P} × ${dstr(pw)} = ${dstr(tot)}`), fin(ansText)); return s;
}
export const dseqSteps = (terms, q) => { const [t0, t1, t2] = terms, d = t1 - t0;
  return [start(q), st("The common difference, d, is how much the sequence changes each step. Subtract a term from the one right after it.", `Take the first two terms: ${t0} and ${t1}`, `d = ${t1} − ${t0}`, `${t1} − ${t0} = ${num(d)}`),
    st("Check with the next pair to make sure the change is the same every time.", `${t2} − ${t1} = ${num(t2 - t1)}`, "That matches, so d is a true common difference"), fin(`d = ${num(d)}`)]; };
export function nthSteps(a1, n, d, q) {
  const nm = `a${sub(n)}`, v = a1 + (n - 1) * d, inner = n - 1, prod = inner * d;
  const s = [start(q), st("Write the formula for the nth term.", "aₙ = a₁ + (n − 1)d", "a₁ is the first term, n is which term you want, d is the common difference"), st("List what you know.", `a₁ = ${a1}`, `n = ${n}`, `d = ${num(d)}`),
    st("Put the numbers into the formula.", `${nm} = ${a1} + (${n} − 1)(${num(d)})`), st("Do the parentheses first.", `${n} − 1 = ${inner}`, `So ${nm} = ${a1} + (${inner})(${num(d)})`),
    st("Multiply.", `${inner} × ${par(d)} = ${num(prod)}`, `So ${nm} = ${a1} + (${num(prod)})`)];
  if (prod < 0) s.push(st("Add. Adding a negative number is the same as subtracting.", `${a1} + (${num(prod)}) = ${a1} − ${Math.abs(prod)}`, `${a1} − ${Math.abs(prod)} = ${num(v)}`)); else s.push(st("Add.", `${a1} + ${prod} = ${v}`));
  s.push(fin(String(v))); return { steps: s, v };
}
const J = (v) => v.join(", ");
export const meanSteps = (v, q) => { const tot = v.reduce((a, b) => a + b, 0), n = v.length; let run = v[0]; const adds = []; for (const x of v.slice(1)) { adds.push(`${run} + ${x} = ${run + x}`); run += x; }
  const m = tot / n;
  return { steps: [start(q), st("The mean is the sum of all the values divided by how many values there are.", "Mean = sum ÷ count"), st("Add the values one at a time, left to right.", ...adds, `So the sum is ${tot}`),
    st("Count the values.", `There are ${n} values: ${J(v)}`), st("Divide the sum by the count.", `${tot} ÷ ${n} = ${+m.toFixed(4)}`), fin(String(+m.toFixed(4)))], ans: String(+m.toFixed(4)) }; };
export function medianSteps(v, q) {
  const sv = [...v].sort((a, b) => a - b), n = v.length;
  const s = [start(q), st("The median is the middle value after the list is sorted. First sort it.", `Original order: ${J(v)}`, `Sorted order: ${J(sv)}`)];
  if (n % 2) { const mid = sv[(n - 1) / 2]; s.push(st("Find the middle value.", `There are ${n} values, which is odd`, `The middle is the value in position ${(n + 1) / 2}, with ${(n - 1) / 2} values on each side`, `Position ${(n + 1) / 2} is ${mid}`), fin(String(mid))); return { steps: s, ans: String(mid) }; }
  const a = sv[n / 2 - 1], b = sv[n / 2], m = (a + b) / 2;
  s.push(st("There is an even number of values, so there are TWO middle values. Find them.", `There are ${n} values, which is even`, `The two middle values are in positions ${n / 2} and ${n / 2 + 1}: ${a} and ${b}`),
    st("Average the two middle values. Add them, then divide by 2.", `${a} + ${b} = ${a + b}`, `${a + b} ÷ 2 = ${+m.toFixed(4)}`), fin(String(+m.toFixed(4)))); return { steps: s, ans: String(+m.toFixed(4)) };
}
export function modeSteps(v, q) {
  const order = [...new Set(v)]; const cnt = (x) => v.filter((y) => y === x).length; const best = Math.max(...order.map(cnt)); const md = order.find((x) => cnt(x) === best);
  return { steps: [start(q), st("The mode is the value that appears the most often. Count each value.", ...order.map((x) => `${x} appears ${cnt(x)} time${cnt(x) !== 1 ? "s" : ""}`)),
    st("Find the biggest count.", `The biggest count is ${best}, and it belongs to ${md}`), fin(String(md))], ans: String(md) };
}
export const rangeSteps = (v, q) => { const hi = Math.max(...v), lo = Math.min(...v);
  return { steps: [start(q), st("The range is the largest value minus the smallest value.", "Range = largest − smallest"), st("Find the largest and the smallest value.", `Values: ${J(v)}`, `Largest: ${hi}`, `Smallest: ${lo}`), st("Subtract.", `${hi} − ${lo} = ${hi - lo}`), fin(String(hi - lo))], ans: String(hi - lo) }; };

// a x² + b x + c with the split of the middle term given: n1 x and n2 x. Returns null when the pairs do not share a binomial.
export function group2Steps(a, b, c, n1, n2, q) {
  const g1 = gcd(a, Math.abs(n1)); const bx = a / g1, bc = n1 / g1;
  if (n2 % bx !== 0 || n2 / bx !== c / bc || !Number.isInteger(c / bc)) return null;
  const g2 = n2 / bx; const b1 = binStr(bx, bc); const second = termsStr([[g1, "x"], [g2, ""]]); const top = polyStr({ 2: a, 1: b, 0: c }); const fa = `${b1}(${second})`;
  const steps = [start(q ?? `Factor by grouping: ${top}`),
    st("Rewrite the middle term using the split they gave us.", `${num(b)}x = ${num(n1)}x ${n2 > 0 ? "+" : "−"} ${Math.abs(n2)}x`, `So ${top} = ${termsStr([[a, "x²"], [n1, "x"], [n2, "x"], [c, ""]])}`),
    st("Group the four terms into two pairs.", `(${termsStr([[a, "x²"], [n1, "x"]])}) + (${termsStr([[n2, "x"], [c, ""]])})`),
    st("Factor the GCF out of each pair.", `First pair: ${termsStr([[a, "x²"], [n1, "x"]])} = ${lin(g1, "x")}${b1}`, `Second pair: ${termsStr([[n2, "x"], [c, ""]])} = ${num(g2)}${b1}`),
    st(`Both pairs now have the same leftover factor, ${b1}. Factor it out.`, `${lin(g1, "x")}${b1} ${g2 > 0 ? "+" : "−"} ${Math.abs(g2)}${b1} = ${b1}(${second})`),
    st("Check by multiplying the two factors back together.", `${fa} = ${top}`, `The middle terms combine to ${num(b)}x`), fin(fa)];
  return { steps, ans: fa };
}
