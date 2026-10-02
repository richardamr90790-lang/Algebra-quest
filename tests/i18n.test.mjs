import test from "node:test";
import assert from "node:assert/strict";
import { t, tIn, L, getLang, setLang, onLangChange, detectLang, dictionaries, LANGS } from "../src/game/i18n.js";

test("language detection", () => {
  assert.equal(detectLang("es"), "es");
  assert.equal(detectLang("es-DO"), "es");
  assert.equal(detectLang("es_MX"), "es");
  assert.equal(detectLang("en-US"), "en");
  assert.equal(detectLang("fr"), "en");
  assert.equal(detectLang(undefined), "en");
  assert.equal(detectLang("espanol"), "en");
});

test("setLang changes the language, ignores junk, and tells listeners once", () => {
  const seen = [];
  const off = onLangChange((l) => seen.push(l));
  setLang("es"); setLang("es"); setLang("zz"); setLang("en");
  assert.deepEqual(seen, ["es", "en"]);
  assert.equal(getLang(), "en");
  off(); setLang("es"); assert.equal(seen.length, 2); setLang("en");
});

test("L picks by the current language", () => {
  setLang("en"); assert.equal(L("Hello", "Hola"), "Hello");
  setLang("es"); assert.equal(L("Hello", "Hola"), "Hola");
  setLang("en");
});

test("both dictionaries have the same keys and the same {placeholders}", () => {
  const { en, es } = dictionaries;
  const onlyEn = Object.keys(en).filter((k) => !(k in es));
  const onlyEs = Object.keys(es).filter((k) => !(k in en));
  assert.deepEqual(onlyEn, [], "keys missing a Spanish translation");
  assert.deepEqual(onlyEs, [], "Spanish keys with no English original");
  const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  for (const k of Object.keys(en)) if (k in es) assert.equal(ph(es[k]), ph(en[k]), `placeholders differ in "${k}"`);
  for (const k of Object.keys(en)) assert.ok(String(es[k] ?? "").trim() !== "", `empty Spanish text for "${k}"`);
});

test("plural keys come in pairs", () => {
  for (const l of LANGS) {
    const keys = Object.keys(dictionaries[l]);
    for (const k of keys) {
      if (k.endsWith(".one")) assert.ok(keys.includes(k.slice(0, -4) + ".other"), `${l}: ${k} has no .other`);
      if (k.endsWith(".other")) assert.ok(keys.includes(k.slice(0, -6) + ".one"), `${l}: ${k} has no .one`);
    }
  }
});

test("a missing key shows the key itself, and tIn ignores the current language", () => {
  assert.equal(t("no.such.key"), "no.such.key");
  assert.equal(tIn("es", "no.such.key"), "no.such.key");
});
