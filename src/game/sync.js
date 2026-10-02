// Merging two copies of a learner's progress (this device vs. the server).
// Pure functions, no DOM or network, so they are easy to test.
//
// Rule of thumb: never lose progress. XP, streak and mastered problems are merged
// as a union / max, with one exception: a reset. A full reset (resetAt) or a topic
// reset (topicResets[id]) discards the *other* copy's progress only if that copy
// was last edited before the reset happened.

import { mergeReview } from "./review.js";

const asObj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const ms = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

// Does `side` still count for a thing that `other` may have reset at `resetTime`?
const survives = (side, resetTime) => ms(side.updatedAt) >= resetTime;

export function mergeState(a, b) {
  if (!a) return b ? { ...b } : null;
  if (!b) return { ...a };

  const newer = ms(a.updatedAt) >= ms(b.updatedAt) ? a : b;
  const older = newer === a ? b : a;

  const resetAt = Math.max(ms(a.resetAt), ms(b.resetAt));
  const aCounts = survives(a, ms(b.resetAt));
  const bCounts = survives(b, ms(a.resetAt));
  const counting = [aCounts && a, bCounts && b].filter(Boolean);

  const topicResets = {};
  for (const src of [asObj(a.topicResets), asObj(b.topicResets)]) {
    for (const [id, t] of Object.entries(src)) topicResets[id] = Math.max(ms(topicResets[id]), ms(t));
  }

  const mastered = {};
  const masteredDates = {};
  const topicIds = new Set([...Object.keys(asObj(a.mastered)), ...Object.keys(asObj(b.mastered))]);
  for (const id of topicIds) {
    const set = new Set();
    for (const side of counting) {
      const otherSide = side === a ? b : a;
      if (!survives(side, ms(asObj(otherSide.topicResets)[id]))) continue;
      for (const idx of asObj(side.mastered)[id] || []) set.add(idx);
    }
    if (set.size) mastered[id] = [...set].sort((x, y) => x - y);
    else mastered[id] = [];
    const dates = counting
      .map((s) => asObj(s.masteredDates)[id])
      .filter(Boolean)
      .sort();
    if (set.size && dates.length) masteredDates[id] = dates[0];
  }

  // Placement check-in: keep the most recent result from a copy that wasn't wiped by a later reset.
  const placement = counting.map((s) => s.placement).filter(Boolean).sort((x, y) => ms(y.at) - ms(x.at))[0] || null;
  const placementDismissed = counting.some((s) => s.placementDismissed);

  // Daily challenge: the most recent completed day, and the largest completed-days count.
  const daily = counting.map((s) => s.daily).filter(Boolean).sort((x, y) => (x.day < y.day ? 1 : x.day > y.day ? -1 : 0))[0] || null;
  const dailyCount = Math.max(0, ...counting.map((s) => ms(s.dailyCount)));

  // Re-rolled practice sets: take the newer side's, falling back to the older's.
  const customProblems = { ...asObj(older.customProblems), ...asObj(newer.customProblems) };
  for (const id of Object.keys(customProblems)) {
    if (ms(topicResets[id]) > ms(newer.updatedAt) && !asObj(newer.customProblems)[id]) delete customProblems[id];
  }

  return {
    ...older,
    ...newer, // name, theme, avatar and anything new: newest edit wins
    xp: Math.max(0, ...counting.map((s) => ms(s.xp))),
    bestStreak: Math.max(0, ...counting.map((s) => ms(s.bestStreak))),
    mastered,
    masteredDates,
    customProblems,
    placement,
    placementDismissed,
    daily,
    dailyCount,
    review: mergeReview(asObj(a.review), asObj(b.review), { resetAt, topicResets }),
    resetAt,
    topicResets,
    updatedAt: Math.max(ms(a.updatedAt), ms(b.updatedAt)),
  };
}

// Same progress? (ignores updatedAt so a no-op merge doesn't trigger an upload)
export function sameProgress(a, b) {
  return !!a && !!b && JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) if (k !== "updatedAt") out[k] = canonical(v[k]);
    return out;
  }
  return v;
}

// Debounced uploader: collapses a burst of saves into one request, retries later
// on failure, and can be flushed when the page is hidden.
export function createPusher(push, { delay = 2000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let timer = null;
  let pending = null;
  let inFlight = false;
  const run = async () => {
    timer = null;
    if (inFlight || !pending) return;
    const state = pending;
    pending = null;
    inFlight = true;
    try {
      await push(state);
    } catch {
      if (!pending) pending = state; // keep it for the next attempt
      timer = setTimer(run, delay * 5);
    } finally {
      inFlight = false;
      if (pending && !timer) timer = setTimer(run, delay);
    }
  };
  return {
    schedule(state) {
      pending = state;
      if (!timer && !inFlight) timer = setTimer(run, delay);
    },
    async flush() {
      if (timer) { clearTimer(timer); timer = null; }
      await run();
    },
    hasPending: () => !!pending || inFlight,
  };
}
