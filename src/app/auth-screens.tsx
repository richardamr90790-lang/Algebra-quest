"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Learner } from "@/lib/learners";
import { L } from "@/game/i18n.js";
import { LangToggle, authMessage, useLang } from "./lang";

export function SignInScreen({ db, onLocal }: { db: SupabaseClient; onLocal: () => void }) {
  const lang = useLang();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "forgot") {
        // The same message whether or not the address has an account, so this can't be used to find out who does.
        const { error } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg({ kind: "ok", text: L("If that email has an account, a reset link is on its way. Check your inbox (and spam), then open the link on this device.", "Si ese correo tiene una cuenta, te va a llegar un enlace para restablecer la contraseña. Revisa tu bandeja de entrada (y el spam) y abre el enlace en este dispositivo.") });
      } else if (mode === "in") {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await db.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setMsg({ kind: "ok", text: L("Account created. Check your email to confirm it, then sign in.", "Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.") });
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? authMessage(err.message, lang) : L("Something went wrong.", "Algo salió mal.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <div className="shell-card">
        <h1>Algebra Quest</h1>
        <p className="lead">
          {mode === "in" && L("Sign in to save progress to your account.", "Inicia sesión para guardar el progreso en tu cuenta.")}
          {mode === "up" && L("Create a parent account. Each learner gets their own profile.", "Crea una cuenta de padre o madre. Cada estudiante tiene su propio perfil.")}
          {mode === "forgot" && L("Enter your email and we'll send a link to choose a new password.", "Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.")}
        </p>
        <form onSubmit={submit}>
          <label htmlFor="aq-email">{L("Email", "Correo electrónico")}</label>
          <input id="aq-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "forgot" && (
            <>
              <label htmlFor="aq-pass">{L("Password", "Contraseña")}</label>
              <input
                id="aq-pass"
                type="password"
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}
          <button className="shell-btn" disabled={busy}>
            {busy ? L("Please wait…", "Espera un momento…") : mode === "in" ? L("Sign in", "Iniciar sesión") : mode === "up" ? L("Create account", "Crear cuenta") : L("Send reset link", "Enviar enlace")}
          </button>
        </form>
        {msg && <div className={`shell-msg ${msg.kind}`} role="status">{msg.text}</div>}
        <div className="shell-row">
          <button className="shell-link" type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
            {mode === "in" ? L("Create an account", "Crear una cuenta") : L("I already have an account", "Ya tengo una cuenta")}
          </button>
          {mode === "in" && (
            <button className="shell-link" type="button" onClick={() => { setMode("forgot"); setMsg(null); }}>{L("Forgot password?", "¿Olvidaste tu contraseña?")}</button>
          )}
          <button className="shell-link" type="button" onClick={onLocal}>{L("Play without an account", "Jugar sin cuenta")}</button>
          <LangToggle />
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
  useLang();
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
        <h1>{L("Who's playing?", "¿Quién va a jugar?")}</h1>
        <p className="lead">{learners.length ? L("Pick a player to continue.", "Elige un jugador para continuar.") : L("Add your first learner to get started.", "Agrega a tu primer estudiante para empezar.")}</p>
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
                aria-label={confirmId === l.id ? L(`Confirm delete ${l.name}`, `Confirmar eliminar a ${l.name}`) : L(`Delete ${l.name}`, `Eliminar a ${l.name}`)}
                onClick={async () => {
                  if (confirmId !== l.id) return setConfirmId(l.id);
                  await onDelete(l);
                  setConfirmId(null);
                }}
              >
                {confirmId === l.id ? L("Delete?", "¿Eliminar?") : "✕"}
              </button>
            </li>
          ))}
        </ul>
        {adding ? (
          <form onSubmit={add}>
            <label htmlFor="aq-learner">{L("Learner's name", "Nombre del estudiante")}</label>
            <input id="aq-learner" type="text" maxLength={24} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            {hasDeviceProgress && (
              <label className="shell-check" style={{ fontSize: 14 }}>
                <input type="checkbox" checked={bring} onChange={(e) => setBring(e.target.checked)} />
                {L("Bring the progress already saved on this device into this profile", "Traer a este perfil el progreso ya guardado en este dispositivo")}
              </label>
            )}
            <button className="shell-btn" disabled={busy || !name.trim()}>{busy ? L("Adding…", "Agregando…") : L("Add learner", "Agregar estudiante")}</button>
          </form>
        ) : (
          <button className="shell-btn secondary" onClick={() => setAdding(true)}>{L("+ Add a learner", "+ Agregar un estudiante")}</button>
        )}
        <div className="shell-row">
          <button className="shell-link" onClick={onSignOut}>{L("Sign out", "Cerrar sesión")}</button>
          <LangToggle />
        </div>
      </div>
    </main>
  );
}

// Shown after someone opens the reset link from their email: they are signed in with a short-lived
// recovery session and choose a new password.
export function RecoveryScreen({ db, onDone, onBack }: { db: SupabaseClient; onDone: () => void; onBack: () => void }) {
  const lang = useLang();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) return setMsg(L("Use at least 6 characters.", "Usa al menos 6 caracteres."));
    if (password !== confirm) return setMsg(L("The two passwords don't match.", "Las dos contraseñas no coinciden."));
    setBusy(true);
    try {
      const { error } = await db.auth.updateUser({ password });
      if (error) throw error;
      onDone();
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      setMsg(/session/i.test(text) ? L("That reset link has expired or was already used. Go back and ask for a new one.", "Ese enlace ya venció o ya se usó. Regresa y pide uno nuevo.") : authMessage(text, lang) || L("Something went wrong. Please try again.", "Algo salió mal. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <div className="shell-card">
        <h1>{L("Choose a new password", "Elige una contraseña nueva")}</h1>
        <p className="lead">{L("Pick something you'll remember. You'll stay signed in on this device.", "Elige algo que recuerdes. Seguirás con la sesión abierta en este dispositivo.")}</p>
        <form onSubmit={submit}>
          <label htmlFor="aq-newpass">{L("New password", "Contraseña nueva")}</label>
          <input id="aq-newpass" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          <label htmlFor="aq-newpass2">{L("Type it again", "Escríbela otra vez")}</label>
          <input id="aq-newpass2" type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="shell-btn" disabled={busy}>{busy ? L("Saving…", "Guardando…") : L("Save new password", "Guardar contraseña nueva")}</button>
        </form>
        {msg && <div className="shell-msg err" role="alert">{msg}</div>}
        <div className="shell-row">
          <button className="shell-link" type="button" onClick={onBack}>{L("Back to sign in", "Volver a iniciar sesión")}</button>
        </div>
      </div>
    </main>
  );
}
