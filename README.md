# Algebra Quest

A 9th grade algebra skill-builder: 34 topics across 8 regions, flashcard quests with worked examples and guided practice, XP, streaks, avatars, six themes, read-aloud, a dictionary, and tiered Boss Battles. Problems are generated fresh, with answers built backwards from clean solutions.

Installable on a phone or desktop (PWA) and works offline. Progress is saved in the browser and can be exported to / imported from a file. With a Supabase project connected (see [docs/supabase-setup.md](docs/supabase-setup.md)), a parent signs in, adds learner profiles, and each learner's progress syncs across devices.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine, backup and sync unit tests
npm run e2e:local  # browser test: offline, backup (build without Supabase keys on :3100)
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
| `src/game/backup.js` | Export / import of saved progress (no DOM) |
| `src/game/app.js` | State, screens and rendering (still the original imperative UI, to be split up) |
| `public/themes/` | Theme background art (extracted from the original single file) |
| `public/sw.js` | Service worker: pages network-first, static files cache-first |
| `legacy/` | The original single-file HTML, kept for reference and parity checks |

## Deploying

Import the repo into Vercel (framework: Next.js) and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as **Config** variables for Production. Vercel builds every push to `main`; other branches get preview deployments. Make `main` the repo's default branch.

## Updating

Merge to `main`; the host (Vercel) redeploys. Installed copies pick up the new version the next time they are opened while online. Saved progress lives in the browser (`localStorage`, key `algebraQuestState_v1`), not in the code, so deploys never touch it.

## Roadmap

0. Foundation: Next.js project, split modules, PWA, backup
1. Accounts and synced progress (Supabase), learner profiles (this)
2. Learning engine: typed answers, hints, spaced review, adaptive difficulty, placement quiz
3. Parent/teacher dashboard and reports
4. Engagement: daily challenge, streak freezes, avatar shop, sound
5. Accessibility, mobile polish, analytics
