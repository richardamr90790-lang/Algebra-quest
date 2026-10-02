"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Learner } from "@/lib/learners";

export function SignInScreen({ db, onLocal }: { db: SupabaseClient; onLocal: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await db.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setMsg({ kind: "ok", text: "Account created. Check your email to confirm it, then sign in." });
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <div className="shell-card">
        <h1>Algebra Quest</h1>
        <p className="lead">{mode === "in" ? "Sign in to save progress to your account." : "Create a parent account. Each learner gets their own profile."}</p>
        <form onSubmit={submit}>
          <label htmlFor="aq-email">Email</label>
          <input id="aq-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="aq-pass">Password</label>
          <input
            id="aq-pass"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="shell-btn" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
        </form>
        {msg && <div className={`shell-msg ${msg.kind}`} role="status">{msg.text}</div>}
        <div className="shell-row">
          <button className="shell-link" type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
            {mode === "in" ? "Create an account" : "I already have an account"}
          </button>
          <button className="shell-link" type="button" onClick={onLocal}>Play without an account</button>
        </div>
      </div>
    </main>
  );
}

export function LearnerPicker({
  learners,
  error,
  hasDeviceProgress,
  onPick,
  onCreate,
  onDelete,
  onSignOut,
}: {
  learners: Learner[];
  error: string | null;
  hasDeviceProgress: boolean;
  onPick: (l: Learner) => void;
  onCreate: (name: string, bringDeviceProgress: boolean) => Promise<void>;
  onDelete: (l: Learner) => Promise<void>;
  onSignOut: () => void;
}) {
  const [name, setName] = useState("");
  const [bring, setBring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [adding, setAdding] = useState(learners.length === 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate(name, hasDeviceProgress && bring);
      setName("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <div className="shell-card">
        <h1>Who&apos;s playing?</h1>
        <p className="lead">{learners.length ? "Pick a player to continue." : "Add your first learner to get started."}</p>
        {error && <div className="shell-msg err" role="alert">{error}</div>}
        <ul className="learner-list">
          {learners.map((l) => (
            <li key={l.id} className="learner-item">
              <button className="learner-btn" onClick={() => onPick(l)}>
                <span className="learner-avatar" aria-hidden>{l.name.slice(0, 1).toUpperCase()}</span>
                {l.name}
              </button>
              <button
                className="learner-del"
                aria-label={confirmId === l.id ? `Confirm delete ${l.name}` : `Delete ${l.name}`}
                onClick={async () => {
                  if (confirmId !== l.id) return setConfirmId(l.id);
                  await onDelete(l);
                  setConfirmId(null);
                }}
              >
                {confirmId === l.id ? "Delete?" : "✕"}
              </button>
            </li>
          ))}
        </ul>
        {adding ? (
          <form onSubmit={add}>
            <label htmlFor="aq-learner">Learner&apos;s name</label>
            <input id="aq-learner" type="text" maxLength={24} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            {hasDeviceProgress && (
              <label className="shell-check" style={{ fontSize: 14 }}>
                <input type="checkbox" checked={bring} onChange={(e) => setBring(e.target.checked)} />
                Bring the progress already saved on this device into this profile
              </label>
            )}
            <button className="shell-btn" disabled={busy || !name.trim()}>{busy ? "Adding…" : "Add learner"}</button>
          </form>
        ) : (
          <button className="shell-btn secondary" onClick={() => setAdding(true)}>+ Add a learner</button>
        )}
        <div className="shell-row">
          <button className="shell-link" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </main>
  );
}
