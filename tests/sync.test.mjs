import test from "node:test";
import assert from "node:assert/strict";
import { mergeState, sameProgress, createPusher } from "../src/game/sync.js";

const base = { xp: 0, bestStreak: 0, mastered: {}, customProblems: {}, theme: "clean", name: "", masteredDates: {}, avatar: "root", updatedAt: 0, resetAt: 0, topicResets: {} };
const s = (o) => ({ ...base, ...o });

test("null on one side returns the other", () => {
  assert.equal(mergeState(null, null), null);
  assert.equal(mergeState(null, s({ xp: 5 })).xp, 5);
  assert.equal(mergeState(s({ xp: 5 }), null).xp, 5);
});

test("two devices that each made progress keep both", () => {
  const phone = s({ xp: 120, bestStreak: 3, mastered: { 1: [0, 1] }, updatedAt: 100 });
  const laptop = s({ xp: 150, bestStreak: 2, mastered: { 1: [1, 2], 5: [0] }, updatedAt: 200 });
  const m = mergeState(phone, laptop);
  assert.equal(m.xp, 150);
  assert.equal(m.bestStreak, 3);
  assert.deepEqual(m.mastered[1], [0, 1, 2]);
  assert.deepEqual(m.mastered[5], [0]);
  assert.equal(m.updatedAt, 200);
});

test("newest edit wins for name, theme and avatar", () => {
  const m = mergeState(s({ name: "Old", theme: "neon", updatedAt: 1 }), s({ name: "New", theme: "pink", updatedAt: 2 }));
  assert.equal(m.name, "New");
  assert.equal(m.theme, "pink");
});

test("merge is symmetric", () => {
  const a = s({ xp: 10, mastered: { 1: [0] }, updatedAt: 5 });
  const b = s({ xp: 20, mastered: { 1: [1] }, updatedAt: 9 });
  assert.deepEqual(mergeState(a, b), mergeState(b, a));
});

test("a full reset is not undone by an older device", () => {
  const stale = s({ xp: 300, mastered: { 1: [0, 1, 2] }, updatedAt: 100 });
  const reset = s({ xp: 0, mastered: {}, resetAt: 200, updatedAt: 200 });
  const m = mergeState(stale, reset);
  assert.equal(m.xp, 0);
  assert.deepEqual(m.mastered[1], []);
  assert.deepEqual(m, mergeState(reset, stale));
});

test("progress made after a reset on another device survives it", () => {
  const reset = s({ resetAt: 200, updatedAt: 200 });
  const later = s({ xp: 40, mastered: { 2: [0] }, updatedAt: 300 });
  const m = mergeState(reset, later);
  assert.equal(m.xp, 40);
  assert.deepEqual(m.mastered[2], [0]);
});

test("a topic reset only clears that topic", () => {
  const stale = s({ xp: 100, mastered: { 1: [0, 1], 2: [0] }, updatedAt: 100 });
  const fresh = s({ xp: 100, mastered: { 1: [], 2: [0] }, topicResets: { 1: 200 }, updatedAt: 200 });
  const m = mergeState(stale, fresh);
  assert.deepEqual(m.mastered[1], []);
  assert.deepEqual(m.mastered[2], [0]);
});

test("sameProgress ignores updatedAt", () => {
  assert.equal(sameProgress(s({ xp: 1, updatedAt: 1 }), s({ xp: 1, updatedAt: 9 })), true);
  assert.equal(sameProgress(s({ xp: 1 }), s({ xp: 2 })), false);
});

test("pusher collapses a burst of saves into one upload of the latest state", async () => {
  const timers = [];
  const sent = [];
  const p = createPusher(async (st) => { sent.push(st); }, { setTimer: (fn) => (timers.push(fn), timers.length), clearTimer: () => {} });
  p.schedule({ xp: 1 }); p.schedule({ xp: 2 }); p.schedule({ xp: 3 });
  assert.equal(timers.length, 1);
  await timers[0]();
  assert.deepEqual(sent, [{ xp: 3 }]);
  assert.equal(p.hasPending(), false);
});

test("pusher keeps the state and retries after a failure", async () => {
  const timers = [];
  let fail = true;
  const sent = [];
  const p = createPusher(async (st) => { if (fail) throw new Error("offline"); sent.push(st); }, { setTimer: (fn) => (timers.push(fn), timers.length), clearTimer: () => {} });
  p.schedule({ xp: 7 });
  await timers[0]();
  assert.equal(p.hasPending(), true);
  fail = false;
  await timers[1]();
  assert.deepEqual(sent, [{ xp: 7 }]);
});

test("flush uploads immediately", async () => {
  const sent = [];
  const p = createPusher(async (st) => { sent.push(st); }, { setTimer: () => 1, clearTimer: () => {} });
  p.schedule({ xp: 9 });
  await p.flush();
  assert.deepEqual(sent, [{ xp: 9 }]);
});

test("review schedules merge per topic and follow resets", () => {
  const r = (box, at) => ({ box, due: "2026-10-10", last: "2026-10-09", at });
  const a = s({ updatedAt: 100, review: { 1: r(2, 100), 2: r(0, 90) } });
  const b = s({ updatedAt: 200, review: { 1: r(0, 200), 3: r(1, 150) } });
  const m = mergeState(a, b);
  assert.equal(m.review[1].box, 0, "newer entry wins");
  assert.ok(m.review[2] && m.review[3], "topics from both devices are kept");
  const reset = mergeState(a, s({ updatedAt: 300, resetAt: 300, review: {} }));
  assert.deepEqual(reset.review, {}, "a later full reset clears review");
});

test("placement result and dismissal merge, and a later reset clears them", () => {
  const pl = (at, start) => ({ at, start, regions: {} });
  const a = s({ updatedAt: 100, placement: pl(100, 5) });
  const b = s({ updatedAt: 200, placementDismissed: true });
  const m = mergeState(a, b);
  assert.equal(m.placement.start, 5, "result from the other device is kept");
  assert.equal(m.placementDismissed, true);
  const newer = mergeState(s({ updatedAt: 100, placement: pl(100, 5) }), s({ updatedAt: 300, placement: pl(300, 9) }));
  assert.equal(newer.placement.start, 9, "most recent result wins");
  const reset = mergeState(a, s({ updatedAt: 400, resetAt: 400, placement: null }));
  assert.equal(reset.placement, null, "a later full reset clears it");
});

test("daily challenge merges: latest day wins, count is the larger, a later reset clears it", () => {
  const a = s({ updatedAt: 100, daily: { day: "2026-10-01", correct: 3, total: 5 }, dailyCount: 4 });
  const b = s({ updatedAt: 200, daily: { day: "2026-10-02", correct: 5, total: 5 }, dailyCount: 3 });
  const m = mergeState(a, b);
  assert.equal(m.daily.day, "2026-10-02");
  assert.equal(m.dailyCount, 4);
  const reset = mergeState(a, s({ updatedAt: 300, resetAt: 300 }));
  assert.equal(reset.daily, null);
  assert.equal(reset.dailyCount, 0);
});
