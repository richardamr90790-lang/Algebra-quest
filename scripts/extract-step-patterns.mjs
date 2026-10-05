// Lists the English step patterns that translations/steps.tsv does not translate yet (most common first).
// Usage: node scripts/extract-step-patterns.mjs [--all]
import { readFileSync, existsSync } from "node:fs";
import { allPatterns } from "../tests/helpers/patterns.mjs";
const file = new URL("../translations/steps.tsv", import.meta.url);
const have = new Set(existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t")[0]) : []);
const pats = [...allPatterns(400).entries()].sort((a, b) => b[1] - a[1]);
const missing = pats.filter(([k]) => process.argv.includes("--all") || !have.has(k));
for (const [k, c] of missing) console.log(`${c}\t${k.replace(/\n/g, "\\n")}`);
console.error(`${missing.length} of ${pats.length} patterns ${process.argv.includes("--all") ? "listed" : "missing"}`);
