// Spaced review: each topic you've practiced is scheduled to come back after a
// growing gap (Leitner boxes). Pass a review and the gap grows; miss it and the
// topic comes back tomorrow. Pure functions, no DOM, so they can be unit tested.
//
// review[topicId] = { box, due: "YYYY-MM-DD", last: "YYYY-MM-DD", at: ms }

export const INTERVAL_DAYS = [1, 3, 7, 14, 30];
export const PASS_RATIO = 0.8; // share of a topic's practice problems needed to count as a pass

const pad = (n) => String(n).padStart(2, "0");

// The learner's local calendar day, so "tomorrow" means tomorrow where they live.
export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n, 12); // noon avoids daylight-saving edges
  return localDay(dt);
}

export function daysBetween(fromDay, toDay) {
  const t = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(toDay) - t(fromDay)) / 86400000);
}

// Record the result of practicing a topic. Returns the new review map (does not mutate).
// `skip` (0 or 1) jumps an extra box on a pass, used when the learner clearly knows the topic.
export function recordResult(review, topicId, passed, now = new Date(), skip = 0) {
  const today = localDay(now);
  const prev = review && review[topicId];
  const box = passed ? Math.min((prev ? prev.box : -1) + 1 + skip, INTERVAL_DAYS.length - 1) : 0;
  return {
    ...(review || {}),
    [topicId]: { box, due: addDays(today, INTERVAL_DAYS[box]), last: today, at: now.getTime() },
  };
}

// Topics whose review is due today or overdue, most overdue first.
export function dueTopics(review, now = new Date(), limit = Infinity) {
  const today = localDay(now);
  return Object.entries(review || {})
    .filter(([, e]) => e && e.due <= today)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : a[1].box - b[1].box))
    .slice(0, limit)
    .map(([id]) => Number(id));
}

// The soonest upcoming review date after today, or null if nothing is scheduled.
export function nextDueDay(review, now = new Date()) {
  const today = localDay(now);
  const future = Object.values(review || {}).filter((e) => e && e.due > today).map((e) => e.due).sort();
  return future[0] || null;
}

export function passed(correct, total) {
  return total > 0 && correct / total >= PASS_RATIO;
}

// Merge two devices' review maps: the more recent entry for each topic wins, and an
// entry made before that topic (or everything) was reset is dropped.
export function mergeReview(a, b, { resetAt = 0, topicResets = {} } = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = a && a[id];
    const y = b && b[id];
    const pick = !x ? y : !y ? x : x.at !== y.at ? (x.at > y.at ? x : y) : x.box >= y.box ? x : y;
    const cutoff = Math.max(resetAt || 0, (topicResets && topicResets[id]) || 0);
    if (pick && (pick.at || 0) >= cutoff) out[id] = pick;
  }
  return out;
}
