// Collects every English step pattern the app can show (topics, and a sample of generated problems), so the Spanish
// table in translations/steps.tsv can be checked for gaps. A pattern is a step sentence with its math lifted out.
import { TOPICS } from "../../src/game/data/topics.js";
import { GENERATORS } from "../../src/game/engine/generators.js";
import { bossHellGenerators } from "../../src/game/engine/boss-tiers.js";
import { maskLine, RED } from "../../src/game/step-es.js";
import { readFileSync } from "node:fs";

// Strings that translations/content.tsv already translates whole (legends, notices, unchanged lines).
const whole = new Set(readFileSync(new URL("../../translations/content.tsv", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => l.split("\t")[0]));

const LABEL = /^(<span class='step-label'>)Step ([^<]*?)(:<\/span> )/;
export const patternsOf = (step, into = new Map()) => {
  if (whole.has(step)) return into;
  let body = String(step).replace(LABEL, ""); const rm = body.match(RED); if (rm) body = rm[1] + rm[2];
  for (const piece of body.split("\n• ")) {
    const { key } = maskLine(piece);
    if (/[A-Za-z]{3,}|\b(is|of|to|or|in|so|by|at|it|no|as)\b/.test(key.replace(/\{\d+\}/g, " ").replace(/<[^>]*>/g, ""))) into.set(key, (into.get(key) || 0) + 1);
  }
  return into;
};
export function allPatterns(samples = 300) {
  const m = new Map();
  for (const t of TOPICS) {
    t.examples.forEach((e) => e.lines.forEach((l) => patternsOf(l, m)));
    t.guided.forEach((g) => g.steps.forEach((s) => patternsOf(s, m)));
    t.problems.forEach((p) => p.steps.forEach((s) => patternsOf(s, m)));
  }
  for (const id of Object.keys(GENERATORS)) for (let i = 0; i < samples; i++) GENERATORS[id]().forEach((p) => p.steps.forEach((s) => patternsOf(s, m)));
  for (const g of bossHellGenerators) for (let i = 0; i < samples; i++) { const p = g(); if (p) p.steps.forEach((s) => patternsOf(s, m)); }
  return m;
}
