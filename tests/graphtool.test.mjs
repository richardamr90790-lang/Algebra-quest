import test from "node:test";
import assert from "node:assert/strict";
import { GENERATORS } from "../src/game/engine/generators.js";
import { TOPICS } from "../src/game/data/topics.js";
import { graphTaskOf, answerFromState, verdict, lineFromDots, snap, canClick, sideOfLine } from "../src/game/graphtool.js";
import { checkEquivalence } from "../src/game/engine/equivalence.js";

test("clicks snap to the nearest grid point and stay on the grid", () => {
  assert.deepEqual(snap(0.5, 0.5), { x: 0, y: 0 });
  assert.deepEqual(snap((120 + 28) / 240, (120 - 42) / 240), { x: 2, y: 3 });
  assert.deepEqual(snap(0, 1), { x: -8, y: -8 });
  assert.deepEqual(snap(1, 0), { x: 8, y: 8 });
});

test("a line through two dots gives slope and intercept, including fractions", () => {
  assert.deepEqual(lineFromDots({ x: 0, y: 3 }, { x: 1, y: 5 }), { m: "2", b: "3", mv: 2, bv: 3 });
  assert.equal(lineFromDots({ x: 0, y: 1 }, { x: 2, y: 2 }).m, "1/2");
  assert.equal(lineFromDots({ x: 2, y: 2 }, { x: 4, y: 3 }).b, "1");
  assert.equal(lineFromDots({ x: 1, y: 1 }, { x: 1, y: 4 }), null);
});

test("every graph problem the generators make is either clickable or see-only, and a perfect graph is marked right", () => {
  for (const id of [17, 26, 30]) {
    for (let i = 0; i < 80; i++) for (const p of GENERATORS[id]()) {
      const task = graphTaskOf(p);
      assert.ok(task, `generator ${id}: ${p.q}`);
      if (!canClick(task)) continue;
      // build the perfect state for the task, check the verdict and that its answer matches the answer key
      let st;
      if (task.kind === "read") st = { dots: [{ x: 0, y: task.b }, { x: 1, y: task.m + task.b }] };
      else if (task.kind === "eval") st = { dots: [{ x: task.x0, y: task.m * task.x0 + task.b }] };
      else if (task.kind === "vertex") st = { dots: [{ x: task.h, y: task.k }] };
      else if (task.kind === "axis") st = { dots: [{ x: task.h, y: 0 }] };
      else if (task.kind === "circle") st = { cx: task.value, closed: task.closed };
      else if (task.kind === "style") st = { dashed: task.dashed };
      else st = { above: task.above };
      if (task.kind === "read" && Math.abs(task.b) > 8 || Math.abs(task.m + task.b) > 8) { if (task.kind === "read") continue; }
      assert.equal(verdict(task, st).ok, true, `${task.kind}: ${p.q}`);
      const ans = answerFromState(task, st, "en");
      assert.ok(checkEquivalence(ans, p.check || p.a), `${task.kind}: "${ans}" should match ${p.check || p.a}`);
    }
  }
});

test("topic problems are recognised too, and wrong graphs are marked wrong", () => {
  const t = TOPICS.find((x) => x.id === 26);
  const vertex = [...t.guided, ...t.problems].map(graphTaskOf).find((x) => x && x.kind === "vertex");
  assert.ok(vertex);
  assert.equal(verdict(vertex, { dots: [{ x: vertex.h + 1, y: vertex.k }] }).ok, false);
  assert.equal(verdict(vertex, { dots: [] }).why, "need");
});

test("sides of the boundary line", () => {
  const t = { m: 1, b: 0 };
  assert.equal(sideOfLine(t, { x: 2, y: 5 }), "above");
  assert.equal(sideOfLine(t, { x: 2, y: -1 }), "below");
  assert.equal(sideOfLine(t, { x: 2, y: 2 }), "on");
});
