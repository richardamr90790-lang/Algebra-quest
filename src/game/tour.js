// The welcome tour shown to a learner the first time they play (and from the ❓ button any time).
// Pure data and rules, no DOM.
import { L } from "./i18n.js";

// Only brand-new learners get it automatically: no XP, nothing mastered, no sessions played.
export function shouldAutoShowTour(state) {
  if (!state || state.tourDone) return false;
  const mastered = Object.values(state.mastered || {}).some((v) => Array.isArray(v) && v.length > 0);
  return !(state.xp > 0) && !mastered && !(Array.isArray(state.activity) && state.activity.length);
}

// Each step may point at a real element on the home screen (`target` is a CSS selector); the tour highlights it.
// Steps without a target, or whose element isn't on screen, show centred.
export function tourSlides() {
  return [
    { icon: "👋", title: L("Welcome to Algebra Quest!", "¡Bienvenido a Algebra Quest!"),
      text: L("Let's take a quick look around. We'll point at each part of the screen. You can skip any time.",
              "Vamos a dar una vuelta rápida. Te iremos señalando cada parte de la pantalla. Puedes saltar cuando quieras.") },
    { icon: "📘", target: ".topic-card", title: L("Topics", "Temas"),
      text: L("34 algebra topics in 8 regions. Tap a card to start. First the key terms, then worked examples, then guided practice and problems on your own. 💡 gives hints and 🔊 reads questions aloud. ↻ resets a topic and 🎲 gives new practice problems.",
              "34 temas de álgebra en 8 regiones. Toca una tarjeta para empezar. Primero los términos clave, luego ejemplos resueltos, después práctica guiada y problemas tú solo. 💡 da pistas y 🔊 lee las preguntas en voz alta. ↻ reinicia un tema y 🎲 da problemas de práctica nuevos.") },
    { icon: "⭐", target: ".xpbar-wrap", title: L("XP and levels", "XP y niveles"),
      text: L("Right answers earn XP, and every 100 XP is a new level. Your level never goes down. The 🔥 counts your answers in a row.",
              "Las respuestas correctas ganan XP y cada 100 XP es un nivel nuevo. Tu nivel nunca baja. El 🔥 cuenta tus respuestas seguidas.") },
    { icon: "🏅", target: "#badgesBtn", title: L("Badges", "Insignias"),
      text: L("Badges unlock as you hit milestones, like mastering your first topic or getting 10 right in a row.",
              "Las insignias se desbloquean con logros, como dominar tu primer tema o acertar 10 seguidas.") },
    { icon: "🔁", target: ".daily-card", title: L("Daily Challenge and Review", "Reto diario y Repaso"),
      text: L("The ⭐ Daily Challenge is 5 mixed questions, the same for everyone today, with bonus XP. A 🔁 Daily Review card appears here when a topic is ready to be revisited, right before you'd forget it.",
              "El ⭐ Reto diario son 5 preguntas variadas, las mismas para todos hoy, con XP de bono. Aquí aparece una tarjeta de 🔁 Repaso diario cuando un tema toca repasarse, justo antes de que lo olvides.") },
    { icon: "🧭", target: "#placementBtn", title: L("Check-in", "Chequeo"),
      text: L("Not sure where to start? The check-in asks 2 quick questions from each area (no hints, no XP, nothing graded) and shows where to begin and what needs work.",
              "¿No sabes por dónde empezar? El chequeo hace 2 preguntas rápidas de cada área (sin pistas, sin XP y nada se califica) y muestra por dónde empezar y qué necesita trabajo.") },
    { icon: "⚔️", target: "#bossBtn", title: L("Boss Battles", "Batallas de jefe"),
      text: L("Ready for a challenge? Pick a difficulty from Easy to Hell Mode. Every battle mixes fresh questions, so no two are the same.",
              "¿Listo para un reto? Elige una dificultad, de Fácil a Modo Infierno. Cada batalla mezcla preguntas nuevas, así que nunca hay dos iguales.") },
    { icon: "🛍️", target: "#shopBtn", title: L("Shop", "Tienda"),
      text: L("Spend XP on new characters, avatar frames and premium themes. Change the look any time with the Theme button, and pick your character by tapping the badge at the top.",
              "Gasta XP en personajes nuevos, marcos de avatar y temas premium. Cambia el estilo cuando quieras con el botón Tema y elige tu personaje tocando la insignia de arriba.") },
    { icon: "📊", target: "#reportBtn", title: L("For parents and teachers", "Para padres y maestros"),
      text: L("The report shows progress by area, where to help and recent activity, and can be printed or saved as a PDF. Next to it, 📖 Dictionary is a quick reference for every term and formula.",
              "El informe muestra el progreso por área, dónde ayudar y la actividad reciente, y se puede imprimir o guardar como PDF. Junto a él, 📖 Diccionario es una referencia rápida de cada término y fórmula.") },
    { icon: "🌎", target: "#langBtn", title: L("Language and sound", "Idioma y sonido"),
      text: L("Switch between English and Español here. The sound button turns the effects on or off. Progress is saved on this device, and with an account it follows you everywhere.",
              "Cambia entre English y Español aquí. El botón de sonido activa o desactiva los efectos. El progreso se guarda en este dispositivo y, con una cuenta, te sigue a todas partes.") },
    { icon: "❓", target: "#tourBtn", title: L("That's the tour!", "¡Eso es todo!"),
      text: L("Tap ❓ Tour any time to see this again. Have fun!", "Toca ❓ Guía cuando quieras para verla otra vez. ¡Diviértete!") },
  ];
}
