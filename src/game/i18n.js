// Language support: English (en) and Dominican Spanish (es).
//
//   t("home.shop")              interface strings (see i18n/en.js and i18n/es.js)
//   t("greeting", {name: "Sam"})  {name} placeholders
//   tn("topics.count", 3)       plural: uses "topics.count.one" or "topics.count.other"
//   L("Hello", "Hola")          an inline pair, for text built inside generators and other content code
//
// The current language is a module-level setting so content code can read it without passing it around.
// A change is announced to listeners (the game re-renders, the React screens re-render).
import { EN } from "./i18n/en.js";
import { ES } from "./i18n/es.js";

export const LANGS = ["en", "es"];
export const LANG_NAMES = { en: "English", es: "Español" };
const DICTS = { en: EN, es: ES };
const DEVICE_KEY = "algebraQuestLang";

let lang = "en";
const listeners = new Set();

export const getLang = () => lang;

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  if (typeof document !== "undefined") document.documentElement.lang = next;
  for (const fn of [...listeners]) fn(next);
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// "es", "es-DO", "es-MX" -> "es"; anything else -> "en".
export function detectLang(navigatorLanguage) {
  return /^es(\b|-|_)/i.test(String(navigatorLanguage || "")) ? "es" : "en";
}

// The language last chosen on this device (used before a learner is loaded, e.g. on the sign-in screens).
export function deviceLang() {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return detectLang(typeof navigator !== "undefined" ? navigator.language : "");
}
export function rememberDeviceLang(next) {
  try { localStorage.setItem(DEVICE_KEY, next); } catch { /* storage unavailable: the choice just won't persist */ }
}

function fill(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

export function t(key, params) {
  const text = DICTS[lang][key] ?? DICTS.en[key];
  if (text === undefined) return key; // a missing key is visible rather than blank (a test keeps this from happening)
  return fill(text, params);
}

export function tn(key, n, params) {
  return t(`${key}.${n === 1 ? "one" : "other"}`, { n, ...params });
}

// Look up in a specific language regardless of the current one (used by tests and for "also accept" lists).
export function tIn(l, key, params) {
  const text = DICTS[l][key] ?? DICTS.en[key];
  return text === undefined ? key : fill(text, params);
}

export const L = (en, es) => (lang === "es" ? es : en);

export const dictionaries = DICTS;

// Locale for dates and times: undefined keeps the browser's own choice in English; Dominican Spanish otherwise.
export const locale = () => (lang === "es" ? "es-DO" : undefined);
