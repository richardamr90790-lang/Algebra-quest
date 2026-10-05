/* ===================== PROCEDURAL PRACTICE GENERATORS =====================
   Produces fresh independent-practice problems on demand. Guided Practice and
   Worked Examples are NOT touched by this — they stay the fixed, hand-written
   content. Every generator below builds each problem "backward" from a chosen
   clean answer (nice roots/factors/numbers), so the answer is correct by
   construction rather than independently (re)solved — the safest way to avoid
   generator bugs at this scale. */

import { L, getLang } from "../i18n.js";
import { translateStep } from "../step-es.js";
import * as K from "./steps.js";
const { start, st, fin, solveSteps, solveIneqSteps, compoundSteps, absSteps, absIneqSteps, substSteps, elimSteps, distributeSteps, gcfSteps, dosSteps, acSteps, tri1Steps, group4Steps, group2Steps, psSteps, cubesSteps, foilSteps, polyOpSteps, ctsSteps, qfSteps, factorSolveSteps, readSteps, evalLineSteps, twoPointSlope, slopeSteps, ptSlopeSteps, parallelSteps, perpSteps, evalFSteps, domainSteps, rangeSqSteps, vertexSteps, axisSteps, opensSteps, ratDiffSq, ratGcf, ratTrinom, ratMulSteps, ratAddSteps, radAddSteps, radMulSteps, radRatSteps, sqrtSteps, expSteps, sciToSteps, sciFromSteps, sciOpSteps, pctOffSteps, pctIncSteps, rateSteps, interestSteps, consecSteps, nlCircleSteps, lineStyleSteps, shadeSteps, directSteps, inverseSteps, workersSteps, growthSteps, dseqSteps, nthSteps, meanSteps, medianSteps, modeSteps, rangeSteps } = K;

// The Spanish step table is downloaded the first time Spanish is used (see localize.js). Until then steps stay English.
let stepTable = null;
export const setStepTable = (tbl) => { stepTable = tbl; };
const esSteps = (steps) => (getLang()==="es" && stepTable ? steps.map((s)=>translateStep(s, stepTable)) : steps);

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
function fmtComma(n){ return n.toLocaleString("en-US"); }
// " + 5" or " − 5" (with a leading space) — for splicing after a variable, e.g. "x" + pmTerm(5) -> "x + 5"
export function pmTerm(n){ if(n===0) return ""; return n<0 ? ` − ${-n}` : ` + ${n}`; }
// "+5" or "−5" (no leading space) — for standalone operation terms, e.g. BAL rows or "Distribute -2:"
function pmRaw(n){ return n<0 ? `−${-n}` : `${n}`; }
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
// Worked steps are written in English by ./steps.js and turned into Spanish (when the language is Spanish) by step-es.js.
// "x = 3  or  x = 5" / "x = 3  o  x = 5" — the double spaces are the app's house style for the typed answer.
const orAns = (ans) => L(ans.replace(" or ", "  or  "), ans.replace(" or ", "  o  "));

// 1. Exponent Rules
GENERATORS[1] = () => genSet(6, () => {
  const type = choice(["mul","pow","div","zero","neg","coef"]);
  if(type==="mul"){
    const a=randInt(2,9), b=randInt(2,9);
    return {q:`x${toSup(a)} · x${toSup(b)} = ?`, a:`x${toSup(a+b)}`, steps:expSteps("mul",{a,b})};
  }
  if(type==="pow"){
    const a=randInt(2,5), b=randInt(2,5);
    return {q:`(x${toSup(a)})${toSup(b)} = ?`, a:`x${toSup(a*b)}`, steps:expSteps("pow",{a,b})};
  }
  if(type==="div"){
    const b=randInt(2,6), diff=randInt(1,7), a=b+diff;
    return {q:`x${toSup(a)} ÷ x${toSup(b)} = ?`, a:`x${toSup(diff)}`, steps:expSteps("div",{a,b})};
  }
  if(type==="zero"){
    const c=randInt(2,9);
    return {q:`${c}x⁰ = ?`, a:`${c}`, steps:expSteps("zero",{c})};
  }
  if(type==="neg"){
    const a=randInt(2,5);
    return {q:L(`x${toSup(-a)} = ? (as a fraction)`,`x${toSup(-a)} = ? (como fracción)`), a:`1/x${toSup(a)}`, steps:expSteps("neg",{a})};
  }
  const c1=randInt(2,5), c2=randInt(2,5), a=randInt(2,5), b=randInt(2,5);
  return {q:`(${c1}x${toSup(a)})(${c2}x${toSup(b)}) = ?`, a:`${c1*c2}x${toSup(a+b)}`, steps:expSteps("coef",{c1,c2,a,b})};
});

// 2. Scientific Notation
GENERATORS[2] = () => {
  const items = [];
  {
    const d1=randInt(2,9), d2=randInt(1,9), e=randInt(3,6);
    const moved = [String(d2)].concat(Array(e-1).fill("0"));
    const num = fmtComma(Math.round((d1*10 + d2) * Math.pow(10,e-1)));
    items.push({q:L(`Write ${num} in scientific notation.`,`Escribe ${num} en notación científica.`), a:`${d1}.${d2} × 10${toSup(e)}`,
      steps:sciToSteps(true,d1,d2,e,num,`###DP:${d1}:${moved.join(",")}:###`)});
  }
  {
    const d1=randInt(1,9), d2=randInt(1,9), e=randInt(2,5);
    const moved = Array(e-1).fill("0").concat([String(d1)]);
    const decStr = "0." + "0".repeat(e-1) + d1 + d2;
    items.push({q:L(`Write ${decStr} in scientific notation.`,`Escribe ${decStr} en notación científica.`), a:`${d1}.${d2} × 10${toSup(-e)}`,
      steps:sciToSteps(false,d1,d2,e,decStr,`###DP::${moved.join(",")}:${d2}###`)});
  }
  {
    const d1=randInt(2,9), d2=randInt(1,9), e=randInt(3,6);
    const moved = [String(d2)].concat(Array(e-1).fill("0"));
    const num = fmtComma(Math.round((d1*10 + d2) * Math.pow(10,e-1)));
    items.push({q:L(`Write ${d1}.${d2} × 10${toSup(e)} in standard form.`,`Escribe ${d1}.${d2} × 10${toSup(e)} en forma estándar.`), a:num,
      steps:sciFromSteps(true,d1,d2,e,num,`###DP:${d1}:${moved.join(",")}:###`)});
  }
  {
    const d1=randInt(1,9), d2=randInt(1,9), e=randInt(2,5);
    const moved = Array(e-1).fill("0").concat([String(d1)]);
    const decStr = "0." + "0".repeat(e-1) + d1 + d2;
    items.push({q:L(`Write ${d1}.${d2} × 10${toSup(-e)} in standard form.`,`Escribe ${d1}.${d2} × 10${toSup(-e)} en forma estándar.`), a:decStr,
      steps:sciFromSteps(false,d1,d2,e,decStr,`###DP::${moved.join(",")}:${d2}###`)});
  }
  {
    const c2=randInt(2,4), m=randInt(2,Math.floor(9/c2)), c1=c2*m;
    const a1=randInt(2,6), b1=randInt(2,6);
    items.push({q:`(${c1} × 10${toSup(a1)})(${c2} × 10${toSup(b1)}) = ?`, a:`${c1*c2} × 10${toSup(a1+b1)}`, steps:sciOpSteps(true,c1,c2,a1,b1)});
  }
  {
    const c2=randInt(2,9), q=randInt(2,9), c1=c2*q;
    const a1=randInt(4,9), b1=randInt(2,3);
    items.push({q:`(${c1} × 10${toSup(a1)}) ÷ (${c2} × 10${toSup(b1)}) = ?`, a:`${q} × 10${toSup(a1-b1)}`, steps:sciOpSteps(false,c1,c2,a1,b1)});
  }
  return items;
};

// 3. Simplifying Square Roots
GENERATORS[3] = () => genSet(6, () => {
  const m = randInt(2,9), r = choice(SQUAREFREE);
  const n = m*m*r;
  if(n>500) return null;
  const sr = sqrtSteps(n);
  return {q:`√${n} = ?`, a:`${m}√${r}`, steps:sr.steps};
});

// 4. Solving Inequalities
GENERATORS[4] = () => genSet(6, () => {
  const type = choice(["add","mul","twostep","negone","negtwo"]);
  const op = choice(["<",">","≤","≥"]);
  let A, K, C, s;
  if(type==="add"){ const b=randInt(2,9); s=randIntNonZero(-9,9); A=1; K=b; C=s+b; }
  else if(type==="mul"){ A=randInt(2,6); s=randIntNonZero(-9,9); K=0; C=A*s; }
  else if(type==="twostep"){ A=randInt(2,5); s=randIntNonZero(-9,9); K=randIntNonZero(-9,9); C=A*s+K; }
  else if(type==="negone"){ A=-randInt(2,6); s=randIntNonZero(-9,9); K=0; C=A*s; }
  else { A=-randInt(2,5); s=randIntNonZero(-9,9); K=randIntNonZero(-9,9); C=A*s+K; }
  const r = solveIneqSteps(A,K,op,C);
  return {q:qClean(`${linTerm(A,"x")} ${pmTerm(K)} ${op} ${C}`), a:r.ans, steps:r.steps};
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
  const r = absSteps(a,b,c);
  return {q:qClean(`|${inner}| = ${c}`), a:L(`x = ${r1}  or  x = ${r2}`,`x = ${r1}  o  x = ${r2}`), steps:r.steps};
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
    const r = substSteps(m,k,A,1,C);
    return {q:`y = ${mTerm}  ${L("and","y")}  ${A===1?"":A}x + y = ${C}`, a:`x = ${x0}, y = ${y0}`, steps:r.steps};
  }
  const x0=randInt(-9,9), y0=randInt(-9,9);
  const S=x0+y0, D=x0-y0;
  if(S===D) return null;
  const r = elimSteps([1,1,S],[1,-1,D]);
  return {q:`x + y = ${S}  ${L("and","y")}  x − y = ${D}`, a:`x = ${x0}, y = ${y0}`, steps:r.steps};
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
    return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:ans, steps:ratDiffSq(k,plus).steps};
  }
  if(type==="gcf"){
    const m = randInt(2,5), c = randIntNonZero(-9,9);
    const num = poly([[m,"x²"],[m*c,"x"]]);
    const den = m===1 ? "x" : `${m}x`;
    const ans = L(`${linTerm(1,"x")+pmTerm(c)}, where x ≠ 0`,`${linTerm(1,"x")+pmTerm(c)}, donde x ≠ 0`);
    return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:ans, steps:ratGcf(m,c).steps};
  }
  const r1 = randIntNonZero(-9,9), r2 = randIntNonZero(-9,9);
  if(r1===r2) return null;
  const B = -(r1+r2), C = r1*r2;
  const num = poly([[1,"x²"],[B,"x"],[C,""]]);
  const den = `x${pmTerm(-r1)}`;
  const ans = L(`x${pmTerm(-r2)}, where x ≠ ${r1}`,`x${pmTerm(-r2)}, donde x ≠ ${r1}`);
  return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:qClean(ans), steps:ratTrinom(r1,r2).steps};
});

// 8. Compound Inequalities
GENERATORS[8] = () => genSet(6, () => {
  const type = choice(["add3","mul3","neg3","or"]);
  const op = choice(["<","≤"]);
  if(type==="add3"){
    const b=randIntNonZero(-9,9), sLo=randInt(-9,5), sHi=sLo+randInt(2,9);
    const left=sLo+b, right=sHi+b;
    const r = compoundSteps(left,1,b,right,op,op);
    return {q:qClean(`${left} ${op} x${pmTerm(b)} ${op} ${right}`), a:`${sLo} ${op} x ${op} ${sHi}`, steps:r.steps};
  }
  if(type==="mul3"){
    const m=randInt(2,6), sLo=randInt(-9,5), sHi=sLo+randInt(2,9);
    const left=m*sLo, right=m*sHi;
    const r = compoundSteps(left,m,0,right,op,op);
    return {q:`${left} ${op} ${m}x ${op} ${right}`, a:`${sLo} ${op} x ${op} ${sHi}`, steps:r.steps};
  }
  if(type==="neg3"){
    const m=-randInt(2,5), sLo=randInt(-9,3), sHi=sLo+randInt(2,8);
    const left=m*sHi, right=m*sLo;
    const r = compoundSteps(left,m,0,right,op,op);
    return {q:`${left} ${op} ${linTerm(m,"x")} ${op} ${right}`, a:`${sLo} ${op} x ${op} ${sHi}`, steps:r.steps};
  }
  const b1=randInt(2,9), s1=randIntNonZero(-9,9), c1=s1+b1;
  const b2=randInt(2,9), s2=randIntNonZero(-9,9), c2=s2+b2;
  const op1=choice(["<",">"]), op2=choice(["<",">"]);
  const qText = `x + ${b1} ${op1} ${c1} or x + ${b2} ${op2} ${c2}`;
  const r1 = solveSteps(1,b1,op1,c1), r2 = solveSteps(1,b2,op2,c2);
  const ans = `x ${op1} ${s1} or x ${op2} ${s2}`;
  const steps = [start(qText), st("These are two SEPARATE inequalities joined by OR. Solve each one on its own."), st(`Solve the first one: x + ${b1} ${op1} ${c1}`), ...r1.steps, st(`Solve the second one: x + ${b2} ${op2} ${c2}`), ...r2.steps, fin(ans)];
  return {q:qClean(L(`x + ${b1} ${op1} ${c1}  or  x + ${b2} ${op2} ${c2}`,`x + ${b1} ${op1} ${c1}  o  x + ${b2} ${op2} ${c2}`)), a:qClean(L(`x ${op1} ${s1}  or  x ${op2} ${s2}`,`x ${op1} ${s1}  o  x ${op2} ${s2}`)), steps};
});

// 9. Systems — Elimination
GENERATORS[9] = () => genSet(6, () => {
  const add = choice([true,false]);
  const x0=randInt(-6,9), y0=randInt(-6,9);
  if(add){
    const b=randInt(1,5), a1=randInt(1,5), a2=randIntNonZero(1,5);
    const C1=a1*x0+b*y0, C2=a2*x0-b*y0;
    const r = elimSteps([a1,b,C1],[a2,-b,C2]);
    return {q:`${a1===1?"":a1}x ${b===1?"+":"+ "+b}y = ${C1}  ${L("and","y")}  ${a2===1?"":a2}x ${b===1?"−":"− "+b}y = ${C2}`.replace("+ 1y","+ y").replace("− 1y","− y"),
      a:`x = ${x0}, y = ${y0}`, steps:r.steps};
  }
  const a=randInt(1,5), b1=randInt(1,6), b2=randIntNonZero(1,6);
  if(b1===b2) return null;
  const C1=a*x0+b1*y0, C2=a*x0+b2*y0;
  const r = elimSteps([a,b1,C1],[a,b2,C2]);
  return {q:`${a===1?"":a}x + ${b1===1?"":b1}y = ${C1}  ${L("and","y")}  ${a===1?"":a}x + ${b2===1?"":b2}y = ${C2}`,
    a:`x = ${x0}, y = ${y0}`, steps:r.steps};
});

// 10. Binomial × Trinomial (cat: expressions)
GENERATORS[10] = () => genSet(6, () => {
  const c1 = choice([1,1,1,2]), p = randIntNonZero(-4,4);
  const A=1, B=randIntNonZero(-4,5), C=randIntNonZero(-5,5);
  const r3 = c1*A, r2 = c1*B + p*A, r1 = c1*C + p*B, r0 = p*C;
  const binom = `${c1===1?"":c1}x${pmTerm(p)}`;
  const trinom = poly([[A,"x²"],[B,"x"],[C,""]]);
  const r = distributeSteps(c1,p,B,C);
  return {q:`(${binom})(${trinom})`, a:poly([[r3,"x³"],[r2,"x²"],[r1,"x"],[r0,""]]), steps:r.steps};
});

// 11. GCF Factoring
GENERATORS[11] = () => genSet(6, () => {
  const deg3 = choice([true,false]);
  const g = randInt(2,9), m = randIntNonZero(2,6), n = randIntNonZero(2,6);
  if(m===n || gcdNum(m,n)!==1) return null;
  const sign = choice([1,-1]);
  const A = g*m, B = g*n;
  if(deg3){
    const q = `${A}x³ ${sign>0?"+":"−"} ${B}x²`;
    const a = `${g}x²(${m}x ${sign>0?"+":"−"} ${n})`;
    return {q, a, steps:gcfSteps(A,B,3,2,sign).steps};
  }
  const q = `${A}x² ${sign>0?"+":"−"} ${B}x`;
  const a = `${g}x(${m}x ${sign>0?"+":"−"} ${n})`;
  return {q, a, steps:gcfSteps(A,B,2,1,sign).steps};
});

// 12. Difference of Squares
GENERATORS[12] = () => genSet(6, () => {
  const co = choice([1,1,1,2,3,5]), k = randInt(2,9);
  const A = co*co;
  const xTerm = co===1?"x²":`${A}x²`;
  const xLabel = co===1?"x":`${co}x`;
  return {q:`${xTerm} − ${k*k}`, a:`(${xLabel} − ${k})(${xLabel} + ${k})`, steps:dosSteps(co,k).steps};
});

// 13. Factoring (Leading Coefficient)
GENERATORS[13] = () => genSet(6, () => {
  const p = choice([2,2,3,4]), q = choice([1,1,2]);
  const m = randIntNonZero(-6,6), n = randIntNonZero(-6,6);
  const A = p*q, B = p*n + q*m, C = m*n;
  if(A<2) return null;
  const qText = poly([[A,"x²"],[B,"x"],[C,""]]);
  let r; try{ r = acSteps(A,B,C); }catch{ return null; }
  return {q:qText, a:r.ans, steps:r.steps};
});

// 14. Completing the Square (8 problems: ~6 clean + ~2 irrational)
GENERATORS[14] = () => genSet(8, () => {
  const irrational = Math.random() < 0.3;
  const p = randIntNonZero(-7,7);
  const T = irrational ? choice([2,3,5,6,7,10,11,13]) : randInt(1,9)*randInt(1,9); // T = s^2 for clean
  let s = null;
  if(!irrational) s = Math.round(Math.sqrt(T));
  if(!irrational && s*s!==T) return null;
  const c = p*p - T, b = 2*p;
  if(c===0) return null;
  const qText = qClean(`${poly([[1,"x²"],[b,"x"],[c,""]])} = 0`);
  const r = ctsSteps(b,c);
  if(irrational) return {q:L(`${qText}  (leave a √ in it)`,`${qText}  (deja una √ en la respuesta)`), a:`x = ${-p} ± √${T}`, steps:r.steps};
  const r1 = -p+s, r2 = -p-s;
  if(r1===r2) return null;
  return {q:qText, a:orAns(r.ans), steps:r.steps};
});

// 15. The Quadratic Formula (8 problems: ~6 rational + ~2 irrational)
GENERATORS[15] = () => genSet(8, () => {
  const irrational = Math.random() < 0.3;
  if(irrational){
    const p = randIntNonZero(-5,5), d = choice([2,3,5,6,7,10,11,13]);
    const b = 2*p, c = p*p - d;
    const qText = qClean(`${poly([[1,"x²"],[b,"x"],[c,""]])} = 0`);
    const r = qfSteps(1,b,c,undefined,false);
    return {q:L(`${qText}  (leave a √ in it)`,`${qText}  (deja una √ en la respuesta)`), a:`x = ${-p} ± √${d}`, steps:r.steps};
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
  const r = qfSteps(a,b,c,undefined,false);
  return {q:qText, a:orAns(r.ans), steps:r.steps};
});

// 16. Multi-Step Word Problems
GENERATORS[16] = () => {
  const items = [];
  {
    const pct = choice([10,20,25,50]), P = 20*randInt(1,10);
    const sale = Math.round(P*(1-pct/100));
    items.push({q:L(`A $${P} shirt is ${pct}% off. Sale price?`,`Una camisa de $${P} tiene ${pct}% de descuento. ¿Cuál es el precio de oferta?`), a:`$${sale}`, steps:pctOffSteps("shirt",P,pct)});
  }
  {
    const pctInc = choice([10,20,25,50]);
    const O = pctInc===25?4*randInt(2,15) : pctInc===10?10*randInt(2,10) : pctInc===20?5*randInt(2,16) : 2*randInt(2,30);
    const N = Math.round(O*(1+pctInc/100));
    items.push({q:L(`Wage goes from $${O} to $${N}. Percent increase?`,`El salario sube de $${O} a $${N}. ¿Cuál es el porcentaje de aumento?`), a:`${pctInc}%`, steps:pctIncSteps(O,N)});
  }
  {
    const rate = randInt(20,80), t1 = randInt(2,6), t2 = randInt(2,8);
    const d1 = rate*t1, d2 = rate*t2;
    items.push({q:L(`A car goes ${d1} mi in ${t1} hrs. At that rate, how far in ${t2} hrs?`,`Un carro recorre ${d1} mi en ${t1} h. A ese ritmo, ¿qué distancia recorre en ${t2} h?`), a:L(`${d2} miles`,`${d2} millas`), steps:rateSteps(d1,t1,t2)});
  }
  {
    const x = randInt(5,60), sum = 3*x+3;
    items.push({q:L(`Three consecutive integers sum to ${sum}. Find them.`,`Tres enteros consecutivos suman ${sum}. Hállalos.`), a:`${x}, ${x+1}, ${x+2}`, steps:consecSteps(3,1,sum).steps});
  }
  {
    const x = 2*randInt(2,30), sum = 2*x+2;
    items.push({q:L(`Two consecutive EVEN integers sum to ${sum}. Find them.`,`Dos enteros PARES consecutivos suman ${sum}. Hállalos.`), a:`${x}, ${x+2}`, steps:consecSteps(2,2,sum).steps});
  }
  {
    const rate = choice([2,4,5,10]), mult = randInt(1,9), P = 100*mult, t = randInt(1,5);
    const interest = mult*rate*t;
    items.push({q:L(`$${P} at ${rate}% simple interest for ${t} years. Interest earned?`,`$${P} al ${rate}% de interés simple durante ${t} años. ¿Cuánto interés se gana?`), a:`$${interest}`, steps:interestSteps(P,rate,t)});
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
      steps:readSteps(m,b,eqStr,`Find the slope and y-intercept of ${eqStr}.`)};
  }
  if(type==="eval"){
    const m=randIntNonZero(-6,6), b=randInt(-9,9), x0=randIntNonZero(-5,5);
    const y0 = m*x0+b;
    const eqStr = qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`);
    return {q:L(`A line has slope ${m} and y-intercept ${b}. What is y when x = ${x0}? ###GRAPH:line;${m},${b};${eqStr}###`,`Una recta tiene pendiente ${m} e intercepto con y ${b}. ¿Cuánto vale y cuando x = ${x0}? ###GRAPH:line;${m},${b};${eqStr}###`), a:`y = ${y0}`,
      steps:evalLineSteps(m,b,x0,`A line has slope ${m} and y-intercept ${b}. What is y when x = ${x0}?`)};
  }
  const x1=randInt(-5,5), x2=randIntNonZero(-5,5);
  if(x1===x2) return null;
  const m=randIntNonZero(-6,6), y1=randInt(-9,9), y2=y1+m*(x2-x1);
  return {q:L(`Find the slope between the points (${x1}, ${y1}) and (${x2}, ${y2}). ###GRAPH:points;${x1},${y1},${x2},${y2};(${x1},${y1}) and (${x2},${y2})###`,`Halla la pendiente entre los puntos (${x1}, ${y1}) y (${x2}, ${y2}). ###GRAPH:points;${x1},${y1},${x2},${y2};(${x1},${y1}) y (${x2},${y2})###`), a:`m = ${m}`,
    steps:slopeSteps(x1,y1,x2,y2,`Find the slope between the points (${x1}, ${y1}) and (${x2}, ${y2}).`)};
});

// 18. Writing Linear Equations
GENERATORS[18] = () => genSet(6, () => {
  const type = choice(["intercept","point","parallel","perp","twopoint"]);
  if(type==="intercept"){
    const m=randIntNonZero(-6,6), b=randInt(-9,9);
    return {q:L(`Write the equation of a line through (0, ${b}) with slope ${m}.`,`Escribe la ecuación de la recta que pasa por (0, ${b}) con pendiente ${m}.`), a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`),
      steps:ptSlopeSteps(0,b,m,`Write the equation of a line through (0, ${b}) with slope ${m}.`).steps};
  }
  if(type==="point"){
    const m=randIntNonZero(-6,6), x0=randIntNonZero(-5,5), y0=randInt(-9,9);
    const b = y0 - m*x0;
    return {q:L(`Write the equation of a line through (${x0}, ${y0}) with slope ${m}.`,`Escribe la ecuación de la recta que pasa por (${x0}, ${y0}) con pendiente ${m}.`), a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`),
      steps:ptSlopeSteps(x0,y0,m,`Write the equation of a line through (${x0}, ${y0}) with slope ${m}.`).steps};
  }
  if(type==="parallel"){
    const m=randIntNonZero(-9,9), b=randInt(-9,9);
    const eq = qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`);
    return {q:L(`What is the slope of a line parallel to ${eq}?`,`¿Cuál es la pendiente de una recta paralela a ${eq}?`), a:`m = ${m}`,
      steps:parallelSteps(m,b,`What is the slope of a line parallel to ${eq}?`)};
  }
  if(type==="perp"){
    const m=randIntNonZero(-9,9);
    if(Math.abs(m)===1) return null;
    const b=randInt(-9,9);
    const perp = fracStr(-1,m);
    const eq = qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`);
    return {q:L(`What is the slope of a line perpendicular to ${eq}?`,`¿Cuál es la pendiente de una recta perpendicular a ${eq}?`), a:`m = ${perp}`,
      steps:perpSteps(m,b,`What is the slope of a line perpendicular to ${eq}?`)};
  }
  const x1=randInt(-5,5), x2=randIntNonZero(-5,5);
  if(x1===x2) return null;
  const m=randIntNonZero(-6,6), y1=randInt(-9,9), y2=y1+m*(x2-x1);
  const b = y1-m*x1;
  const qq = `Find the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2}), then write its equation using (${x1},${y1}).`;
  const sl = twoPointSlope(x1,y1,x2,y2);
  const steps = [start(qq), ...sl.steps, ...ptSlopeSteps(x1,y1,m,"",false).steps];
  return {q:L(qq,`Halla la pendiente de la recta que pasa por (${x1}, ${y1}) y (${x2}, ${y2}), y luego escribe su ecuación usando (${x1},${y1}).`), a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`), steps};
});

// 19. Functions & Function Notation
GENERATORS[19] = () => genSet(6, () => {
  const type = choice(["linear","quad","domain","range"]);
  if(type==="linear"){
    const m=randIntNonZero(-9,9), b=randInt(-9,9), x0=randIntNonZero(-9,9);
    const val = m*x0+b;
    const qq = qClean(`If f(x) = ${linTerm(m,"x")}${pmTerm(b)}, find f(${x0}).`);
    return {q:qClean(L(`If f(x) = ${linTerm(m,"x")}${pmTerm(b)}, find f(${x0}).`,`Si f(x) = ${linTerm(m,"x")}${pmTerm(b)}, halla f(${x0}).`)), a:`${val}`, steps:evalFSteps({1:m,0:b},x0,qq)};
  }
  if(type==="quad"){
    const B=randIntNonZero(-6,6), x0=randIntNonZero(-5,5);
    const val = x0*x0+B*x0;
    const qq = qClean(`If f(x) = x² ${pmTerm(B)}x, find f(${x0}).`);
    return {q:qClean(L(`If f(x) = x² ${pmTerm(B)}x, find f(${x0}).`,`Si f(x) = x² ${pmTerm(B)}x, halla f(${x0}).`)), a:`${val}`, steps:evalFSteps({2:1,1:B},x0,qq)};
  }
  if(type==="domain"){
    const k=randIntNonZero(-9,9);
    return {q:qClean(L(`What is the domain of f(x) = 1/(x${pmTerm(k)})?`,`¿Cuál es el dominio de f(x) = 1/(x${pmTerm(k)})?`)), a:L(`all real numbers except x = ${-k}`,`todos los números reales excepto x = ${-k}`), check:L(`allrealnumbersexceptx=${-k}`,`todoslosnumerosrealesexceptox=${-k}`),
      steps:domainSteps(k,qClean(`What is the domain of f(x) = 1/(x${pmTerm(k)})?`))};
  }
  return {q:L(`If f(x) = x² (for x ≥ 0), what is the range?`,`Si f(x) = x² (para x ≥ 0), ¿cuál es el rango?`), a:`y ≥ 0`, steps:rangeSqSteps("If f(x) = x² (for x ≥ 0), what is the range?")};
});

// 20. Adding & Subtracting Polynomials
GENERATORS[20] = () => genSet(6, () => {
  const A1=randInt(-7,7), B1=randInt(-7,7), C1=randInt(-7,7);
  const A2=randIntNonZero(-7,7), B2=randInt(-7,7), C2=randInt(-7,7);
  const op = choice(["+","-"]);
  const p1 = poly([[A1,"x²"],[B1,"x"],[C1,""]]);
  const p2 = poly([[A2,"x²"],[B2,"x"],[C2,""]]);
  if(p1==="0"||p2==="0") return null;
  const co = (A,B,C)=>{ const o={}; if(A) o[2]=A; if(B) o[1]=B; if(C) o[0]=C; return o; };
  const sign = op==="+" ? "+" : "−";
  const r = polyOpSteps(co(A1,B1,C1), co(A2,B2,C2), sign, `(${p1}) ${sign} (${p2})`);
  return {q:`(${p1}) ${op} (${p2}) = ?`, a:r.ans, steps:r.steps};
});

// 21. Multiplying Binomials (FOIL)
GENERATORS[21] = () => genSet(6, () => {
  const c1 = choice([1,1,1,2,3]), c2 = choice([1,1,1,2]);
  const p = randIntNonZero(-9,9), q = randIntNonZero(-9,9);
  const A = c1*c2, B = c1*q + c2*p, C = p*q;
  const b1 = c1===1?"x":`${c1}x`, b2 = c2===1?"x":`${c2}x`;
  return {q:qClean(`(${b1}${pmTerm(p)})(${b2}${pmTerm(q)}) = ?`), a:poly([[A,"x²"],[B,"x"],[C,""]]), steps:foilSteps(c1,p,c2,q).steps};
});

// 22. Factoring Trinomials (a = 1)
GENERATORS[22] = () => genSet(6, () => {
  const n1=randIntNonZero(-9,9), n2=randIntNonZero(-9,9);
  if(n1===n2) return null;
  const B=n1+n2, C=n1*n2;
  const qText = qClean(L(`Factor: ${poly([[1,"x²"],[B,"x"],[C,""]])}`,`Factoriza: ${poly([[1,"x²"],[B,"x"],[C,""]])}`));
  const r = tri1Steps(B,C);
  return {q:qText, a:r.ans, steps:r.steps};
});

// 23. Factoring by Grouping
GENERATORS[23] = () => genSet(6, () => {
  const type = choice(["pure","split"]);
  if(type==="pure"){
    const A=randIntNonZero(-9,9), B=randInt(2,9);
    const qText = qClean(L(`Factor by grouping: ${poly([[1,"x³"],[A,"x²"],[B,"x"],[A*B,""]])}`,`Factoriza por agrupación: ${poly([[1,"x³"],[A,"x²"],[B,"x"],[A*B,""]])}`));
    const r = group4Steps(A,B);
    return {q:qText, a:qClean(`(x${pmTerm(A)})(x²${pmTerm(B)})`), steps:r.steps};
  }
  const p = choice([2,2,3,4]), q = choice([1,1,2]);
  const m = randIntNonZero(-6,6), n = randIntNonZero(-6,6);
  const A = p*q, Bmid = p*n + q*m, C = m*n;
  if(A<2) return null;
  const n1 = p*n, n2 = q*m;
  if(gcdNum(gcdNum(A,Bmid),C)!==1) return null;
  const r = group2Steps(A,Bmid,C,n1,n2);
  if(!r) return null;
  const qText = qClean(L(`Factor by grouping: ${poly([[A,"x²"],[Bmid,"x"],[C,""]])}  (split ${Bmid}x into ${n1}x and ${n2}x)`,`Factoriza por agrupación: ${poly([[A,"x²"],[Bmid,"x"],[C,""]])}  (divide ${Bmid}x en ${n1}x y ${n2}x)`));
  return {q:qText, a:r.ans, steps:r.steps};
});

// 24. Special Factoring Patterns
GENERATORS[24] = () => genSet(6, () => {
  const type = choice(["sqplus","sqminus","cube"]);
  if(type==="sqplus"){
    const k=randInt(2,12);
    return {q:qClean(`Factor: ${poly([[1,"x²"],[2*k,"x"],[k*k,""]])}`), a:`(x + ${k})²`, steps:psSteps(2*k,k*k).steps};
  }
  if(type==="sqminus"){
    const k=randInt(2,12);
    return {q:qClean(`Factor: ${poly([[1,"x²"],[-2*k,"x"],[k*k,""]])}`), a:`(x − ${k})²`, steps:psSteps(-2*k,k*k).steps};
  }
  const k=randInt(2,6), sum=choice([true,false]);
  if(sum) return {q:L(`Factor: x³ + ${k*k*k}`,`Factoriza: x³ + ${k*k*k}`), a:`(x + ${k})(x² − ${k}x + ${k*k})`, steps:cubesSteps(k,true).steps};
  return {q:L(`Factor: x³ − ${k*k*k}`,`Factoriza: x³ − ${k*k*k}`), a:`(x − ${k})(x² + ${k}x + ${k*k})`, steps:cubesSteps(k,false).steps};
});

// 25. Solving Quadratics by Factoring
GENERATORS[25] = () => genSet(6, () => {
  const n1=randInt(-9,9), n2=randIntNonZero(-9,9);
  if(n1===n2) return null;
  const B=n1+n2, C=n1*n2;
  const r1=-n1, r2=-n2;
  const qText = qClean(L(`Solve: ${poly([[1,"x²"],[B,"x"],[C,""]])} = 0`,`Resuelve: ${poly([[1,"x²"],[B,"x"],[C,""]])} = 0`));
  const checkStr = `x=${r1} or x=${r2}`;
  return {q:qText, a:L(`x = ${r1}  or  x = ${r2}`,`x = ${r1}  o  x = ${r2}`), check:checkStr, steps:factorSolveSteps(r1,r2).steps};
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
      steps:opensSteps(a,`Does ${eqStr} open up or down?`)};
  }
  const a = choice([1,1,1,2,3]);
  const aPrefix = a===1?"":String(a);
  const eqStr = qClean(`y = ${aPrefix}(x${pmTerm(-h)})²${pmTerm(k)}`);
  if(type==="axis"){
    return {q:L(`What is the axis of symmetry of ${eqStr}? ###GRAPH:parabola;${a},${h},${k};${eqStr}###`,`¿Cuál es el eje de simetría de ${eqStr}? ###GRAPH:parabola;${a},${h},${k};${eqStr}###`), a:`x = ${h}`,
      steps:axisSteps(h,`What is the axis of symmetry of ${eqStr}?`)};
  }
  return {q:L(`Find the vertex of ${eqStr}. ###GRAPH:parabola;${a},${h},${k};${eqStr}###`,`Halla el vértice de ${eqStr}. ###GRAPH:parabola;${a},${h},${k};${eqStr}###`), a:`h = ${h}, k = ${k}`,
    steps:vertexSteps(h,k,`Find the vertex of ${eqStr}.`)};
});

// 27. Rational Expression Operations (cat: rational)
const FR = (n,d) => `<span class='frac'><span class='frac-num'>${n}</span><span class='frac-den'>${d}</span></span>`;
GENERATORS[27] = () => genSet(6, () => {
  const type = choice(["mulCancelBin","mulCancelX","divX","divBin","addDiffDenom","subSameDenom"]);
  if(type==="mulCancelBin"){
    const k=randIntNonZero(2,9), m=randInt(2,9);
    const ans = L(`x/${m}, where x ≠ ${pmRaw(-k)}`,`x/${m}, donde x ≠ ${pmRaw(-k)}`);
    const qq = `${FR("x",`x${pmTerm(k)}`)} × ${FR(`x${pmTerm(k)}`,m)}`;
    return {q:`${qq} = ?`, a:ans, steps:ratMulSteps("mulbin",qq,{K:k,M:m}).steps};
  }
  if(type==="mulCancelX"){
    const c1=randInt(2,12), c2=randInt(2,12);
    const ans = L(`${fracStr(c1,c2)}, where x ≠ 0`,`${fracStr(c1,c2)}, donde x ≠ 0`);
    const qq = `${FR(c1,"x")} × ${FR("x",c2)}`;
    return {q:`${qq} = ?`, a:ans, steps:ratMulSteps("mulx",qq,{c1,c2}).steps};
  }
  if(type==="divX"){
    const c1=randInt(2,12), c2=randInt(2,12);
    const ans = L(`${fracStr(c1,c2)}, where x ≠ 0`,`${fracStr(c1,c2)}, donde x ≠ 0`);
    const qq = `${FR(c1,"x")} ÷ ${FR(c2,"x")}`;
    return {q:`${qq} = ?`, a:ans, steps:ratMulSteps("divx",qq,{c1,c2}).steps};
  }
  if(type==="divBin"){
    const k=randIntNonZero(2,9), m=randInt(2,9), n=randInt(2,9);
    const ans = L(`${fracStr(n,m)}, where x ≠ ${pmRaw(-k)}`,`${fracStr(n,m)}, donde x ≠ ${pmRaw(-k)}`);
    const qq = `${FR(`x${pmTerm(k)}`,m)} ÷ ${FR(`x${pmTerm(k)}`,n)}`;
    return {q:`${qq} = ?`, a:ans, steps:ratMulSteps("divbin",qq,{K:k,M:m,N:n}).steps};
  }
  if(type==="addDiffDenom"){
    const m=randInt(2,9);
    const ans = L(`(${m} + x)/${m}x, where x ≠ 0`,`(${m} + x)/${m}x, donde x ≠ 0`);
    const qq = `${FR(1,"x")} + ${FR(1,m)}`;
    return {q:`${qq} = ?  (${L("common denominator is","el denominador común es")} ${m}x)`, a:ans, steps:ratAddSteps("add",qq,{m}).steps};
  }
  const c1=randInt(3,12), c2=randInt(1,c1-1);
  const diff=c1-c2;
  const diffStr = diff===1?"1/x":`${diff}/x`;
  const ans = L(`${diffStr}, where x ≠ 0`,`${diffStr}, donde x ≠ 0`);
  const qq = `${FR(c1,"x")} − ${FR(c2,"x")}`;
  return {q:`${qq} = ?  (${L("same denominator already","ya tienen el mismo denominador")})`, a:ans, steps:ratAddSteps("sub",qq,{c1,c2}).steps};
});

// 28. Radical Operations (cat: foundations)
GENERATORS[28] = () => genSet(6, () => {
  const type = choice(["add","sub","mulProduct","mulSame","rationalize"]);
  if(type==="add"){
    const c1=randInt(2,12), c2=randInt(2,12), r=choice(SQUAREFREE);
    return {q:`${c1}√${r} + ${c2}√${r} = ?`, a:`${c1+c2}√${r}`, steps:radAddSteps(c1,c2,r,false,`${c1}√${r} + ${c2}√${r}`).steps};
  }
  if(type==="sub"){
    const c2=randInt(2,9), c1=c2+randInt(1,9), r=choice(SQUAREFREE);
    const diff=c1-c2;
    return {q:`${c1}√${r} − ${c2}√${r} = ?`, a: diff===1?`√${r}`:`${diff}√${r}`, steps:radAddSteps(c1,c2,r,true,`${c1}√${r} − ${c2}√${r}`).steps};
  }
  if(type==="mulProduct"){
    const sOpts = [4,6,8,9,10,12];
    const s = choice(sOpts);
    const divisors = [2,3,4,5,6].filter(j=>j>1 && j<s && s%j===0);
    if(!divisors.length) return null;
    const j = choice(divisors);
    const m = s*j, n = s/j;
    return {q:`√${m} × √${n} = ?`, a:`${s}`, steps:radMulSteps(m,n,`√${m} × √${n}`).steps};
  }
  if(type==="mulSame"){
    const r=randInt(2,12);
    return {q:`√${r} × √${r} = ?`, a:`${r}`, steps:radMulSteps(r,r,`√${r} × √${r}`).steps};
  }
  const r = choice(SQUAREFREE);
  return {q:L(`Rationalize: 1/√${r}`,`Racionaliza: 1/√${r}`), a:`√${r}/${r}`, steps:radRatSteps(r,`Rationalize: 1/√${r}`).steps};
});

// 29. Absolute Value Inequalities
GENERATORS[29] = () => genSet(6, () => {
  const type = choice(["between","or","plain"]);
  if(type==="between"){
    const b=randInt(-9,9), c=randInt(2,9), op=choice(["<","≤"]);
    const lo=b-c, hi=b+c;
    const inner = `x${pmTerm(-b)}`;
    return {q:qClean(L(`Solve: |${inner}| ${op} ${c}`,`Resuelve: |${inner}| ${op} ${c}`)), a:`${lo} ${op} x ${op} ${hi}`, steps:absIneqSteps(1,-b,c,op,qClean(`|${inner}| ${op} ${c}`)).steps};
  }
  if(type==="or"){
    const b=randInt(-9,9), c=randInt(2,9), opOut=choice([">","≥"]), opIn=opOut===">"?"<":"≤";
    const lo=b-c, hi=b+c;
    const inner = `x${pmTerm(-b)}`;
    return {q:qClean(L(`Solve: |${inner}| ${opOut} ${c}`,`Resuelve: |${inner}| ${opOut} ${c}`)), a:qClean(L(`x ${opOut} ${hi}  or  x ${opIn} ${lo}`,`x ${opOut} ${hi}  o  x ${opIn} ${lo}`)), steps:absIneqSteps(1,-b,c,opOut,qClean(`|${inner}| ${opOut} ${c}`)).steps};
  }
  const c=randInt(2,15), op=choice(["≤","<"]);
  return {q:L(`Solve: |x| ${op} ${c}`,`Resuelve: |x| ${op} ${c}`), a:`−${c} ${op} x ${op} ${c}`, steps:absIneqSteps(1,0,c,op,`|x| ${op} ${c}`).steps};
});

// 30. Graphing Inequalities (uses ###GRAPH###)
GENERATORS[30] = () => genSet(6, () => {
  const type = choice(["circleOpen","circleClosed","boundary","shade"]);
  if(type==="circleOpen"){
    const v=randInt(-9,9), op=choice(["<",">"]);
    const dir = op==="<"?"left":"right";
    return {q:L(`On a number line, is x ${op} ${v} an open or closed circle at ${v}? ###GRAPH:numberline;${v},open,${dir};x ${op} ${v}###`,`En una recta numérica, ¿x ${op} ${v} lleva un círculo abierto o cerrado en ${v}? ###GRAPH:numberline;${v},open,${dir};x ${op} ${v}###`), a:word("open"),
      steps:nlCircleSteps(`On a number line, is x ${op} ${v} an open or closed circle at ${v}?`,op,v)};
  }
  if(type==="circleClosed"){
    const v=randInt(-9,9), op=choice(["≤","≥"]);
    const dir = op==="≤"?"left":"right";
    return {q:L(`On a number line, is x ${op} ${v} an open or closed circle at ${v}? ###GRAPH:numberline;${v},closed,${dir};x ${op} ${v}###`,`En una recta numérica, ¿x ${op} ${v} lleva un círculo abierto o cerrado en ${v}? ###GRAPH:numberline;${v},closed,${dir};x ${op} ${v}###`), a:word("closed"),
      steps:nlCircleSteps(`On a number line, is x ${op} ${v} an open or closed circle at ${v}?`,op,v)};
  }
  const m=randIntNonZero(-6,6), b=randInt(-9,9);
  const op=choice(["≥","≤",">","<"]);
  const dashed = (op===">"||op==="<");
  const above = (op===">"||op==="≥");
  const eqStr = qClean(`y ${op} ${linTerm(m,"x")}${pmTerm(b)}`);
  if(type==="boundary"){
    return {q:L(`For ${eqStr}, is the boundary line dashed or solid? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`,`Para ${eqStr}, ¿la recta frontera es discontinua o continua? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`), a:word(dashed?"dashed":"solid"),
      steps:lineStyleSteps(`For ${eqStr}, is the boundary line dashed or solid?`,eqStr,op)};
  }
  return {q:L(`For ${eqStr}, which way do you shade? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`,`Para ${eqStr}, ¿hacia dónde se sombrea? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`), a:word(above?"above":"below"),
    steps:shadeSteps(`For ${eqStr}, which way do you shade?`,eqStr,op)};
});

// 31. Direct & Inverse Variation
GENERATORS[31] = () => genSet(6, () => {
  const type = choice(["directY","inverseY","directX","workers"]);
  if(type==="directY"){
    const k=randInt(2,9), x1=randInt(2,9), x2=randIntNonZero(2,12);
    if(x1===x2) return null;
    const y1=k*x1, y2=k*x2;
    const qq = `y varies directly with x. y = ${y1} when x = ${x1}. Find y when x = ${x2}.`;
    return {q:L(qq,`y varía directamente con x. y = ${y1} cuando x = ${x1}. Halla y cuando x = ${x2}.`), a:`y = ${y2}`, steps:directSteps(y1,x1,x2,"y",qq).steps};
  }
  if(type==="inverseY"){
    const x1=randInt(2,9), y1=randInt(2,9), k=x1*y1;
    const divisors=[2,3,4,5,6,7,8,9].filter(d=>d!==x1 && k%d===0);
    if(!divisors.length) return null;
    const x2=choice(divisors), y2=k/x2;
    const qq = `y varies inversely with x. y = ${y1} when x = ${x1}. Find y when x = ${x2}.`;
    return {q:L(qq,`y varía inversamente con x. y = ${y1} cuando x = ${x1}. Halla y cuando x = ${x2}.`), a:`y = ${y2}`, steps:inverseSteps(x1,y1,x2,qq).steps};
  }
  if(type==="directX"){
    const k=randInt(2,9), x1=randInt(2,9), y1=k*x1, x3=randIntNonZero(2,12);
    if(x3===x1) return null;
    const y3=k*x3;
    const qq = `y varies directly with x. y = ${y1} when x = ${x1}. Find x when y = ${y3}.`;
    return {q:L(qq,`y varía directamente con x. y = ${y1} cuando x = ${x1}. Halla x cuando y = ${y3}.`), a:`x = ${x3}`, steps:directSteps(y1,x1,y3,"x",qq).steps};
  }
  const w1=randInt(2,9), h1=randInt(2,9), k=w1*h1;
  const divisors=[2,3,4,5,6,7,8,9].filter(d=>d!==w1 && k%d===0);
  if(!divisors.length) return null;
  const w2=choice(divisors), h2=k/w2;
  const qq = `It takes ${w1} workers ${h1} hours to finish a job (inverse variation). How long for ${w2} workers?`;
  return {q:L(qq,`${w1} trabajadores tardan ${h1} horas en terminar un trabajo (variación inversa). ¿Cuánto tardarían ${w2} trabajadores?`), a:L(`${h2} hours`,`${h2} horas`), check:`${h2}`, steps:workersSteps(w1,h1,w2,qq,`${h2} hours`)};
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
  let qEn;
  const q = growth
    ? (subject==="money" ? (qEn=`$${P} grows ${r}% per year. What is it worth after ${t} year${t>1?"s":""}?`, L(qEn,`$${P} crecen ${r}% por año. ¿Cuánto valdrán después de ${t} ${t>1?"años":"año"}?`))
                          : (qEn=`A population of ${P} grows ${r}% per year. What is it after ${t} year${t>1?"s":""}?`, L(qEn,`Una población de ${P} crece ${r}% por año. ¿Cuánto será después de ${t} ${t>1?"años":"año"}?`)))
    : (()=>{ const thing = choice(["machine","laptop","car"]); const esThing = {machine:"Una máquina",laptop:"Una laptop",car:"Un carro"}[thing];
        qEn=`A $${P} ${thing} depreciates ${r}% per year. What is it worth after ${t} year${t>1?"s":""}?`;
        return L(qEn,`${esThing} de $${P} se deprecia ${r}% por año. ¿Cuánto vale después de ${t} ${t>1?"años":"año"}?`); })();
  const a = (growth && subject==="population") ? formatMoney(value) : `$${money}`;
  return {q, a, steps:growthSteps(P,r,t,!growth,qEn,a)};
});

// 33. Arithmetic Sequences
GENERATORS[33] = () => genSet(6, () => {
  const type = choice(["diff","diff","nth","nth","nth","nth"]);
  if(type==="diff"){
    const a1=randInt(-20,60), d=randIntNonZero(-9,9);
    const qq = `Find the common difference: ${a1}, ${a1+d}, ${a1+2*d}, ${a1+3*d}…`;
    return {q:L(qq,`Halla la diferencia común: ${a1}, ${a1+d}, ${a1+2*d}, ${a1+3*d}…`), a:`d = ${d}`, steps:dseqSteps([a1,a1+d,a1+2*d],qq)};
  }
  const a1=randInt(1,20), d=randIntNonZero(-9,9), n=randInt(5,25);
  const qq = `Find the ${n}th term of ${a1}, ${a1+d}, ${a1+2*d}… (d = ${d})`;
  const r = nthSteps(a1,n,d,qq);
  return {q:L(qq,`Halla el término número ${n} de ${a1}, ${a1+d}, ${a1+2*d}… (d = ${d})`), a:`${r.v}`, steps:r.steps};
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
    const qq = `Find the mean of: ${all.join(", ")}`;
    return {q:L(qq,`Halla la media de: ${all.join(", ")}`), a:`${target}`, steps:meanSteps(all,qq).steps};
  }
  if(type==="medianOdd"){
    const set = new Set();
    while(set.size<5) set.add(randInt(0,100));
    const vals = [...set];
    const sorted = [...vals].sort((a,b)=>a-b);
    const shuffled = [...vals].sort(()=>Math.random()-0.5);
    const qq = `Find the median of: ${shuffled.join(", ")}`;
    return {q:L(qq,`Halla la mediana de: ${shuffled.join(", ")}`), a:`${sorted[2]}`, steps:medianSteps(shuffled,qq).steps};
  }
  if(type==="mode"){
    const modeVal = randInt(0,20);
    const others = new Set([modeVal]);
    while(others.size<3) others.add(randInt(0,20));
    others.delete(modeVal);
    const otherVals = [...others];
    const vals = [modeVal,modeVal,modeVal,otherVals[0],otherVals[1]].sort(()=>Math.random()-0.5);
    const qq = `Find the mode of: ${vals.join(", ")}`;
    return {q:L(qq,`Halla la moda de: ${vals.join(", ")}`), a:`${modeVal}`, steps:modeSteps(vals,qq).steps};
  }
  if(type==="range"){
    const set = new Set();
    while(set.size<5) set.add(randInt(0,30));
    const vals = [...set];
    const range = Math.max(...vals)-Math.min(...vals);
    const qq = `Find the range of: ${vals.join(", ")}`;
    return {q:L(qq,`Halla el rango de: ${vals.join(", ")}`), a:`${range}`, steps:rangeSteps(vals,qq).steps};
  }
  const set = new Set();
  while(set.size<4) set.add(randInt(0,30));
  const vals=[...set];
  const sorted=[...vals].sort((a,b)=>a-b);
  const med = (sorted[1]+sorted[2])/2;
  const medStr = Number.isInteger(med)?String(med):med.toFixed(1);
  const shuffled=[...vals].sort(()=>Math.random()-0.5);
  const qq = `Find the median of: ${shuffled.join(", ")}  (even count — average the two middle values)`;
  return {q:L(qq,`Halla la mediana de: ${shuffled.join(", ")}  (cantidad par — promedia los dos valores del medio)`), a:medStr, steps:medianSteps(shuffled,`Find the median of: ${shuffled.join(", ")}`).steps};
});

// Every generator builds English steps; this turns them into Spanish when Spanish is on.
for(const id of Object.keys(GENERATORS)){
  const gen = GENERATORS[id];
  GENERATORS[id] = (...args) => { const out = gen(...args); (out||[]).forEach((p)=>{ if(p && p.steps) p.steps = esSteps(p.steps); }); return out; };
}
export { esSteps };
