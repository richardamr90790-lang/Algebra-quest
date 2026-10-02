import type { SupabaseClient } from "@supabase/supabase-js";

export type Learner = { id: string; name: string };
// The game's saved state is a loose JSON object (see src/game/app.js defaultState).
export type GameState = Record<string, unknown> & { updatedAt?: number };

export async function listLearners(db: SupabaseClient): Promise<Learner[]> {
  const { data, error } = await db.from("learners").select("id,name").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createLearner(db: SupabaseClient, name: string, initial?: GameState): Promise<Learner> {
  const { data, error } = await db.from("learners").insert({ name: name.trim() }).select("id,name").single();
  if (error) throw error;
  const learner = data as Learner;
  if (initial) await saveProgress(db, learner.id, initial);
  return learner;
}

export async function renameLearner(db: SupabaseClient, id: string, name: string) {
  const { error } = await db.from("learners").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

export async function deleteLearner(db: SupabaseClient, id: string) {
  const { error } = await db.from("learners").delete().eq("id", id);
  if (error) throw error;
}

export async function loadProgress(db: SupabaseClient, learnerId: string): Promise<GameState | null> {
  const { data, error } = await db.from("progress").select("state").eq("learner_id", learnerId).maybeSingle();
  if (error) throw error;
  const state = data?.state as GameState | undefined;
  return state && Object.keys(state).length ? state : null;
}

export async function saveProgress(db: SupabaseClient, learnerId: string, state: GameState) {
  const { error } = await db.from("progress").upsert({ learner_id: learnerId, state }, { onConflict: "learner_id" });
  if (error) throw error;
}
