// Switches the topic and dictionary content between English and Spanish.
// The English data in topics.js / dictionary.js stays the source of truth: a pristine copy is kept, and
// switching language rewrites TOPICS and DICTIONARY_SECTIONS in place from it (using the English → Spanish
// table in i18n/content-es.js, which is only downloaded when Spanish is first used).
import { TOPICS } from "./data/topics.js";
import { DICTIONARY_SECTIONS } from "./data/dictionary.js";

const clone = (v) => (typeof v === "string" ? v : Array.isArray(v) ? v.map(clone) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v);
let pristine = null;
let table = null;

const trWith = (tbl, v) => {
  if (typeof v === "string") return tbl && v in tbl ? tbl[v] : v;
  if (Array.isArray(v)) return v.map((x) => trWith(tbl, x));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trWith(tbl, x)]));
  return v;
};

function snapshot() {
  if (!pristine) pristine = { topics: clone(TOPICS), dictionary: clone(DICTIONARY_SECTIONS) };
}

// Translated copy of one piece of English content (used for generated problems that are built from English text).
export const translateContent = (v) => trWith(table, v);

export async function loadContentTable(lang) {
  snapshot();
  if (lang === "es" && !table) table = (await import("./i18n/content-es.js")).CONTENT_ES;
}

// Rewrites the live data for `lang`. Call loadContentTable(lang) first when switching to Spanish.
export function applyContentLanguage(lang) {
  snapshot();
  const tbl = lang === "es" ? table : null;
  TOPICS.forEach((topic, i) => {
    for (const k of Object.keys(pristine.topics[i])) if (k !== "id" && k !== "cat") topic[k] = trWith(tbl, pristine.topics[i][k]);
  });
  DICTIONARY_SECTIONS.forEach((section, i) => {
    for (const k of Object.keys(pristine.dictionary[i])) section[k] = trWith(tbl, pristine.dictionary[i][k]);
  });
}

export const contentLoaded = () => table !== null;
