# How worked steps are written

Every worked solution in the app (worked examples, guided-practice steps, the step-by-step breakdown after a missed
problem, hints, and generated problems) follows these rules. `tests/step-quality.test.mjs` enforces the mechanical ones.

1. **No arrows.** Never use `→` to jump from one line to the next. If something changes, say what was done and show it.
2. **Step 1 restates the problem** exactly as given (for `|x − 3| = 7` the first line shows `|x − 3| = 7`).
3. **One idea per step**, named in words ("Split into two equations", "Add 3 to both sides"). Cases get their own steps
   (Step 3a positive case, Step 3b negative case).
4. **Show the work as bullets** under the sentence, one move per bullet, with the operation visible on BOTH sides:
   `x − 3 {p:+ 3} = 7 {p:+ 3}` then `x = 10`.
5. **Colour the operation by its sign**: `{p:+ 3}` is the positive colour (green), `{n:− 3}` the negative colour
   (orange). The sign is always written, so colour is never the only cue. Red stays for final answers.
6. **Rewrites are steps too.** `x² − 4x + 4` becoming `(x − 2)²` needs the square roots, the middle-term check, then the result.
7. **The last step is "Final answer: …".**
8. Rules and hints use words, not arrows ("When you multiply with the same base, add the exponents.").

Markup inside a step string: `\n• ` starts a bullet (one list per step, at the end), `{p:…}` / `{n:…}` colour a piece.
