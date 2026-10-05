import test from "node:test";
import assert from "node:assert/strict";
import { TOPICS } from "../src/game/data/topics.js";
import { DICTIONARY_SECTIONS } from "../src/game/data/dictionary.js";
import { GENERATORS } from "../src/game/engine/generators.js";
import { bossHellGenerators } from "../src/game/engine/boss-tiers.js";
import { loadContentTable, applyContentLanguage } from "../src/game/localize.js";
import { setLang } from "../src/game/i18n.js";
import { arithmeticSlips, plainText } from "./helpers/arith.mjs";

const strings = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
};
const content = () => strings([TOPICS.map(({ id, cat, ...r }) => r), DICTIONARY_SECTIONS]);
const generated = () => {
  const out = [];
  for (const id of Object.keys(GENERATORS)) {
    const topic = TOPICS.find((t) => t.id === Number(id));
    for (let i = 0; i < 20; i++) (GENERATORS[id](topic) || []).forEach((p) => out.push(...strings([p.q, p.a, p.steps])));
  }
  for (let i = 0; i < 20; i++) bossHellGenerators.forEach((g) => { const p = g(); if (p) out.push(...strings([p.q, p.a, p.steps])); });
  return out;
};

for (const lang of ["en", "es"]) {
  test(`topics and dictionary: no arrows between steps, well-formed markup, correct arithmetic (${lang})`, async () => {
    await loadContentTable("es"); applyContentLanguage(lang); setLang(lang);
    const all = content();
    const arrows = all.filter((s) => s.includes("→"));
    assert.deepEqual(arrows.slice(0, 3).map((s) => plainText(s).slice(0, 100)), [], `${arrows.length} strings still contain an arrow`);
    const badMarkup = all.filter((s) => (s.match(/\{[pn]:/g) || []).length !== (s.match(/\{[pn]:[^}]*\}/g) || []).length || /\n•(?! )/.test(s));
    assert.deepEqual(badMarkup.slice(0, 3), [], "unbalanced {p:}/{n:} or a bullet without a space");
    const slips = all.flatMap((s) => arithmeticSlips(s).map((x) => `${x}   in: ${plainText(s).slice(0, 80)}`));
    assert.deepEqual(slips.slice(0, 5), [], `${slips.length} arithmetic slips`);
    applyContentLanguage("en"); setLang("en");
  });
  test(`generated problems: no arrows, correct arithmetic (${lang})`, () => {
    setLang(lang);
    const all = generated();
    const arrows = all.filter((s) => s.includes("→"));
    assert.deepEqual([...new Set(arrows.map((s) => plainText(s).slice(0, 80)))].slice(0, 3), [], `${arrows.length} generated strings contain an arrow`);
    const slips = all.flatMap((s) => arithmeticSlips(s).map((x) => `${x}   in: ${plainText(s).slice(0, 80)}`));
    assert.deepEqual([...new Set(slips)].slice(0, 5), [], `${slips.length} arithmetic slips`);
    setLang("en");
  });
}
