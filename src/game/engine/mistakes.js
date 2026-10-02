// Spot the kind of slip in a wrong typed answer so the feedback can say more than
// "not quite". Pure functions, no DOM. Only ever called after the answer was judged
// wrong, and it only returns something when it is fairly sure; otherwise null.
import { canonicalClauses, clauseEquals, parseNumeric } from "./equivalence.js";
import { L } from "../i18n.js";

// Split an expression into its signed terms: "x²-5x+6" -> ["x²", "-5x", "+6"].
function terms(clause) {
  return clause.split(/(?=[+-])/).filter(Boolean);
}
const unsigned = (t) => t.replace(/^[+-]/, "");

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const rest = b.slice();
  for (const x of a) {
    const i = rest.indexOf(x);
    if (i === -1) return false;
    rest.splice(i, 1);
  }
  return true;
}

export function diagnoseMistake(userRaw, correctRaw) {
  if (!userRaw || !userRaw.trim() || !correctRaw) return null;
  const user = canonicalClauses(userRaw);
  const right = canonicalClauses(correctRaw);
  if (!user.length || !right.length) return null;

  // Several solutions expected: did they give only some, or add ones that don't belong?
  const covered = (list, other) => list.every((c) => other.some((o) => clauseEquals(c, o)));
  if (right.length > 1 && user.length < right.length && covered(user, right)) {
    return { kind: "partial", message: L(`That's one correct answer, but this problem has ${right.length}. Can you find the other${right.length > 2 ? "s" : ""}?`, `Esa es una respuesta correcta, pero este problema tiene ${right.length}. ¿Puedes encontrar ${right.length > 2 ? "las otras" : "la otra"}?`) };
  }
  if (user.length > right.length && covered(right, user)) {
    return { kind: "extra", message: L("Your list includes everything it needs, plus something that doesn't belong. Plug each one back in to check.", "Tu lista incluye todo lo necesario, más algo que no va. Sustituye cada una en la ecuación para comprobar.") };
  }
  if (user.length !== right.length) return null;

  // All numeric (single answer or a list of them).
  const un = user.map(parseNumeric);
  const rn = right.map(parseNumeric);
  if (un.every((n) => n !== null) && rn.every((n) => n !== null)) {
    if (user.length === 1) {
      const [u] = un, [r] = rn;
      if (r !== 0 && Math.abs(u + r) < 1e-9) return { kind: "sign", message: L("So close! Check your signs. Your answer is the opposite of the right one.", "¡Casi! Revisa tus signos. Tu respuesta es la opuesta de la correcta.") };
      if (u !== 0 && r !== 0 && Math.abs(u * r - 1) < 1e-9) return { kind: "flipped", message: L("Look at your fraction. Did you flip it upside down?", "Mira tu fracción. ¿La pusiste al revés?") };
      if (Number.isInteger(u) && Number.isInteger(r) && Math.abs(u - r) <= 2) return { kind: "slip", message: L("So close! Re-check your arithmetic. You're only a little off.", "¡Casi! Revisa tu aritmética. Solo te desviaste un poquito.") };
      return null;
    }
    const mag = (list) => list.map((n) => Math.abs(n)).sort((a, b) => a - b);
    if (sameMultiset(mag(un).map(String), mag(rn).map(String))) {
      return { kind: "sign", message: L("You have the right numbers. Check which are positive and which are negative.", "Tienes los números correctos. Revisa cuáles son positivos y cuáles negativos.") };
    }
    return null;
  }

  // Expressions: compare the signed terms, ignoring order.
  if (user.length === 1) {
    const ut = terms(user[0]);
    const rt = terms(right[0]);
    if (ut.length > 1 || rt.length > 1) {
      const norm = (t) => (/^[+-]/.test(t) ? t : "+" + t);
      if (sameMultiset(ut.map(norm), rt.map(norm))) {
        return { kind: "reorder", message: L("Those are the same terms in a different order, which may well be right. If you're sure, use \"Actually, that's right\".", "Son los mismos términos en otro orden, y puede que estén bien. Si estás seguro, usa \"En realidad, está bien\".") };
      }
      if (sameMultiset(ut.map(unsigned), rt.map(unsigned))) {
        return { kind: "sign", message: L("You've got the right pieces. Check the sign on each term.", "Tienes las piezas correctas. Revisa el signo de cada término.") };
      }
    }
  }
  return null;
}
