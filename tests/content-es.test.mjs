import test from "node:test";
import assert from "node:assert/strict";
import { collect } from "../scripts/extract-content-strings.mjs";
import { CONTENT_ES } from "../src/game/i18n/content-es.js";

const tags = (s) => (s.match(/<\/?[a-z][^>]*>/gi) || []).join("|");
// the caption after the last ";" is translatable; the type and numbers are not
const markers = (s) => (s.match(/###[^#]*###/g) || []).map((m) => m.split(";").slice(0, 2).join(";")).join("|");
const blanks = (s) => (s.match(/\{\{\}\}/g) || []).length;
// digits, operators and math symbols outside markup, in order
const mathBits = (s) => s.replace(/<[^>]*>/g, " ").replace(/###[^#]*###/g, " ").match(/[0-9]+(?:\.[0-9]+)?|[=<>≤≥≠±√∛²³⁴⁰¹ᵗ₀-₉]+/g)?.join(" ") ?? "";

test("every content string has a Spanish translation", () => {
  const missing = [...collect().keys()].filter((s) => !(s in CONTENT_ES));
  assert.deepEqual(missing.slice(0, 5), [], `${missing.length} strings missing a translation`);
});

test("translations keep markup, graph markers and blanks identical", () => {
  const bad = [];
  for (const [en, es] of Object.entries(CONTENT_ES)) {
    if (!es.trim()) bad.push(["empty", en]);
    else if (tags(en) !== tags(es)) bad.push(["tags", en]);
    else if (markers(en) !== markers(es)) bad.push(["marker", en]);
    else if (blanks(en) !== blanks(es)) bad.push(["blanks", en]);
  }
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} structural mismatches`);
});

test("translations keep the same numbers and symbols", () => {
  // English ordinals ("5th term") become words in Spanish ("quinto término"), so they are exempt
  const bad = Object.entries(CONTENT_ES).filter(([en, es]) => !/\d(st|nd|rd|th)\b/.test(en) && mathBits(en) !== mathBits(es)).map(([en, es]) => [en, es]);
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} numeric mismatches`);
});
