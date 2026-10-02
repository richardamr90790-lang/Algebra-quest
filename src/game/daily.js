// Daily Challenge: the same 5 questions for everyone on a given calendar day, drawn from 5 different
// regions. The question generators use Math.random, so a day's set is produced with Math.random
// temporarily replaced by a generator seeded from the date. Pure logic, no DOM.

export const DAILY_COUNT = 5;
export const DAILY_XP_PER_CORRECT = 15;
export const DAILY_BONUS_XP = 25;

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// mulberry32: small, fast, good enough for picking questions.
export function seededRandom(seed) {
  let a = hashString(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Run fn with Math.random replaced by a generator seeded from `seed`, restoring it afterwards.
export function withSeededRandom(seed, fn) {
  const original = Math.random;
  Math.random = seededRandom(seed);
  try { return fn(); } finally { Math.random = original; }
}

function shuffled(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Which topics a day's challenge uses: one topic from each of DAILY_COUNT randomly chosen regions.
export function dailyTopicPlan(day, topics, regionOrder) {
  const rand = seededRandom("plan:" + day);
  const regions = shuffled(regionOrder.filter((cat) => topics.some((t) => t.cat === cat)), rand).slice(0, DAILY_COUNT);
  return regions.map((cat) => {
    const ids = topics.filter((t) => t.cat === cat).map((t) => t.id);
    return { cat, topicId: ids[Math.floor(rand() * ids.length)] };
  });
}

// The day's problems: [{...problem, topicId, cat}] in a fixed order. `generate(topicId)` returns a
// problem list for a topic (the game passes its own generators in).
export function dailyProblems(day, topics, regionOrder, generate) {
  return withSeededRandom("problems:" + day, () => {
    const plan = dailyTopicPlan(day, topics, regionOrder);
    return plan.map(({ cat, topicId }) => {
      const items = generate(topicId);
      return { ...items[Math.floor(Math.random() * items.length)], topicId, cat };
    });
  });
}

export function dailyDoneToday(daily, today) {
  return !!daily && daily.day === today;
}
