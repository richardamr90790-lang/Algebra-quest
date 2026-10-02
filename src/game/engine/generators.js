/* ===================== PROCEDURAL PRACTICE GENERATORS =====================
   Produces fresh independent-practice problems on demand. Guided Practice and
   Worked Examples are NOT touched by this — they stay the fixed, hand-written
   content. Every generator below builds each problem "backward" from a chosen
   clean answer (nice roots/factors/numbers), so the answer is correct by
   construction rather than independently (re)solved — the safest way to avoid
   generator bugs at this scale. */

import { L } from "../i18n.js";

export function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
export function randIntNonZero(min,max){ let v; do{ v=randInt(min,max); }while(v===0); return v; }
export function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function gcdNum(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b,a%b]; } return a||1; }
function fracStr(n,d){
  if(d<0){ n=-n; d=-d; }
  const g = gcdNum(n,d);
  n = n/g; d = d/g;
  if(d===1) return String(n);
  return `${n}/${d}`;
}
const SUP_DIGITS = {"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","-":"⁻"};
function toSup(n){ return String(n).split("").map(ch=>SUP_DIGITS[ch]||ch).join(""); }
const SUB_DIGITS = {"0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉"};
function toSub(n){ return String(n).split("").map(ch=>SUB_DIGITS[ch]||ch).join(""); }
function fmtComma(n){ return n.toLocaleString("en-US"); }
// " + 5" or " − 5" (with a leading space) — for splicing after a variable, e.g. "x" + pmTerm(5) -> "x + 5"
export function pmTerm(n){ if(n===0) return ""; return n<0 ? ` − ${-n}` : ` + ${n}`; }
// "+5" or "−5" (no leading space) — for standalone operation terms, e.g. BAL rows or "Distribute -2:"
function pmRaw(n){ return n<0 ? `−${-n}` : `${n}`; }
function flipOp(op){ return {"<":">", ">":"<", "≤":"≥", "≥":"≤"}[op]; }
// Renders "a − b" as subtraction text without ever producing a confusing
// double sign like "6 − -3" — flips to "6 + 3" when b is negative.
function diffStr(a,b){ return `${a} ${b<0 ? "+" : "−"} ${Math.abs(b)}`; }
function formatMoney(n){
  const r = Math.round(n*100)/100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}
// Generic polynomial formatter. terms: array of [coef, varPart] highest degree first.
// Mirrors the house style: leading "−2x²" (no space), later " − 3x" / " + 3".
function poly(terms){
  let out = "";
  terms.forEach(([coef,varPart])=>{
    if(coef===0) return;
    const absC = Math.abs(coef);
    const cPart = (absC===1 && varPart) ? "" : String(absC);
    if(out===""){
      out = (coef<0 ? "−" : "") + cPart + varPart;
    }else{
      out += (coef<0 ? " − " : " + ") + cPart + varPart;
    }
  });
  return out==="" ? "0" : out;
}
// "4x" / "x" / "−x" / "−4x" style linear term (no leading sign handling beyond the coefficient itself)
export function linTerm(m, varName){
  const absM = Math.abs(m);
  const cPart = absM===1 ? "" : String(absM);
  return (m<0 ? "−" : "") + cPart + varName;
}
function qClean(s){ return s.replace(/ {2,}/g," ").replace(/\( /g,"(").replace(/ \)/g,")").trim(); }
// Answer words that differ by language (the ###GRAPH### markers keep their English tokens).
const WORDS_ES = {up:"arriba", down:"abajo", open:"abierto", closed:"cerrado", dashed:"discontinua", solid:"continua", above:"por encima", below:"por debajo"};
const word = (en) => L(en, WORDS_ES[en] || en);
const SQUAREFREE = [2,3,5,6,7,10,11,13,14,15,17,19,21,22];

function genSet(n, fn){
  const out = []; const seen = new Set();
  let guard = 0;
  while(out.length<n && guard<500){
    guard++;
    const p = fn();
    if(!p) continue;
    if(seen.has(p.q)) continue;
    seen.add(p.q);
    out.push(p);
  }
  return out;
}

export const GENERATORS = {};

// 1. Exponent Rules
GENERATORS[1] = () => genSet(6, () => {
  const type = choice(["mul","pow","div","zero","neg","coef"]);
  if(type==="mul"){
    const a=randInt(2,9), b=randInt(2,9);
    return {q:`x${toSup(a)} · x${toSup(b)} = ?`, a:`x${toSup(a+b)}`,
      steps:[L(`Same base, multiplying → ADD the exponents.`,`Misma base, multiplicando → SUMA los exponentes.`), `${a} + ${b} = ${a+b}`, L(`Answer: x${toSup(a+b)}`,`Respuesta: x${toSup(a+b)}`)]};
  }
  if(type==="pow"){
    const a=randInt(2,5), b=randInt(2,5);
    return {q:`(x${toSup(a)})${toSup(b)} = ?`, a:`x${toSup(a*b)}`,
      steps:[L(`Power to a power → MULTIPLY the exponents.`,`Potencia de una potencia → MULTIPLICA los exponentes.`), `${a} × ${b} = ${a*b}`, L(`Answer: x${toSup(a*b)}`,`Respuesta: x${toSup(a*b)}`)]};
  }
  if(type==="div"){
    const b=randInt(2,6), diff=randInt(1,7), a=b+diff;
    return {q:`x${toSup(a)} ÷ x${toSup(b)} = ?`, a:`x${toSup(diff)}`,
      steps:[L(`Same base, dividing → SUBTRACT the exponents.`,`Misma base, dividiendo → RESTA los exponentes.`), `${a} − ${b} = ${diff}`, L(`Answer: x${toSup(diff)}`,`Respuesta: x${toSup(diff)}`)]};
  }
  if(type==="zero"){
    const c=randInt(2,9);
    return {q:`${c}x⁰ = ?`, a:`${c}`,
      steps:[L(`Anything to the power of 0 is 1 (as long as x ≠ 0).`,`Todo número elevado a la potencia 0 es 1 (siempre que x ≠ 0).`), `x⁰ = 1`, `${c} × 1 = ${c}`]};
  }
  if(type==="neg"){
    const a=randInt(2,5);
    return {q:L(`x${toSup(-a)} = ? (as a fraction)`,`x${toSup(-a)} = ? (como fracción)`), a:`1/x${toSup(a)}`,
      steps:[L(`A negative exponent means "flip it into a fraction."`,`Un exponente negativo significa "voltéalo y conviértelo en una fracción."`), L(`x${toSup(-a)} becomes 1 over x${toSup(a)}`,`x${toSup(-a)} se convierte en 1 sobre x${toSup(a)}`), L(`Answer: 1/x${toSup(a)}`,`Respuesta: 1/x${toSup(a)}`)]};
  }
  const c1=randInt(2,5), c2=randInt(2,5), a=randInt(2,5), b=randInt(2,5);
  return {q:`(${c1}x${toSup(a)})(${c2}x${toSup(b)}) = ?`, a:`${c1*c2}x${toSup(a+b)}`,
    steps:[L(`Multiply the coefficients: ${c1} × ${c2} = ${c1*c2}`,`Multiplica los coeficientes: ${c1} × ${c2} = ${c1*c2}`), L(`Same base, multiplying → add the exponents: ${a} + ${b} = ${a+b}`,`Misma base, multiplicando → suma los exponentes: ${a} + ${b} = ${a+b}`), L(`Answer: ${c1*c2}x${toSup(a+b)}`,`Respuesta: ${c1*c2}x${toSup(a+b)}`)]};
});

// 2. Scientific Notation
GENERATORS[2] = () => {
  const items = [];
  {
    const d1=randInt(2,9), d2=randInt(1,9), e=randInt(3,6);
    const moved = [String(d2)].concat(Array(e-1).fill("0"));
    const num = fmtComma(Math.round((d1*10 + d2) * Math.pow(10,e-1)));
    items.push({q:L(`Write ${num} in scientific notation.`,`Escribe ${num} en notación científica.`), a:`${d1}.${d2} × 10${toSup(e)}`,
      steps:[L(`Move the decimal point LEFT until one digit is in front: ${d1}.${d2}`,`Mueve el punto decimal a la IZQUIERDA hasta que quede un dígito al frente: ${d1}.${d2}`),
        L(`Count the digits the decimal hopped over:###DP:${d1}:${moved.join(",")}:###`,`Cuenta los dígitos que saltó el punto decimal:###DP:${d1}:${moved.join(",")}:###`),
        L(`That's ${e} places → Big number → the exponent is POSITIVE.`,`Son ${e} lugares → Número grande → el exponente es POSITIVO.`),
        L(`Answer: ${d1}.${d2} × 10${toSup(e)}`,`Respuesta: ${d1}.${d2} × 10${toSup(e)}`)]});
  }
  {
    const d1=randInt(1,9), d2=randInt(1,9), e=randInt(2,5);
    const moved = Array(e-1).fill("0").concat([String(d1)]);
    const decStr = "0." + "0".repeat(e-1) + d1 + d2;
    items.push({q:L(`Write ${decStr} in scientific notation.`,`Escribe ${decStr} en notación científica.`), a:`${d1}.${d2} × 10${toSup(-e)}`,
      steps:[L(`Move the decimal point RIGHT until one digit is in front: ${d1}.${d2}`,`Mueve el punto decimal a la DERECHA hasta que quede un dígito al frente: ${d1}.${d2}`),
        L(`Count the digits the decimal hopped over:###DP::${moved.join(",")}:${d2}###`,`Cuenta los dígitos que saltó el punto decimal:###DP::${moved.join(",")}:${d2}###`),
        L(`That's ${e} places → Tiny number → the exponent is NEGATIVE.`,`Son ${e} lugares → Número diminuto → el exponente es NEGATIVO.`),
        L(`Answer: ${d1}.${d2} × 10${toSup(-e)}`,`Respuesta: ${d1}.${d2} × 10${toSup(-e)}`)]});
  }
  {
    const d1=randInt(2,9), d2=randInt(1,9), e=randInt(3,6);
    const moved = [String(d2)].concat(Array(e-1).fill("0"));
    const num = fmtComma(Math.round((d1*10 + d2) * Math.pow(10,e-1)));
    items.push({q:L(`Write ${d1}.${d2} × 10${toSup(e)} in standard form.`,`Escribe ${d1}.${d2} × 10${toSup(e)} en forma estándar.`), a:num,
      steps:[L(`The exponent is +${e}, so move the decimal RIGHT ${e} places, padding zeros as needed.`,`El exponente es +${e}, así que mueve el punto decimal ${e} lugares a la DERECHA, rellenando con ceros según haga falta.`),
        L(`Watch the decimal hop across (padded zeros included):###DP:${d1}:${moved.join(",")}:###`,`Mira cómo salta el punto decimal (con los ceros de relleno incluidos):###DP:${d1}:${moved.join(",")}:###`),
        L(`Answer: ${num}`,`Respuesta: ${num}`)]});
  }
  {
    const d1=randInt(1,9), d2=randInt(1,9), e=randInt(2,5);
    const moved = Array(e-1).fill("0").concat([String(d1)]);
    const decStr = "0." + "0".repeat(e-1) + d1 + d2;
    items.push({q:L(`Write ${d1}.${d2} × 10${toSup(-e)} in standard form.`,`Escribe ${d1}.${d2} × 10${toSup(-e)} en forma estándar.`), a:decStr,
      steps:[L(`The exponent is −${e}, so move the decimal LEFT ${e} places, padding zeros as needed.`,`El exponente es −${e}, así que mueve el punto decimal ${e} lugares a la IZQUIERDA, rellenando con ceros según haga falta.`),
        L(`Watch the decimal hop across (padded zeros included):###DP::${moved.join(",")}:${d2}###`,`Mira cómo salta el punto decimal (con los ceros de relleno incluidos):###DP::${moved.join(",")}:${d2}###`),
        L(`Answer: ${decStr}`,`Respuesta: ${decStr}`)]});
  }
  {
    const c2=randInt(2,4), m=randInt(2,Math.floor(9/c2)), c1=c2*m;
    const a1=randInt(2,6), b1=randInt(2,6);
    items.push({q:`(${c1} × 10${toSup(a1)})(${c2} × 10${toSup(b1)}) = ?`, a:`${c1*c2} × 10${toSup(a1+b1)}`,
      steps:[L(`Multiply the front numbers: ${c1} × ${c2} = ${c1*c2}`,`Multiplica los números de adelante: ${c1} × ${c2} = ${c1*c2}`), L(`Add the exponents: ${a1} + ${b1} = ${a1+b1}`,`Suma los exponentes: ${a1} + ${b1} = ${a1+b1}`), L(`Answer: ${c1*c2} × 10${toSup(a1+b1)}`,`Respuesta: ${c1*c2} × 10${toSup(a1+b1)}`)]});
  }
  {
    const c2=randInt(2,9), q=randInt(2,9), c1=c2*q;
    const a1=randInt(4,9), b1=randInt(2,3);
    items.push({q:`(${c1} × 10${toSup(a1)}) ÷ (${c2} × 10${toSup(b1)}) = ?`, a:`${q} × 10${toSup(a1-b1)}`,
      steps:[L(`Divide the front numbers: ${c1} ÷ ${c2} = ${q}`,`Divide los números de adelante: ${c1} ÷ ${c2} = ${q}`), L(`Subtract the exponents: ${a1} − ${b1} = ${a1-b1}`,`Resta los exponentes: ${a1} − ${b1} = ${a1-b1}`), L(`Answer: ${q} × 10${toSup(a1-b1)}`,`Respuesta: ${q} × 10${toSup(a1-b1)}`)]});
  }
  return items;
};

// 3. Simplifying Square Roots
GENERATORS[3] = () => genSet(6, () => {
  const m = randInt(2,9), r = choice(SQUAREFREE);
  const n = m*m*r;
  if(n>500) return null;
  return {q:`√${n} = ?`, a:`${m}√${r}`,
    steps:[L(`Find the largest perfect square that divides ${n}: ${m*m} (${n} = ${m*m} × ${r})`,`Halla el mayor cuadrado perfecto que divide a ${n}: ${m*m} (${n} = ${m*m} × ${r})`),
      L(`√${m*m} = ${m}, so pull the ${m} out front`,`√${m*m} = ${m}, así que saca el ${m} hacia afuera`), L(`Answer: ${m}√${r}`,`Respuesta: ${m}√${r}`)]};
});

// 4. Solving Inequalities (uses ###BAL###)
GENERATORS[4] = () => genSet(6, () => {
  const type = choice(["add","mul","twostep","negone","negtwo"]);
  const op = choice(["<",">","≤","≥"]);
  if(type==="add"){
    const b=randInt(2,9), s=randIntNonZero(-9,9), c=s+b;
    return {q:qClean(`x + ${b} ${op} ${c}`), a:`x ${op} ${s}`,
      steps:[L(`Subtract ${b} from BOTH sides — watch it happen:###BAL:x + ${b},${c};${op};−${b},−${b};x,${s}###`,`Resta ${b} de AMBOS lados — mira cómo pasa:###BAL:x + ${b},${c};${op};−${b},−${b};x,${s}###`), L(`Answer: x ${op} ${s}`,`Respuesta: x ${op} ${s}`)]};
  }
  if(type==="mul"){
    const m=randInt(2,6), s=randIntNonZero(-9,9), c=m*s;
    return {q:`${m}x ${op} ${c}`, a:`x ${op} ${s}`,
      steps:[L(`Divide BOTH sides by ${m} — watch it happen:###BAL:${m}x,${c};${op};÷${m},÷${m};x,${s}###`,`Divide AMBOS lados entre ${m} — mira cómo pasa:###BAL:${m}x,${c};${op};÷${m},÷${m};x,${s}###`), L(`Answer: x ${op} ${s}`,`Respuesta: x ${op} ${s}`)]};
  }
  if(type==="twostep"){
    const m=randInt(2,5), s=randIntNonZero(-9,9), b=randIntNonZero(-9,9), c=m*s+b;
    const undo = pmRaw(-b);
    return {q:qClean(`${m}x ${pmTerm(b)} ${op} ${c}`), a:`x ${op} ${s}`,
      steps:[L(`${b<0?"Add":"Subtract"} ${Math.abs(b)} ${b<0?"to":"from"} BOTH sides:###BAL:${m}x ${pmTerm(b)},${c};${op};${undo},${undo};${m}x,${m*s}###`,`${b<0?"Suma":"Resta"} ${Math.abs(b)} ${b<0?"a":"de"} AMBOS lados:###BAL:${m}x ${pmTerm(b)},${c};${op};${undo},${undo};${m}x,${m*s}###`),
        L(`Now divide BOTH sides by ${m}:###BAL:${m}x,${m*s};${op};÷${m},÷${m};x,${s}###`,`Ahora divide AMBOS lados entre ${m}:###BAL:${m}x,${m*s};${op};÷${m},÷${m};x,${s}###`),
        L(`Answer: x ${op} ${s}`,`Respuesta: x ${op} ${s}`)]};
  }
  if(type==="negone"){
    const m=-randInt(2,6), s=randIntNonZero(-9,9), c=m*s;
    return {q:`${m}x ${op} ${c}`, a:`x ${flipOp(op)} ${s}`,
      steps:[L(`Divide BOTH sides by ${m} — the sign FLIPS because it's negative:###BAL:${m}x,${c};${op};÷${m},÷${m};x,${s};${flipOp(op)}###`,`Divide AMBOS lados entre ${m} — el signo se VOLTEA porque es negativo:###BAL:${m}x,${c};${op};÷${m},÷${m};x,${s};${flipOp(op)}###`), L(`Answer: x ${flipOp(op)} ${s}`,`Respuesta: x ${flipOp(op)} ${s}`)]};
  }
  // negtwo: two-step with negative coefficient
  const m=-randInt(2,5), s=randIntNonZero(-9,9), b=randIntNonZero(-9,9), c=m*s+b;
  const undo = pmRaw(-b);
  return {q:qClean(`${m}x ${pmTerm(b)} ${op} ${c}`), a:`x ${flipOp(op)} ${s}`,
    steps:[L(`${b<0?"Add":"Subtract"} ${Math.abs(b)} ${b<0?"to":"from"} BOTH sides:###BAL:${m}x ${pmTerm(b)},${c};${op};${undo},${undo};${m}x,${m*s}###`,`${b<0?"Suma":"Resta"} ${Math.abs(b)} ${b<0?"a":"de"} AMBOS lados:###BAL:${m}x ${pmTerm(b)},${c};${op};${undo},${undo};${m}x,${m*s}###`),
      L(`Divide BOTH sides by ${m} — the sign FLIPS:###BAL:${m}x,${m*s};${op};÷${m},÷${m};x,${s};${flipOp(op)}###`,`Divide AMBOS lados entre ${m} — el signo se VOLTEA:###BAL:${m}x,${m*s};${op};÷${m},÷${m};x,${s};${flipOp(op)}###`),
      L(`Answer: x ${flipOp(op)} ${s}`,`Respuesta: x ${flipOp(op)} ${s}`)]};
});

// 5. Absolute Value Equations
GENERATORS[5] = () => genSet(6, () => {
  const a = choice([1,1,1,2,4]);
  const range = a===1?6:(a===2?4:3);
  const b2 = randInt(-range,range), k = randIntNonZero(-range,range);
  const b = a*b2, c = a*(k+b2);
  if(c<=0) return null;
  const r1 = k, r2 = -k-2*b2;
  if(r1===r2) return null;
  const inner = a===1 ? `x${pmTerm(b)}` : `${a}x${pmTerm(b)}`;
  let steps;
  if(a===1){
    steps=[L(`Positive case: ${inner} = ${c} → x = ${r1}`,`Caso positivo: ${inner} = ${c} → x = ${r1}`), L(`Negative case: ${inner} = −${c} → x = ${r2}`,`Caso negativo: ${inner} = −${c} → x = ${r2}`), L(`Answer: x = ${r1} or x = ${r2}`,`Respuesta: x = ${r1} o x = ${r2}`)];
  }else{
    steps=[L(`Positive case: ${inner} = ${c} → ${linTerm(a,"x")} = ${c-b} → x = ${r1}`,`Caso positivo: ${inner} = ${c} → ${linTerm(a,"x")} = ${c-b} → x = ${r1}`),
      L(`Negative case: ${inner} = −${c} → ${linTerm(a,"x")} = ${-c-b} → x = ${r2}`,`Caso negativo: ${inner} = −${c} → ${linTerm(a,"x")} = ${-c-b} → x = ${r2}`),
      L(`Answer: x = ${r1} or x = ${r2}`,`Respuesta: x = ${r1} o x = ${r2}`)];
  }
  return {q:qClean(`|${inner}| = ${c}`), a:L(`x = ${r1}  or  x = ${r2}`,`x = ${r1}  o  x = ${r2}`), steps};
});

// 6. Systems of Equations
GENERATORS[6] = () => genSet(6, () => {
  const type = choice(["sub","add"]);
  if(type==="sub"){
    const x0=randInt(-6,9), y0=randInt(-6,9);
    const m=choice([1,1,2,3,-1]), k=y0-m*x0;
    const A=choice([1,2,3]), C=A*x0+y0;
    if(A+m===0) return null;
    const mTerm = linTerm(m,"x") + pmTerm(k);
    return {q:`y = ${mTerm}  ${L("and","y")}  ${A===1?"":A}x + y = ${C}`, a:`x = ${x0}, y = ${y0}`,
      steps:[L(`Substitute (${mTerm}) in for y: ${A===1?"":A}x + (${mTerm}) = ${C}`,`Sustituye (${mTerm}) en lugar de y: ${A===1?"":A}x + (${mTerm}) = ${C}`),
        L(`${poly([[A+m,"x"],[k,""]])} = ${C} → ${A===1?"":A}${m>=0?"+":""}${m===0?"":""}x term solved → x = ${x0}`,`${poly([[A+m,"x"],[k,""]])} = ${C} → ${A===1?"":A}${m>=0?"+":""}${m===0?"":""}x término resuelto → x = ${x0}`),
        L(`Plug x = ${x0} back in: y = ${mTerm.replace(/x/,`(${x0})`)} = ${y0}`,`Sustituye x = ${x0} de nuevo: y = ${mTerm.replace(/x/,`(${x0})`)} = ${y0}`)]};
  }
  const x0=randInt(-9,9), y0=randInt(-9,9);
  const S=x0+y0, D=x0-y0;
  if(S===D) return null;
  return {q:`x + y = ${S}  ${L("and","y")}  x − y = ${D}`, a:`x = ${x0}, y = ${y0}`,
    steps:[L(`Add the two equations straight down — the y's cancel: 2x = ${S+D}`,`Suma las dos ecuaciones de arriba abajo — las y se cancelan: 2x = ${S+D}`), `x = ${x0}`, L(`Plug x = ${x0} back in: ${x0} + y = ${S} → y = ${y0}`,`Sustituye x = ${x0} de nuevo: ${x0} + y = ${S} → y = ${y0}`)]};
});

// 7. Simplifying Rational Expressions (cat: rational)
GENERATORS[7] = () => genSet(6, () => {
  const type = choice(["diffsq","gcf","trinomial"]);
  if(type==="diffsq"){
    const k = randIntNonZero(2,12);
    const plus = choice([true,false]);
    const num = `x² − ${k*k}`;
    const den = plus ? `x + ${k}` : `x − ${k}`;
    const ans = plus ? L(`x − ${k}, where x ≠ −${k}`,`x − ${k}, donde x ≠ −${k}`) : L(`x + ${k}, where x ≠ ${k}`,`x + ${k}, donde x ≠ ${k}`);
    return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:ans,
      steps:[L(`Factor the top (difference of squares): (x − ${k})(x + ${k})`,`Factoriza el numerador (diferencia de cuadrados): (x − ${k})(x + ${k})`), L(`Cancel the matching (${den}) on top and bottom.`,`Cancela el (${den}) que se repite arriba y abajo.`),
        L(`Restriction: the original denominator ${den} = 0 when x = ${plus?-k:k}.`,`Restricción: el denominador original ${den} = 0 cuando x = ${plus?-k:k}.`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  }
  if(type==="gcf"){
    const m = randInt(2,5), c = randIntNonZero(-9,9);
    const num = poly([[m,"x²"],[m*c,"x"]]);
    const den = m===1 ? "x" : `${m}x`;
    const ans = L(`${linTerm(1,"x")+pmTerm(c)}, where x ≠ 0`,`${linTerm(1,"x")+pmTerm(c)}, donde x ≠ 0`);
    return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:ans,
      steps:[L(`Factor the top: ${den}(x${pmTerm(c)})`,`Factoriza el numerador: ${den}(x${pmTerm(c)})`), L(`Cancel the matching ${den} on top and bottom.`,`Cancela el ${den} que se repite arriba y abajo.`),
        L(`Restriction: the original denominator ${den} = 0 when x = 0.`,`Restricción: el denominador original ${den} = 0 cuando x = 0.`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  }
  const r1 = randIntNonZero(-9,9), r2 = randIntNonZero(-9,9);
  if(r1===r2) return null;
  const B = -(r1+r2), C = r1*r2;
  const num = poly([[1,"x²"],[B,"x"],[C,""]]);
  const den = `x${pmTerm(-r1)}`;
  const ans = L(`x${pmTerm(-r2)}, where x ≠ ${r1}`,`x${pmTerm(-r2)}, donde x ≠ ${r1}`);
  return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:qClean(ans),
    steps:[L(`Factor the top: (${den})(x${pmTerm(-r2)})`,`Factoriza el numerador: (${den})(x${pmTerm(-r2)})`), L(`Cancel the matching (${den}) on top and bottom.`,`Cancela el (${den}) que se repite arriba y abajo.`),
      L(`Restriction: the original denominator ${den} = 0 when x = ${r1}.`,`Restricción: el denominador original ${den} = 0 cuando x = ${r1}.`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
});

// 8. Compound Inequalities (uses ###BAL###)
GENERATORS[8] = () => genSet(6, () => {
  const type = choice(["add3","mul3","neg3","or"]);
  const op = choice(["<","≤"]);
  if(type==="add3"){
    const b=randIntNonZero(-9,9), sLo=randInt(-9,5), sHi=sLo+randInt(2,9);
    const left=sLo+b, right=sHi+b, undo=pmRaw(-b);
    return {q:qClean(`${left} ${op} x${pmTerm(b)} ${op} ${right}`), a:`${sLo} ${op} x ${op} ${sHi}`,
      steps:[L(`${b<0?"Add":"Subtract"} ${Math.abs(b)} from ALL THREE parts — watch it happen:###BAL:${left},x${pmTerm(b)},${right};${op},${op};${undo},${undo},${undo};${sLo},x,${sHi}###`,`${b<0?"Suma":"Resta"} ${Math.abs(b)} ${b<0?"a":"de"} LAS TRES partes — mira cómo pasa:###BAL:${left},x${pmTerm(b)},${right};${op},${op};${undo},${undo},${undo};${sLo},x,${sHi}###`),
        L(`Answer: ${sLo} ${op} x ${op} ${sHi}`,`Respuesta: ${sLo} ${op} x ${op} ${sHi}`)]};
  }
  if(type==="mul3"){
    const m=randInt(2,6), sLo=randInt(-9,5), sHi=sLo+randInt(2,9);
    const left=m*sLo, right=m*sHi;
    return {q:`${left} ${op} ${m}x ${op} ${right}`, a:`${sLo} ${op} x ${op} ${sHi}`,
      steps:[L(`Divide ALL THREE parts by ${m} — watch it happen:###BAL:${left},${m}x,${right};${op},${op};÷${m},÷${m},÷${m};${sLo},x,${sHi}###`,`Divide LAS TRES partes entre ${m} — mira cómo pasa:###BAL:${left},${m}x,${right};${op},${op};÷${m},÷${m},÷${m};${sLo},x,${sHi}###`),
        L(`Answer: ${sLo} ${op} x ${op} ${sHi}`,`Respuesta: ${sLo} ${op} x ${op} ${sHi}`)]};
  }
  if(type==="neg3"){
    const m=-randInt(2,5), sLo=randInt(-9,3), sHi=sLo+randInt(2,8);
    const left=m*sHi, right=m*sLo;
    return {q:`${left} ${op} ${linTerm(m,"x")} ${op} ${right}`, a:`${sLo} ${op} x ${op} ${sHi}`,
      steps:[L(`Divide ALL THREE parts by ${m} — BOTH signs flip:###BAL:${left},${linTerm(m,"x")},${right};${op},${op};÷${m},÷${m},÷${m};${sHi},x,${sLo};${flipOp(op)},${flipOp(op)}###`,`Divide LAS TRES partes entre ${m} — AMBOS signos se voltean:###BAL:${left},${linTerm(m,"x")},${right};${op},${op};÷${m},÷${m},÷${m};${sHi},x,${sLo};${flipOp(op)},${flipOp(op)}###`),
        L(`Rewritten left-to-right: ${sLo} ${op} x ${op} ${sHi}`,`Reescrito de izquierda a derecha: ${sLo} ${op} x ${op} ${sHi}`)]};
  }
  const b1=randInt(2,9), s1=randIntNonZero(-9,9), c1=s1+b1;
  const b2=randInt(2,9), s2=randIntNonZero(-9,9), c2=s2+b2;
  const op1=choice(["<",">"]), op2=choice(["<",">"]);
  const undo1=pmRaw(-b1), undo2=pmRaw(-b2);
  return {q:qClean(L(`x + ${b1} ${op1} ${c1}  or  x + ${b2} ${op2} ${c2}`,`x + ${b1} ${op1} ${c1}  o  x + ${b2} ${op2} ${c2}`)), a:qClean(L(`x ${op1} ${s1}  or  x ${op2} ${s2}`,`x ${op1} ${s1}  o  x ${op2} ${s2}`)),
    steps:[L(`These are two SEPARATE inequalities — solve each one on its own.`,`Estas son dos desigualdades SEPARADAS — resuelve cada una por su cuenta.`),
      L(`First one:###BAL:x + ${b1},${c1};${op1};${undo1},${undo1};x,${s1}###`,`La primera:###BAL:x + ${b1},${c1};${op1};${undo1},${undo1};x,${s1}###`),
      L(`Second one:###BAL:x + ${b2},${c2};${op2};${undo2},${undo2};x,${s2}###`,`La segunda:###BAL:x + ${b2},${c2};${op2};${undo2},${undo2};x,${s2}###`),
      L(`Answer: x ${op1} ${s1} or x ${op2} ${s2}`,`Respuesta: x ${op1} ${s1} o x ${op2} ${s2}`)]};
});

// 9. Systems — Elimination
GENERATORS[9] = () => genSet(6, () => {
  const add = choice([true,false]);
  const x0=randInt(-6,9), y0=randInt(-6,9);
  if(add){
    const b=randInt(1,5), a1=randInt(1,5), a2=randIntNonZero(1,5);
    const C1=a1*x0+b*y0, C2=a2*x0-b*y0;
    return {q:`${a1===1?"":a1}x ${b===1?"+":"+ "+b}y = ${C1}  ${L("and","y")}  ${a2===1?"":a2}x ${b===1?"−":"− "+b}y = ${C2}`.replace("+ 1y","+ y").replace("− 1y","− y"),
      a:`x = ${x0}, y = ${y0}`,
      steps:[L(`The y's are opposites — ADD the equations: ${a1+a2}x = ${C1+C2}`,`Las y son opuestas — SUMA las ecuaciones: ${a1+a2}x = ${C1+C2}`), `x = ${x0}`, L(`Plug back in: ${a1===1?"":a1}(${x0}) + ${b===1?"":b}y = ${C1} → y = ${y0}`,`Sustituye de nuevo: ${a1===1?"":a1}(${x0}) + ${b===1?"":b}y = ${C1} → y = ${y0}`)]};
  }
  const a=randInt(1,5), b1=randInt(1,6), b2=randIntNonZero(1,6);
  if(b1===b2) return null;
  const C1=a*x0+b1*y0, C2=a*x0+b2*y0;
  return {q:`${a===1?"":a}x + ${b1===1?"":b1}y = ${C1}  ${L("and","y")}  ${a===1?"":a}x + ${b2===1?"":b2}y = ${C2}`,
    a:`x = ${x0}, y = ${y0}`,
    steps:[L(`The x's match — SUBTRACT the equations: ${b1-b2}y = ${C1-C2}`,`Las x coinciden — RESTA las ecuaciones: ${b1-b2}y = ${C1-C2}`), `y = ${y0}`, L(`Plug back in: ${a===1?"":a}x + ${b1===1?"":b1}(${y0}) = ${C1} → x = ${x0}`,`Sustituye de nuevo: ${a===1?"":a}x + ${b1===1?"":b1}(${y0}) = ${C1} → x = ${x0}`)]};
});

// 10. Binomial × Trinomial (cat: expressions)
GENERATORS[10] = () => genSet(6, () => {
  const c1 = choice([1,1,1,2]), p = randIntNonZero(-4,4);
  const A=1, B=randInt(-4,5), C=randIntNonZero(-5,5);
  const t1 = [c1*A, c1*B, c1*C];       // distribute the x-part
  const t2 = [p*A, p*B, p*C];          // distribute the constant part
  const sum = [t1[0]+t2[0]||t1[0], t1[1]+t2[1], t1[2]+t2[2], t2[2]];
  // careful recombination (degree3..0)
  const r3 = c1*A, r2 = c1*B + p*A, r1 = c1*C + p*B, r0 = p*C;
  const binom = `${c1===1?"":c1}x${pmTerm(p)}`;
  const trinom = poly([[A,"x²"],[B,"x"],[C,""]]);
  return {q:`(${binom})(${trinom})`, a:poly([[r3,"x³"],[r2,"x²"],[r1,"x"],[r0,""]]),
    steps:[L(`Distribute ${c1===1?"":c1}x: ${poly([[c1*A,"x³"],[c1*B,"x²"],[c1*C,"x"]])}`,`Distribuye ${c1===1?"":c1}x: ${poly([[c1*A,"x³"],[c1*B,"x²"],[c1*C,"x"]])}`),
      L(`Distribute ${pmRaw(p)}: ${poly([[p*A,"x²"],[p*B,"x"],[p*C,""]])}`,`Distribuye ${pmRaw(p)}: ${poly([[p*A,"x²"],[p*B,"x"],[p*C,""]])}`),
      L(`Combine like terms: ${poly([[r3,"x³"],[r2,"x²"],[r1,"x"],[r0,""]])}`,`Combina los términos semejantes: ${poly([[r3,"x³"],[r2,"x²"],[r1,"x"],[r0,""]])}`)]};
});

// 11. GCF Factoring
GENERATORS[11] = () => genSet(6, () => {
  const deg3 = choice([true,false]);
  const g = randInt(2,9), m = randIntNonZero(2,6), n = randIntNonZero(2,6);
  if(m===n) return null;
  const sign = choice([1,-1]);
  const A = g*m, B = g*n;
  if(deg3){
    const q = `${A}x³ ${sign>0?"+":"−"} ${B}x²`;
    const a = `${g}x²(${m}x ${sign>0?"+":"−"} ${n})`;
    return {q, a, steps:[L(`GCF of ${A} and ${B} is ${g}; smallest power of x in both terms is x² → GCF = ${g}x²`,`El MCD de ${A} y ${B} es ${g}; la menor potencia de x en ambos términos es x² → MCD = ${g}x²`),
      L(`Divide each term by ${g}x²: ${m}x and ${sign>0?"":"−"}${n}`,`Divide cada término entre ${g}x²: ${m}x y ${sign>0?"":"−"}${n}`), L(`Answer: ${a}`,`Respuesta: ${a}`)]};
  }
  const q = `${A}x² ${sign>0?"+":"−"} ${B}x`;
  const a = `${g}x(${m}x ${sign>0?"+":"−"} ${n})`;
  return {q, a, steps:[L(`GCF of ${A} and ${B} is ${g}; both terms have at least one x → GCF = ${g}x`,`El MCD de ${A} y ${B} es ${g}; ambos términos tienen al menos una x → MCD = ${g}x`),
    L(`Divide each term by ${g}x: ${m}x and ${sign>0?"":"−"}${n}`,`Divide cada término entre ${g}x: ${m}x y ${sign>0?"":"−"}${n}`), L(`Answer: ${a}`,`Respuesta: ${a}`)]};
});

// 12. Difference of Squares
GENERATORS[12] = () => genSet(6, () => {
  const co = choice([1,1,1,2,3,5]), k = randInt(2,9);
  const A = co*co;
  const xTerm = co===1?"x²":`${A}x²`;
  const xLabel = co===1?"x":`${co}x`;
  return {q:`${xTerm} − ${k*k}`, a:`(${xLabel} − ${k})(${xLabel} + ${k})`,
    steps:[L(`Square root of ${xTerm} is ${xLabel}; square root of ${k*k} is ${k}.`,`La raíz cuadrada de ${xTerm} es ${xLabel}; la raíz cuadrada de ${k*k} es ${k}.`),
      L(`Pattern: a² − b² = (a − b)(a + b)`,`Patrón: a² − b² = (a − b)(a + b)`), L(`Answer: (${xLabel} − ${k})(${xLabel} + ${k})`,`Respuesta: (${xLabel} − ${k})(${xLabel} + ${k})`)]};
});

// 13. Factoring (Leading Coefficient)
GENERATORS[13] = () => genSet(6, () => {
  const p = choice([2,2,3,4]), q = choice([1,1,2]);
  const m = randIntNonZero(-6,6), n = randIntNonZero(-6,6);
  const A = p*q, B = p*n + q*m, C = m*n;
  if(A<2) return null;
  const n1 = p*n, n2 = q*m;
  const qText = poly([[A,"x²"],[B,"x"],[C,""]]);
  const ans = qClean(`(${p===1?"":p}x${pmTerm(m)})(${q===1?"":q}x${pmTerm(n)})`);
  return {q:qText, a:ans,
    steps:[L(`a × c = ${A} × ${C} = ${A*C}. Two numbers that multiply to ${A*C} and add to ${B}: ${n1} and ${n2}`,`a × c = ${A} × ${C} = ${A*C}. Dos números que multipliquen a ${A*C} y sumen ${B}: ${n1} y ${n2}`),
      L(`Split the middle term: ${poly([[A,"x²"],[n1,"x"],[n2,"x"],[C,""]])}`,`Divide el término del medio: ${poly([[A,"x²"],[n1,"x"],[n2,"x"],[C,""]])}`),
      L(`Group and factor each pair — it works out to: ${ans}`,`Agrupa y factoriza cada par — queda: ${ans}`)]};
});

// 14. Completing the Square (8 problems: ~6 clean + ~2 irrational)
GENERATORS[14] = () => genSet(8, () => {
  const irrational = Math.random() < 0.3;
  const p = randIntNonZero(-7,7);
  const T = irrational ? choice([2,3,5,6,7,8,10,11,12,13]) : randInt(1,9)*randInt(1,9); // T = s^2 for clean
  let s = null;
  if(!irrational) s = Math.round(Math.sqrt(T));
  if(!irrational && s*s!==T) return null;
  const c = p*p - T, b = 2*p;
  const qText = qClean(`${poly([[1,"x²"],[b,"x"],[c,""]])} = 0`);
  if(irrational){
    return {q:L(`${qText}  (leave a √ in it)`,`${qText}  (deja una √ en la respuesta)`), a:`x = ${-p} ± √${T}`,
      steps:[L(`Move the constant: x²${pmTerm(b)} = ${-c}`,`Pasa la constante al otro lado: x²${pmTerm(b)} = ${-c}`),
        L(`Half of ${b} is ${p}, squared is ${p*p} — add to both sides: (x${pmTerm(p)})² = ${T}`,`La mitad de ${b} es ${p}, al cuadrado es ${p*p} — súmalo a ambos lados: (x${pmTerm(p)})² = ${T}`),
        L(`Square root both sides (not a perfect square, so keep the √): x${pmTerm(p)} = ±√${T}`,`Saca la raíz cuadrada a ambos lados (no es un cuadrado perfecto, así que deja la √): x${pmTerm(p)} = ±√${T}`),
        L(`Answer: x = ${-p} ± √${T}`,`Respuesta: x = ${-p} ± √${T}`)]};
  }
  const r1 = -p+s, r2 = -p-s;
  if(r1===r2) return null;
  return {q:qText, a:L(`x = ${r1}  or  x = ${r2}`,`x = ${r1}  o  x = ${r2}`),
    steps:[L(`Move the constant: x²${pmTerm(b)} = ${-c}`,`Pasa la constante al otro lado: x²${pmTerm(b)} = ${-c}`),
      L(`Half of ${b} is ${p}, squared is ${p*p} — add to both sides: (x${pmTerm(p)})² = ${T}`,`La mitad de ${b} es ${p}, al cuadrado es ${p*p} — súmalo a ambos lados: (x${pmTerm(p)})² = ${T}`),
      L(`Square root both sides: x${pmTerm(p)} = ±${s}`,`Saca la raíz cuadrada a ambos lados: x${pmTerm(p)} = ±${s}`),
      L(`Answer: x = ${r1} or x = ${r2}`,`Respuesta: x = ${r1} o x = ${r2}`)]};
});

// 15. The Quadratic Formula (8 problems: ~6 rational + ~2 irrational)
GENERATORS[15] = () => genSet(8, () => {
  const irrational = Math.random() < 0.3;
  if(irrational){
    const p = randIntNonZero(-5,5), d = choice([2,3,5,6,7,8,10,11,13]);
    const b = 2*p, c = p*p - d;
    const qText = qClean(`${poly([[1,"x²"],[b,"x"],[c,""]])} = 0`);
    return {q:L(`${qText}  (leave a √ in it)`,`${qText}  (deja una √ en la respuesta)`), a:`x = ${-p} ± √${d}`,
      steps:[`a=1, b=${b}, c=${c}`,
        L(`Discriminant: b²−4ac = ${diffStr(b*b,4*c)} = ${4*d}, √${4*d} = 2√${d}`,`Discriminante: b²−4ac = ${diffStr(b*b,4*c)} = ${4*d}, √${4*d} = 2√${d}`),
        `x = (${pmRaw(-b)} ± 2√${d}) / 2`,
        L(`Answer: x = ${-p} ± √${d}`,`Respuesta: x = ${-p} ± √${d}`)]};
  }
  const p = choice([1,2,3]), q = choice([1,1,2]);
  const m = randIntNonZero(-6,6), n = randIntNonZero(-6,6);
  const a = p*q, b = p*n + q*m, c = m*n;
  if(a<1) return null;
  const disc = b*b - 4*a*c;
  const sq = Math.abs(p*n - q*m);
  if(sq*sq !== disc) return null;
  const root1 = fracStr(-m,p), root2 = fracStr(-n,q);
  if(root1===root2) return null;
  const qText = qClean(`${poly([[a,"x²"],[b,"x"],[c,""]])} = 0`);
  return {q:qText, a:L(`x = ${root1}  or  x = ${root2}`,`x = ${root1}  o  x = ${root2}`),
    steps:[`a=${a}, b=${b}, c=${c}`,
      L(`Discriminant: b²−4ac = ${disc}, √${disc} = ${sq}`,`Discriminante: b²−4ac = ${disc}, √${disc} = ${sq}`),
      `x = (${pmRaw(-b)} ± ${sq}) / ${2*a}`,
      L(`Answer: x = ${root1} or x = ${root2}`,`Respuesta: x = ${root1} o x = ${root2}`)]};
});

// 16. Multi-Step Word Problems
GENERATORS[16] = () => {
  const items = [];
  {
    const pct = choice([10,20,25,50]), P = 20*randInt(1,10);
    const sale = Math.round(P*(1-pct/100));
    items.push({q:L(`A $${P} shirt is ${pct}% off. Sale price?`,`Una camisa de $${P} tiene ${pct}% de descuento. ¿Cuál es el precio de oferta?`), a:`$${sale}`,
      steps:[L(`${pct}% off means you pay ${100-pct}% of the original price.`,`${pct}% de descuento significa que pagas ${100-pct}% del precio original.`), L(`Sale price = ${P} × ${(1-pct/100).toFixed(2)}`,`Precio de oferta = ${P} × ${(1-pct/100).toFixed(2)}`), L(`Answer: $${sale}`,`Respuesta: $${sale}`)]});
  }
  {
    const pctInc = choice([10,20,25,50]);
    const O = pctInc===25?4*randInt(2,15) : pctInc===10?10*randInt(2,10) : pctInc===20?5*randInt(2,16) : 2*randInt(2,30);
    const N = Math.round(O*(1+pctInc/100));
    items.push({q:L(`Wage goes from $${O} to $${N}. Percent increase?`,`El salario sube de $${O} a $${N}. ¿Cuál es el porcentaje de aumento?`), a:`${pctInc}%`,
      steps:[L(`Percent increase = (new − old) ÷ old`,`Porcentaje de aumento = (nuevo − viejo) ÷ viejo`), L(`(${N} − ${O}) ÷ ${O} = ${N-O} ÷ ${O} = ${(pctInc/100).toFixed(2)}`,`(${N} − ${O}) ÷ ${O} = ${N-O} ÷ ${O} = ${(pctInc/100).toFixed(2)}`), L(`Answer: ${pctInc}%`,`Respuesta: ${pctInc}%`)]});
  }
  {
    const rate = randInt(20,80), t1 = randInt(2,6), t2 = randInt(2,8);
    const d1 = rate*t1, d2 = rate*t2;
    items.push({q:L(`A car goes ${d1} mi in ${t1} hrs. At that rate, how far in ${t2} hrs?`,`Un carro recorre ${d1} mi en ${t1} h. A ese ritmo, ¿qué distancia recorre en ${t2} h?`), a:L(`${d2} miles`,`${d2} millas`),
      steps:[L(`Find the rate: ${d1} ÷ ${t1} = ${rate} mph`,`Halla la velocidad: ${d1} ÷ ${t1} = ${rate} mi/h`), L(`Multiply the rate by the new time: ${rate} × ${t2}`,`Multiplica la velocidad por el tiempo nuevo: ${rate} × ${t2}`), L(`Answer: ${d2} miles`,`Respuesta: ${d2} millas`)]});
  }
  {
    const x = randInt(5,60), sum = 3*x+3;
    items.push({q:L(`Three consecutive integers sum to ${sum}. Find them.`,`Tres enteros consecutivos suman ${sum}. Hállalos.`), a:`${x}, ${x+1}, ${x+2}`,
      steps:[L(`Let x, x+1, x+2 be the three integers.`,`Sean x, x+1, x+2 los tres enteros.`), L(`x + (x+1) + (x+2) = ${sum} → 3x + 3 = ${sum} → 3x = ${sum-3} → x = ${x}`,`x + (x+1) + (x+2) = ${sum} → 3x + 3 = ${sum} → 3x = ${sum-3} → x = ${x}`), L(`Answer: ${x}, ${x+1}, ${x+2}`,`Respuesta: ${x}, ${x+1}, ${x+2}`)]});
  }
  {
    const x = 2*randInt(2,30), sum = 2*x+2;
    items.push({q:L(`Two consecutive EVEN integers sum to ${sum}. Find them.`,`Dos enteros PARES consecutivos suman ${sum}. Hállalos.`), a:`${x}, ${x+2}`,
      steps:[L(`Let x, x+2 be the two even integers.`,`Sean x, x+2 los dos enteros pares.`), L(`x + (x+2) = ${sum} → 2x + 2 = ${sum} → 2x = ${sum-2} → x = ${x}`,`x + (x+2) = ${sum} → 2x + 2 = ${sum} → 2x = ${sum-2} → x = ${x}`), L(`Answer: ${x}, ${x+2}`,`Respuesta: ${x}, ${x+2}`)]});
  }
  {
    const rate = choice([2,4,5,10]), mult = randInt(1,9), P = 100*mult, t = randInt(1,5);
    const interest = mult*rate*t;
    items.push({q:L(`$${P} at ${rate}% simple interest for ${t} years. Interest earned?`,`$${P} al ${rate}% de interés simple durante ${t} años. ¿Cuánto interés se gana?`), a:`$${interest}`,
      steps:[L(`Simple interest = Principal × rate × time`,`Interés simple = Capital × tasa × tiempo`), `${P} × ${(rate/100).toFixed(2)} × ${t}`, L(`Answer: $${interest}`,`Respuesta: $${interest}`)]});
  }
  return items;
};

// 17. Graphing Linear Equations (uses ###GRAPH###)
GENERATORS[17] = () => genSet(6, () => {
  const type = choice(["read","eval","slope"]);
  if(type==="read"){
    const m=randIntNonZero(-6,6), b=randInt(-9,9);
    const eqStr = qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`);
    return {q:L(`Find the slope and y-intercept of ${eqStr}. ###GRAPH:line;${m},${b};${eqStr}###`,`Halla la pendiente y el intercepto con y de ${eqStr}. ###GRAPH:line;${m},${b};${eqStr}###`), a:`m = ${m}, b = ${b}`,
      steps:[L(`The number multiplying x is the slope.`,`El número que multiplica a x es la pendiente.`), L(`The number standing alone is the y-intercept.`,`El número que está solo es el intercepto con y.`), L(`Answer: m = ${m}, b = ${b}`,`Respuesta: m = ${m}, b = ${b}`)]};
  }
  if(type==="eval"){
    const m=randIntNonZero(-6,6), b=randInt(-9,9), x0=randIntNonZero(-5,5);
    const y0 = m*x0+b;
    const eqStr = qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`);
    return {q:L(`A line has slope ${m} and y-intercept ${b}. What is y when x = ${x0}? ###GRAPH:line;${m},${b};${eqStr}###`,`Una recta tiene pendiente ${m} e intercepto con y ${b}. ¿Cuánto vale y cuando x = ${x0}? ###GRAPH:line;${m},${b};${eqStr}###`), a:`y = ${y0}`,
      steps:[L(`Plug into y = mx + b: y = ${m}(${x0})${pmTerm(b)}`,`Sustituye en y = mx + b: y = ${m}(${x0})${pmTerm(b)}`), `y = ${m*x0}${pmTerm(b)}`, L(`Answer: y = ${y0}`,`Respuesta: y = ${y0}`)]};
  }
  const x1=randInt(-5,5), x2=randIntNonZero(-5,5);
  if(x1===x2) return null;
  const m=randIntNonZero(-6,6), y1=randInt(-9,9), y2=y1+m*(x2-x1);
  return {q:L(`Find the slope between the points (${x1}, ${y1}) and (${x2}, ${y2}). ###GRAPH:points;${x1},${y1},${x2},${y2};(${x1},${y1}) and (${x2},${y2})###`,`Halla la pendiente entre los puntos (${x1}, ${y1}) y (${x2}, ${y2}). ###GRAPH:points;${x1},${y1},${x2},${y2};(${x1},${y1}) y (${x2},${y2})###`), a:`m = ${m}`,
    steps:[L(`Slope = (change in y) ÷ (change in x) = (${diffStr(y2,y1)}) ÷ (${diffStr(x2,x1)})`,`Pendiente = (cambio en y) ÷ (cambio en x) = (${diffStr(y2,y1)}) ÷ (${diffStr(x2,x1)})`), `= ${y2-y1} ÷ ${x2-x1}`, L(`Answer: m = ${m}`,`Respuesta: m = ${m}`)]};
});

// 18. Writing Linear Equations
GENERATORS[18] = () => genSet(6, () => {
  const type = choice(["intercept","point","parallel","perp","twopoint"]);
  if(type==="intercept"){
    const m=randIntNonZero(-6,6), b=randInt(-9,9);
    return {q:L(`Write the equation of a line through (0, ${b}) with slope ${m}.`,`Escribe la ecuación de la recta que pasa por (0, ${b}) con pendiente ${m}.`), a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`),
      steps:[L(`The point (0,${b}) is already the y-intercept, so b = ${b}.`,`El punto (0,${b}) ya es el intercepto con y, así que b = ${b}.`), L(`Plug in: y = ${linTerm(m,"x")}${pmTerm(b)}`,`Sustituye: y = ${linTerm(m,"x")}${pmTerm(b)}`), L(`Answer: y = ${linTerm(m,"x")}${pmTerm(b)}`,`Respuesta: y = ${linTerm(m,"x")}${pmTerm(b)}`)]};
  }
  if(type==="point"){
    const m=randIntNonZero(-6,6), x0=randIntNonZero(-5,5), y0=randInt(-9,9);
    const b = y0 - m*x0;
    return {q:L(`Write the equation of a line through (${x0}, ${y0}) with slope ${m}.`,`Escribe la ecuación de la recta que pasa por (${x0}, ${y0}) con pendiente ${m}.`), a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`),
      steps:[L(`Plug into y = mx + b: ${y0} = ${m}(${x0}) + b`,`Sustituye en y = mx + b: ${y0} = ${m}(${x0}) + b`), L(`Solve: ${y0} = ${m*x0} + b → b = ${b}`,`Resuelve: ${y0} = ${m*x0} + b → b = ${b}`), L(`Answer: y = ${linTerm(m,"x")}${pmTerm(b)}`,`Respuesta: y = ${linTerm(m,"x")}${pmTerm(b)}`)]};
  }
  if(type==="parallel"){
    const m=randIntNonZero(-9,9), b=randInt(-9,9);
    return {q:L(`What is the slope of a line parallel to ${qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`)}?`,`¿Cuál es la pendiente de una recta paralela a ${qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`)}?`), a:`m = ${m}`,
      steps:[L(`Parallel lines have the same slope.`,`Las rectas paralelas tienen la misma pendiente.`), L(`Answer: m = ${m}`,`Respuesta: m = ${m}`)]};
  }
  if(type==="perp"){
    const m=randIntNonZero(-9,9);
    if(Math.abs(m)===1) return null;
    const b=randInt(-9,9);
    const perp = fracStr(-1,m);
    return {q:L(`What is the slope of a line perpendicular to ${qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`)}?`,`¿Cuál es la pendiente de una recta perpendicular a ${qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`)}?`), a:`m = ${perp}`,
      steps:[L(`Perpendicular slopes are negative reciprocals.`,`Las pendientes perpendiculares son recíprocos negativos.`), L(`Flip ${m} to 1/${m}, then negate: ${perp}`,`Voltea ${m} a 1/${m} y luego cámbiale el signo: ${perp}`), L(`Answer: m = ${perp}`,`Respuesta: m = ${perp}`)]};
  }
  const x1=randInt(-5,5), x2=randIntNonZero(-5,5);
  if(x1===x2) return null;
  const m=randIntNonZero(-6,6), y1=randInt(-9,9), y2=y1+m*(x2-x1);
  const b = y1-m*x1;
  return {q:L(`Find the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2}), then write its equation using (${x1},${y1}).`,`Halla la pendiente de la recta que pasa por (${x1}, ${y1}) y (${x2}, ${y2}), y luego escribe su ecuación usando (${x1},${y1}).`), a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`),
    steps:[L(`Slope = (${diffStr(y2,y1)})÷(${diffStr(x2,x1)}) = ${y2-y1}÷${x2-x1} = ${m}`,`Pendiente = (${diffStr(y2,y1)})÷(${diffStr(x2,x1)}) = ${y2-y1}÷${x2-x1} = ${m}`), L(`Plug into y = mx + b: ${y1} = ${m}(${x1}) + b → b = ${b}`,`Sustituye en y = mx + b: ${y1} = ${m}(${x1}) + b → b = ${b}`), L(`Answer: y = ${linTerm(m,"x")}${pmTerm(b)}`,`Respuesta: y = ${linTerm(m,"x")}${pmTerm(b)}`)]};
});

// 19. Functions & Function Notation
GENERATORS[19] = () => genSet(6, () => {
  const type = choice(["linear","quad","domain","range"]);
  if(type==="linear"){
    const m=randIntNonZero(-9,9), b=randInt(-9,9), x0=randInt(-9,9);
    const val = m*x0+b;
    return {q:qClean(L(`If f(x) = ${linTerm(m,"x")}${pmTerm(b)}, find f(${x0}).`,`Si f(x) = ${linTerm(m,"x")}${pmTerm(b)}, halla f(${x0}).`)), a:`${val}`,
      steps:[L(`Substitute x = ${x0}: f(${x0}) = ${m}(${x0})${pmTerm(b)}`,`Sustituye x = ${x0}: f(${x0}) = ${m}(${x0})${pmTerm(b)}`), L(`Simplify: ${m*x0}${pmTerm(b)} = ${val}`,`Simplifica: ${m*x0}${pmTerm(b)} = ${val}`), L(`Answer: ${val}`,`Respuesta: ${val}`)]};
  }
  if(type==="quad"){
    const B=randIntNonZero(-6,6), x0=randInt(-5,5);
    const val = x0*x0+B*x0;
    return {q:qClean(L(`If f(x) = x² ${pmTerm(B)}x, find f(${x0}).`,`Si f(x) = x² ${pmTerm(B)}x, halla f(${x0}).`)), a:`${val}`,
      steps:[L(`Substitute x = ${x0}: f(${x0}) = ${x0}² ${pmTerm(B)}(${x0})`,`Sustituye x = ${x0}: f(${x0}) = ${x0}² ${pmTerm(B)}(${x0})`), L(`Simplify: ${x0*x0}${pmTerm(B*x0)} = ${val}`,`Simplifica: ${x0*x0}${pmTerm(B*x0)} = ${val}`), L(`Answer: ${val}`,`Respuesta: ${val}`)]};
  }
  if(type==="domain"){
    const k=randIntNonZero(-9,9);
    return {q:qClean(L(`What is the domain of f(x) = 1/(x${pmTerm(k)})?`,`¿Cuál es el dominio de f(x) = 1/(x${pmTerm(k)})?`)), a:L(`all real numbers except x = ${-k}`,`todos los números reales excepto x = ${-k}`), check:L(`allrealnumbersexceptx=${-k}`,`todoslosnumerosrealesexceptox=${-k}`),
      steps:[L(`A fraction is undefined when its denominator is 0.`,`Una fracción no está definida cuando su denominador es 0.`), L(`x${pmTerm(k)} = 0 when x = ${-k}, so that value is excluded.`,`x${pmTerm(k)} = 0 cuando x = ${-k}, así que ese valor queda excluido.`), L(`Answer: all real numbers except x = ${-k}`,`Respuesta: todos los números reales excepto x = ${-k}`)]};
  }
  return {q:L(`If f(x) = x² (for x ≥ 0), what is the range?`,`Si f(x) = x² (para x ≥ 0), ¿cuál es el rango?`), a:`y ≥ 0`,
    steps:[L(`Squaring any x ≥ 0 can never produce a negative output.`,`Elevar al cuadrado cualquier x ≥ 0 nunca produce una salida negativa.`), L(`The smallest output is 0, at x = 0.`,`La salida más pequeña es 0, cuando x = 0.`), L(`Answer: y ≥ 0`,`Respuesta: y ≥ 0`)]};
});

// 20. Adding & Subtracting Polynomials
GENERATORS[20] = () => genSet(6, () => {
  const A1=randInt(-7,7), B1=randInt(-7,7), C1=randInt(-7,7);
  const A2=randIntNonZero(-7,7), B2=randInt(-7,7), C2=randInt(-7,7);
  const op = choice(["+","-"]);
  const p1 = poly([[A1,"x²"],[B1,"x"],[C1,""]]);
  const p2 = poly([[A2,"x²"],[B2,"x"],[C2,""]]);
  if(p1==="0"||p2==="0") return null;
  const result = op==="+" ? [A1+A2,B1+B2,C1+C2] : [A1-A2,B1-B2,C1-C2];
  const ansStr = poly([[result[0],"x²"],[result[1],"x"],[result[2],""]]);
  const steps = op==="+"
    ? [L(`Group like terms: (${A1} ${A2>=0?"+":"−"} ${Math.abs(A2)})x² + (${B1} ${B2>=0?"+":"−"} ${Math.abs(B2)})x + (${C1} ${C2>=0?"+":"−"} ${Math.abs(C2)})`,`Agrupa los términos semejantes: (${A1} ${A2>=0?"+":"−"} ${Math.abs(A2)})x² + (${B1} ${B2>=0?"+":"−"} ${Math.abs(B2)})x + (${C1} ${C2>=0?"+":"−"} ${Math.abs(C2)})`), L(`Combine: ${ansStr}`,`Combina: ${ansStr}`), L(`Answer: ${ansStr}`,`Respuesta: ${ansStr}`)]
    : [L(`Distribute the negative sign: ${p1} ${poly([[-A2,"x²"],[-B2,"x"],[-C2,""]])}`,`Distribuye el signo negativo: ${p1} ${poly([[-A2,"x²"],[-B2,"x"],[-C2,""]])}`), L(`Combine like terms: (${diffStr(A1,A2)})x² + (${diffStr(B1,B2)})x + (${diffStr(C1,C2)})`,`Combina los términos semejantes: (${diffStr(A1,A2)})x² + (${diffStr(B1,B2)})x + (${diffStr(C1,C2)})`), L(`Answer: ${ansStr}`,`Respuesta: ${ansStr}`)];
  return {q:`(${p1}) ${op} (${p2}) = ?`, a:ansStr, steps};
});

// 21. Multiplying Binomials (FOIL)
GENERATORS[21] = () => genSet(6, () => {
  const c1 = choice([1,1,1,2,3]), c2 = choice([1,1,1,2]);
  const p = randIntNonZero(-9,9), q = randIntNonZero(-9,9);
  const A = c1*c2, B = c1*q + c2*p, C = p*q;
  const first = A===1?"x²":`${A}x²`;
  const b1 = c1===1?"x":`${c1}x`, b2 = c2===1?"x":`${c2}x`;
  return {q:qClean(`(${b1}${pmTerm(p)})(${b2}${pmTerm(q)}) = ?`), a:poly([[A,"x²"],[B,"x"],[C,""]]),
    steps:[L(`First: ${b1} · ${b2} = ${first}`,`Primeros: ${b1} · ${b2} = ${first}`), L(`Outer + Inner: combine to give ${pmRaw(B)}x`,`Externos + Internos: se combinan y dan ${pmRaw(B)}x`), L(`Last: ${pmRaw(p)} · ${pmRaw(q)} = ${pmRaw(C)}`,`Últimos: ${pmRaw(p)} · ${pmRaw(q)} = ${pmRaw(C)}`), L(`Answer: ${poly([[A,"x²"],[B,"x"],[C,""]])}`,`Respuesta: ${poly([[A,"x²"],[B,"x"],[C,""]])}`)]};
});

// 22. Factoring Trinomials (a = 1)
GENERATORS[22] = () => genSet(6, () => {
  const n1=randIntNonZero(-9,9), n2=randIntNonZero(-9,9);
  if(n1===n2) return null;
  const B=n1+n2, C=n1*n2;
  const qText = qClean(L(`Factor: ${poly([[1,"x²"],[B,"x"],[C,""]])}`,`Factoriza: ${poly([[1,"x²"],[B,"x"],[C,""]])}`));
  const ans = qClean(`(x${pmTerm(n1)})(x${pmTerm(n2)})`);
  return {q:qText, a:ans,
    steps:[L(`Two numbers that multiply to ${C} and add to ${B}: ${n1} and ${n2}`,`Dos números que multipliquen a ${C} y sumen ${B}: ${n1} y ${n2}`), L(`Check: ${n1}×${n2}=${C}, ${n1}+${n2}=${B}`,`Comprueba: ${n1}×${n2}=${C}, ${n1}+${n2}=${B}`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
});

// 23. Factoring by Grouping
GENERATORS[23] = () => genSet(6, () => {
  const type = choice(["pure","split"]);
  if(type==="pure"){
    const A=randIntNonZero(-9,9), B=randInt(2,9);
    const qText = qClean(L(`Factor by grouping: ${poly([[1,"x³"],[A,"x²"],[B,"x"],[A*B,""]])}`,`Factoriza por agrupación: ${poly([[1,"x³"],[A,"x²"],[B,"x"],[A*B,""]])}`));
    const ans = qClean(`(x${pmTerm(A)})(x²${pmTerm(B)})`);
    return {q:qText, a:ans,
      steps:[L(`Group: (x³${pmTerm(A)}x²) + (${B}x${pmTerm(A*B)})`,`Agrupa: (x³${pmTerm(A)}x²) + (${B}x${pmTerm(A*B)})`), L(`Pull GCFs: x²(x${pmTerm(A)}) + ${B}(x${pmTerm(A)})`,`Saca los MCD: x²(x${pmTerm(A)}) + ${B}(x${pmTerm(A)})`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  }
  const p = choice([2,2,3,4]), q = choice([1,1,2]);
  const m = randIntNonZero(-6,6), n = randIntNonZero(-6,6);
  const A = p*q, Bmid = p*n + q*m, C = m*n;
  if(A<2) return null;
  const n1 = p*n, n2 = q*m;
  const qText = qClean(L(`Factor by grouping: ${poly([[A,"x²"],[Bmid,"x"],[C,""]])}  (split ${Bmid}x into ${n1}x and ${n2}x)`,`Factoriza por agrupación: ${poly([[A,"x²"],[Bmid,"x"],[C,""]])}  (divide ${Bmid}x en ${n1}x y ${n2}x)`));
  const ans = qClean(`(${p===1?"":p}x${pmTerm(m)})(${q===1?"":q}x${pmTerm(n)})`);
  return {q:qText, a:ans,
    steps:[L(`Rewrite: ${poly([[A,"x²"],[n1,"x"],[n2,"x"],[C,""]])}`,`Reescribe: ${poly([[A,"x²"],[n1,"x"],[n2,"x"],[C,""]])}`),
      L(`Group and pull the GCF from each pair.`,`Agrupa y saca el MCD de cada par.`),
      L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
});

// 24. Special Factoring Patterns
GENERATORS[24] = () => genSet(6, () => {
  const type = choice(["sqplus","sqminus","cube"]);
  if(type==="sqplus"){
    const k=randInt(2,12);
    return {q:qClean(`Factor: ${poly([[1,"x²"],[2*k,"x"],[k*k,""]])}`), a:`(x + ${k})²`,
      steps:[L(`Square roots of outer terms: √x²=x, √${k*k}=${k}`,`Raíces cuadradas de los términos de los extremos: √x²=x, √${k*k}=${k}`), L(`Check middle: 2×x×${k}=${2*k}x ✓`,`Comprueba el del medio: 2×x×${k}=${2*k}x ✓`), L(`Answer: (x + ${k})²`,`Respuesta: (x + ${k})²`)]};
  }
  if(type==="sqminus"){
    const k=randInt(2,12);
    return {q:qClean(`Factor: ${poly([[1,"x²"],[-2*k,"x"],[k*k,""]])}`), a:`(x − ${k})²`,
      steps:[L(`Square roots of outer terms: √x²=x, √${k*k}=${k}`,`Raíces cuadradas de los términos de los extremos: √x²=x, √${k*k}=${k}`), L(`Check middle: 2×x×${k}=${2*k}x ✓, subtracted so (x−${k})²`,`Comprueba el del medio: 2×x×${k}=${2*k}x ✓, se resta, así que (x−${k})²`), L(`Answer: (x − ${k})²`,`Respuesta: (x − ${k})²`)]};
  }
  const k=randInt(2,6), sum=choice([true,false]);
  if(sum) return {q:L(`Factor: x³ + ${k*k*k}`,`Factoriza: x³ + ${k*k*k}`), a:`(x + ${k})(x² − ${k}x + ${k*k})`,
    steps:[L(`Cube roots: ∛x³=x, ∛${k*k*k}=${k}`,`Raíces cúbicas: ∛x³=x, ∛${k*k*k}=${k}`), L(`Pattern a³+b³=(a+b)(a²−ab+b²), plug in a=x, b=${k}`,`Patrón a³+b³=(a+b)(a²−ab+b²), sustituye a=x, b=${k}`), L(`Answer: (x + ${k})(x² − ${k}x + ${k*k})`,`Respuesta: (x + ${k})(x² − ${k}x + ${k*k})`)]};
  return {q:L(`Factor: x³ − ${k*k*k}`,`Factoriza: x³ − ${k*k*k}`), a:`(x − ${k})(x² + ${k}x + ${k*k})`,
    steps:[L(`Cube roots: ∛x³=x, ∛${k*k*k}=${k}`,`Raíces cúbicas: ∛x³=x, ∛${k*k*k}=${k}`), L(`Pattern a³−b³=(a−b)(a²+ab+b²), plug in a=x, b=${k}`,`Patrón a³−b³=(a−b)(a²+ab+b²), sustituye a=x, b=${k}`), L(`Answer: (x − ${k})(x² + ${k}x + ${k*k})`,`Respuesta: (x − ${k})(x² + ${k}x + ${k*k})`)]};
});

// 25. Solving Quadratics by Factoring
GENERATORS[25] = () => genSet(6, () => {
  const n1=randInt(-9,9), n2=randIntNonZero(-9,9);
  if(n1===n2) return null;
  const B=n1+n2, C=n1*n2;
  const r1=-n1, r2=-n2;
  const qText = qClean(L(`Solve: ${poly([[1,"x²"],[B,"x"],[C,""]])} = 0`,`Resuelve: ${poly([[1,"x²"],[B,"x"],[C,""]])} = 0`));
  const checkStr = `x=${r1} or x=${r2}`;
  return {q:qText, a:L(`x = ${r1}  or  x = ${r2}`,`x = ${r1}  o  x = ${r2}`), check:checkStr,
    steps:[L(`Factor: (x${pmTerm(n1)})(x${pmTerm(n2)}) = 0`,`Factoriza: (x${pmTerm(n1)})(x${pmTerm(n2)}) = 0`), L(`Set each factor to 0: x${pmTerm(n1)} = 0 or x${pmTerm(n2)} = 0`,`Iguala cada factor a 0: x${pmTerm(n1)} = 0 o x${pmTerm(n2)} = 0`), L(`Answer: x = ${r1} or x = ${r2}`,`Respuesta: x = ${r1} o x = ${r2}`)]};
});

// 26. Graphing Quadratics (uses ###GRAPH###)
GENERATORS[26] = () => genSet(6, () => {
  const type = choice(["vertex","axis","opens"]);
  const h=randIntNonZero(-7,7), k=randIntNonZero(-9,9);
  if(type==="opens"){
    const a = choice([-1,2,3,-2,-3]);
    const aPrefix = a===1?"":(a===-1?"−":String(a));
    const eqStr = qClean(`y = ${aPrefix}(x${pmTerm(-h)})²${pmTerm(k)}`);
    const dir = a>0?"up":"down";
    return {q:L(`Does ${eqStr} open up or down? ###GRAPH:parabola;${a},${h},${k};${eqStr}###`,`¿La parábola ${eqStr} abre hacia arriba o hacia abajo? ###GRAPH:parabola;${a},${h},${k};${eqStr}###`), a:word(dir),
      steps:[L(`Look at a, the number multiplying the squared part: a = ${a}`,`Fíjate en a, el número que multiplica la parte al cuadrado: a = ${a}`), L(`a is ${a>0?"positive, so it opens up.":"negative, so it opens down."}`,`a es ${a>0?"positiva, así que abre hacia arriba.":"negativa, así que abre hacia abajo."}`), L(`Answer: ${dir}`,`Respuesta: ${word(dir)}`)]};
  }
  const a = choice([1,1,1,2,3]);
  const aPrefix = a===1?"":String(a);
  const eqStr = qClean(`y = ${aPrefix}(x${pmTerm(-h)})²${pmTerm(k)}`);
  if(type==="axis"){
    return {q:L(`What is the axis of symmetry of ${eqStr}? ###GRAPH:parabola;${a},${h},${k};${eqStr}###`,`¿Cuál es el eje de simetría de ${eqStr}? ###GRAPH:parabola;${a},${h},${k};${eqStr}###`), a:`x = ${h}`,
      steps:[L(`The axis of symmetry is the vertical line x = h.`,`El eje de simetría es la línea vertical x = h.`), L(`h = ${h} here.`,`Aquí h = ${h}.`), L(`Answer: x = ${h}`,`Respuesta: x = ${h}`)]};
  }
  return {q:L(`Find the vertex of ${eqStr}. ###GRAPH:parabola;${a},${h},${k};${eqStr}###`,`Halla el vértice de ${eqStr}. ###GRAPH:parabola;${a},${h},${k};${eqStr}###`), a:`h = ${h}, k = ${k}`,
    steps:[L(`Compare to (x − h)²: h = ${h}`,`Compara con (x − h)²: h = ${h}`), L(`The number added at the end is k: k = ${k}`,`El número que se suma al final es k: k = ${k}`), L(`Answer: h = ${h}, k = ${k}`,`Respuesta: h = ${h}, k = ${k}`)]};
});

// 27. Rational Expression Operations (cat: rational)
GENERATORS[27] = () => genSet(6, () => {
  const type = choice(["mulCancelBin","mulCancelX","divX","divBin","addDiffDenom","subSameDenom"]);
  if(type==="mulCancelBin"){
    const k=randIntNonZero(2,9), m=randInt(2,9);
    const ans = L(`x/${m}, where x ≠ ${pmRaw(-k)}`,`x/${m}, donde x ≠ ${pmRaw(-k)}`);
    return {q:`<span class='frac'><span class='frac-num'>x</span><span class='frac-den'>x${pmTerm(k)}</span></span> × <span class='frac'><span class='frac-num'>x${pmTerm(k)}</span><span class='frac-den'>${m}</span></span> = ?`, a:ans,
      steps:[L(`Multiply across: x(x${pmTerm(k)}) / ${m}(x${pmTerm(k)})`,`Multiplica directo: x(x${pmTerm(k)}) / ${m}(x${pmTerm(k)})`), L(`Cancel the shared (x${pmTerm(k)})`,`Cancela el (x${pmTerm(k)}) compartido`), L(`Restriction: x${pmTerm(k)} = 0 when x = ${pmRaw(-k)}`,`Restricción: x${pmTerm(k)} = 0 cuando x = ${pmRaw(-k)}`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  }
  if(type==="mulCancelX"){
    const c1=randInt(2,12), c2=randInt(2,12);
    const ans = L(`${fracStr(c1,c2)}, where x ≠ 0`,`${fracStr(c1,c2)}, donde x ≠ 0`);
    return {q:`<span class='frac'><span class='frac-num'>${c1}</span><span class='frac-den'>x</span></span> × <span class='frac'><span class='frac-num'>x</span><span class='frac-den'>${c2}</span></span> = ?`, a:ans,
      steps:[L(`Multiply across: ${c1}x / ${c2}x`,`Multiplica directo: ${c1}x / ${c2}x`), L(`Cancel the shared x: ${c1}/${c2}`,`Cancela la x compartida: ${c1}/${c2}`), L(`Restriction: x = 0`,`Restricción: x = 0`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  }
  if(type==="divX"){
    const c1=randInt(2,12), c2=randInt(2,12);
    const ans = L(`${fracStr(c1,c2)}, where x ≠ 0`,`${fracStr(c1,c2)}, donde x ≠ 0`);
    return {q:`<span class='frac'><span class='frac-num'>${c1}</span><span class='frac-den'>x</span></span> ÷ <span class='frac'><span class='frac-num'>${c2}</span><span class='frac-den'>x</span></span> = ?`, a:ans,
      steps:[L(`Flip the second fraction and multiply: ${c1}/x × x/${c2}`,`Voltea la segunda fracción y multiplica: ${c1}/x × x/${c2}`), L(`Cancel the shared x: ${c1}/${c2}`,`Cancela la x compartida: ${c1}/${c2}`), L(`Restriction: x = 0`,`Restricción: x = 0`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  }
  if(type==="divBin"){
    const k=randIntNonZero(2,9), m=randInt(2,9), n=randInt(2,9);
    const ans = L(`${fracStr(n,m)}, where x ≠ ${pmRaw(-k)}`,`${fracStr(n,m)}, donde x ≠ ${pmRaw(-k)}`);
    return {q:`<span class='frac'><span class='frac-num'>x${pmTerm(k)}</span><span class='frac-den'>${m}</span></span> ÷ <span class='frac'><span class='frac-num'>x${pmTerm(k)}</span><span class='frac-den'>${n}</span></span> = ?`, a:ans,
      steps:[L(`Flip the second fraction and multiply: (x${pmTerm(k)})/${m} × ${n}/(x${pmTerm(k)})`,`Voltea la segunda fracción y multiplica: (x${pmTerm(k)})/${m} × ${n}/(x${pmTerm(k)})`), L(`Cancel the shared (x${pmTerm(k)}): ${n}/${m}`,`Cancela el (x${pmTerm(k)}) compartido: ${n}/${m}`), L(`Restriction: x${pmTerm(k)} = 0 when x = ${pmRaw(-k)}`,`Restricción: x${pmTerm(k)} = 0 cuando x = ${pmRaw(-k)}`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  }
  if(type==="addDiffDenom"){
    const m=randInt(2,9);
    const ans = L(`(${m} + x)/${m}x, where x ≠ 0`,`(${m} + x)/${m}x, donde x ≠ 0`);
    return {q:`<span class='frac'><span class='frac-num'>1</span><span class='frac-den'>x</span></span> + <span class='frac'><span class='frac-num'>1</span><span class='frac-den'>${m}</span></span> = ?  (${L("common denominator is","el denominador común es")} ${m}x)`, a:ans,
      steps:[L(`Common denominator: ${m}x`,`Denominador común: ${m}x`), L(`Rewrite each fraction over ${m}x: ${m}/${m}x + x/${m}x`,`Reescribe cada fracción sobre ${m}x: ${m}/${m}x + x/${m}x`), L(`Restriction: x = 0`,`Restricción: x = 0`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
  }
  const c1=randInt(3,12), c2=randInt(1,c1-1);
  const diff=c1-c2;
  const diffStr = diff===1?"1/x":`${diff}/x`;
  const ans = L(`${diffStr}, where x ≠ 0`,`${diffStr}, donde x ≠ 0`);
  return {q:`<span class='frac'><span class='frac-num'>${c1}</span><span class='frac-den'>x</span></span> − <span class='frac'><span class='frac-num'>${c2}</span><span class='frac-den'>x</span></span> = ?  (${L("same denominator already","ya tienen el mismo denominador")})`, a:ans,
    steps:[L(`Same denominator, so just subtract the numerators: ${c1} − ${c2} = ${diff}`,`Mismo denominador, así que solo resta los numeradores: ${c1} − ${c2} = ${diff}`), L(`Restriction: x = 0`,`Restricción: x = 0`), L(`Answer: ${ans}`,`Respuesta: ${ans}`)]};
});

// 28. Radical Operations (cat: foundations)
GENERATORS[28] = () => genSet(6, () => {
  const type = choice(["add","sub","mulProduct","mulSame","rationalize"]);
  if(type==="add"){
    const c1=randInt(2,12), c2=randInt(2,12), r=choice(SQUAREFREE);
    return {q:`${c1}√${r} + ${c2}√${r} = ?`, a:`${c1+c2}√${r}`,
      steps:[L(`Same radical, add the coefficients.`,`Mismo radical, suma los coeficientes.`), `${c1} + ${c2} = ${c1+c2}`, L(`Answer: ${c1+c2}√${r}`,`Respuesta: ${c1+c2}√${r}`)]};
  }
  if(type==="sub"){
    const c2=randInt(2,9), c1=c2+randInt(1,9), r=choice(SQUAREFREE);
    const diff=c1-c2;
    return {q:`${c1}√${r} − ${c2}√${r} = ?`, a: diff===1?`√${r}`:`${diff}√${r}`,
      steps:[L(`Same radical, subtract the coefficients.`,`Mismo radical, resta los coeficientes.`), `${c1} − ${c2} = ${diff}`, L(`Answer: ${diff===1?`√${r}`:`${diff}√${r}`}`,`Respuesta: ${diff===1?`√${r}`:`${diff}√${r}`}`)]};
  }
  if(type==="mulProduct"){
    const sOpts = [4,6,8,9,10,12];
    const s = choice(sOpts);
    const divisors = [2,3,4,5,6].filter(j=>j>1 && j<s && s%j===0);
    if(!divisors.length) return null;
    const j = choice(divisors);
    const m = s*j, n = s/j;
    return {q:`√${m} × √${n} = ?`, a:`${s}`,
      steps:[L(`Multiply what's under the roots: ${m} × ${n} = ${m*n}`,`Multiplica lo que hay bajo las raíces: ${m} × ${n} = ${m*n}`), `√${m*n} = ${s}`, L(`Answer: ${s}`,`Respuesta: ${s}`)]};
  }
  if(type==="mulSame"){
    const r=randInt(2,12);
    return {q:`√${r} × √${r} = ?`, a:`${r}`,
      steps:[L(`Multiply what's under the roots: ${r} × ${r} = ${r*r}`,`Multiplica lo que hay bajo las raíces: ${r} × ${r} = ${r*r}`), `√${r*r} = ${r}`, L(`Answer: ${r}`,`Respuesta: ${r}`)]};
  }
  const r = choice(SQUAREFREE);
  return {q:L(`Rationalize: 1/√${r}`,`Racionaliza: 1/√${r}`), a:`√${r}/${r}`,
    steps:[L(`Multiply top and bottom by √${r}.`,`Multiplica arriba y abajo por √${r}.`), `(1×√${r}) / (√${r}×√${r}) = √${r}/${r}`, L(`Answer: √${r}/${r}`,`Respuesta: √${r}/${r}`)]};
});

// 29. Absolute Value Inequalities
GENERATORS[29] = () => genSet(6, () => {
  const type = choice(["between","or","plain"]);
  if(type==="between"){
    const b=randInt(-9,9), c=randInt(2,9), op=choice(["<","≤"]);
    const lo=b-c, hi=b+c;
    return {q:qClean(L(`Solve: |x${pmTerm(-b)}| ${op} ${c}`,`Resuelve: |x${pmTerm(-b)}| ${op} ${c}`)), a:`${lo} ${op} x ${op} ${hi}`,
      steps:[L(`Rewrite as between: −${c} ${op} x${pmTerm(-b)} ${op} ${c}`,`Reescribe como entre: −${c} ${op} x${pmTerm(-b)} ${op} ${c}`), L(`Add ${b} to all parts: ${lo} ${op} x ${op} ${hi}`,`Suma ${b} a todas las partes: ${lo} ${op} x ${op} ${hi}`), L(`Answer: ${lo} ${op} x ${op} ${hi}`,`Respuesta: ${lo} ${op} x ${op} ${hi}`)]};
  }
  if(type==="or"){
    const b=randInt(-9,9), c=randInt(2,9), opOut=choice([">","≥"]), opIn=opOut===">"?"<":"≤";
    const lo=b-c, hi=b+c;
    return {q:qClean(L(`Solve: |x${pmTerm(-b)}| ${opOut} ${c}`,`Resuelve: |x${pmTerm(-b)}| ${opOut} ${c}`)), a:qClean(L(`x ${opOut} ${hi}  or  x ${opIn} ${lo}`,`x ${opOut} ${hi}  o  x ${opIn} ${lo}`)),
      steps:[L(`Split with OR: x${pmTerm(-b)} ${opOut} ${c} OR x${pmTerm(-b)} ${opIn} −${c}`,`Separa con O: x${pmTerm(-b)} ${opOut} ${c} O x${pmTerm(-b)} ${opIn} −${c}`), L(`Solve each: x ${opOut} ${hi} OR x ${opIn} ${lo}`,`Resuelve cada una: x ${opOut} ${hi} O x ${opIn} ${lo}`), L(`Answer: x ${opOut} ${hi} or x ${opIn} ${lo}`,`Respuesta: x ${opOut} ${hi} o x ${opIn} ${lo}`)]};
  }
  const c=randInt(2,15), op=choice(["≤","<"]);
  return {q:L(`Solve: |x| ${op} ${c}`,`Resuelve: |x| ${op} ${c}`), a:`−${c} ${op} x ${op} ${c}`,
    steps:[L(`Rewrite as between: −${c} ${op} x ${op} ${c}`,`Reescribe como entre: −${c} ${op} x ${op} ${c}`), L(`Answer: −${c} ${op} x ${op} ${c}`,`Respuesta: −${c} ${op} x ${op} ${c}`)]};
});

// 30. Graphing Inequalities (uses ###GRAPH###)
GENERATORS[30] = () => genSet(6, () => {
  const type = choice(["circleOpen","circleClosed","boundary","shade"]);
  if(type==="circleOpen"){
    const v=randInt(-9,9), op=choice(["<",">"]);
    const dir = op==="<"?"left":"right";
    return {q:L(`On a number line, is x ${op} ${v} an open or closed circle at ${v}? ###GRAPH:numberline;${v},open,${dir};x ${op} ${v}###`,`En una recta numérica, ¿x ${op} ${v} lleva un círculo abierto o cerrado en ${v}? ###GRAPH:numberline;${v},open,${dir};x ${op} ${v}###`), a:word("open"),
      steps:[L(`${op} does not include the number itself.`,`${op} no incluye al número mismo.`), L(`That means an open circle.`,`Eso significa un círculo abierto.`), L(`Answer: open`,`Respuesta: abierto`)]};
  }
  if(type==="circleClosed"){
    const v=randInt(-9,9), op=choice(["≤","≥"]);
    const dir = op==="≤"?"left":"right";
    return {q:L(`On a number line, is x ${op} ${v} an open or closed circle at ${v}? ###GRAPH:numberline;${v},closed,${dir};x ${op} ${v}###`,`En una recta numérica, ¿x ${op} ${v} lleva un círculo abierto o cerrado en ${v}? ###GRAPH:numberline;${v},closed,${dir};x ${op} ${v}###`), a:word("closed"),
      steps:[L(`${op} includes the number itself.`,`${op} incluye al número mismo.`), L(`That means a closed circle.`,`Eso significa un círculo cerrado.`), L(`Answer: closed`,`Respuesta: cerrado`)]};
  }
  const m=randIntNonZero(-6,6), b=randInt(-9,9);
  const op=choice(["≥","≤",">","<"]);
  const dashed = (op===">"||op==="<");
  const above = (op===">"||op==="≥");
  const eqStr = qClean(`y ${op} ${linTerm(m,"x")}${pmTerm(b)}`);
  if(type==="boundary"){
    return {q:L(`For ${eqStr}, is the boundary line dashed or solid? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`,`Para ${eqStr}, ¿la recta frontera es discontinua o continua? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`), a:word(dashed?"dashed":"solid"),
      steps:[L(`The symbol is ${op}${dashed?", strictly":", which includes equal to."}`,`El símbolo es ${op}${dashed?", estrictamente":", que incluye el igual."}`), L(`${dashed?"< / > → dashed line.":"≤ / ≥ → solid line."}`,`${dashed?"< / > → recta discontinua.":"≤ / ≥ → recta continua."}`), L(`Answer: ${dashed?"dashed":"solid"}`,`Respuesta: ${word(dashed?"dashed":"solid")}`)]};
  }
  return {q:L(`For ${eqStr}, which way do you shade? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`,`Para ${eqStr}, ¿hacia dónde se sombrea? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`), a:word(above?"above":"below"),
    steps:[L(`The inequality says "y ${op}".`,`La desigualdad dice "y ${op}".`), L(`"y ${op}" always shades ${above?"above":"below"} the line.`,`"y ${op}" siempre sombrea ${above?"por encima":"por debajo"} de la recta.`), L(`Answer: ${above?"above":"below"}`,`Respuesta: ${word(above?"above":"below")}`)]};
});

// 31. Direct & Inverse Variation
GENERATORS[31] = () => genSet(6, () => {
  const type = choice(["directY","inverseY","directX","workers"]);
  if(type==="directY"){
    const k=randInt(2,9), x1=randInt(2,9), x2=randIntNonZero(2,12);
    if(x1===x2) return null;
    const y1=k*x1, y2=k*x2;
    return {q:L(`y varies directly with x. y = ${y1} when x = ${x1}. Find y when x = ${x2}.`,`y varía directamente con x. y = ${y1} cuando x = ${x1}. Halla y cuando x = ${x2}.`), a:`y = ${y2}`,
      steps:[L(`Find k: k = ${y1}/${x1} = ${k}`,`Halla k: k = ${y1}/${x1} = ${k}`), L(`Use y = kx: y = ${k} × ${x2}`,`Usa y = kx: y = ${k} × ${x2}`), L(`Answer: y = ${y2}`,`Respuesta: y = ${y2}`)]};
  }
  if(type==="inverseY"){
    const x1=randInt(2,9), y1=randInt(2,9), k=x1*y1;
    const divisors=[2,3,4,5,6,7,8,9].filter(d=>d!==x1 && k%d===0);
    if(!divisors.length) return null;
    const x2=choice(divisors), y2=k/x2;
    return {q:L(`y varies inversely with x. y = ${y1} when x = ${x1}. Find y when x = ${x2}.`,`y varía inversamente con x. y = ${y1} cuando x = ${x1}. Halla y cuando x = ${x2}.`), a:`y = ${y2}`,
      steps:[L(`Find k: k = xy = ${x1} × ${y1} = ${k}`,`Halla k: k = xy = ${x1} × ${y1} = ${k}`), L(`Use y = k/x: y = ${k}/${x2}`,`Usa y = k/x: y = ${k}/${x2}`), L(`Answer: y = ${y2}`,`Respuesta: y = ${y2}`)]};
  }
  if(type==="directX"){
    const k=randInt(2,9), x1=randInt(2,9), y1=k*x1, x3=randIntNonZero(2,12);
    if(x3===x1) return null;
    const y3=k*x3;
    return {q:L(`y varies directly with x. y = ${y1} when x = ${x1}. Find x when y = ${y3}.`,`y varía directamente con x. y = ${y1} cuando x = ${x1}. Halla x cuando y = ${y3}.`), a:`x = ${x3}`,
      steps:[L(`Find k: k = ${y1}/${x1} = ${k}`,`Halla k: k = ${y1}/${x1} = ${k}`), L(`Use y = kx: ${y3} = ${k}x, so x = ${x3}`,`Usa y = kx: ${y3} = ${k}x, así que x = ${x3}`), L(`Answer: x = ${x3}`,`Respuesta: x = ${x3}`)]};
  }
  const w1=randInt(2,9), h1=randInt(2,9), k=w1*h1;
  const divisors=[2,3,4,5,6,7,8,9].filter(d=>d!==w1 && k%d===0);
  if(!divisors.length) return null;
  const w2=choice(divisors), h2=k/w2;
  return {q:L(`It takes ${w1} workers ${h1} hours to finish a job (inverse variation). How long for ${w2} workers?`,`${w1} trabajadores tardan ${h1} horas en terminar un trabajo (variación inversa). ¿Cuánto tardarían ${w2} trabajadores?`), a:L(`${h2} hours`,`${h2} horas`), check:`${h2}`,
    steps:[L(`Find k: k = workers × hours = ${w1} × ${h1} = ${k}`,`Halla k: k = trabajadores × horas = ${w1} × ${h1} = ${k}`), L(`Use hours = k/workers: ${k}/${w2}`,`Usa horas = k/trabajadores: ${k}/${w2}`), L(`Answer: ${h2} hours`,`Respuesta: ${h2} horas`)]};
});

// 32. Exponential Growth & Decay
GENERATORS[32] = () => genSet(6, () => {
  const growth = choice([true,false]);
  const r = choice([5,10,15,20,25,50]);
  const P = 100*randInt(1,50);
  const t = choice([1,2]);
  const factor = growth ? 1+r/100 : 1-r/100;
  const value = P*Math.pow(factor,t);
  const money = formatMoney(value);
  const subject = choice(["money","population"]);
  const q = growth
    ? (subject==="money" ? L(`$${P} grows ${r}% per year. What is it worth after ${t} year${t>1?"s":""}?`,`$${P} crecen ${r}% por año. ¿Cuánto valdrán después de ${t} ${t>1?"años":"año"}?`)
                          : L(`A population of ${P} grows ${r}% per year. What is it after ${t} year${t>1?"s":""}?`,`Una población de ${P} crece ${r}% por año. ¿Cuánto será después de ${t} ${t>1?"años":"año"}?`))
    : (()=>{ const thing = choice(["machine","laptop","car"]); const esThing = {machine:"Una máquina",laptop:"Una laptop",car:"Un carro"}[thing];
        return L(`A $${P} ${thing} depreciates ${r}% per year. What is it worth after ${t} year${t>1?"s":""}?`,`${esThing} de $${P} se deprecia ${r}% por año. ¿Cuánto vale después de ${t} ${t>1?"años":"año"}?`); })();
  const a = (growth && subject==="population") ? formatMoney(value) : `$${money}`;
  return {q, a,
    steps:[L(`${growth?"Growth":"Decay"} factor: 1 ${growth?"+":"−"} ${(r/100).toFixed(2)} = ${factor.toFixed(2)}`,`Factor de ${growth?"crecimiento":"decaimiento"}: 1 ${growth?"+":"−"} ${(r/100).toFixed(2)} = ${factor.toFixed(2)}`),
      L(`Plug in: y = ${P}(${factor.toFixed(2)})${toSup(t)}`,`Sustituye: y = ${P}(${factor.toFixed(2)})${toSup(t)}`), L(`Answer: ${a}`,`Respuesta: ${a}`)]};
});

// 33. Arithmetic Sequences
GENERATORS[33] = () => genSet(6, () => {
  const type = choice(["diff","diff","nth","nth","nth","nth"]);
  if(type==="diff"){
    const a1=randInt(-20,60), d=randIntNonZero(-9,9);
    return {q:L(`Find the common difference: ${a1}, ${a1+d}, ${a1+2*d}, ${a1+3*d}…`,`Halla la diferencia común: ${a1}, ${a1+d}, ${a1+2*d}, ${a1+3*d}…`), a:`d = ${d}`,
      steps:[L(`Subtract consecutive terms: ${diffStr(a1+d,a1)} = ${d}`,`Resta términos consecutivos: ${diffStr(a1+d,a1)} = ${d}`), L(`Answer: d = ${d}`,`Respuesta: d = ${d}`)]};
  }
  const a1=randInt(1,20), d=randIntNonZero(-9,9), n=randInt(5,25);
  const term=a1+(n-1)*d;
  return {q:L(`Find the ${n}th term of ${a1}, ${a1+d}, ${a1+2*d}… (d = ${d})`,`Halla el término número ${n} de ${a1}, ${a1+d}, ${a1+2*d}… (d = ${d})`), a:`${term}`,
    steps:[L(`Use aₙ = a₁ + (n−1)d: a${toSub(n)} = ${a1} + (${n}−1)(${d})`,`Usa aₙ = a₁ + (n−1)d: a${toSub(n)} = ${a1} + (${n}−1)(${d})`), `a${toSub(n)} = ${a1} ${d*(n-1)>=0?"+":"−"} ${Math.abs(d*(n-1))}`, L(`Answer: ${term}`,`Respuesta: ${term}`)]};
});

// 34. Data & Statistics Basics
GENERATORS[34] = () => genSet(6, () => {
  const type = choice(["mean","medianOdd","mode","range","medianEven"]);
  if(type==="mean"){
    const target = randInt(10,90);
    const vals = [randInt(0,100),randInt(0,100),randInt(0,100),randInt(0,100)];
    const last = target*5 - vals.reduce((s,v)=>s+v,0);
    if(last<0 || last>150) return null;
    const all = [...vals,last];
    return {q:L(`Find the mean of: ${all.join(", ")}`,`Halla la media de: ${all.join(", ")}`), a:`${target}`,
      steps:[L(`Add them all: ${all.join("+")} = ${target*5}`,`Súmalos todos: ${all.join("+")} = ${target*5}`), L(`Divide by 5: ${target*5} ÷ 5 = ${target}`,`Divide entre 5: ${target*5} ÷ 5 = ${target}`), L(`Answer: ${target}`,`Respuesta: ${target}`)]};
  }
  if(type==="medianOdd"){
    const set = new Set();
    while(set.size<5) set.add(randInt(0,100));
    const vals = [...set];
    const sorted = [...vals].sort((a,b)=>a-b);
    const shuffled = [...vals].sort(()=>Math.random()-0.5);
    return {q:L(`Find the median of: ${shuffled.join(", ")}`,`Halla la mediana de: ${shuffled.join(", ")}`), a:`${sorted[2]}`,
      steps:[L(`Sort: ${sorted.join(", ")}`,`Ordena: ${sorted.join(", ")}`), L(`Pick the middle value: ${sorted[2]}`,`Toma el valor del medio: ${sorted[2]}`), L(`Answer: ${sorted[2]}`,`Respuesta: ${sorted[2]}`)]};
  }
  if(type==="mode"){
    const modeVal = randInt(0,20);
    const others = new Set([modeVal]);
    while(others.size<3) others.add(randInt(0,20));
    others.delete(modeVal);
    const otherVals = [...others];
    const vals = [modeVal,modeVal,modeVal,otherVals[0],otherVals[1]].sort(()=>Math.random()-0.5);
    return {q:L(`Find the mode of: ${vals.join(", ")}`,`Halla la moda de: ${vals.join(", ")}`), a:`${modeVal}`,
      steps:[L(`Count how many times each value appears.`,`Cuenta cuántas veces aparece cada valor.`), L(`${modeVal} appears three times — more than any other.`,`El ${modeVal} aparece tres veces — más que cualquier otro.`), L(`Answer: ${modeVal}`,`Respuesta: ${modeVal}`)]};
  }
  if(type==="range"){
    const set = new Set();
    while(set.size<5) set.add(randInt(0,30));
    const vals = [...set];
    const range = Math.max(...vals)-Math.min(...vals);
    return {q:L(`Find the range of: ${vals.join(", ")}`,`Halla el rango de: ${vals.join(", ")}`), a:`${range}`,
      steps:[L(`Range = largest − smallest = ${Math.max(...vals)} − ${Math.min(...vals)}`,`Rango = mayor − menor = ${Math.max(...vals)} − ${Math.min(...vals)}`), L(`Answer: ${range}`,`Respuesta: ${range}`)]};
  }
  const set = new Set();
  while(set.size<4) set.add(randInt(0,30));
  const vals=[...set];
  const sorted=[...vals].sort((a,b)=>a-b);
  const med = (sorted[1]+sorted[2])/2;
  const medStr = Number.isInteger(med)?String(med):med.toFixed(1);
  const shuffled=[...vals].sort(()=>Math.random()-0.5);
  return {q:L(`Find the median of: ${shuffled.join(", ")}  (even count — average the two middle values)`,`Halla la mediana de: ${shuffled.join(", ")}  (cantidad par — promedia los dos valores del medio)`), a:medStr,
    steps:[L(`Sort: ${sorted.join(", ")}`,`Ordena: ${sorted.join(", ")}`), L(`Average the two middle values: (${sorted[1]} + ${sorted[2]}) ÷ 2`,`Promedia los dos valores del medio: (${sorted[1]} + ${sorted[2]}) ÷ 2`), L(`Answer: ${medStr}`,`Respuesta: ${medStr}`)]};
});



