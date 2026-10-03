// The welcome tour shown to a learner the first time they play (and from the ❓ button any time).
// Pure data and rules, no DOM.
import { L } from "./i18n.js";

// Only brand-new learners get it automatically: no XP, nothing mastered, no sessions played.
export function shouldAutoShowTour(state) {
  if (!state || state.tourDone) return false;
  const mastered = Object.values(state.mastered || {}).some((v) => Array.isArray(v) && v.length > 0);
  return !(state.xp > 0) && !mastered && !(Array.isArray(state.activity) && state.activity.length);
}

export function tourSlides() {
  return [
    { icon: "👋", title: L("Welcome to Algebra Quest!", "¡Bienvenido a Algebra Quest!"),
      text: L("34 algebra topics across 8 regions. Tap any topic card on the map to start. You can go in any order, but the ⭐ Start here card and the order on the map are a good path.",
              "34 temas de álgebra en 8 regiones. Toca cualquier tarjeta del mapa para empezar. Puedes ir en el orden que quieras, pero la tarjeta ⭐ Empieza aquí y el orden del mapa son un buen camino.") },
    { icon: "📘", title: L("How a topic works", "Cómo funciona un tema"),
      text: L("First the key terms, then worked examples, then guided practice with fill-in-the-blanks, then problems on your own. Stuck? 💡 Need a hint? shows the rule, then the first step. The 🔊 button reads any question aloud.",
              "Primero los términos clave, luego ejemplos resueltos, después práctica guiada con espacios en blanco y por último problemas tú solo. ¿Atascado? 💡 ¿Necesitas una pista? te muestra la regla y luego el primer paso. El botón 🔊 lee cualquier pregunta en voz alta.") },
    { icon: "⭐", title: L("XP, levels and badges", "XP, niveles e insignias"),
      text: L("Right answers earn XP, and every 100 XP is a new level. Your level never goes down. 🏅 Badges unlock as you hit milestones, like your first topic mastered or a 10-in-a-row streak.",
              "Las respuestas correctas ganan XP y cada 100 XP es un nivel nuevo. Tu nivel nunca baja. Las 🏅 insignias se desbloquean con logros, como dominar tu primer tema o acertar 10 seguidas.") },
    { icon: "🔁", title: L("Daily Review and Daily Challenge", "Repaso diario y Reto diario"),
      text: L("Daily Review brings back topics right when you are about to forget them, so they stick. The ⭐ Daily Challenge is 5 mixed questions that are the same for everyone today, with bonus XP.",
              "El Repaso diario te trae de vuelta los temas justo cuando los ibas a olvidar, para que se te queden. El ⭐ Reto diario son 5 preguntas variadas, las mismas para todos hoy, con XP de bono.") },
    { icon: "🧭", title: L("Not sure where to start?", "¿No sabes por dónde empezar?"),
      text: L("The 🧭 Check-in asks 2 quick questions from each area (no hints, no XP, nothing graded) and shows you where to begin and what needs work.",
              "El 🧭 Chequeo te hace 2 preguntas rápidas de cada área (sin pistas, sin XP y nada se califica) y te muestra por dónde empezar y qué necesita trabajo.") },
    { icon: "⚔️", title: L("Boss Battles", "Batallas de jefe"),
      text: L("Ready for a challenge? Pick a difficulty from Easy to Hell Mode. Every battle mixes fresh questions, so no two are the same. 🎲 on a topic card gives you new practice problems for it.",
              "¿Listo para un reto? Elige una dificultad, de Fácil a Modo Infierno. Cada batalla mezcla preguntas nuevas, así que nunca hay dos iguales. El 🎲 de una tarjeta te da problemas de práctica nuevos para ese tema.") },
    { icon: "🛍️", title: L("Shop and looks", "Tienda y estilos"),
      text: L("Spend XP in the 🛍️ Shop on new characters, avatar frames and premium themes. Change the look any time with the Theme button, and pick your character by tapping the badge at the top.",
              "Gasta XP en la 🛍️ Tienda en personajes nuevos, marcos de avatar y temas premium. Cambia el estilo cuando quieras con el botón Tema y elige tu personaje tocando la insignia de arriba.") },
    { icon: "📊", title: L("For parents and teachers", "Para padres y maestros"),
      text: L("📊 Report shows progress by area, where to help and recent activity, and can be printed or saved as a PDF. 📖 Dictionary is a quick reference for every term and formula.",
              "📊 Informe muestra el progreso por área, dónde ayudar y la actividad reciente, y se puede imprimir o guardar como PDF. 📖 Diccionario es una referencia rápida de cada término y fórmula.") },
    { icon: "🌎", title: L("Your way", "A tu manera"),
      text: L("Switch between English and Español with the flag button. Sound effects can be muted. Your progress is saved on this device, and with an account it follows you everywhere. Tap ❓ Tour any time to see this again.",
              "Cambia entre English y Español con el botón de la bandera. Los efectos de sonido se pueden silenciar. Tu progreso se guarda en este dispositivo y, con una cuenta, te sigue a todas partes. Toca ❓ Guía cuando quieras para verla otra vez.") },
  ];
}
