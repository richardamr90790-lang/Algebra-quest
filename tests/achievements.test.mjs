import test from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, EMPTY_STATS, earnedNow, newBadges, mergeBadges, mergeStats, snapshot } from "../src/game/achievements.js";
import { TOPICS } from "../src/game/data/topics.js";

const six = () => 6;
const state = (o = {}) => ({ xp: 0, bestStreak: 0, mastered: {}, owned: [], stats: { ...EMPTY_STATS }, ...o });
const earned = (o) => new Set(earnedNow(state(o), TOPICS, six));
const masterAll = (ids) => Object.fromEntries(ids.map((id) => [id, [0, 1, 2, 3, 4, 5]]));

test("catalog: unique ids, complete entries, and no day-streak badges", () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) assert.ok(a.icon && a.title && a.desc && typeof a.test === "function", a.id);
  assert.ok(ACHIEVEMENTS.every((a) => !/consecutive|every day|days in a row|day streak/i.test(a.title + " " + a.desc)), "no badge depends on playing day after day");
});

test("a brand new learner has earned nothing", () => {
  assert.equal(earned({}).size, 0);
});

test("answer counts and streaks", () => {
  assert.ok(earned({ stats: { ...EMPTY_STATS, correct: 1 } }).has("first-answer"));
  assert.ok(!earned({ stats: { ...EMPTY_STATS, correct: 99 } }).has("correct-100"));
  assert.ok(earned({ stats: { ...EMPTY_STATS, correct: 100 } }).has("correct-100"));
  assert.ok(earned({ bestStreak: 10 }).has("streak-10") && !earned({ bestStreak: 9 }).has("streak-10"));
});

test("mastery: topics, halfway, all, and regions", () => {
  const ids = TOPICS.map((t) => t.id);
  assert.ok(!earned({ mastered: { [ids[0]]: [0, 1, 2, 3, 4] } }).has("master-1"), "5 of 6 problems is not mastered");
  assert.ok(earned({ mastered: masterAll(ids.slice(0, 1)) }).has("master-1"));
  assert.ok(earned({ mastered: masterAll(ids.slice(0, 5)) }).has("master-5"));
  assert.ok(!earned({ mastered: masterAll(ids.slice(0, 16)) }).has("master-half"));
  assert.ok(earned({ mastered: masterAll(ids.slice(0, 17)) }).has("master-half"));
  const all = earned({ mastered: masterAll(ids) });
  assert.ok(all.has("master-all") && all.has("region-4"));
  // clearing exactly one region
  const rational = TOPICS.filter((t) => t.cat === "rational").map((t) => t.id);
  const one = earned({ mastered: masterAll(rational) });
  assert.ok(one.has("region-1") && !one.has("region-4"));
});

test("habit badges follow their counters", () => {
  const s = (o) => earned({ stats: { ...EMPTY_STATS, ...o } });
  assert.ok(s({ perfect: 1 }).has("perfect-1") && !s({ perfect: 4 }).has("perfect-5") && s({ perfect: 5 }).has("perfect-5"));
  assert.ok(s({ reviews: 1 }).has("review-1") && s({ reviews: 10 }).has("review-10"));
  assert.ok(s({ bosses: 1 }).has("boss-1") && !s({ bosses: 1 }).has("boss-perfect") && s({ bossPerfect: 1 }).has("boss-perfect"));
  assert.ok(earned({ placement: { at: 1 } }).has("checkin"));
  assert.ok(earned({ dailyCount: 7 }).has("daily-7") && !earned({ dailyCount: 6 }).has("daily-7"));
});

test("levels come from lifetime XP, and shop badges from owned items", () => {
  assert.ok(earned({ xp: 400 }).has("level-5") && !earned({ xp: 399 }).has("level-5"));
  assert.ok(earned({ owned: ["rocket"] }).has("shop-1") && !earned({ owned: ["rocket"] }).has("shop-5"));
  assert.ok(earned({ owned: ["a", "b", "c", "d", "e"] }).has("shop-5"));
});

test("newBadges returns only ones not recorded yet, with the given time", () => {
  const st = state({ stats: { ...EMPTY_STATS, correct: 1 }, badges: {} });
  assert.deepEqual(newBadges(st, TOPICS, six, 123), [{ id: "first-answer", at: 123 }]);
  assert.deepEqual(newBadges({ ...st, badges: { "first-answer": 5 } }, TOPICS, six, 123), []);
});

test("badges and stats merge across devices", () => {
  assert.deepEqual(mergeBadges({ "first-answer": 50, "master-1": 90 }, { "first-answer": 20, "level-5": 70, bogus: 1 }), { "first-answer": 20, "master-1": 90, "level-5": 70 });
  assert.deepEqual(mergeStats({ correct: 5, reviews: 2 }, { correct: 3, reviews: 4 }), { ...EMPTY_STATS, correct: 5, reviews: 4 });
  assert.deepEqual(mergeStats(undefined, undefined), EMPTY_STATS);
});

test("snapshot handles missing fields without throwing", () => {
  const s = snapshot({}, TOPICS, six);
  assert.equal(s.level, 1);
  assert.equal(s.topicsMastered, 0);
  assert.equal(s.totalTopics, TOPICS.length);
});
