import { randInt, randIntNonZero, choice, pmTerm, linTerm } from "./generators.js";
import { L } from "../i18n.js";

/* ===================== BOSS BATTLE DIFFICULTY TIERS =====================
   Every tier is procedurally generated fresh each time you start it — same
   "dice" idea as the per-topic 🎲 reroll button. Easy/Medium/Hard/Nightmare
   each list the topicIds that match their difficulty flavor; startBoss()
   calls that topic's own GENERATORS[topicId]() (the same engine the topic
   practice reroll uses) and picks one random item per topic, so no two
   battles are ever the same. Hell Mode needs content past what any single
   topic's generator produces (rationalizing a binomial denominator, a
   rational equation that needs the quadratic formula, fractional exponents,
   a quadratic word problem, …), so it has its own small set of dedicated
   generator functions (bossHellGenerators, below), built the same
   "backward construction" way as every other generator in this file. */
export const BOSS_LEVELS = [
  {id:"easy", name:"Easy", es:"Fácil", icon:"🍃", color:"var(--good)", xpPerCorrect:10,
   tagline:"Straightforward stuff — if you've got the basics, you've got this.",
   esTagline:"Cosas sencillas — si dominas lo básico, lo tienes.",
   count:8, topics:[1,2,3,20,21,4,17,11]},
  {id:"medium", name:"Medium", es:"Medio", icon:"🧱", color:"var(--accent-2)", xpPerCorrect:16,
   tagline:"A bit trickier — negatives, two steps, keep your head up.",
   esTagline:"Un poco más difícil — negativos, dos pasos, mantén la cabeza en alto.",
   count:8, topics:[6,22,25,7,10,5,18,28]},
  {id:"hard", name:"Hard", es:"Difícil", icon:"🧬", color:"var(--cat-factoring)", xpPerCorrect:22,
   tagline:"Requires real thought — multi-step problems, no shortcuts.",
   esTagline:"Requiere pensar de verdad — problemas de varios pasos, sin atajos.",
   count:8, topics:[13,25,9,27,21,28,19,14]},
  {id:"nightmare", name:"Nightmare", es:"Pesadilla", icon:"💀", color:"var(--bad)", xpPerCorrect:30,
   tagline:"Every single problem bites — not one easy one in sight.",
   esTagline:"Cada problema muerde — ni uno fácil a la vista.",
   count:8, topics:[15,23,29,27,9,13,28,19]},
  {id:"hellmode", name:"Hell Mode", es:"Modo Infierno", icon:"🔥", color:"#8b2fc9", xpPerCorrect:42,
   tagline:"Extreme difficulty — stacked methods, and a couple of questions that reach past what's taught here.",
   esTagline:"Dificultad extrema — métodos combinados y un par de preguntas que van más allá de lo que se enseña aquí.",
   count:6, generator:true},
];

// Each function below returns one freshly randomized Hell Mode problem,
// built the same "pick clean numbers first, derive the answer from them"
// way as every GENERATORS[] entry — so every generated problem is correct
// by construction. guardedGen() just retries a generator a few times if it
// happens to roll an edge case (e.g. a degenerate coefficient) it rejects.
function guardedGen(fn, maxTries){
  for(let i=0;i<(maxTries||40);i++){ const r = fn(); if(r) return r; }
  return fn.fallback ? fn.fallback() : null;
}
export const bossHellGenerators = [
  // 1. Rationalize a two-term radical denominator via the conjugate.
  //    r is always chosen as k²+1 so the denominator (r − k²) simplifies to
  //    exactly 1, keeping the answer clean: 1/(√r − k) = √r + k.
  () => {
    const k = randInt(1,4), r = k*k+1;
    return {q:L(`Rationalize and simplify: 1/(√${r} − ${k})`,`Racionaliza y simplifica: 1/(√${r} − ${k})`), a:`√${r} + ${k}`, check:`sqrt${r}+${k}`,
      topicId:28, cat:"foundations",
      steps:[L(`Multiply top and bottom by the conjugate (√${r} + ${k}): (√${r}+${k})/((√${r}−${k})(√${r}+${k}))`,`Multiplica arriba y abajo por el conjugado (√${r} + ${k}): (√${r}+${k})/((√${r}−${k})(√${r}+${k}))`),
        L(`The bottom becomes ${r} − ${k*k} = 1`,`El denominador queda ${r} − ${k*k} = 1`), L(`Answer: √${r} + ${k}`,`Respuesta: √${r} + ${k}`)]};
  },
  // 2. A rational equation that clears to a quadratic solved by formula,
  //    with an irrational (non-perfect-square) answer, plus an extraneous-
  //    solution check. Built backward from a center p and offset T (just
  //    like completing-the-square), then reverse-engineered into the
  //    (x+P)/(x−D) = C/(x²−D²) cover story.
  () => guardedGen(()=>{
    const p = randIntNonZero(-5,5), T = choice([2,3,5,6,7,10,11,13]), D = randInt(2,5);
    const P = 2*p - D, C = P*D - p*p + T;
    if(C===0 || P===0 || P===-D) return null;
    const PD = P*D;
    return {q:L(`Solve (watch for extraneous solutions): (x${pmTerm(P)})/(x − ${D}) = ${C}/(x² − ${D*D})`,`Resuelve (cuidado con las soluciones extrañas): (x${pmTerm(P)})/(x − ${D}) = ${C}/(x² − ${D*D})`),
      a:L(`x = ${p} + √${T} or x = ${p} - √${T}`,`x = ${p} + √${T} o x = ${p} - √${T}`), check:`x=${p}+sqrt${T} or x=${p}-sqrt${T}`,
      topicId:27, cat:"rational",
      steps:[L(`Factor the denominator: x² − ${D*D} = (x−${D})(x+${D}). Multiply every term by (x−${D})(x+${D}): (x${pmTerm(P)})(x+${D}) = ${C}`,`Factoriza el denominador: x² − ${D*D} = (x−${D})(x+${D}). Multiplica cada término por (x−${D})(x+${D}): (x${pmTerm(P)})(x+${D}) = ${C}`),
        L(`Expand: x² ${pmTerm(P+D)}x ${pmTerm(PD)} = ${C} → x² ${pmTerm(-2*p)}x ${pmTerm(PD-C)} = 0`,`Expande: x² ${pmTerm(P+D)}x ${pmTerm(PD)} = ${C} → x² ${pmTerm(-2*p)}x ${pmTerm(PD-C)} = 0`),
        L(`This matches (x${pmTerm(-p)})² = ${T} → x = ${p} ± √${T} (neither root is ${D} or ${-D}, so both are valid)`,`Esto coincide con (x${pmTerm(-p)})² = ${T} → x = ${p} ± √${T} (ninguna raíz es ${D} ni ${-D}, así que ambas son válidas)`)]};
  }),
  // 3. A system of y = x² and a line, backward-built from two clean
  //    integer roots so it always factors.
  () => guardedGen(()=>{
    const r1 = randInt(-5,5), r2 = randIntNonZero(-5,5);
    if(r1===r2) return null;
    const m = r1+r2, b = -r1*r2;
    if(m===0) return null;
    const y1 = r1*r1, y2 = r2*r2;
    return {q:L(`Solve the system: y = x²  and  y = ${linTerm(m,"x")}${pmTerm(b)}`,`Resuelve el sistema: y = x²  y  y = ${linTerm(m,"x")}${pmTerm(b)}`),
      a:L(`(x,y)=(${r1},${y1}) or (x,y)=(${r2},${y2})`,`(x,y)=(${r1},${y1}) o (x,y)=(${r2},${y2})`), check:`(x,y)=(${r1},${y1}) or (x,y)=(${r2},${y2})`,
      topicId:6, cat:"equations",
      steps:[L(`Substitute x² in for y: x² = ${linTerm(m,"x")}${pmTerm(b)} → x² ${pmTerm(-m)}x ${pmTerm(-b)} = 0`,`Sustituye x² en lugar de y: x² = ${linTerm(m,"x")}${pmTerm(b)} → x² ${pmTerm(-m)}x ${pmTerm(-b)} = 0`),
        L(`Factor: (x${pmTerm(-r1)})(x${pmTerm(-r2)}) = 0 → x = ${r1} or x = ${r2}`,`Factoriza: (x${pmTerm(-r1)})(x${pmTerm(-r2)}) = 0 → x = ${r1} o x = ${r2}`),
        L(`Plug back into y = x²: (${r1}, ${y1}) and (${r2}, ${y2})`,`Sustituye de nuevo en y = x²: (${r1}, ${y1}) y (${r2}, ${y2})`)]};
  }),
  // 4. A fractional exponent — cube-then-square or square-then-cube.
  () => {
    const mode = choice(["cubeRoot","squareRoot"]);
    if(mode==="cubeRoot"){
      const c = randInt(2,5), base = c*c*c, ans = c*c;
      return {q:L(`Simplify: ${base}^(2/3)  — a fractional exponent means "root on the bottom, power on top": take the cube root first, then square it.`,`Simplifica: ${base}^(2/3)  — un exponente fraccionario significa "raíz abajo, potencia arriba": saca primero la raíz cúbica y luego elévala al cuadrado.`),
        a:`${ans}`, topicId:1, cat:"foundations",
        steps:[L(`The denominator (3) is the root: the cube root of ${base} is ${c}.`,`El denominador (3) es la raíz: la raíz cúbica de ${base} es ${c}.`), L(`The numerator (2) is the power: square that result: ${c}² = ${ans}`,`El numerador (2) es la potencia: eleva ese resultado al cuadrado: ${c}² = ${ans}`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
    }
    const d = randInt(2,6), base = d*d, ans = d*d*d;
    return {q:L(`Simplify: ${base}^(3/2)  — a fractional exponent means "root on the bottom, power on top": take the square root first, then cube it.`,`Simplifica: ${base}^(3/2)  — un exponente fraccionario significa "raíz abajo, potencia arriba": saca primero la raíz cuadrada y luego elévala al cubo.`),
      a:`${ans}`, topicId:1, cat:"foundations",
      steps:[L(`The denominator (2) is the root: the square root of ${base} is ${d}.`,`El denominador (2) es la raíz: la raíz cuadrada de ${base} es ${d}.`), L(`The numerator (3) is the power: cube that result: ${d}³ = ${ans}`,`El numerador (3) es la potencia: eleva ese resultado al cubo: ${d}³ = ${ans}`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  },
  // 5. Quartic difference-of-squares down to real roots ±k.
  () => {
    const k = randInt(2,5), k4 = k*k*k*k;
    return {q:L(`Solve (real solutions only): x⁴ − ${k4} = 0`,`Resuelve (solo soluciones reales): x⁴ − ${k4} = 0`), a:L(`x = ${k} or x = -${k}`,`x = ${k} o x = -${k}`), check:`x=${k} or x=-${k}`,
      topicId:24, cat:"factoring",
      steps:[L(`Difference of squares: (x² − ${k*k})(x² + ${k*k}) = 0`,`Diferencia de cuadrados: (x² − ${k*k})(x² + ${k*k}) = 0`),
        L(`x² − ${k*k} = 0 gives real solutions; x² + ${k*k} = 0 has no real solution (x² can't be negative).`,`x² − ${k*k} = 0 da soluciones reales; x² + ${k*k} = 0 no tiene solución real (x² no puede ser negativo).`),
        L(`Answer: x = ${k} or x = -${k}`,`Respuesta: x = ${k} o x = -${k}`)]};
  },
  // 6. A projectile word problem solved with the quadratic formula,
  //    rounded to the nearest tenth — the "+" root is always the one that
  //    makes physical sense (time can't be negative).
  () => {
    const v = choice([32,36,40,44,48,52,56]), h0 = randInt(2,9);
    const disc = v*v + 64*h0;
    const t = (v + Math.sqrt(disc)) / 32;
    const tRounded = Math.round(t*10)/10;
    return {q:L(`A ball's height is h = −16t² + ${v}t + ${h0}. About when does it hit the ground? (round to the nearest tenth of a second)`,`La altura de una pelota es h = −16t² + ${v}t + ${h0}. ¿Aproximadamente cuándo toca el suelo? (redondea a la décima de segundo más cercana)`),
      a:L(`t ≈ ${tRounded.toFixed(1)} seconds`,`t ≈ ${tRounded.toFixed(1)} segundos`), check:`t=${tRounded.toFixed(1)}`,
      topicId:15, cat:"quadratics",
      steps:[L(`Set h = 0: −16t² + ${v}t + ${h0} = 0. Multiply by −1: 16t² − ${v}t − ${h0} = 0`,`Iguala h = 0: −16t² + ${v}t + ${h0} = 0. Multiplica por −1: 16t² − ${v}t − ${h0} = 0`),
        L(`Quadratic formula: a=16, b=−${v}, c=−${h0}. Discriminant = ${v}² + 4(16)(${h0}) = ${disc}`,`Fórmula cuadrática: a=16, b=−${v}, c=−${h0}. Discriminante = ${v}² + 4(16)(${h0}) = ${disc}`),
        L(`t = (${v} ± √${disc}) / 32 — only the positive root makes sense here. √${disc} ≈ ${Math.sqrt(disc).toFixed(2)}, so t ≈ ${tRounded.toFixed(1)} seconds`,`t = (${v} ± √${disc}) / 32 — aquí solo tiene sentido la raíz positiva. √${disc} ≈ ${Math.sqrt(disc).toFixed(2)}, así que t ≈ ${tRounded.toFixed(1)} segundos`)]};
  },
];

