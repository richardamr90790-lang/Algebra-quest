import test from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS } from "../src/game/achievements.js";
import { SHOP_ITEMS } from "../src/game/shop.js";
import { BOSS_LEVELS } from "../src/game/engine/boss-tiers.js";
import { CAT } from "../src/game/data/topics.js";

const filled = (v) => typeof v === "string" && v.trim().length > 0;

test("every badge has a Spanish name and description", () => {
  const bad = ACHIEVEMENTS.filter((a) => !filled(a.es) || !filled(a.esDesc)).map((a) => a.id);
  assert.deepEqual(bad, []);
});
test("every shop item has a Spanish name", () => {
  assert.deepEqual(SHOP_ITEMS.filter((i) => !filled(i.es)).map((i) => i.id), []);
});
test("every Boss Battle tier has a Spanish name and tagline", () => {
  assert.deepEqual(BOSS_LEVELS.filter((l) => !filled(l.es) || !filled(l.esTagline)).map((l) => l.id), []);
});
test("every region has a Spanish name", () => {
  assert.deepEqual(Object.entries(CAT).filter(([, c]) => !filled(c.es)).map(([k]) => k), []);
});
