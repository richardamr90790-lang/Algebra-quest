import { randInt, randIntNonZero, choice, pmTerm, linTerm } from "./generators.js";
import { L, getLang } from "../i18n.js";
import { translateStep } from "../step-es.js";
import { start, st, fin, num, par, factorSolveSteps, qfSteps, cancel } from "./steps.js";
import { esSteps } from "./generators.js";

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
    const qq = `Rationalize and simplify: 1/(√${r} − ${k})`;
    return {q:L(qq,`Racionaliza y simplifica: 1/(√${r} − ${k})`), a:`√${r} + ${k}`, check:`sqrt${r}+${k}`,
      topicId:28, cat:"foundations",
      steps:[start(qq),
        st(`A radical should not stay in the denominator. The denominator has two terms, so multiply the top and the bottom by its CONJUGATE. The conjugate has the same two terms with the opposite sign in the middle.`, `The denominator is √${r} − ${k}`, `Its conjugate is √${r} + ${k}`),
        st(`Multiply the top and the bottom by the conjugate. This multiplies by 1, so the value does not change.`, `1/(√${r} − ${k}) × (√${r} + ${k})/(√${r} + ${k})`),
        st("Multiply the tops together.", `Top: 1 × (√${r} + ${k}) = √${r} + ${k}`),
        st("Multiply the bottoms together. Use the pattern (a − b)(a + b) = a² − b².", `(√${r} − ${k})(√${r} + ${k}) = (√${r})² − ${k}²`, `(√${r})² = ${r}, because a square root times itself gives the number under it`, `${k}² = ${k*k}`, `${r} − ${k*k} = ${r-k*k}`, `So the bottom is ${r-k*k}`),
        st("Write the new fraction.", `(√${r} + ${k}) ÷ ${r-k*k} = √${r} + ${k}`),
        fin(`√${r} + ${k}`)]};
  },
  // 2. A rational equation that clears to a quadratic solved by formula,
  //    with an irrational (non-perfect-square) answer, plus an extraneous-
  //    solution check. Built backward from a center p and offset T (just
  //    like completing-the-square), then reverse-engineered into the
  //    (x+P)/(x−D) = C/(x²−D²) cover story. With P = −2p − D the cleared
  //    equation is x² − 2px + (PD − C) = 0, whose roots are p ± √T.
  () => guardedGen(()=>{
    const p = randIntNonZero(-5,5), T = choice([2,3,5,6,7,10,11,13]), D = randInt(2,5);
    const P = -2*p - D, C = P*D - p*p + T;
    if(C===0 || P===0 || P===-D) return null;
    const PD = P*D;
    const fx = (c) => c===0 ? "" : c<0 ? ` − ${-c}` : ` + ${c}`;
    const qq = `(x${fx(P)})/(x − ${D}) = ${num(C)}/(x² − ${D*D})`;
    const quad = `x² ${-2*p<0?"−":"+"} ${Math.abs(2*p)}x ${PD-C<0?"−":"+"} ${Math.abs(PD-C)}`;
    const [sg, mag] = cancel(C); const o = sg==="+" ? `{p:+ ${mag}}` : `{n:− ${mag}}`;
    const qf = qfSteps(1,-2*p,PD-C,quad.replace(/ /g," ")+" = 0",false);
    return {q:L(`Solve (watch for extraneous solutions): ${qq}`,`Resuelve (cuidado con las soluciones extrañas): ${qq}`),
      a:L(`x = ${p} + √${T} or x = ${p} - √${T}`,`x = ${p} + √${T} o x = ${p} - √${T}`), check:`x=${p}+sqrt${T} or x=${p}-sqrt${T}`,
      topicId:27, cat:"rational",
      steps:[start(qq),
        st(`Factor the denominator on the right. It is a difference of squares.`, `x² − ${D*D} = (x − ${D})(x + ${D})`, `Pattern: a² − b² = (a − b)(a + b), with a = x and b = ${D}`, `So the equation is (x${fx(P)})/(x − ${D}) = ${num(C)}/((x − ${D})(x + ${D}))`),
        st(`Find the restrictions. A denominator can never be 0.`, `x − ${D} = 0 when x = ${D}`, `x + ${D} = 0 when x = ${num(-D)}`, `So x cannot be ${D} and x cannot be ${num(-D)}`),
        st(`Clear the fractions. Multiply BOTH sides by (x − ${D})(x + ${D}).`, `Left side: (x${fx(P)})/(x − ${D}) × (x − ${D})(x + ${D}) = (x${fx(P)})(x + ${D}), because (x − ${D}) cancels`, `Right side: ${num(C)}/((x − ${D})(x + ${D})) × (x − ${D})(x + ${D}) = ${num(C)}, because both factors cancel`, `So (x${fx(P)})(x + ${D}) = ${num(C)}`),
        st(`Multiply out the left side (FOIL).`, `(x${fx(P)})(x + ${D}) = x² + ${D}x ${P<0?"−":"+"} ${Math.abs(P)}x ${PD<0?"−":"+"} ${Math.abs(PD)}`, `Combine the x terms: ${D}x ${P<0?"−":"+"} ${Math.abs(P)}x = ${num(P+D)}x`, `So x² ${P+D<0?"−":"+"} ${Math.abs(P+D)}x ${PD<0?"−":"+"} ${Math.abs(PD)} = ${num(C)}`),
        st(`Move ${num(C)} to the left side so the right side is 0. ${sg==="+"?"Add":"Subtract"} ${mag} ${sg==="+"?"to":"from"} BOTH sides.`, `x² ${P+D<0?"−":"+"} ${Math.abs(P+D)}x ${PD<0?"−":"+"} ${Math.abs(PD)} ${o} = ${num(C)} ${o}`, `Right side: ${num(C)} ${sg==="+"?"+":"−"} ${mag} = 0`, `Left side: ${num(PD)} ${sg==="+"?"+":"−"} ${mag} = ${num(PD-C)}`, `So ${quad} = 0`),
        ...qf.steps.slice(1,-1),
        st(`Check the answers against the restrictions.`, `The solutions are x = ${p} + √${T} and x = ${p} − √${T}`, `√${T} is not a whole number, so neither solution equals ${D} or ${num(-D)}`, `Both solutions are valid`),
        fin(`x = ${p} + √${T} or x = ${p} − √${T}`)]};
  }),
  // 3. A system of y = x² and a line, backward-built from two clean
  //    integer roots so it always factors.
  () => guardedGen(()=>{
    const r1 = randInt(-5,5), r2 = randIntNonZero(-5,5);
    if(r1===r2) return null;
    const m = r1+r2, b = -r1*r2;
    if(m===0) return null;
    const y1 = r1*r1, y2 = r2*r2;
    const line = `${linTerm(m,"x")}${pmTerm(b)}`;
    const qq = `Solve the system: y = x²  and  y = ${line}`;
    const fac = factorSolveSteps(r1,r2);
    const mv = (c, name) => c>0 ? [`Subtract ${linTerm(c,"x")}`, `{n:− ${linTerm(c,"x")}}`] : [`Add ${linTerm(-c,"x")}`, `{p:+ ${linTerm(-c,"x")}}`];
    const mTxt = linTerm(m,"x"); const [w1,o1] = mv(m); const lhsM = `x² ${m>0?"−":"+"} ${linTerm(Math.abs(m),"x")}`; const afterM = `${lhsM} = ${num(b)}`;
    const steps = [start(qq),
      st("Both equations say what y equals, so the two right sides must be equal. Substitute x² in for y in the second equation.", `y = ${line} becomes x² = ${line}`),
      st(`Get a 0 on one side. First move the x term. ${w1} ${m>0?"from":"to"} BOTH sides.`, `x² ${o1} = ${line} ${o1}`, `Right side: ${mTxt} ${m>0?"−":"+"} ${mTxt.replace("−","")} = 0, so only ${b===0?"0":num(b)} is left`, `So ${afterM}`)];
    if(b!==0){ const [sg, mag] = cancel(b); const o = sg==="+" ? `{p:+ ${mag}}` : `{n:− ${mag}}`;
      steps.push(st(`Now move the number. ${sg==="+"?"Add":"Subtract"} ${mag} ${sg==="+"?"to":"from"} BOTH sides.`, `${lhsM} ${o} = ${num(b)} ${o}`, `Right side: ${num(b)} ${sg==="+"?"+":"−"} ${mag} = 0`, `So x² ${m>0?"−":"+"} ${linTerm(Math.abs(m),"x")} ${b>0?"−":"+"} ${Math.abs(b)} = 0`)); }
    steps.push(...fac.steps.slice(1,-1));
    steps.push(st("Find y for each x. Use y = x².", `When x = ${num(r1)}: y = ${par(r1)}² = ${y1}`, `When x = ${num(r2)}: y = ${par(r2)}² = ${y2}`),
      fin(`(x, y) = (${num(r1)}, ${y1}) or (x, y) = (${num(r2)}, ${y2})`));
    return {q:L(qq,`Resuelve el sistema: y = x²  y  y = ${line}`),
      a:L(`(x,y)=(${r1},${y1}) or (x,y)=(${r2},${y2})`,`(x,y)=(${r1},${y1}) o (x,y)=(${r2},${y2})`), check:`(x,y)=(${r1},${y1}) or (x,y)=(${r2},${y2})`,
      topicId:6, cat:"equations", steps};
  }),
  // 4. A fractional exponent — cube-then-square or square-then-cube.
  () => {
    const mode = choice(["cubeRoot","squareRoot"]);
    if(mode==="cubeRoot"){
      const c = randInt(2,5), base = c*c*c, ans = c*c;
      return {q:L(`Simplify: ${base}^(2/3)  — a fractional exponent means "root on the bottom, power on top": take the cube root first, then square it.`,`Simplifica: ${base}^(2/3)  — un exponente fraccionario significa "raíz abajo, potencia arriba": saca primero la raíz cúbica y luego elévala al cuadrado.`),
        a:`${ans}`, topicId:1, cat:"foundations",
        steps:[start(`${base}^(2/3)`),
          st(`A fractional exponent has two jobs. The bottom number is the root. The top number is the power.`, `In ${base}^(2/3), the bottom is 3, so take the cube root`, `The top is 2, so square the result`),
          st(`Take the cube root first.`, `The cube root of ${base} is the number that gives ${base} when you multiply it by itself 3 times`, `${c} × ${c} × ${c} = ${base}`, `So the cube root of ${base} is ${c}`),
          st(`Now square the result.`, `${c}² = ${c} × ${c} = ${ans}`),
          fin(`${ans}`)]};
    }
    const d = randInt(2,6), base = d*d, ans = d*d*d;
    return {q:L(`Simplify: ${base}^(3/2)  — a fractional exponent means "root on the bottom, power on top": take the square root first, then cube it.`,`Simplifica: ${base}^(3/2)  — un exponente fraccionario significa "raíz abajo, potencia arriba": saca primero la raíz cuadrada y luego elévala al cubo.`),
      a:`${ans}`, topicId:1, cat:"foundations",
      steps:[start(`${base}^(3/2)`),
        st(`A fractional exponent has two jobs. The bottom number is the root. The top number is the power.`, `In ${base}^(3/2), the bottom is 2, so take the square root`, `The top is 3, so cube the result`),
        st(`Take the square root first.`, `The square root of ${base} is the number that gives ${base} when you multiply it by itself`, `${d} × ${d} = ${base}`, `So the square root of ${base} is ${d}`),
        st(`Now cube the result.`, `${d}³ = ${d} × ${d} × ${d}`, `${d} × ${d} = ${d*d}`, `${d*d} × ${d} = ${ans}`),
        fin(`${ans}`)]};
  },
  // 5. Quartic difference-of-squares down to real roots ±k.
  () => {
    const k = randInt(2,5), k4 = k*k*k*k;
    const qq = `Solve (real solutions only): x⁴ − ${k4} = 0`;
    return {q:L(qq,`Resuelve (solo soluciones reales): x⁴ − ${k4} = 0`), a:L(`x = ${k} or x = -${k}`,`x = ${k} o x = -${k}`), check:`x=${k} or x=-${k}`,
      topicId:24, cat:"factoring",
      steps:[start(`x⁴ − ${k4} = 0`),
        st(`Look for a difference of squares. Write each term as something squared.`, `x⁴ = (x²)²`, `${k4} = ${k*k}², because ${k*k} × ${k*k} = ${k4}`, `So a = x² and b = ${k*k}`),
        st(`Use the pattern a² − b² = (a − b)(a + b).`, `x⁴ − ${k4} = (x² − ${k*k})(x² + ${k*k})`, `The equation is (x² − ${k*k})(x² + ${k*k}) = 0`),
        st(`Use the Zero Product Property. At least one factor must be 0, so set EACH factor equal to 0.`, `x² − ${k*k} = 0`, `x² + ${k*k} = 0`),
        st(`Solve the first one. It is another difference of squares.`, `x² − ${k*k} = (x − ${k})(x + ${k})`, `x − ${k} = 0 and x + ${k} = 0`, `x − ${k} {p:+ ${k}} = 0 {p:+ ${k}}, so x = ${k}`, `x + ${k} {n:− ${k}} = 0 {n:− ${k}}, so x = ${num(-k)}`),
        st(`Solve the second one.`, `x² + ${k*k} {n:− ${k*k}} = 0 {n:− ${k*k}}`, `So x² = ${num(-k*k)}`, `No real number squared is negative, so this factor gives no real solution`),
        fin(`x = ${k} or x = ${num(-k)}`)]};
  },
  // 6. A projectile word problem solved with the quadratic formula,
  //    rounded to the nearest tenth — the "+" root is always the one that
  //    makes physical sense (time can't be negative).
  () => {
    const v = choice([32,36,40,44,48,52,56]), h0 = randInt(2,9);
    const disc = v*v + 64*h0;
    const t = (v + Math.sqrt(disc)) / 32;
    const tRounded = Math.round(t*10)/10;
    const r2 = Math.round(Math.sqrt(disc)*100)/100;
    const qq = `A ball's height is h = −16t² + ${v}t + ${h0}. About when does it hit the ground? (round to the nearest tenth of a second)`;
    const top1 = Math.round((v + r2)*100)/100, top2 = Math.round((v - r2)*100)/100;
    return {q:L(qq,`La altura de una pelota es h = −16t² + ${v}t + ${h0}. ¿Aproximadamente cuándo toca el suelo? (redondea a la décima de segundo más cercana)`),
      a:L(`t ≈ ${tRounded.toFixed(1)} seconds`,`t ≈ ${tRounded.toFixed(1)} segundos`), check:`t=${tRounded.toFixed(1)}`,
      topicId:15, cat:"quadratics",
      steps:[start(`h = −16t² + ${v}t + ${h0}. When does the ball hit the ground? Round to the nearest tenth of a second.`),
        st(`The ball is on the ground when its height is 0. Set h = 0.`, `−16t² + ${v}t + ${h0} = 0`),
        st(`Make the t² term positive. Multiply BOTH sides by −1. Every sign flips.`, `(−16t² + ${v}t + ${h0}) {n:× (−1)} = 0 {n:× (−1)}`, `16t² − ${v}t − ${h0} = 0`),
        st(`Use the quadratic formula. Find a, b and c first.`, `t = (−b ± √(b² − 4ac)) / (2a)`, `a = 16`, `b = −${v}`, `c = −${h0}`),
        st(`Find the discriminant, b² − 4ac, one piece at a time.`, `b² = (−${v})² = ${v*v}`, `4ac = 4 × 16 × (−${h0}) = −${64*h0}`, `b² − 4ac = ${v*v} − (−${64*h0}) = ${v*v} + ${64*h0} = ${disc}`),
        st(`Take the square root of the discriminant. It is not a whole number, so round it to two decimal places.`, `√${disc} ≈ ${r2.toFixed(2)}`),
        st(`Plug the numbers into the formula.`, `−b = ${v}`, `2a = 2 × 16 = 32`, `t = (${v} ± ${r2.toFixed(2)}) / 32`),
        st(`Solve the plus case.`, `Top: ${v} + ${r2.toFixed(2)} = ${top1.toFixed(2)}`, `t = ${top1.toFixed(2)} ÷ 32 ≈ ${(top1/32).toFixed(3)}`),
        st(`Solve the minus case.`, `Top: ${v} − ${r2.toFixed(2)} = ${top2.toFixed(2)}`, `t = ${top2.toFixed(2)} ÷ 32 ≈ ${(top2/32).toFixed(3)}`),
        st(`Pick the answer that makes sense. Time cannot be negative.`, `The minus case is negative, so it is not possible`, `The plus case is about ${(top1/32).toFixed(3)} seconds`),
        st(`Round to the nearest tenth of a second.`, `${(top1/32).toFixed(3)} rounds to ${tRounded.toFixed(1)}`),
        fin(`t ≈ ${tRounded.toFixed(1)} seconds`)]};
  },
];
// Spanish for the worked steps (the English steps above are turned into Spanish when Spanish is on).
for(let i=0;i<bossHellGenerators.length;i++){
  const gen = bossHellGenerators[i];
  bossHellGenerators[i] = (...a) => { const p = gen(...a); if(p && p.steps) p.steps = esSteps(p.steps); return p; };
}
