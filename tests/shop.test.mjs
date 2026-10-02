import test from "node:test";
import assert from "node:assert/strict";
import { SHOP_ITEMS, spentOn, balance, buy, canUse, mergeOwned, isOwned } from "../src/game/shop.js";

test("catalog: unique ids, positive prices, both kinds", () => {
  assert.equal(new Set(SHOP_ITEMS.map((i) => i.id)).size, SHOP_ITEMS.length);
  assert.ok(SHOP_ITEMS.every((i) => i.price > 0 && i.label && i.icon));
  assert.ok(SHOP_ITEMS.some((i) => i.kind === "avatar") && SHOP_ITEMS.some((i) => i.kind === "frame"));
});

test("balance is lifetime XP minus what you own, never negative", () => {
  assert.equal(balance(400, []), 400);
  assert.equal(balance(400, ["rocket"]), 250);
  assert.equal(balance(100, ["rocket"]), 0);
  assert.equal(balance(NaN, []), 0);
  assert.equal(spentOn(["rocket", "gold", "does-not-exist"]), 400);
});

test("buying needs enough balance and can't repeat", () => {
  const r = buy(400, [], "rocket");
  assert.deepEqual(r, { ok: true, owned: ["rocket"] });
  assert.equal(buy(400, ["rocket"], "rocket").reason, "owned");
  const poor = buy(100, [], "rocket");
  assert.deepEqual([poor.ok, poor.reason, poor.short], [false, "poor", 50]);
  assert.equal(buy(1000, [], "nope").reason, "unknown");
  assert.equal(buy(400, ["rocket"], "wolf").ok, true, "balance counts what you already own: 400-150=250 >= 200");
  assert.equal(buy(400, ["rocket"], "astronaut").reason, "poor", "250 left is not enough for 350");
});

test("using a character or frame requires owning it unless it's free", () => {
  const free = ["root", "fox"];
  assert.equal(canUse([], "avatar", "fox", free), true);
  assert.equal(canUse([], "avatar", "rocket", free), false);
  assert.equal(canUse(["rocket"], "avatar", "rocket", free), true);
  assert.equal(canUse([], "frame", "", free), true, "no frame is always allowed");
  assert.equal(canUse([], "frame", "gold", free), false);
  assert.equal(canUse(["gold"], "frame", "gold", free), true);
});

test("owned lists from two devices merge by union without duplicates", () => {
  assert.deepEqual(mergeOwned(["rocket", "gold"], ["gold", "wolf"]).sort(), ["gold", "rocket", "wolf"]);
  assert.deepEqual(mergeOwned(undefined, ["wolf"]), ["wolf"]);
  assert.equal(isOwned(mergeOwned(["x"], []), "x"), false, "unknown ids are dropped");
});
