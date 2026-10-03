import test from "node:test";
import assert from "node:assert/strict";
import { shouldAutoShowTour, tourSlides } from "../src/game/tour.js";
import { setLang } from "../src/game/i18n.js";

test("only brand-new learners get the tour automatically", () => {
  assert.equal(shouldAutoShowTour({}), true);
  assert.equal(shouldAutoShowTour({ xp: 0, mastered: {}, activity: [] }), true);
  assert.equal(shouldAutoShowTour({ tourDone: true }), false);
  assert.equal(shouldAutoShowTour({ xp: 40 }), false);
  assert.equal(shouldAutoShowTour({ mastered: { 3: [0] } }), false);
  assert.equal(shouldAutoShowTour({ activity: [{ at: 1 }] }), false);
});

test("every slide has an icon, title and text in both languages", () => {
  const seen = {};
  for (const lang of ["en", "es"]) {
    setLang(lang);
    seen[lang] = tourSlides();
    for (const s of seen[lang]) for (const k of ["icon", "title", "text"]) assert.ok(s[k] && s[k].trim(), `${lang} ${k}`);
  }
  setLang("en");
  assert.equal(seen.en.length, seen.es.length);
  seen.en.forEach((s, i) => assert.notEqual(s.title, seen.es[i].title));
});
