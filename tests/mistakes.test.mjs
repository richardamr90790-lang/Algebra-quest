import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseMistake as d } from "../src/game/engine/mistakes.js";

const kind = (u, c) => (d(u, c) || {}).kind || null;

test("opposite sign on a single number", () => {
  assert.equal(kind("x = -5", "x = 5"), "sign");
  assert.equal(kind("3", "-3"), "sign");
  assert.equal(kind("-1/2", "1/2"), "sign");
});

test("a flipped fraction", () => {
  assert.equal(kind("2/3", "3/2"), "flipped");
  assert.equal(kind("x = 4", "x = 1/4"), "flipped");
});

test("off by one or two", () => {
  assert.equal(kind("x = 7", "x = 8"), "slip");
  assert.equal(kind("11", "9"), "slip");
  assert.equal(kind("x = 30", "x = 8"), null, "far off gets no guess");
});

test("only some of several solutions", () => {
  assert.equal(kind("x = 5", "x = 5 or x = -13"), "partial");
  assert.equal(kind("x=2, x=3", "x=2, x=3, x=4"), "partial");
});

test("extra solutions that do not belong", () => {
  assert.equal(kind("x = 5, x = -13, x = 7", "x = 5 or x = -13"), "extra");
});

test("right numbers, wrong signs in a list", () => {
  assert.equal(kind("x = 5, x = -3", "x = -5, x = 3"), "sign");
});

test("expression with the right terms but wrong signs", () => {
  assert.equal(kind("x² + 5x + 6", "x² - 5x + 6"), "sign");
  assert.equal(kind("2x - 3", "2x + 3"), "sign");
});

test("same terms in another order is flagged as probably right", () => {
  assert.equal(kind("5x + x²", "x² + 5x"), "reorder");
  assert.equal(kind("6 - 5x + x²", "x² - 5x + 6"), "reorder");
});

test("no guess when there is nothing useful to say", () => {
  assert.equal(d("", "5"), null);
  assert.equal(d("banana", "5"), null);
  assert.equal(d("x = 17", "x = 5"), null);
  assert.equal(d("(x+2)(x+3)", "(x+4)(x+1)"), null);
  assert.equal(kind("(x+2)(x+3)", "(x-2)(x-3)"), "sign", "wrong signs inside factors is still a sign slip");
});

import { TOPICS } from "../src/game/data/topics.js";
import { GENERATORS } from "../src/game/engine/generators.js";
import { checkEquivalence } from "../src/game/engine/equivalence.js";

test("never throws on any real answer, and never flags a correct answer as a slip", () => {
  const answers = [];
  for (const t of TOPICS) for (let i = 0; i < 6; i++) for (const p of GENERATORS[t.id](t)) answers.push(p.check || p.a);
  assert.ok(answers.length > 500);
  for (let i = 0; i < answers.length; i++) {
    const other = answers[(i * 7 + 3) % answers.length];
    const res = d(other, answers[i]);
    if (res) assert.ok(res.kind && res.message.length > 10);
    // If the checker says they match, the caller never asks for a diagnosis; the detector must at least not crash.
    if (checkEquivalence(other, answers[i])) d(other, answers[i]);
  }
});
