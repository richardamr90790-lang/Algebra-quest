// Lists every English string in the topic data and the dictionary that needs a Spanish translation.
// Usage: node scripts/extract-content-strings.mjs [--tsv]   (prints "n<TAB>english" lines)
import { TOPICS } from "../src/game/data/topics.js";
import { DICTIONARY_SECTIONS } from "../src/game/data/dictionary.js";

const IGNORE = new Set(["sqrt"]);
// Short English words that the 3-letter rule would miss.
const SHORT = new Set(["so", "no", "up", "is", "an", "in", "on", "of", "to", "by", "at", "as", "if", "it", "be"]);

// Does this string contain English wording (rather than being only maths and markup)?
export function needsTranslation(s) {
  if (typeof s !== "string") return false;
  const bare = s.replace(/<[^>]*>/g, " ").replace(/###[^#]*###/g, " ");
  if (/\b(or|and)\b/.test(bare)) return true;
  if ((bare.match(/[A-Za-z]{2}/g) || []).length && (bare.match(/\b[A-Za-z]{2}\b/g) || []).some((w) => SHORT.has(w.toLowerCase()))) return true;
  return (bare.match(/[A-Za-z]{3,}/g) || []).some((w) => !IGNORE.has(w.toLowerCase()));
}

export function collect() {
  const found = new Map();
  const walk = (v) => {
    if (typeof v === "string") { if (needsTranslation(v) && !found.has(v)) found.set(v, found.size + 1); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(TOPICS.map(({ id, cat, ...rest }) => rest));
  walk(DICTIONARY_SECTIONS);
  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = collect();
  for (const [s, n] of found) console.log(`${n}\t${s}`);
  console.error(`${found.size} strings, ${[...found.keys()].reduce((a, s) => a + s.length, 0)} characters`);
}
