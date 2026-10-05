// A small checker for the arithmetic written inside worked steps. It looks at every "=" whose two sides are plain
// numbers (digits, + − × ÷ · / ( ) and superscript 2 / 3) and tests that they are equal. Anything with a letter next to
// the "=" is left alone, so it only ever reports a real arithmetic slip, never a style difference.
const ALLOWED = /[0-9.+\-−×·÷*/()²³ ]/;
const SUP = { "²": "**2", "³": "**3" };

export function plainText(s) {
  return String(s)
    .replace(/###[^#]*###/g, " ")
    .replace(/\{[pn]:([^}]*)\}/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ");
}

function evaluate(expr) {
  let e = expr.trim();
  if (!e || !/[0-9]/.test(e)) return null;
  if (/^[+×·÷*/]/.test(e) || /[+\-−×·÷*/]$/.test(e)) return null;         // starts or ends on an operator: a fragment
  let depth = 0; for (const ch of e) { if (ch === "(") depth++; if (ch === ")") depth--; if (depth < 0) return null; }
  if (depth !== 0) return null;
  e = e.replace(/[−]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/[²³]/g, (c) => SUP[c]);
  e = e.replace(/\)\s*\(/g, ")*(").replace(/(\d)\s*\(/g, "$1*(").replace(/\)\s*(\d)/g, ")*$1");
  if (/[^0-9.+\-*/() ]/.test(e) || /\d\s+\d/.test(e) || /\.\./.test(e)) return null;
  try { const v = Function(`"use strict";return (${e})`)(); return Number.isFinite(v) ? v : null; } catch { return null; }
}

// Returns a list of "left = right (got a vs b)" strings for every numeric equality that is wrong.
export function arithmeticSlips(text) {
  const t = plainText(text);
  const slips = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== "=" || t[i - 1] === "<" || t[i - 1] === ">" || t[i - 1] === "!" ) continue;
    let a = i - 1; while (a >= 0 && ALLOWED.test(t[a])) a--;
    let b = i + 1; while (b < t.length && ALLOWED.test(t[b])) b++;
    // a side glued to a letter (3x, x², √9) is not a plain number
    if (/[A-Za-z√∛π]/.test(t[a] ?? "") && /[0-9()²³]/.test(t[a + 1] ?? "")) continue;
    if (/[A-Za-z√∛π]/.test(t[b] ?? "") && /[0-9()²³]/.test(t[b - 1] ?? "")) continue;
    const L = t.slice(a + 1, i), R = t.slice(i + 1, b);
    // a left side that starts with a sign belongs to a longer expression when something sits right before it ("x − 3 = 0")
    if (/^\s*[+\-−]/.test(L) && /[A-Za-z0-9)²³]\s*$/.test(t.slice(0, a + 1))) continue;
    // a "−" or "+" just before the left side that we did not take (e.g. "x − 3 + 3 = 7") means a longer expression
    if (/[+\-−×·÷*/(]\s*$/.test(t.slice(0, a + 1)) || /^\s*[+\-−×·÷*/^]/.test(t.slice(b))) continue;
    const lv = evaluate(L), rv = evaluate(R);
    if (lv === null || rv === null) continue;
    if (Math.abs(lv - rv) > 1e-9 * Math.max(1, Math.abs(lv), Math.abs(rv))) slips.push(`${L.trim()} = ${R.trim()}  (${lv} vs ${rv})`);
  }
  return slips;
}
