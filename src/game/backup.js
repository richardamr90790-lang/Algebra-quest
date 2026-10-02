// Progress backup: export the saved state as a JSON file and read one back.
// Pure functions only (no DOM) so they can be unit tested.

export const BACKUP_APP = "algebra-quest";
export const BACKUP_VERSION = 1;

export function serializeBackup(state, now = new Date()) {
  return JSON.stringify(
    { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), state },
    null,
    2,
  );
}

export function backupFileName(state, now = new Date()) {
  const who = String(state.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `algebra-quest-${who ? who + "-" : ""}${now.toISOString().slice(0, 10)}.json`;
}

// Returns a full state object (missing fields filled from `defaults`) or throws
// an Error with a message that is safe to show to the learner.
export function parseBackup(text, defaults) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a valid Algebra Quest backup.");
  }
  if (!data || data.app !== BACKUP_APP || typeof data.state !== "object" || data.state === null) {
    throw new Error("That file isn't an Algebra Quest backup.");
  }
  if (typeof data.version !== "number" || data.version > BACKUP_VERSION) {
    throw new Error("This backup was made by a newer version of Algebra Quest.");
  }
  const s = data.state;
  if (typeof s.xp !== "number" || !Number.isFinite(s.xp) || s.xp < 0) {
    throw new Error("The backup's progress data looks damaged.");
  }
  if (typeof s.mastered !== "object" || s.mastered === null || Array.isArray(s.mastered)) {
    throw new Error("The backup's progress data looks damaged.");
  }
  return Object.assign({}, defaults, s);
}
