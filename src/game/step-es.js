// Spanish for worked steps. The English steps are built from math (numbers and expressions) and a small set of
// sentences. Every run of math is lifted out as a token, so "Subtract 3 from BOTH sides." and "Subtract 7 from BOTH
// sides." share one sentence pattern: "Subtract {1} from BOTH sides." The Spanish pattern for each English one lives in
// translations/steps.tsv (built into i18n/steps-es.js). The same code runs when the tables are built and when a
// generated problem is shown, so the two always agree.

const MATHCH = /[0-9+−×÷=<>≤≥≠≈±√∛²³\u00b9·/^%$|∞°\u2070-\u209f\ue000-\uefff]/;
const OPONLY = /^[+−×÷=<>≤≥≠≈±·/^|-]+$/;
const strip = (w) => w.replace(/^[(\[]+/, "").replace(/[)\].,;:?!]+$/, "");
const isStrong = (w) => { const c = strip(w); return c !== "" && MATHCH.test(c) && !/^[-–—]+$/.test(c); };
const isOp = (w) => OPONLY.test(strip(w) || w);

// Pulls out the spans of a segment that must be kept verbatim (markers, fractions, colour markup) as private-use placeholders.
function protect(seg, keep) {
  const put = (m) => { keep.push(m); return String.fromCharCode(0xe000 + keep.length - 1); };
  return seg
    .replace(/###[\s\S]*?###/g, put)
    .replace(/<span class='frac'><span class='frac-num'>[\s\S]*?<\/span><span class='frac-den'>[\s\S]*?<\/span><\/span>/g, put)
    .replace(/\{[pn]:[^}]*\}/g, put);
}

// A trailing ###…### marker (a balance animation or a decimal-point hop) is not part of the sentence.
const MARK = /(###[^#]*(?:#[^#]+)*###)$/;
export const splitMarker = (piece) => { const m = piece.match(MARK); return m ? [piece.slice(0, m.index), m[1]] : [piece, ""]; };

// One line of text (no bullets) -> { key, toks }
export function maskLine(line) {
  line = splitMarker(line)[0];
  const keep = [];
  let s = protect(line, keep);
  const html = []; // other tags stay in the pattern as they are
  s = s.replace(/<\/?[a-z][^<>]*>/gi, (m) => { html.push(m); return String.fromCharCode(0xf000 + html.length - 1); });
  const parts = s.split(/( +)/); // words and their spaces
  const words = []; for (let i = 0; i < parts.length; i += 2) words.push(parts[i]);
  const math = words.map((w) => w !== "" && isStrong(w));
  // a lone variable letter joins the math next to it only when an operator word sits beside it
  words.forEach((w, i) => {
    if (math[i] || !/^[(]*[a-z][)]*[.,;:?!]*$/.test(w) || /^[(]*a[)]*[.,;:?!]*$/.test(w)) return;
    const near = (j) => j >= 0 && j < words.length && (isOp(words[j]) || math[j] && /^[(]*[a-z]/.test(words[j]) === false && false);
    if (near(i - 1) || near(i + 1)) math[i] = "var";
  });
  // a pure operator word between two math words is math too
  words.forEach((w, i) => { if (!math[i] && w !== "" && isOp(w) && (math[i - 1] || math[i + 1])) math[i] = true; });
  // build the pattern
  let key = "", toks = [], cur = null;
  const flush = () => { if (cur !== null) { let t = cur, tail = ""; const m = t.match(/[.,;:?!]+$/); if (m && !/\d[.,]\d*$/.test(t) || (m && /^[.,;:?!]+$/.test(m[0]))) { tail = m ? m[0] : ""; t = t.slice(0, t.length - tail.length); } toks.push(t); key += `{${toks.length}}` + tail; cur = null; } };
  for (let i = 0; i < words.length; i++) {
    const w = words[i], sp = parts[2 * i + 1] ?? "";
    if (math[i]) { cur = cur === null ? w : cur + (parts[2 * i - 1] ?? " ") + w; if (!(math[i + 1])) { flush(); key += sp; } else { /* space is added when the next word joins */ } }
    else { flush(); key += w + sp; }
  }
  flush();
  // put the other tags back and expand the kept spans inside tokens
  const back = (t) => t.replace(/[-]/g, (c) => keep[c.charCodeAt(0) - 0xe000]);
  const fromHtml = (t) => t.replace(/[-]/g, (c) => html[c.charCodeAt(0) - 0xf000]);
  // placeholders that sit alone (not inside a token) are math kept verbatim: make them tokens too
  const outToks = toks.map((t) => fromHtml(back(t)));
  let k2 = fromHtml(key);
  const lone = []; k2 = k2.replace(/[-]/g, (c) => { lone.push(keep[c.charCodeAt(0) - 0xe000]); return `${lone.length - 1}`; });
  let n = outToks.length; k2 = k2.replace(/(\d+)/g, (_, i) => { outToks.push(lone[+i]); n++; return `{${n}}`; });
  return { key: k2, toks: outToks };
}

export function fillTemplate(tpl, toks) { return tpl.replace(/\{(\d+)\}/g, (m, i) => toks[i - 1] ?? m); }

// "Final answer: <span class='ex-red'>x = 3</span>" is translated as "Final answer: x = 3" with the red span put back.
export const RED = /^(Final answer: )<span class='ex-red'>([\s\S]*)<\/span>$/;

// A whole step: split into the label span, bullets, and translate each piece.
const LABEL = /^(<span class='step-label'>)Step ([^<]*?)(:<\/span> )/;
export function translateStep(step, table) {
  if (typeof step !== "string" || !table) return step;
  let prefix = "";
  const lm = step.match(LABEL);
  if (lm) { prefix = `${lm[1]}Paso ${lm[2]}${lm[3]}`; step = step.slice(lm[0].length); }
  let red = false; const rm = step.match(RED); if (rm) { red = true; step = rm[1] + rm[2]; }
  const out = step.split("\n• ").map((piece0) => {
    const [piece, marker] = splitMarker(piece0);
    if (piece in table) return table[piece] + marker;
    const { key, toks } = maskLine(piece);
    if (!(key in table)) return piece0;
    return fillTemplate(table[key], toks) + marker;
  });
  let res = out.join("\n• ");
  if (red) res = res.replace(/^(Respuesta final: )([\s\S]*)$/, "$1<span class='ex-red'>$2</span>");
  return prefix + res;
}
