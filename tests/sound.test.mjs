import test from "node:test";
import assert from "node:assert/strict";
import { SOUND_NAMES, planFor, createSoundPlayer } from "../src/game/sound.js";

// A fake audio context that records what would have been played.
function fakeContext({ state = "running" } = {}) {
  const ctx = {
    state, currentTime: 10, resumed: 0, destination: {}, oscillators: [],
    resume() { ctx.resumed++; ctx.state = "running"; },
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; },
    createOscillator() {
      const o = { type: "", frequency: { value: 0 }, connect() {}, start(t) { o.startAt = t; }, stop(t) { o.stopAt = t; } };
      ctx.oscillators.push(o);
      return o;
    },
  };
  return ctx;
}

test("every sound has well-formed notes", () => {
  assert.deepEqual(SOUND_NAMES.sort(), ["badge", "buy", "correct", "fanfare", "levelup", "mastered", "streak", "wrong"]);
  for (const name of SOUND_NAMES) {
    const plan = planFor(name);
    assert.ok(plan.length >= 2, name);
    for (const n of plan) {
      assert.ok(n.freq >= 200 && n.freq <= 2000, `${name} pitch is in a pleasant range`);
      assert.ok(n.dur > 0 && n.dur <= 0.6 && n.at >= 0 && n.gain > 0 && n.gain <= 1, name);
      assert.ok(["sine", "triangle", "square"].includes(n.type), name);
    }
    const end = Math.max(...plan.map((n) => n.at + n.dur));
    assert.ok(end < 1.6, `${name} stays short (${end.toFixed(2)}s)`);
  }
  assert.equal(planFor("nope"), null);
});

test("playing schedules one oscillator per note at the right times", () => {
  const ctx = fakeContext();
  const p = createSoundPlayer({ makeContext: () => ctx, isMuted: () => false });
  assert.equal(p.play("levelup"), true);
  const plan = planFor("levelup");
  assert.equal(ctx.oscillators.length, plan.length);
  ctx.oscillators.forEach((o, i) => {
    assert.equal(o.frequency.value, plan[i].freq);
    assert.equal(o.startAt, 10 + plan[i].at);
    assert.ok(o.stopAt > o.startAt);
  });
});

test("muted means silent and the audio device is never even created", () => {
  let made = 0;
  const p = createSoundPlayer({ makeContext: () => { made++; return fakeContext(); }, isMuted: () => true });
  assert.equal(p.play("correct"), false);
  assert.equal(made, 0);
});

test("the mute switch is read every time", () => {
  const ctx = fakeContext();
  let muted = true;
  const p = createSoundPlayer({ makeContext: () => ctx, isMuted: () => muted });
  assert.equal(p.play("correct"), false);
  muted = false;
  assert.equal(p.play("correct"), true);
  muted = true;
  const before = ctx.oscillators.length;
  assert.equal(p.play("correct"), false);
  assert.equal(ctx.oscillators.length, before);
});

test("a suspended context is resumed, and the context is reused", () => {
  const ctx = fakeContext({ state: "suspended" });
  let made = 0;
  const p = createSoundPlayer({ makeContext: () => { made++; return ctx; }, isMuted: () => false });
  p.play("correct"); p.play("wrong");
  assert.equal(ctx.resumed, 1);
  assert.equal(made, 1);
});

test("devices without audio, and unknown sounds, stay silent without throwing", () => {
  assert.equal(createSoundPlayer({ makeContext: () => null, isMuted: () => false }).play("correct"), false);
  assert.equal(createSoundPlayer({ makeContext: () => { throw new Error("no audio"); }, isMuted: () => false }).play("correct"), false);
  assert.equal(createSoundPlayer({ makeContext: () => fakeContext(), isMuted: () => false }).play("nope"), false);
});
