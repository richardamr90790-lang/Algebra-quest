// Achievements: a catalog of badges and a pure function that works out which ones a learner has earned
// from their saved state. There are deliberately no day-streak badges. Pure logic, no DOM.

export const EMPTY_STATS = { answers: 0, correct: 0, reviews: 0, perfect: 0, bosses: 0, bossPerfect: 0 };

// Numbers every badge rule reads from. `problemCount(topic)` says how many practice problems a topic has.
export function snapshot(state, topics, problemCount) {
  const stats = { ...EMPTY_STATS, ...(state.stats || {}) };
  const mastered = state.mastered || {};
  const done = (t) => (mastered[t.id] || []).length >= problemCount(t);
  const masteredTopics = topics.filter(done);
  const regions = [...new Set(topics.map((t) => t.cat))];
  const regionsCleared = regions.filter((cat) => topics.filter((t) => t.cat === cat).every(done)).length;
  return {
    ...stats,
    bestStreak: state.bestStreak || 0,
    level: Math.floor((state.xp || 0) / 100) + 1,
    topicsMastered: masteredTopics.length,
    totalTopics: topics.length,
    regionsCleared,
    checkin: !!state.placement,
    dailies: state.dailyCount || 0,
    owned: Array.isArray(state.owned) ? state.owned.length : 0,
  };
}

const at = (key, n) => (s) => s[key] >= n;

export const ACHIEVEMENTS = [
  // First steps
  { id: "first-answer", icon: "🌱", title: "First Steps",       desc: "Answer your first question correctly.", test: at("correct", 1) },
  { id: "correct-100",  icon: "🎯", title: "Sharpshooter",      desc: "Get 100 answers right.",                test: at("correct", 100) },
  { id: "correct-500",  icon: "🏹", title: "Bullseye",          desc: "Get 500 answers right.",                test: at("correct", 500) },
  { id: "streak-10",    icon: "🔥", title: "On Fire",           desc: "Get 10 answers right in a row.",        test: at("bestStreak", 10) },
  { id: "streak-25",    icon: "☄️", title: "Unstoppable",       desc: "Get 25 answers right in a row.",        test: at("bestStreak", 25) },
  // Mastery
  { id: "master-1",     icon: "🏆", title: "Topic Master",      desc: "Master your first topic.",              test: at("topicsMastered", 1) },
  { id: "master-5",     icon: "🥈", title: "Five Down",         desc: "Master 5 topics.",                      test: at("topicsMastered", 5) },
  { id: "master-10",    icon: "🥇", title: "Ten Strong",        desc: "Master 10 topics.",                     test: at("topicsMastered", 10) },
  { id: "master-half",  icon: "⛰️", title: "Halfway There",     desc: "Master half of all the topics.",        test: (s) => s.topicsMastered >= Math.ceil(s.totalTopics / 2) },
  { id: "master-all",   icon: "👑", title: "Algebra Royalty",   desc: "Master every topic.",                   test: (s) => s.totalTopics > 0 && s.topicsMastered >= s.totalTopics },
  { id: "region-1",     icon: "🗺️", title: "Region Cleared",    desc: "Master every topic in one area.",       test: at("regionsCleared", 1) },
  { id: "region-4",     icon: "🧭", title: "Four Corners",      desc: "Clear 4 areas.",                        test: at("regionsCleared", 4) },
  // Habits
  { id: "perfect-1",    icon: "✨", title: "Flawless",          desc: "Finish a topic with every answer typed right, and no hints.", test: at("perfect", 1) },
  { id: "perfect-5",    icon: "💎", title: "Gem",               desc: "Do that 5 times.",                      test: at("perfect", 5) },
  { id: "review-1",     icon: "🔁", title: "Remember When",     desc: "Finish a Daily Review.",                test: at("reviews", 1) },
  { id: "review-10",    icon: "🧠", title: "Memory Master",     desc: "Finish 10 Daily Reviews.",              test: at("reviews", 10) },
  { id: "checkin",      icon: "📍", title: "Know Your Map",     desc: "Complete the check-in.",                test: (s) => s.checkin },
  // Daily Challenge (a running total, never consecutive days)
  { id: "daily-1",      icon: "⭐", title: "Daily Starter",     desc: "Finish a Daily Challenge.",             test: at("dailies", 1) },
  { id: "daily-7",      icon: "🗓️", title: "Weekly Warrior",    desc: "Finish 7 Daily Challenges.",            test: at("dailies", 7) },
  { id: "daily-30",     icon: "🌟", title: "Daily Legend",      desc: "Finish 30 Daily Challenges.",           test: at("dailies", 30) },
  // Bosses
  { id: "boss-1",       icon: "⚔️", title: "Boss Battler",      desc: "Finish a Boss Battle.",                 test: at("bosses", 1) },
  { id: "boss-perfect", icon: "🐉", title: "Boss Slayer",       desc: "Win a Boss Battle with every answer right.", test: at("bossPerfect", 1) },
  // Levels
  { id: "level-5",      icon: "⬆️", title: "Level 5",           desc: "Reach level 5.",                        test: at("level", 5) },
  { id: "level-10",     icon: "🚀", title: "Level 10",          desc: "Reach level 10.",                       test: at("level", 10) },
  { id: "level-25",     icon: "🌠", title: "Level 25",          desc: "Reach level 25.",                       test: at("level", 25) },
  // Shop
  { id: "shop-1",       icon: "🛍️", title: "First Purchase",    desc: "Buy something in the shop.",            test: at("owned", 1) },
  { id: "shop-5",       icon: "🎁", title: "Collector",         desc: "Own 5 shop items.",                     test: at("owned", 5) },
];

export const achievementById = (id) => ACHIEVEMENTS.find((a) => a.id === id) || null;

// Ids of every badge the state currently qualifies for.
export function earnedNow(state, topics, problemCount) {
  const snap = snapshot(state, topics, problemCount);
  return ACHIEVEMENTS.filter((a) => a.test(snap)).map((a) => a.id);
}

// New badges to record: [{id, at}] for those earned now but not yet in `badges`.
export function newBadges(state, topics, problemCount, now = Date.now()) {
  const have = state.badges || {};
  return earnedNow(state, topics, problemCount).filter((id) => !have[id]).map((id) => ({ id, at: now }));
}

// Merge two devices' badge maps: union, keeping the earliest date for each.
export function mergeBadges(a, b) {
  const out = { ...(a || {}) };
  for (const [id, t] of Object.entries(b || {})) {
    if (!achievementById(id)) continue;
    out[id] = out[id] ? Math.min(out[id], t) : t;
  }
  for (const id of Object.keys(out)) if (!achievementById(id)) delete out[id];
  return out;
}

export function mergeStats(a, b) {
  const out = { ...EMPTY_STATS };
  for (const k of Object.keys(EMPTY_STATS)) out[k] = Math.max((a && a[k]) || 0, (b && b[k]) || 0);
  return out;
}
