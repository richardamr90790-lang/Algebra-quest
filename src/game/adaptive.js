// Gentle, behind-the-scenes adaptation. Pure functions, no DOM.
//
// - Struggling: after MISSES_FOR_WARMUP misses in a row on real practice problems, the next
//   problem is a warm-up (a fresh problem with the hints already open that doesn't count
//   against mastery). At most MAX_WARMUPS per session so a hard day doesn't turn into a slog.
// - Cruising: a perfect run (all right, no hints, no retries) pushes the next review further out.

export const MISSES_FOR_WARMUP = 2;
export const MAX_WARMUPS = 3;

export function shouldInsertWarmup({ missStreak, warmupsUsed, problemsLeft }) {
  return missStreak >= MISSES_FOR_WARMUP && warmupsUsed < MAX_WARMUPS && problemsLeft > 0;
}

// Only real practice problems feed the miss streak; warm-ups reset it so the learner gets a fresh start.
export function nextMissStreak(prev, { correct, warmup }) {
  if (warmup || correct) return 0;
  return prev + 1;
}

// results: [{correct, hinted, attempts}] for the real (non-warm-up) practice problems.
export function isPerfectRun(results) {
  return results.length > 0 && results.every((r) => r.correct && !r.hinted && r.attempts <= 1);
}
