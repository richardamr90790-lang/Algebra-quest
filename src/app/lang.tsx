"use client";

import { useSyncExternalStore } from "react";
import { getLang, onLangChange, setLang, rememberDeviceLang, LANG_NAMES } from "@/game/i18n.js";

// Re-renders the calling component whenever the language changes (the screens outside the game read it with L()).
export function useLang(): "en" | "es" {
  return useSyncExternalStore(
    (cb) => onLangChange(cb),
    () => getLang() as "en" | "es",
    () => "en",
  );
}

// Language switch for the screens outside the game (sign-in, who's playing). The game has its own button on its home screen.
export function LangToggle() {
  const lang = useLang();
  const next = lang === "es" ? "en" : "es";
  return (
    <button
      type="button"
      className="shell-link lang-toggle"
      lang={next}
      title={lang === "es" ? "Switch to English" : "Cambiar a español"}
      onClick={() => { setLang(next); rememberDeviceLang(next); }}
    >
      <span aria-hidden="true">{next === "es" ? "🇩🇴" : "🇺🇸"}</span> {LANG_NAMES[next as "en" | "es"]}
    </button>
  );
}

// Supabase returns its error messages in English; translate the common ones, pass the rest through.
export function authMessage(text: string, lang: "en" | "es"): string {
  if (lang !== "es") return text;
  const table: [RegExp, string][] = [
    [/invalid login credentials/i, "Correo o contraseña incorrectos."],
    [/email not confirmed/i, "Todavía no has confirmado tu correo. Revisa tu bandeja de entrada."],
    [/user already registered|already been registered/i, "Ya existe una cuenta con ese correo."],
    [/password should be at least/i, "Usa al menos 6 caracteres."],
    [/rate limit|too many requests|for security purposes/i, "Demasiados intentos. Espera un momento y vuelve a intentarlo."],
    [/failed to fetch|network/i, "No hay conexión. Revisa tu internet e inténtalo de nuevo."],
    [/unable to validate email|invalid email/i, "Ese correo no parece válido."],
    [/new password should be different/i, "La contraseña nueva debe ser distinta de la anterior."],
  ];
  return table.find(([re]) => re.test(text))?.[1] ?? text;
}
