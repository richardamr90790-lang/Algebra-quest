# Algebra Quest

A 9th grade algebra skill-builder: 34 topics across 8 regions, flashcard quests with worked examples and guided practice, XP, streaks, avatars, six themes, read-aloud, a dictionary, and tiered Boss Battles. Problems are generated fresh, with answers built backwards from clean solutions.

Installable on a phone or desktop (PWA) and works offline. Progress is saved in the browser and can be exported to / imported from a file.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine + backup unit tests
npm run build && npm start
```

## Layout

| Path | What lives there |
| --- | --- |
| `src/app/` | Next.js shell: layout, page, manifest, global + game CSS |
| `src/app/algebra-quest.tsx` | Client component that mounts the game and registers the service worker |
| `src/game/data/` | The 34 topics and the dictionary (content only) |
| `src/game/engine/` | Problem generators, boss tiers, answer-equivalence checker (no DOM) |
| `src/game/backup.js` | Export / import of saved progress (no DOM) |
| `src/game/app.js` | State, screens and rendering (still the original imperative UI, to be split up) |
| `public/themes/` | Theme background art (extracted from the original single file) |
| `public/sw.js` | Service worker: pages network-first, static files cache-first |
| `legacy/` | The original single-file HTML, kept for reference and parity checks |

## Updating

Merge to `main`; the host (Vercel) redeploys. Installed copies pick up the new version the next time they are opened while online. Saved progress lives in the browser (`localStorage`, key `algebraQuestState_v1`), not in the code, so deploys never touch it.

## Roadmap

0. Foundation (this): Next.js project, split modules, PWA, backup
1. Accounts and synced progress (Supabase), student profiles
2. Learning engine: typed answers, hints, spaced review, adaptive difficulty, placement quiz
3. Parent/teacher dashboard and reports
4. Engagement: daily challenge, streak freezes, avatar shop, sound
5. Accessibility, mobile polish, analytics
