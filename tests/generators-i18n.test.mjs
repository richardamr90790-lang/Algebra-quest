import test from "node:test";
import assert from "node:assert/strict";
import { GENERATORS } from "../src/game/engine/generators.js";
import { bossHellGenerators } from "../src/game/engine/boss-tiers.js";
import { TOPICS } from "../src/game/data/topics.js";
import { checkEquivalence } from "../src/game/engine/equivalence.js";
import { setLang } from "../src/game/i18n.js";

// Words that would show up if a generator still produced English while the language is Spanish.
const ENGLISH = /\b(the|of|is|are|to|for|with|from|both|sides|then|find|step|answer|solve|what|when|where|that|your|each|plug|multiply|add|subtract|number|numbers|equation|value|common|term|terms|first|last|check|simplify|write|line|slope|which|does|open|closed|down|up|shade|above|below|workers|hours|miles|seconds|years|per|after|worth|grows|sum|difference|integers|consecutive|squared|root|roots|sale|price|rate|time|interest|ball|ground|about|round|nearest|tenth|solutions|only|set|rewrite|combine|group|pull|split|flip|restriction|cancel|shared|denominator|numerators?|fraction|top|bottom|conjugate|becomes|expand|matches|neither|valid|between|mean|median|range|sorted|sort|count|appears|times|more|than|any|other|largest|smallest|average|middle)\b/i;
const plain = (s) => s.replace(/<[^>]*>/g, " ").replace(/###[^#]*###/g, " ");
const SAMPLES = 25;

function everyProblem(fn) {
  for (const id of Object.keys(GENERATORS)) {
    const topic = TOPICS.find((t) => t.id === Number(id));
    for (let i = 0; i < SAMPLES; i++) (GENERATORS[id](topic) || []).forEach((p) => fn(p, `generator ${id}`));
  }
  for (let i = 0; i < SAMPLES; i++) bossHellGenerators.forEach((g, k) => { const p = g(); if (p) fn(p, `hell ${k}`); });
}

for (const lang of ["en", "es"]) {
  test(`generated answers match themselves (${lang})`, () => {
    setLang(lang);
    everyProblem((p, where) => {
      assert.ok(checkEquivalence(p.a, p.check || p.a), `${where}: "${p.a}" should match its own answer key`);
    });
  });
}

test("Spanish generated text contains no English wording", () => {
  setLang("es");
  const leaks = new Set();
  everyProblem((p, where) => {
    for (const s of [p.q, p.a, ...(p.steps || [])]) if (typeof s === "string" && ENGLISH.test(plain(s))) leaks.add(`${where}: ${plain(s).slice(0, 90)}`);
  });
  setLang("en");
  assert.deepEqual([...leaks].slice(0, 5), [], `${leaks.size} English leaks`);
});

test("Spanish answers accept typed 'o' and English 'or' for two-answer problems", () => {
  setLang("es");
  assert.ok(checkEquivalence("x=3 o x=-3", "x = 3  o  x = −3"));
  assert.ok(checkEquivalence("x=-3 o x=3", "x = 3  o  x = −3"));
  assert.ok(checkEquivalence("x=3 or x=-3", "x = 3  o  x = −3"));
  assert.ok(checkEquivalence("x/2, donde x != -5", "x/2, donde x ≠ −5"));
  assert.ok(checkEquivalence("264", "264 millas"));
  assert.ok(checkEquivalence("3 horas", "3 horas"));
  assert.ok(checkEquivalence("todos los números reales excepto x = 8", "todoslosnumerosrealesexceptox=8"));
  setLang("en");
});
