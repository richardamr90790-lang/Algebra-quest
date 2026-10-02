import test from "node:test";
import assert from "node:assert/strict";
import { addDays, daysBetween, dueTopics, localDay, mergeReview, nextDueDay, passed, recordResult } from "../src/game/review.js";

const day = (s) => new Date(`${s}T10:00:00`); // local time

test("localDay and addDays use calendar days, including month and year ends", () => {
  assert.equal(localDay(day("2026-10-02")), "2026-10-02");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09"); // a US daylight-saving change
  assert.equal(daysBetween("2026-10-01", "2026-10-31"), 30);
});

test("first pass schedules a review for tomorrow, later passes space it out", () => {
  let r = recordResult({}, 5, true, day("2026-10-02"));
  assert.deepEqual([r[5].box, r[5].due], [0, "2026-10-03"]);
  r = recordResult(r, 5, true, day("2026-10-03"));
  assert.deepEqual([r[5].box, r[5].due], [1, "2026-10-06"]);
  r = recordResult(r, 5, true, day("2026-10-06"));
  assert.deepEqual([r[5].box, r[5].due], [2, "2026-10-13"]);
  r = recordResult(r, 5, true, day("2026-10-13"));
  assert.deepEqual([r[5].box, r[5].due], [3, "2026-10-27"]);
  r = recordResult(r, 5, true, day("2026-10-27"));
  assert.deepEqual([r[5].box, r[5].due], [4, "2026-11-26"]);
  r = recordResult(r, 5, true, day("2026-11-26")); // stays at the longest gap
  assert.equal(r[5].box, 4);
});

test("a miss sends the topic back to tomorrow and does not touch other topics", () => {
  let r = recordResult({}, 1, true, day("2026-10-01"));
  r = recordResult(r, 1, true, day("2026-10-02"));
  r = recordResult(r, 2, true, day("2026-10-02"));
  const after = recordResult(r, 1, false, day("2026-10-06"));
  assert.deepEqual([after[1].box, after[1].due], [0, "2026-10-07"]);
  assert.deepEqual(after[2], r[2]);
});

test("recordResult does not mutate its input", () => {
  const r = {};
  recordResult(r, 1, true);
  assert.deepEqual(r, {});
});

test("due topics: due or overdue only, most overdue first, limited", () => {
  const review = {
    1: { box: 0, due: "2026-10-05", last: "x", at: 1 },
    2: { box: 2, due: "2026-10-01", last: "x", at: 1 },
    3: { box: 1, due: "2026-10-09", last: "x", at: 1 },
    4: { box: 0, due: "2026-10-02", last: "x", at: 1 },
  };
  assert.deepEqual(dueTopics(review, day("2026-10-05")), [2, 4, 1]);
  assert.deepEqual(dueTopics(review, day("2026-10-05"), 2), [2, 4]);
  assert.deepEqual(dueTopics({}, day("2026-10-05")), []);
  assert.deepEqual(dueTopics(undefined, day("2026-10-05")), []);
});

test("next due day looks only at the future", () => {
  const review = { 1: { box: 0, due: "2026-10-05" }, 2: { box: 0, due: "2026-10-09" }, 3: { box: 0, due: "2026-10-08" } };
  assert.equal(nextDueDay(review, day("2026-10-05")), "2026-10-08");
  assert.equal(nextDueDay(review, day("2026-10-20")), null);
});

test("pass threshold is 80%", () => {
  assert.equal(passed(4, 5), true);
  assert.equal(passed(3, 5), false);
  assert.equal(passed(0, 0), false);
});

test("merge keeps the more recent entry per topic and honours resets", () => {
  const a = { 1: { box: 2, due: "d", last: "d", at: 100 }, 2: { box: 0, due: "d", last: "d", at: 300 } };
  const b = { 1: { box: 0, due: "d", last: "d", at: 200 }, 3: { box: 1, due: "d", last: "d", at: 50 } };
  const m = mergeReview(a, b);
  assert.equal(m[1].at, 200);
  assert.ok(m[2] && m[3]);
  const afterReset = mergeReview(a, b, { resetAt: 250 });
  assert.deepEqual(Object.keys(afterReset), ["2"]);
  const topicReset = mergeReview(a, b, { topicResets: { 1: 999, 3: 10 } });
  assert.deepEqual(Object.keys(topicReset).sort(), ["2", "3"]);
});
