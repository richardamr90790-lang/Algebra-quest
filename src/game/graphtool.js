// Interactive graph problems: what a graph question is asking, what a click means, and what answer a student's
// graph gives. Pure logic (no DOM) so it can be tested; src/game/app.js draws it.
//
// A graph question carries a marker  ###GRAPH:type;params;caption###  in its text. Together with the answer, that tells us
// the task:
//   read     line y = mx + b, "find the slope and y-intercept"      click the y-intercept and a second point
//   eval     line y = mx + b, "what is y when x = x0?"              click the point on the line at x0
//   vertex   parabola, "find the vertex"                            click the vertex
//   axis     parabola, "axis of symmetry"                           click anywhere on the axis (the x counts)
//   circle   number line, "open or closed?"                         click where the circle goes, choose open or closed
//   style    inequality, "dashed or solid?"                         click the boundary line to switch, choose
//   side     inequality, "shade above or below?"                    click above or below the line
// Anything else (slope between two points, opens up/down) gets the "See it" button only.

export const G_RANGE = 8;
export const MARKER = /###GRAPH:([a-z]+);([^;#]*);?([^#]*)###/;

const STYLE_WORDS = { dashed: "dashed", solid: "solid", discontinua: "dashed", continua: "solid" };
const SIDE_WORDS = { above: "above", below: "below", "por encima": "above", "por debajo": "below" };

const num = (s) => parseFloat(String(s).replace("−", "-"));
const plain = (s) => String(s).replace(/<[^>]*>/g, "").replace(/###[^#]*###/g, " ");

export function graphTaskOf(problem) {
  const m = String(problem.q || "").match(MARKER);
  if (!m) return null;
  const type = m[1], parts = m[2].split(",").map((p) => p.trim()), key = String(problem.check || problem.a || "").trim();
  const full = { marker: m[0], type, parts };
  if (type === "line") {
    const mm = num(parts[0]), b = num(parts[1]);
    if (/^m\s*=/.test(key)) return { ...full, kind: "read", m: mm, b };
    if (/^y\s*=/.test(key)) {
      const xs = [...plain(problem.q).matchAll(/x\s*=\s*([−-]?\d+)/g)];
      if (xs.length) return { ...full, kind: "eval", m: mm, b, x0: num(xs[xs.length - 1][1]) };
    }
  } else if (type === "parabola") {
    const a = num(parts[0]), h = num(parts[1]), k = num(parts[2]);
    if (/^h\s*=/.test(key)) return { ...full, kind: "vertex", a, h, k };
    if (/^x\s*=/.test(key)) return { ...full, kind: "axis", a, h, k };
  } else if (type === "numberline") {
    return { ...full, kind: "circle", value: num(parts[0]), closed: parts[1] === "closed", dir: parts[2] };
  } else if (type === "inequality") {
    const t = { ...full, m: num(parts[0]), b: num(parts[1]), dashed: parts[2] === "dashed", above: parts[3] === "above" };
    const word = key.toLowerCase();
    if (word in STYLE_WORDS) return { ...t, kind: "style" };
    if (word in SIDE_WORDS) return { ...t, kind: "side" };
  }
  return { ...full, kind: "see" }; // can be shown, but not answered by clicking
}

export const canClick = (task) => !!task && task.kind !== "see";

// How many dots a task asks for.
export const dotsNeeded = (task) => ({ read: 2, eval: 1, vertex: 1, axis: 1, circle: 1 }[task.kind] || 0);

// A click inside the picture (fractions 0..1 across and down the 240-unit square) -> the nearest whole grid point.
export function snap(fx, fy, size = 240, unit = 14, origin = 120) {
  const clamp = (v) => Math.max(-G_RANGE, Math.min(G_RANGE, v));
  return { x: clamp(Math.round((fx * size - origin) / unit)), y: clamp(Math.round((origin - fy * size) / unit)) };
}

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const frac = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : `${n}/${d}`; };

// Line through two clicked dots -> { m, b } as text, or null when the line is vertical (or the dots coincide).
export function lineFromDots(p1, p2) {
  if (!p1 || !p2 || p1.x === p2.x) return null;
  const dy = p2.y - p1.y, dx = p2.x - p1.x;
  const m = frac(dy, dx);
  const bNum = p1.y * dx - dy * p1.x; // b = y1 − (dy/dx) x1 = (y1 dx − dy x1) / dx
  return { m, b: frac(bNum, dx), mv: dy / dx, bv: bNum / dx };
}

const WORD = {
  closed: ["closed", "cerrado"], open: ["open", "abierto"],
  dashed: ["dashed", "discontinua"], solid: ["solid", "continua"],
  above: ["above", "por encima"], below: ["below", "por debajo"],
};
export const wordFor = (w, lang) => WORD[w][lang === "es" ? 1 : 0];

// The state a student has built: { dots: [{x,y}...], closed, dashed, above, cx } -> the answer text for the answer box, or null.
export function answerFromState(task, st, lang = "en") {
  if (!task || !st) return null;
  const dots = st.dots || [];
  switch (task.kind) {
    case "read": { const l = lineFromDots(dots[0], dots[1]); return l ? `m = ${l.m}, b = ${l.b}` : null; }
    case "eval": return dots[0] ? `y = ${dots[0].y}` : null;
    case "vertex": return dots[0] ? `h = ${dots[0].x}, k = ${dots[0].y}` : null;
    case "axis": return dots[0] ? `x = ${dots[0].x}` : null;
    case "circle": return st.closed == null ? null : wordFor(st.closed ? "closed" : "open", lang);
    case "style": return st.dashed == null ? null : wordFor(st.dashed ? "dashed" : "solid", lang);
    case "side": return st.above == null ? null : wordFor(st.above ? "above" : "below", lang);
    default: return null;
  }
}

// Does the student's graph match the real one? Returns { ok, why } where `why` names what is off ("" when ok).
export function verdict(task, st) {
  const dots = (st && st.dots) || [];
  switch (task.kind) {
    case "read": {
      const l = lineFromDots(dots[0], dots[1]);
      if (!l) return { ok: false, why: "need" };
      return Math.abs(l.mv - task.m) < 1e-9 && Math.abs(l.bv - task.b) < 1e-9 ? { ok: true, why: "" } : { ok: false, why: "line" };
    }
    case "eval": return !dots[0] ? { ok: false, why: "need" } : dots[0].x === task.x0 && Math.abs(dots[0].y - (task.m * task.x0 + task.b)) < 1e-9 ? { ok: true, why: "" } : { ok: false, why: dots[0].x === task.x0 ? "y" : "x" };
    case "vertex": return !dots[0] ? { ok: false, why: "need" } : dots[0].x === task.h && dots[0].y === task.k ? { ok: true, why: "" } : { ok: false, why: "vertex" };
    case "axis": return !dots[0] ? { ok: false, why: "need" } : dots[0].x === task.h ? { ok: true, why: "" } : { ok: false, why: "axis" };
    case "circle": return st.closed == null || st.cx == null ? { ok: false, why: "need" } : st.cx === task.value && st.closed === task.closed ? { ok: true, why: "" } : { ok: false, why: st.cx !== task.value ? "place" : "fill" };
    case "style": return st.dashed == null ? { ok: false, why: "need" } : st.dashed === task.dashed ? { ok: true, why: "" } : { ok: false, why: "style" };
    case "side": return st.above == null ? { ok: false, why: "need" } : st.above === task.above ? { ok: true, why: "" } : { ok: false, why: "side" };
    default: return { ok: false, why: "see" };
  }
}

// Which side of the boundary line y = m x + b a grid click is on ("on" when it is within `tol` units of the line).
export function sideOfLine(task, pt, tol = 0.4) {
  const d = pt.y - (task.m * pt.x + task.b);
  return Math.abs(d) <= tol ? "on" : d > 0 ? "above" : "below";
}
