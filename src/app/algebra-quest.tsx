"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { backendEnabled, getSupabase } from "@/lib/supabase";
import {
  createLearner,
  deleteLearner,
  listLearners,
  loadProgress,
  saveProgress,
  type GameState,
  type Learner,
} from "@/lib/learners";
import { createPusher, mergeState, sameProgress } from "@/game/sync.js";
import { LearnerPicker, RecoveryScreen, SignInScreen } from "./auth-screens";
import { L, deviceLang, setLang } from "@/game/i18n.js";
import { useLang } from "./lang";

// The game is an imperative DOM app (src/game/app.js). It renders into #app and
// #confettiCanvas, so it is loaded in the browser after those elements exist.
const loadGame = () => import("@/game/app.js");

type Screen =
  | { name: "loading" }
  | { name: "signin" }
  | { name: "picker" }
  | { name: "recovery" } // opened from a password-reset email
  | { name: "playing"; learner: Learner | null }; // null = local-only play on this device
type SyncStatus = "saved" | "saving" | "offline";

const learnerKey = (userId: string, learnerId: string) => `aq:${userId}:${learnerId}`;

export default function AlgebraQuest() {
  useLang();
  const db = getSupabase();
  const [screen, setScreen] = useState<Screen>(backendEnabled ? { name: "loading" } : { name: "playing", learner: null });
  const [session, setSession] = useState<Session | null>(null);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>("saved");
  const pusherRef = useRef<ReturnType<typeof createPusher> | null>(null);
  const activeRef = useRef<{ userId: string; learner: Learner } | null>(null);
  // Set while someone is choosing a new password, so the sign-in events that come with the reset link
  // don't whisk them off to the "Who's playing?" screen.
  const recoveringRef = useRef(false);

  // Start in the language this device last used (or the browser's); a signed-in learner's own choice takes over once loaded.
  useEffect(() => {
    setLang(deviceLang());
  }, []);

  // The sign-in screens always use the light look (the learner's own theme applies once they are playing).
  useEffect(() => {
    if (screen.name !== "playing") document.documentElement.setAttribute("data-theme", "clean");
  }, [screen.name]);

  // Offline support (installed app / no connection).
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // No backend configured: behave exactly like the original single-device app.
  useEffect(() => {
    if (backendEnabled) return;
    loadGame().then((g) => g.loadLearner({ key: g.LEGACY_STORAGE_KEY }));
  }, []);

  // Track the signed-in parent.
  useEffect(() => {
    if (!db) return;
    let alive = true;
    db.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (recoveringRef.current) return;
      setScreen((s) => (s.name === "loading" ? { name: data.session ? "picker" : "signin" } : s));
    });
    const { data: sub } = db.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") {
        recoveringRef.current = true;
        setScreen({ name: "recovery" });
        return;
      }
      if (recoveringRef.current) return;
      if (!next) {
        setScreen((s) => (s.name === "playing" && s.learner === null ? s : { name: "signin" }));
      } else {
        setScreen((s) => (s.name === "signin" || s.name === "loading" ? { name: "picker" } : s));
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [db]);

  // Load the learner list whenever the picker is shown.
  useEffect(() => {
    if (!db || screen.name !== "picker" || !session) return;
    let alive = true;
    listLearners(db).then(
      (rows) => { if (alive) { setLearners(rows); setPickerError(null); } },
      () => { if (alive) setPickerError(L("Couldn't load your learners. Check your connection and try again.", "No se pudieron cargar tus estudiantes. Revisa tu conexión e inténtalo de nuevo.")); },
    );
    return () => { alive = false; };
  }, [db, screen.name, session]);

  const stopSync = useCallback(async () => {
    const p = pusherRef.current;
    pusherRef.current = null;
    activeRef.current = null;
    if (p) await p.flush().catch(() => {});
  }, []);

  const startLearner = useCallback(
    async (learner: Learner) => {
      if (!db || !session) return;
      const userId = session.user.id;
      const game = await loadGame();
      await stopSync();

      const key = learnerKey(userId, learner.id);
      const local = game.readLocalState(key) as GameState | null;
      let remote: GameState | null = null;
      let reachable = true;
      try {
        remote = await loadProgress(db, learner.id);
      } catch {
        reachable = false;
      }

      let merged = mergeState(local, remote) as GameState | null;
      if (!merged) merged = { name: learner.name };

      const pusher = createPusher(async (state: GameState) => {
        setStatus("saving");
        try {
          await saveProgress(db, learner.id, state);
          setStatus("saved");
        } catch (err) {
          setStatus("offline");
          throw err;
        }
      });
      pusherRef.current = pusher;
      activeRef.current = { userId, learner };

      game.loadLearner({ key, initial: merged, onSave: (s: GameState) => pusher.schedule({ ...s }) });
      setScreen({ name: "playing", learner });
      if (!reachable) setStatus("offline");
      if (reachable && !sameProgress(merged, remote)) pusher.schedule({ ...merged });
      if (!reachable) pusher.schedule({ ...merged });
    },
    [db, session, stopSync],
  );

  // While playing: pull in changes from other devices when the tab regains focus,
  // and push anything pending when the tab is hidden or closed.
  useEffect(() => {
    if (screen.name !== "playing" || !screen.learner || !db) return;
    const learner = screen.learner;
    const onVisibility = async () => {
      if (document.visibilityState === "hidden") {
        pusherRef.current?.flush().catch(() => {});
        return;
      }
      try {
        const remote = await loadProgress(db, learner.id);
        if (!remote || pusherRef.current?.hasPending()) return;
        const game = await loadGame();
        const merged = mergeState(game.currentState(), remote) as GameState;
        if (!sameProgress(merged, game.currentState())) game.applyRemoteState(merged);
        if (!sameProgress(merged, remote)) pusherRef.current?.schedule({ ...merged });
        else setStatus("saved");
      } catch {
        setStatus("offline");
      }
    };
    const onHide = () => pusherRef.current?.flush().catch(() => {});
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [screen, db]);

  async function playLocal() {
    const game = await loadGame();
    await stopSync();
    game.loadLearner({ key: game.LEGACY_STORAGE_KEY });
    setScreen({ name: "playing", learner: null });
  }

  async function switchPlayer() {
    await stopSync();
    setScreen(session ? { name: "picker" } : { name: "signin" });
  }

  async function signOut() {
    await stopSync();
    await db?.auth.signOut();
    setScreen({ name: "signin" });
  }

  async function onCreate(name: string, bringDeviceProgress: boolean) {
    if (!db) return;
    try {
      const game = await loadGame();
      const initial = bringDeviceProgress ? ((game.readLocalState(game.LEGACY_STORAGE_KEY) as GameState | null) ?? undefined) : undefined;
      const seeded = initial ? { ...initial, name: initial.name || name.trim() } : undefined;
      const learner = await createLearner(db, name, seeded);
      setLearners((l) => [...l, learner]);
      await startLearner(learner);
    } catch {
      setPickerError(L("Couldn't add that learner. Check your connection and try again.", "No se pudo agregar a ese estudiante. Revisa tu conexión e inténtalo de nuevo."));
    }
  }

  async function onDelete(l: Learner) {
    if (!db) return;
    try {
      await deleteLearner(db, l.id);
      try { localStorage.removeItem(learnerKey(session!.user.id, l.id)); } catch {}
      setLearners((all) => all.filter((x) => x.id !== l.id));
    } catch {
      setPickerError(L("Couldn't delete that learner. Try again.", "No se pudo eliminar a ese estudiante. Inténtalo de nuevo."));
    }
  }

  const playing = screen.name === "playing";
  const [hasDeviceProgress, setHasDeviceProgress] = useState(false);
  useEffect(() => {
    if (screen.name !== "picker") return;
    loadGame().then((g) => {
      const s = g.readLocalState(g.LEGACY_STORAGE_KEY) as GameState | null;
      setHasDeviceProgress(!!s && (Number(s.xp) > 0 || Object.values((s.mastered as object) ?? {}).some((v) => Array.isArray(v) && v.length > 0)));
    });
  }, [screen.name]);

  return (
    <>
      {screen.name === "signin" && db && <SignInScreen db={db} onLocal={playLocal} />}
      {screen.name === "recovery" && db && (
        <RecoveryScreen
          db={db}
          onDone={() => {
            recoveringRef.current = false;
            window.history.replaceState(null, "", window.location.pathname);
            setScreen({ name: "picker" });
          }}
          onBack={async () => {
            recoveringRef.current = false;
            window.history.replaceState(null, "", window.location.pathname);
            await db.auth.signOut();
            setScreen({ name: "signin" });
          }}
        />
      )}
      {screen.name === "picker" && (
        <LearnerPicker
          learners={learners}
          error={pickerError}
          hasDeviceProgress={hasDeviceProgress}
          onPick={startLearner}
          onCreate={onCreate}
          onDelete={onDelete}
          onSignOut={signOut}
        />
      )}
      {playing && backendEnabled && (
        <nav className="accountbar" aria-label={L("Account", "Cuenta")}>
          {screen.learner ? (
            <>
              <span className="who">👤 {screen.learner.name}</span>
              <span className={`sync ${status === "saved" ? "ok" : status === "offline" ? "bad" : ""}`} role="status">
                {status === "saved" ? L("✓ Saved", "✓ Guardado") : status === "saving" ? L("Saving…", "Guardando…") : L("Offline · will sync", "Sin conexión · se sincronizará")}
              </span>
              <button className="shell-link" onClick={switchPlayer}>{L("Switch player", "Cambiar de jugador")}</button>
              <button className="shell-link" onClick={signOut}>{L("Sign out", "Cerrar sesión")}</button>
            </>
          ) : (
            <>
              <span className="who">{L("Playing on this device only", "Jugando solo en este dispositivo")}</span>
              <button className="shell-link" onClick={switchPlayer}>{L("Sign in to sync", "Inicia sesión para sincronizar")}</button>
            </>
          )}
        </nav>
      )}
      {/* Screen readers: the game announces results here (see announce() in src/game/app.js). */}
      <div id="srAnnounce" className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <main id="app" hidden={!playing} />
      <canvas id="confettiCanvas" hidden={!playing} aria-hidden="true" />
    </>
  );
}
