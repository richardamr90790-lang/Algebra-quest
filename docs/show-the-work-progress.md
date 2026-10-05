# Show-the-work rewrite: progress log

Goal (from the owner): every worked solution shows every step, no arrows, bullets with the operation on both sides,
colour by sign, step 1 restates the problem, final answer last. Style guide: docs/step-style.md. Enforced by
tests/step-quality.test.mjs. Branch: claude/show-the-work. Final deliverable: a summary of what was fixed.

Order: topics 1-34 in src/game/data/topics.js (examples, guided steps + blanks, problem steps, howTo/why text),
then generators.js, boss-tiers.js (Hell), dictionary.js, then Spanish (translations/content.tsv via
scripts/extract-content-strings.mjs + npm run build:content), then tests/e2e, summary.

## Done
- infrastructure: renderer shorthand ({p:}/{n:}/bullets), colours (--ex-orange), checker (tests/helpers/arith.mjs), tests
