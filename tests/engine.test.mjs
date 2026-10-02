import test from "node:test";
import assert from "node:assert/strict";
import { TOPICS } from "../src/game/data/topics.js";
import { GENERATORS } from "../src/game/engine/generators.js";
import { BOSS_LEVELS, bossHellGenerators } from "../src/game/engine/boss-tiers.js";
import { checkEquivalence } from "../src/game/engine/equivalence.js";

test("34 topics with unique ids and hand-written problems", () => {
  assert.equal(TOPICS.length, 34);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, 34);
  for (const t of TOPICS) assert.ok(t.problems.length > 0, `topic ${t.id} has problems`);
});

test("every topic has a generator that yields well-formed, self-consistent problems", () => {
  for (const t of TOPICS) {
    assert.equal(typeof GENERATORS[t.id], "function", `generator for topic ${t.id}`);
    for (let run = 0; run < 25; run++) {
      const set = GENERATORS[t.id](t);
      assert.ok(Array.isArray(set) && set.length > 0, `topic ${t.id} yields problems`);
      for (const p of set) {
        const answer = p.check || p.a;
        assert.equal(typeof p.q, "string", `topic ${t.id} question`);
        assert.ok(typeof answer === "string" && answer.length > 0, `topic ${t.id} answer`);
        assert.ok(!/NaN|undefined|Infinity/.test(p.q + answer), `topic ${t.id} has junk: ${p.q} / ${answer}`);
      }
    }
  }
});

test("boss tiers and their hardest generators run without errors", () => {
  assert.ok(BOSS_LEVELS.length > 0);
  for (const gen of bossHellGenerators) {
    for (let i = 0; i < 25; i++) {
      const p = typeof gen === "function" ? gen() : gen;
      assert.ok(p && typeof p.q === "string");
    }
  }
});

test("answer checking accepts equivalent forms and rejects wrong ones", () => {
  assert.equal(checkEquivalence("x=5", "x = 5"), true);
  assert.equal(checkEquivalence("x=5 or x=-13", "x = -13, x = 5"), true);
  assert.equal(checkEquivalence("x=4", "x = 5"), false);
});
