# Algebra Quest

A 9th grade algebra skill-builder: 34 topics across 8 regions, flashcard quests with worked examples and guided practice, XP, streaks, avatars, six themes, read-aloud, a dictionary, and tiered Boss Battles. Problems are generated fresh, with answers built backwards from clean solutions.

Everything is available in English and in Dominican Spanish (a flag button (Dominican / US) on the home and sign-in screens; see [Languages](#languages)).

Installable on a phone or desktop (PWA) and works offline. Progress is saved in the browser and can be exported to / imported from a file. With a Supabase project connected (see [docs/supabase-setup.md](docs/supabase-setup.md)), a parent signs in, adds learner profiles, and each learner's progress syncs across devices.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine, backup and sync unit tests
npm run e2e:local  # browser test: offline, backup (build without Supabase keys on :3100)
npm run e2e:themes # browser test: premium themes in the shop and the theme picker (build without Supabase keys on :3100)
npm run e2e:a11y   # accessibility: axe on every screen x theme, layout, touch sizes, keyboard (build without Supabase keys on :3100)
npm run e2e:a11y-accounts # accessibility of the sign-in / Who's playing screens (build with fake keys, see the file header)
npm run e2e:report # browser test: progress report, activity log, print styles (build without Supabase keys on :3100)
npm run e2e:badges # browser test: badges, counters, pop-ups (build without Supabase keys on :3100)
npm run e2e:sound  # browser test: which sound plays when, mute (build without Supabase keys on :3100)
npm run e2e:shop   # browser test: shop, equipping, frames (build without Supabase keys on :3100)
npm run e2e:daily  # browser test: Daily Challenge incl. a changing date (build without Supabase keys on :3100)
npm run e2e:adaptive # browser test: warm-ups and perfect-run scheduling (build without Supabase keys on :3100)
npm run e2e:placement # browser test: the check-in (build without Supabase keys on :3100)
npm run e2e:hints  # browser test: hint ladder and mistake feedback (build without Supabase keys on :3100)
npm run e2e:review # browser test: daily review (build without Supabase keys on :3100)
npm run e2e:save-warning # browser test: the "progress is not being saved" warning (build without Supabase keys on :3100)
npm run e2e:tour    # browser test: the welcome tour (build without Supabase keys on :3100)
npm run e2e:steps  # browser test: worked solutions show every step, in both languages (build without Supabase keys on :3100)
npm run e2e:graphs # browser test: interactive graph problems, See it / Try it on the graph (build without Supabase keys on :3100)
npm run e2e:spanish # browser test: Spanish and the language toggle, incl. an English-leak scan of every screen (build without Supabase keys on :3100)
npm run e2e:spanish-accounts # browser test: language on the sign-in screens and saved per learner (build with fake keys)
npm run e2e:sync   # browser test: accounts + sync against a mocked Supabase (see header of e2e/sync.e2e.mjs)
npm run build && npm start
```

## Layout

| Path | What lives there |
| --- | --- |
| `src/app/` | Next.js shell: layout, page, manifest, global + game CSS |
| `src/app/algebra-quest.tsx` | Client component that mounts the game and registers the service worker |
| `src/game/data/` | The 34 topics and the dictionary (content only) |
| `src/game/engine/` | Problem generators, boss tiers, answer-equivalence checker (no DOM) |
| `src/game/sync.js` | Merging device vs. server progress, debounced uploader (no DOM) |
| `src/lib/` | Supabase client and learner/progress queries |
| `src/app/auth-screens.tsx` | Sign-in and "Who's playing?" screens |
| `supabase/migrations/` | Database schema + row-level security |
| `e2e/` | Playwright tests against a mocked Supabase |
| `src/game/engine/mistakes.js` | Spots common slips in a wrong answer (sign, flipped fraction, partial solutions...) |
| `src/game/report.js` | Progress report and recent-activity log (pure logic) |
| `src/game/achievements.js` | Badge catalog, unlock rules and merging (pure logic) |
| `src/game/sound.js` | Synthesized sound effects: note plans and a player (testable with a fake audio device) |
| `src/game/shop.js` | Cosmetics catalog, balance and purchase rules (pure logic) |
| `src/game/daily.js` | Daily Challenge: date-seeded questions, plan and constants (pure logic) |
| `src/game/adaptive.js` | Warm-up trigger and perfect-run rules (pure logic) |
| `src/game/placement.js` | Check-in plan, per-region scoring, suggested start (pure logic) |
| `src/game/review.js` | Spaced-review schedule (Leitner boxes), pure logic |
| `src/game/backup.js` | Export / import of saved progress (no DOM) |
| `src/game/i18n.js` | Language state (`en` / `es`), `L(english, spanish)`, detection, locale for dates |
| `src/game/localize.js` | Switches `TOPICS` and the dictionary between languages in place (loads the Spanish table on demand) |
| `src/game/i18n/content-es.js` | GENERATED English → Spanish table for all topic and dictionary text, built from `translations/content.tsv` |
| `translations/content.tsv` | The Spanish translations of the topic and dictionary text (one `english<TAB>spanish` row per string) |
| `src/game/engine/steps.js` | English builders for fully worked solutions (every step, operations shown on both sides); the generators and Hell Mode problems use them |
| `src/game/step-es.js` | Turns finished English steps into Spanish by lifting out the math and matching the sentence pattern |
| `translations/steps.tsv` | The Spanish sentence patterns for worked steps (`{1}`, `{2}` stand for the math); built into `src/game/i18n/steps-es.js` by `npm run build:steps` |
| `src/game/app.js` | State, screens and rendering (still the original imperative UI, to be split up) |
| `public/themes/` | Theme background art: the six free themes (extracted from the original single file) and the three premium ones (`glam`, `tide`, `holo`, each with a small `-thumb` for the shop) |
| `public/sw.js` | Service worker: pages network-first, static files cache-first |
| `legacy/` | The original single-file HTML, kept for reference and parity checks |

## Languages

The game and the sign-in screens are in English and Dominican Spanish (informal "tú"; numbers use a decimal point and comma thousands, the same as English, so answers never need converting). A learner's choice is saved with their progress (so it follows them between devices); a device remembers its last choice for the sign-in screens, and a new device starts from the browser language.

How it fits together:

- **Interface text** is written inline with `L("English", "Español")`, so the two versions sit side by side.
- **Topic and dictionary text** stays English in `src/game/data/`. `translations/content.tsv` maps every English string to Spanish; `npm run build:content` regenerates `src/game/i18n/content-es.js` from it. `localize.js` rewrites `TOPICS` in place from a pristine English copy when the language changes.
- **Worked steps** (examples, guided steps, step-by-step breakdowns, generated problems) are written in English only, in the style of [docs/step-style.md](docs/step-style.md). `step-es.js` lifts every run of math (numbers, expressions) out of a sentence and looks the sentence pattern up in `translations/steps.tsv`, so "Subtract 3 from BOTH sides." and "Subtract 7 from BOTH sides." share one Spanish sentence. `node scripts/extract-step-patterns.mjs` lists patterns that still need a Spanish version; `npm run build:steps` rebuilds the table.
- **Generated practice problems** use `L()` for the question and answer, and the worked steps come from `steps.js` (translated by pattern, see above). Changing language regenerates any re-rolled practice sets.
- **Answers**: `o` works like `or`, accents are ignored, and Spanish unit words (`millas`, `horas`, `donde`...) are ignored like their English twins. Typed English answers still work.
- **Read-aloud** speaks Spanish with the best Spanish voice on the device (Dominican first when it has one).

When you add or change English text, update `translations/content.tsv` (and `translations/steps.tsv` for worked steps; the tests list anything missing), run `npm run build:content` and `npm run build:steps`, and run `npm test`. `node scripts/extract-content-strings.mjs` lists every string that needs a translation. The Spanish was written for a Dominican audience but has not been reviewed by a native speaker, so terminology feedback is welcome.

## Single-file download

`npm run build:standalone` (after `npx next build`) writes `dist/algebra-quest.html`: the whole game, both languages, fonts and backgrounds in one file that works offline by double-clicking it. There are no accounts or syncing in it; progress is saved in that browser only. A copy is kept at `public/download/algebra-quest.html` (served at `/download/algebra-quest.html`); regenerate and copy it after changing the game.

## Deploying

Import the repo into Vercel (framework: Next.js) and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as **Config** variables for Production. Vercel builds every push to `main`; other branches get preview deployments. Make `main` the repo's default branch.

## Updating

Merge to `main`; the host (Vercel) redeploys. Installed copies pick up the new version the next time they are opened while online. Saved progress lives in the browser (`localStorage`, key `algebraQuestState_v1`), not in the code, so deploys never touch it.

## Roadmap

0. Foundation: Next.js project, split modules, PWA, backup
1. Accounts and synced progress (Supabase), learner profiles (this)
2. Learning engine: spaced review (done), hints and mistake-aware feedback (done), placement check-in (done), gentle adaptive difficulty (done), unlimited question variations
3. Progress report for parents and teachers (done): overview, where to help, recent activity, print / PDF
4. Engagement: daily challenge (done), avatar shop (done), sound (done), achievements (done) (no daily streak, by choice)
5. Accessibility and mobile polish (done); no third-party analytics, by choice, because the learners are children
