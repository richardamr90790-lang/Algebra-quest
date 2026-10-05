# Show-the-work rewrite: log

Goal (from the owner): every worked solution shows every step, no arrows, bullets with the operation on both sides,
colour by sign, step 1 restates the problem, final answer last. Style guide: docs/step-style.md. Enforced by
tests/step-quality.test.mjs.

## What changed

- **Topics 1-34** (`src/game/data/topics.js`): every worked example, guided step list and step-by-step breakdown rewritten
  in the new style. howTo text, term examples and dictionary examples now show their calculations too.
- **Generated practice** (`src/game/engine/generators.js`) and **Hell Mode** (`boss-tiers.js`): steps come from the shared
  builders in `src/game/engine/steps.js`, so a generated problem shows the same full work as a lesson.
- **Hint ladder**: the "first step" hint is the first real move, not the restated problem.
- **Spanish**: worked steps are translated by sentence pattern (`translations/steps.tsv`, 800+ patterns), the rest
  of the new text in `translations/content.tsv`. Generated steps are translated at runtime by `src/game/step-es.js`.
- **Tests**: arithmetic check on every `a = b` in every step (topics, generated, Hell; English and Spanish), arrows,
  markup, English leaks, and "every step pattern has a Spanish version".

## Bugs found while doing it

- Hell Mode "rational equation" gave the wrong sign for its answer (x = p ± √T where the equation gives x = −p ± √T).
  Fixed at the source.
- Some generated factoring problems had a common factor left in the shown answer (not fully factored); some
  radical answers were left unsimplified (√8, √12). Those cases are no longer generated.
- Two generated problem types could put 0 in places that made a step read oddly (a "+ 0"); excluded.
