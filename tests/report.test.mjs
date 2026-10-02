import test from "node:test";
import assert from "node:assert/strict";
import { addActivity, mergeActivity, buildReport, describeScore, ACTIVITY_LIMIT, RECENT_SHOWN } from "../src/game/report.js";
import { recordResult } from "../src/game/review.js";
import { TOPICS } from "../src/game/data/topics.js";
import { REGION_ORDER } from "../src/game/placement.js";

const labels = Object.fromEntries(REGION_ORDER.map((c) => [c, c.toUpperCase()]));
const opts = { regionOrder: REGION_ORDER, labels, problemCount: () => 6, badgesTotal: 27, now: new Date("2026-10-05T10:00:00") };
const six = [0, 1, 2, 3, 4, 5];

test("review entries remember whether the last result was a pass", () => {
  const now = new Date("2026-10-02T10:00:00");
  assert.equal(recordResult({}, 1, true, now)[1].ok, true);
  assert.equal(recordResult({}, 1, false, now)[1].ok, false);
});

test("activity log is newest first and capped", () => {
  let log = [];
  for (let i = 0; i < ACTIVITY_LIMIT + 5; i++) log = addActivity(log, { at: i, mode: "topic", title: "t", correct: 1, total: 2 });
  assert.equal(log.length, ACTIVITY_LIMIT);
  assert.equal(log[0].at, ACTIVITY_LIMIT + 4);
  assert.deepEqual(addActivity(undefined, { at: 1 }), [{ at: 1 }]);
});

test("activity logs from two devices merge without duplicates", () => {
  const a = [{ at: 5, mode: "topic" }, { at: 3, mode: "daily" }];
  const b = [{ at: 5, mode: "topic" }, { at: 9, mode: "review" }];
  const m = mergeActivity(a, b);
  assert.deepEqual(m.map((e) => e.at), [9, 5, 3]);
  assert.equal(mergeActivity(a, b, 2).length, 2);
  assert.deepEqual(mergeActivity(undefined, undefined), []);
});

test("overview numbers", () => {
  const r = buildReport({ xp: 250, name: "Sam", bestStreak: 7, dailyCount: 3, mastered: { 1: six, 2: six, 3: [0, 1] }, badges: { a: 1, b: 2 }, stats: { correct: 40, reviews: 2 } }, TOPICS, opts);
  assert.equal(r.name, "Sam");
  assert.deepEqual([r.level, r.xp, r.xpToNext], [3, 250, 50]);
  assert.deepEqual([r.topicsMastered, r.totalTopics], [2, 34]);
  assert.deepEqual([r.badgesEarned, r.badgesTotal, r.dailies, r.bestStreak, r.rightAnswers, r.reviewsDone], [2, 27, 3, 7, 40, 2]);
  const foundations = r.regions.find((x) => x.cat === "foundations");
  assert.deepEqual([foundations.mastered, foundations.total, foundations.pct], [2, 4, 50]);
  assert.equal(r.regions.length, 8);
});

test("an empty learner produces a sane report", () => {
  const r = buildReport({}, TOPICS, opts);
  assert.deepEqual([r.level, r.topicsMastered, r.attention.length, r.recent.length, r.lastPlayed, r.checkinDone, r.nextReview], [1, 0, 0, 0, null, false, null]);
});

test("attention list: missed reviews first, then check-in, then due reviews", () => {
  const review = {
    1: { box: 0, due: "2026-10-06", last: "x", at: 1, ok: false },
    5: { box: 1, due: "2026-10-01", last: "x", at: 1, ok: true },
    7: { box: 0, due: "2026-10-09", last: "x", at: 1, ok: true },
  };
  const placement = { at: 100, start: 20, regions: { foundations: { level: "solid" }, expressions: { level: "needs" }, equations: { level: "getting" } } };
  const r = buildReport({ review, placement }, TOPICS, opts);
  assert.deepEqual(r.attention.map((a) => a.kind), ["missed", "checkin", "due", "checkin-getting"]);
  assert.match(r.attention[0].text, /Exponent Rules.*missed/);
  assert.match(r.attention[1].text, /EXPRESSIONS.*needs work/);
  assert.match(r.attention[2].text, /Absolute Value Equations.*due/);
  assert.equal(r.suggestedStart, "Adding & Subtracting Polynomials");
  assert.equal(r.reviewsDue, 1);
  assert.equal(r.nextReview, "today");
});

test("next review is the soonest future date when nothing is due", () => {
  const r = buildReport({ review: { 1: { box: 0, due: "2026-10-09", at: 1, ok: true }, 2: { box: 0, due: "2026-10-07", at: 1, ok: true } } }, TOPICS, opts);
  assert.equal(r.reviewsDue, 0);
  assert.equal(r.nextReview, "2026-10-07");
});

test("recent activity: newest first, limited, and the last-played time", () => {
  const activity = Array.from({ length: 15 }, (_, i) => ({ at: i + 1, mode: "topic", title: `T${i}`, correct: 2, total: 3 }));
  const r = buildReport({ activity }, TOPICS, opts);
  assert.equal(r.recent.length, RECENT_SHOWN);
  assert.equal(r.recent[0].at, 15);
  assert.equal(r.lastPlayed, 15);
  assert.equal(describeScore(r.recent[0]), "2/3");
  assert.equal(describeScore({}), "");
});
