import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, scoreRegions, recommendStart, regionTopics, REGION_ORDER } from "../src/game/placement.js";
import { TOPICS, SUGGESTED_ORDER } from "../src/game/data/topics.js";

test("plan covers all 8 regions in learning order with entry + mid topics", () => {
  const plan = buildPlan(TOPICS, SUGGESTED_ORDER);
  assert.deepEqual(plan.map((p) => p.cat), REGION_ORDER);
  assert.equal(plan.length, 8);
  assert.deepEqual(plan.find((p) => p.cat === "foundations").topicIds, [1, 3]);
  assert.deepEqual(plan.find((p) => p.cat === "factoring").topicIds, [11, 23]);
  assert.deepEqual(plan.find((p) => p.cat === "rational").topicIds, [7, 27]);
  for (const p of plan) for (const id of p.topicIds) assert.equal(TOPICS.find((t) => t.id === id).cat, p.cat);
});

test("a single-topic region uses its topic twice", () => {
  const topics = [{ id: 1, cat: "foundations" }];
  assert.deepEqual(buildPlan(topics, [1])[0].topicIds, [1, 1]);
});

test("scores: both right is solid, one is getting there, none needs work", () => {
  const r = scoreRegions([
    { cat: "foundations", topicId: 1, correct: true }, { cat: "foundations", topicId: 3, correct: true },
    { cat: "expressions", topicId: 20, correct: true }, { cat: "expressions", topicId: 21, correct: false },
    { cat: "equations", topicId: 4, correct: false }, { cat: "equations", topicId: 9, correct: false },
  ]);
  assert.deepEqual([r.foundations.level, r.expressions.level, r.equations.level], ["solid", "getting", "needs"]);
  assert.deepEqual([r.expressions.correct, r.expressions.total], [1, 2]);
});

test("recommendation is the first non-solid region, skipping topics already answered right", () => {
  const results = [
    { cat: "foundations", topicId: 1, correct: true }, { cat: "foundations", topicId: 3, correct: true },
    { cat: "expressions", topicId: 20, correct: true }, { cat: "expressions", topicId: 21, correct: false },
  ];
  const regions = scoreRegions(results);
  assert.equal(recommendStart(regions, results, TOPICS, SUGGESTED_ORDER), 21);
  const first = [{ cat: "foundations", topicId: 1, correct: false }, { cat: "foundations", topicId: 3, correct: false }];
  assert.equal(recommendStart(scoreRegions(first), first, TOPICS, SUGGESTED_ORDER), 1);
});

test("everything solid means no recommendation", () => {
  const results = REGION_ORDER.flatMap((cat) => [{ cat, topicId: regionTopics(TOPICS, SUGGESTED_ORDER, cat)[0], correct: true }, { cat, topicId: -1, correct: true }]);
  assert.equal(recommendStart(scoreRegions(results), results, TOPICS, SUGGESTED_ORDER), null);
});
