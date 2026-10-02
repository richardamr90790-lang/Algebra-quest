import test from "node:test";
import assert from "node:assert/strict";
import { serializeBackup, parseBackup, backupFileName } from "../src/game/backup.js";

const defaults = { xp: 0, bestStreak: 0, mastered: {}, customProblems: {}, theme: "clean", name: "", masteredDates: {}, avatar: "root" };

test("round trip keeps progress", () => {
  const state = { ...defaults, xp: 250, name: "Sam", mastered: { 1: [0, 1, 2] }, theme: "neon" };
  const out = parseBackup(serializeBackup(state), defaults);
  assert.deepEqual(out, state);
});

test("fills fields missing from older backups", () => {
  const text = JSON.stringify({ app: "algebra-quest", version: 1, state: { xp: 5, mastered: {} } });
  const out = parseBackup(text, defaults);
  assert.equal(out.theme, "clean");
  assert.equal(out.xp, 5);
});

test("rejects junk, other apps, newer versions and damaged data", () => {
  assert.throws(() => parseBackup("not json", defaults), /valid/);
  assert.throws(() => parseBackup(JSON.stringify({ app: "other", version: 1, state: {} }), defaults), /isn't an Algebra Quest/);
  assert.throws(() => parseBackup(JSON.stringify({ app: "algebra-quest", version: 99, state: { xp: 1, mastered: {} } }), defaults), /newer/);
  assert.throws(() => parseBackup(JSON.stringify({ app: "algebra-quest", version: 1, state: { xp: "x", mastered: {} } }), defaults), /damaged/);
  assert.throws(() => parseBackup(JSON.stringify({ app: "algebra-quest", version: 1, state: { xp: 1, mastered: [] } }), defaults), /damaged/);
});

test("file name uses learner name and date", () => {
  assert.equal(backupFileName({ name: "Sam K." }, new Date("2026-10-02T12:00:00Z")), "algebra-quest-sam-k-2026-10-02.json");
  assert.equal(backupFileName({ name: "" }, new Date("2026-10-02T12:00:00Z")), "algebra-quest-2026-10-02.json");
});
