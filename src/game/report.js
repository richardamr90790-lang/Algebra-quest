// Progress report for one learner, built from their saved state. Pure logic, no DOM.
import { EMPTY_STATS } from "./achievements.js";
import { dueTopics, nextDueDay } from "./review.js";

export const ACTIVITY_LIMIT = 30;
export const RECENT_SHOWN = 10;

// Add a finished session to the activity log (newest first, capped). Does not mutate.
export function addActivity(activity, entry, limit = ACTIVITY_LIMIT) {
  return [entry, ...(Array.isArray(activity) ? activity : [])].slice(0, limit);
}

// Merge two devices' logs: union by (time, mode), newest first, capped.
export function mergeActivity(a, b, limit = ACTIVITY_LIMIT) {
  const seen = new Map();
  for (const e of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    if (e && typeof e.at === "number") seen.set(`${e.at}:${e.mode}`, e);
  }
  return [...seen.values()].sort((x, y) => y.at - x.at).slice(0, limit);
}

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

// regionOrder: ["foundations", ...]; labels: {cat: "Foundations"}; problemCount(topic) -> number.
export function buildReport(state, topics, { regionOrder, labels, problemCount, badgesEarned, badgesTotal, now = new Date() }) {
  const mastered = state.mastered || {};
  const isDone = (t) => (mastered[t.id] || []).length >= problemCount(t);
  const placement = state.placement || null;

  const regions = regionOrder
    .map((cat) => {
      const ts = topics.filter((t) => t.cat === cat);
      if (!ts.length) return null;
      const done = ts.filter(isDone).length;
      return { cat, label: labels[cat] || cat, mastered: done, total: ts.length, pct: pct(done, ts.length), checkin: placement && placement.regions && placement.regions[cat] ? placement.regions[cat].level : null };
    })
    .filter(Boolean);

  const title = (id) => { const t = topics.find((x) => x.id === Number(id)); return t ? t.title : `Topic ${id}`; };
  const review = state.review || {};
  const due = dueTopics(review, now);

  // Areas that need attention, most important first: missed last review, check-in "needs work", review overdue.
  const attention = [];
  const seen = new Set();
  const add = (kind, key, text) => { const k = kind + key; if (!seen.has(k)) { seen.add(k); attention.push({ kind, text }); } };
  for (const [id, e] of Object.entries(review)) if (e && e.ok === false) add("missed", id, `${title(id)}: missed in the last review`);
  for (const r of regions) if (r.checkin === "needs") add("checkin", r.cat, `${r.label}: needs work (from the check-in)`);
  for (const id of due) add("due", id, `${title(id)}: review is due`);
  for (const r of regions) if (r.checkin === "getting") add("checkin-getting", r.cat, `${r.label}: getting there (from the check-in)`);

  const activity = (Array.isArray(state.activity) ? state.activity : []).slice().sort((a, b) => b.at - a.at);
  const stats = { ...EMPTY_STATS, ...(state.stats || {}) };
  const xp = state.xp || 0;
  const startTopic = placement && placement.start ? title(placement.start) : null;

  return {
    name: state.name || "",
    level: Math.floor(xp / 100) + 1,
    xp,
    xpToNext: 100 - (xp % 100),
    topicsMastered: topics.filter(isDone).length,
    totalTopics: topics.length,
    regions,
    badgesEarned: badgesEarned ?? Object.keys(state.badges || {}).length,
    badgesTotal: badgesTotal ?? 0,
    dailies: state.dailyCount || 0,
    bestStreak: state.bestStreak || 0,
    rightAnswers: stats.correct,
    reviewsDone: stats.reviews,
    reviewsDue: due.length,
    nextReview: due.length ? "today" : nextDueDay(review, now),
    attention,
    checkinDone: !!placement,
    checkinDate: placement ? placement.at : null,
    suggestedStart: startTopic,
    lastPlayed: activity.length ? activity[0].at : null,
    recent: activity.slice(0, RECENT_SHOWN),
  };
}

export function describeScore(entry) {
  if (!entry || !entry.total) return "";
  return `${entry.correct}/${entry.total}`;
}
