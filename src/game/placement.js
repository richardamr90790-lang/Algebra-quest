// Placement check-in: two questions per region (one from its entry topic, one from a
// topic about halfway through), then a per-region result and a suggested starting topic.
// Pure functions, no DOM, so they can be unit tested.

export const REGION_ORDER = ["foundations", "expressions", "equations", "graphing", "factoring", "rational", "quadratics", "applications"];

// Topics of a region in the suggested learning order.
export function regionTopics(topics, suggestedOrder, cat) {
  return topics
    .filter((t) => t.cat === cat)
    .sort((a, b) => suggestedOrder.indexOf(a.id) - suggestedOrder.indexOf(b.id))
    .map((t) => t.id);
}

// [{cat, topicIds: [entryTopic, midTopic]}] in learning order. A region with a single
// topic uses it twice (the caller draws two different problems from it).
export function buildPlan(topics, suggestedOrder) {
  return REGION_ORDER.map((cat) => {
    const ids = regionTopics(topics, suggestedOrder, cat);
    if (!ids.length) return null;
    const mid = ids[Math.floor(ids.length / 2)];
    return { cat, topicIds: [ids[0], ids.length > 1 ? mid : ids[0]] };
  }).filter(Boolean);
}

// results: [{cat, topicId, correct: boolean}] -> { [cat]: {correct, total, level} }
export function scoreRegions(results) {
  const out = {};
  for (const r of results) {
    const row = out[r.cat] || (out[r.cat] = { correct: 0, total: 0, level: "needs" });
    row.total++;
    if (r.correct) row.correct++;
  }
  for (const row of Object.values(out)) {
    row.level = row.correct === row.total ? "solid" : row.correct > 0 ? "getting" : "needs";
  }
  return out;
}

// The topic to start on: the first region (in learning order) that isn't solid, and in it
// the first topic that wasn't already answered correctly. null if every region is solid.
export function recommendStart(regions, results, topics, suggestedOrder) {
  const correctTopics = new Set(results.filter((r) => r.correct).map((r) => r.topicId));
  for (const cat of REGION_ORDER) {
    const row = regions[cat];
    if (!row || row.level === "solid") continue;
    const ids = regionTopics(topics, suggestedOrder, cat);
    return ids.find((id) => !correctTopics.has(id)) ?? ids[0] ?? null;
  }
  return null;
}
