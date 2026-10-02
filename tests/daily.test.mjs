import test from "node:test";
import assert from "node:assert/strict";
import { seededRandom, withSeededRandom, dailyTopicPlan, dailyProblems, dailyDoneToday, DAILY_COUNT } from "../src/game/daily.js";
import { TOPICS } from "../src/game/data/topics.js";
import { GENERATORS } from "../src/game/engine/generators.js";
import { REGION_ORDER } from "../src/game/placement.js";

const gen = (id) => GENERATORS[id](TOPICS.find((t) => t.id === id));

test("seeded random is repeatable and different seeds differ", () => {
  const a = seededRandom("x"), b = seededRandom("x"), c = seededRandom("y");
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()], seqC = [c(), c(), c()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  assert.ok(seqA.every((n) => n >= 0 && n < 1));
});

test("Math.random is always restored, even if the callback throws", () => {
  const original = Math.random;
  withSeededRandom("s", () => 1);
  assert.equal(Math.random, original);
  assert.throws(() => withSeededRandom("s", () => { throw new Error("boom"); }));
  assert.equal(Math.random, original);
});

test("a day's plan has 5 topics from 5 different regions", () => {
  const plan = dailyTopicPlan("2026-10-02", TOPICS, REGION_ORDER);
  assert.equal(plan.length, DAILY_COUNT);
  assert.equal(new Set(plan.map((p) => p.cat)).size, DAILY_COUNT);
  for (const p of plan) assert.equal(TOPICS.find((t) => t.id === p.topicId).cat, p.cat);
});

test("the same day always gives the same questions; other days differ", () => {
  const qs = (day) => dailyProblems(day, TOPICS, REGION_ORDER, gen).map((p) => p.q + "=" + p.a);
  assert.deepEqual(qs("2026-10-02"), qs("2026-10-02"));
  assert.deepEqual(qs("2026-10-02"), qs("2026-10-02"));
  assert.notDeepEqual(qs("2026-10-02"), qs("2026-10-03"));
});

test("every day for a year produces 5 well-formed problems", () => {
  for (let d = 0; d < 365; d++) {
    const day = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
    const probs = dailyProblems(day, TOPICS, REGION_ORDER, gen);
    assert.equal(probs.length, DAILY_COUNT, day);
    for (const p of probs) assert.ok(typeof p.q === "string" && (p.check || p.a), day);
  }
});

test("done-today check", () => {
  assert.equal(dailyDoneToday({ day: "2026-10-02" }, "2026-10-02"), true);
  assert.equal(dailyDoneToday({ day: "2026-10-01" }, "2026-10-02"), false);
  assert.equal(dailyDoneToday(null, "2026-10-02"), false);
});
