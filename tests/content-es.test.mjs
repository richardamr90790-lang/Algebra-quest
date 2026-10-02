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

test("switching language rewrites topics in place and back again", async () => {
  const { TOPICS } = await import("../src/game/data/topics.js");
  const { loadContentTable, applyContentLanguage } = await import("../src/game/localize.js");
  const en = JSON.stringify(TOPICS);
  await loadContentTable("es");
  applyContentLanguage("es");
  assert.notEqual(JSON.stringify(TOPICS), en);
  assert.equal(TOPICS[0].title, "Reglas de los exponentes");
  applyContentLanguage("en");
  assert.equal(JSON.stringify(TOPICS), en);
});

test("Spanish topics stay self-consistent: dropdown answers are options, answers match their keys", async () => {
  const { TOPICS } = await import("../src/game/data/topics.js");
  const { checkEquivalence } = await import("../src/game/engine/equivalence.js");
  const { loadContentTable, applyContentLanguage } = await import("../src/game/localize.js");
  await loadContentTable("es");
  for (const lang of ["es", "en"]) {
    applyContentLanguage(lang);
    const problems = [];
    for (const t of TOPICS) {
      for (const g of t.guided || []) {
        const blanks = g.blanks || [];
        blanks.forEach((b, si) => {
          const slots = (b.template.match(/\{\{\}\}/g) || []).length;
          assert.equal(slots, b.answers.length, `${lang} topic ${t.id} guided "${g.q}" step ${si}: blanks vs answers`);
          (b.options || []).forEach((opts, bi) => {
            if (opts) assert.ok(opts.includes(b.answers[bi]), `${lang} topic ${t.id}: answer "${b.answers[bi]}" must be one of ${JSON.stringify(opts)}`);
          });
          b.answers.forEach((a) => assert.ok(checkEquivalence(a, a), `${lang} topic ${t.id}: blank answer "${a}" matches itself`));
        });
        problems.push(g);
      }
      problems.push(...t.problems);
    }
    for (const p of problems) {
      const key = p.check || p.a; // `a` is what is shown; `check` (when present) is what typed answers are compared with
      assert.ok(checkEquivalence(key, key), `${lang}: "${key}" should match itself`);
      for (const alt of p.alt || []) assert.ok(typeof alt === "string");
    }
  }
});
