import test from "node:test";
import assert from "node:assert/strict";
import { shouldInsertWarmup, nextMissStreak, isPerfectRun, MAX_WARMUPS } from "../src/game/adaptive.js";
import { recordResult } from "../src/game/review.js";

test("warm-up after two misses in a row, not after one", () => {
  assert.equal(shouldInsertWarmup({ missStreak: 1, warmupsUsed: 0, problemsLeft: 4 }), false);
  assert.equal(shouldInsertWarmup({ missStreak: 2, warmupsUsed: 0, problemsLeft: 4 }), true);
});

test("capped per session, and never after the last problem", () => {
  assert.equal(shouldInsertWarmup({ missStreak: 2, warmupsUsed: MAX_WARMUPS, problemsLeft: 4 }), false);
  assert.equal(shouldInsertWarmup({ missStreak: 5, warmupsUsed: 0, problemsLeft: 0 }), false);
});

test("miss streak counts only real misses; a right answer or a warm-up resets it", () => {
  let s = 0;
  s = nextMissStreak(s, { correct: false }); assert.equal(s, 1);
  s = nextMissStreak(s, { correct: false }); assert.equal(s, 2);
  assert.equal(nextMissStreak(s, { correct: true }), 0);
  assert.equal(nextMissStreak(s, { correct: false, warmup: true }), 0);
});

test("a perfect run needs every answer right, no hints and no retries", () => {
  const good = { correct: true, hinted: false, attempts: 1 };
  assert.equal(isPerfectRun([good, good, good]), true);
  assert.equal(isPerfectRun([good, { ...good, hinted: true }]), false);
  assert.equal(isPerfectRun([good, { ...good, attempts: 2 }]), false);
  assert.equal(isPerfectRun([good, { ...good, correct: false }]), false);
  assert.equal(isPerfectRun([]), false);
});

test("skipping a box on a pass lengthens the gap, capped at the longest", () => {
  const now = new Date("2026-10-02T10:00:00");
  assert.equal(recordResult({}, 1, true, now, 0)[1].box, 0);
  assert.equal(recordResult({}, 1, true, now, 1)[1].box, 1);
  const r = recordResult({ 1: { box: 3, due: "x", last: "x", at: 1 } }, 1, true, now, 1);
  assert.equal(r[1].box, 4);
  assert.equal(recordResult({ 1: { box: 2, due: "x", last: "x", at: 1 } }, 1, false, now, 1)[1].box, 0, "a miss ignores the skip");
});
