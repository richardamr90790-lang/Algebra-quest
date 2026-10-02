/* ===================== PROCEDURAL PRACTICE GENERATORS =====================
   Produces fresh independent-practice problems on demand. Guided Practice and
   Worked Examples are NOT touched by this — they stay the fixed, hand-written
   content. Every generator below builds each problem "backward" from a chosen
   clean answer (nice roots/factors/numbers), so the answer is correct by
   construction rather than independently (re)solved — the safest way to avoid
   generator bugs at this scale. */

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
      steps:[`Same base, multiplying → ADD the exponents.`, `${a} + ${b} = ${a+b}`, `Answer: x${toSup(a+b)}`]};
  }
  if(type==="pow"){
    const a=randInt(2,5), b=randInt(2,5);
    return {q:`(x${toSup(a)})${toSup(b)} = ?`, a:`x${toSup(a*b)}`,
      steps:[`Power to a power → MULTIPLY the exponents.`, `${a} × ${b} = ${a*b}`, `Answer: x${toSup(a*b)}`]};
  }
  if(type==="div"){
    const b=randInt(2,6), diff=randInt(1,7), a=b+diff;
    return {q:`x${toSup(a)} ÷ x${toSup(b)} = ?`, a:`x${toSup(diff)}`,
      steps:[`Same base, dividing → SUBTRACT the exponents.`, `${a} − ${b} = ${diff}`, `Answer: x${toSup(diff)}`]};
  }
  if(type==="zero"){
    const c=randInt(2,9);
    return {q:`${c}x⁰ = ?`, a:`${c}`,
      steps:[`Anything to the power of 0 is 1 (as long as x ≠ 0).`, `x⁰ = 1`, `${c} × 1 = ${c}`]};
  }
  if(type==="neg"){
    const a=randInt(2,5);
    return {q:`x${toSup(-a)} = ? (as a fraction)`, a:`1/x${toSup(a)}`,
      steps:[`A negative exponent means "flip it into a fraction."`, `x${toSup(-a)} becomes 1 over x${toSup(a)}`, `Answer: 1/x${toSup(a)}`]};
  }
  const c1=randInt(2,5), c2=randInt(2,5), a=randInt(2,5), b=randInt(2,5);
  return {q:`(${c1}x${toSup(a)})(${c2}x${toSup(b)}) = ?`, a:`${c1*c2}x${toSup(a+b)}`,
    steps:[`Multiply the coefficients: ${c1} × ${c2} = ${c1*c2}`, `Same base, multiplying → add the exponents: ${a} + ${b} = ${a+b}`, `Answer: ${c1*c2}x${toSup(a+b)}`]};
});

// 2. Scientific Notation
GENERATORS[2] = () => {
  const items = [];
  {
    const d1=randInt(2,9), d2=randInt(1,9), e=randInt(3,6);
    const moved = [String(d2)].concat(Array(e-1).fill("0"));
    const num = fmtComma(Math.round((d1*10 + d2) * Math.pow(10,e-1)));
    items.push({q:`Write ${num} in scientific notation.`, a:`${d1}.${d2} × 10${toSup(e)}`,
      steps:[`Move the decimal point LEFT until one digit is in front: ${d1}.${d2}`,
        `Count the digits the decimal hopped over:###DP:${d1}:${moved.join(",")}:###`,
        `That's ${e} places → Big number → the exponent is POSITIVE.`,
        `Answer: ${d1}.${d2} × 10${toSup(e)}`]});
  }
  {
    const d1=randInt(1,9), d2=randInt(1,9), e=randInt(2,5);
    const moved = Array(e-1).fill("0").concat([String(d1)]);
    const decStr = "0." + "0".repeat(e-1) + d1 + d2;
    items.push({q:`Write ${decStr} in scientific notation.`, a:`${d1}.${d2} × 10${toSup(-e)}`,
      steps:[`Move the decimal point RIGHT until one digit is in front: ${d1}.${d2}`,
        `Count the digits the decimal hopped over:###DP::${moved.join(",")}:${d2}###`,
        `That's ${e} places → Tiny number → the exponent is NEGATIVE.`,
        `Answer: ${d1}.${d2} × 10${toSup(-e)}`]});
  }
  {
    const d1=randInt(2,9), d2=randInt(1,9), e=randInt(3,6);
    const moved = [String(d2)].concat(Array(e-1).fill("0"));
    const num = fmtComma(Math.round((d1*10 + d2) * Math.pow(10,e-1)));
    items.push({q:`Write ${d1}.${d2} × 10${toSup(e)} in standard form.`, a:num,
      steps:[`The exponent is +${e}, so move the decimal RIGHT ${e} places, padding zeros as needed.`,
        `Watch the decimal hop across (padded zeros included):###DP:${d1}:${moved.join(",")}:###`,
        `Answer: ${num}`]});
  }
  {
    const d1=randInt(1,9), d2=randInt(1,9), e=randInt(2,5);
    const moved = Array(e-1).fill("0").concat([String(d1)]);
    const decStr = "0." + "0".repeat(e-1) + d1 + d2;
    items.push({q:`Write ${d1}.${d2} × 10${toSup(-e)} in standard form.`, a:decStr,
      steps:[`The exponent is −${e}, so move the decimal LEFT ${e} places, padding zeros as needed.`,
        `Watch the decimal hop across (padded zeros included):###DP::${moved.join(",")}:${d2}###`,
        `Answer: ${decStr}`]});
  }
  {
    const c2=randInt(2,4), m=randInt(2,Math.floor(9/c2)), c1=c2*m;
    const a1=randInt(2,6), b1=randInt(2,6);
    items.push({q:`(${c1} × 10${toSup(a1)})(${c2} × 10${toSup(b1)}) = ?`, a:`${c1*c2} × 10${toSup(a1+b1)}`,
      steps:[`Multiply the front numbers: ${c1} × ${c2} = ${c1*c2}`, `Add the exponents: ${a1} + ${b1} = ${a1+b1}`, `Answer: ${c1*c2} × 10${toSup(a1+b1)}`]});
  }
  {
    const c2=randInt(2,9), q=randInt(2,9), c1=c2*q;
    const a1=randInt(4,9), b1=randInt(2,3);
    items.push({q:`(${c1} × 10${toSup(a1)}) ÷ (${c2} × 10${toSup(b1)}) = ?`, a:`${q} × 10${toSup(a1-b1)}`,
      steps:[`Divide the front numbers: ${c1} ÷ ${c2} = ${q}`, `Subtract the exponents: ${a1} − ${b1} = ${a1-b1}`, `Answer: ${q} × 10${toSup(a1-b1)}`]});
  }
  return items;
};

// 3. Simplifying Square Roots
GENERATORS[3] = () => genSet(6, () => {
  const m = randInt(2,9), r = choice(SQUAREFREE);
  const n = m*m*r;
  if(n>500) return null;
  return {q:`√${n} = ?`, a:`${m}√${r}`,
    steps:[`Find the largest perfect square that divides ${n}: ${m*m} (${n} = ${m*m} × ${r})`,
      `√${m*m} = ${m}, so pull the ${m} out front`, `Answer: ${m}√${r}`]};
});

// 4. Solving Inequalities (uses ###BAL###)
GENERATORS[4] = () => genSet(6, () => {
  const type = choice(["add","mul","twostep","negone","negtwo"]);
  const op = choice(["<",">","≤","≥"]);
  if(type==="add"){
    const b=randInt(2,9), s=randIntNonZero(-9,9), c=s+b;
    return {q:qClean(`x + ${b} ${op} ${c}`), a:`x ${op} ${s}`,
      steps:[`Subtract ${b} from BOTH sides — watch it happen:###BAL:x + ${b},${c};${op};−${b},−${b};x,${s}###`, `Answer: x ${op} ${s}`]};
  }
  if(type==="mul"){
    const m=randInt(2,6), s=randIntNonZero(-9,9), c=m*s;
    return {q:`${m}x ${op} ${c}`, a:`x ${op} ${s}`,
      steps:[`Divide BOTH sides by ${m} — watch it happen:###BAL:${m}x,${c};${op};÷${m},÷${m};x,${s}###`, `Answer: x ${op} ${s}`]};
  }
  if(type==="twostep"){
    const m=randInt(2,5), s=randIntNonZero(-9,9), b=randIntNonZero(-9,9), c=m*s+b;
    const undo = pmRaw(-b);
    return {q:qClean(`${m}x ${pmTerm(b)} ${op} ${c}`), a:`x ${op} ${s}`,
      steps:[`${b<0?"Add":"Subtract"} ${Math.abs(b)} ${b<0?"to":"from"} BOTH sides:###BAL:${m}x ${pmTerm(b)},${c};${op};${undo},${undo};${m}x,${m*s}###`,
        `Now divide BOTH sides by ${m}:###BAL:${m}x,${m*s};${op};÷${m},÷${m};x,${s}###`,
        `Answer: x ${op} ${s}`]};
  }
  if(type==="negone"){
    const m=-randInt(2,6), s=randIntNonZero(-9,9), c=m*s;
    return {q:`${m}x ${op} ${c}`, a:`x ${flipOp(op)} ${s}`,
      steps:[`Divide BOTH sides by ${m} — the sign FLIPS because it's negative:###BAL:${m}x,${c};${op};÷${m},÷${m};x,${s};${flipOp(op)}###`, `Answer: x ${flipOp(op)} ${s}`]};
  }
  // negtwo: two-step with negative coefficient
  const m=-randInt(2,5), s=randIntNonZero(-9,9), b=randIntNonZero(-9,9), c=m*s+b;
  const undo = pmRaw(-b);
  return {q:qClean(`${m}x ${pmTerm(b)} ${op} ${c}`), a:`x ${flipOp(op)} ${s}`,
    steps:[`${b<0?"Add":"Subtract"} ${Math.abs(b)} ${b<0?"to":"from"} BOTH sides:###BAL:${m}x ${pmTerm(b)},${c};${op};${undo},${undo};${m}x,${m*s}###`,
      `Divide BOTH sides by ${m} — the sign FLIPS:###BAL:${m}x,${m*s};${op};÷${m},÷${m};x,${s};${flipOp(op)}###`,
      `Answer: x ${flipOp(op)} ${s}`]};
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
    steps=[`Positive case: ${inner} = ${c} → x = ${r1}`, `Negative case: ${inner} = −${c} → x = ${r2}`, `Answer: x = ${r1} or x = ${r2}`];
  }else{
    steps=[`Positive case: ${inner} = ${c} → ${linTerm(a,"x")} = ${c-b} → x = ${r1}`,
      `Negative case: ${inner} = −${c} → ${linTerm(a,"x")} = ${-c-b} → x = ${r2}`,
      `Answer: x = ${r1} or x = ${r2}`];
  }
  return {q:qClean(`|${inner}| = ${c}`), a:`x = ${r1}  or  x = ${r2}`, steps};
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
    return {q:`y = ${mTerm}  and  ${A===1?"":A}x + y = ${C}`, a:`x = ${x0}, y = ${y0}`,
      steps:[`Substitute (${mTerm}) in for y: ${A===1?"":A}x + (${mTerm}) = ${C}`,
        `${poly([[A+m,"x"],[k,""]])} = ${C} → ${A===1?"":A}${m>=0?"+":""}${m===0?"":""}x term solved → x = ${x0}`,
        `Plug x = ${x0} back in: y = ${mTerm.replace(/x/,`(${x0})`)} = ${y0}`]};
  }
  const x0=randInt(-9,9), y0=randInt(-9,9);
  const S=x0+y0, D=x0-y0;
  if(S===D) return null;
  return {q:`x + y = ${S}  and  x − y = ${D}`, a:`x = ${x0}, y = ${y0}`,
    steps:[`Add the two equations straight down — the y's cancel: 2x = ${S+D}`, `x = ${x0}`, `Plug x = ${x0} back in: ${x0} + y = ${S} → y = ${y0}`]};
});

// 7. Simplifying Rational Expressions (cat: rational)
GENERATORS[7] = () => genSet(6, () => {
  const type = choice(["diffsq","gcf","trinomial"]);
  if(type==="diffsq"){
    const k = randIntNonZero(2,12);
    const plus = choice([true,false]);
    const num = `x² − ${k*k}`;
    const den = plus ? `x + ${k}` : `x − ${k}`;
    const ans = plus ? `x − ${k}, where x ≠ −${k}` : `x + ${k}, where x ≠ ${k}`;
    return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:ans,
      steps:[`Factor the top (difference of squares): (x − ${k})(x + ${k})`, `Cancel the matching (${den}) on top and bottom.`,
        `Restriction: the original denominator ${den} = 0 when x = ${plus?-k:k}.`, `Answer: ${ans}`]};
  }
  if(type==="gcf"){
    const m = randInt(2,5), c = randIntNonZero(-9,9);
    const num = poly([[m,"x²"],[m*c,"x"]]);
    const den = m===1 ? "x" : `${m}x`;
    const ans = `${linTerm(1,"x")+pmTerm(c)}, where x ≠ 0`;
    return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:ans,
      steps:[`Factor the top: ${den}(x${pmTerm(c)})`, `Cancel the matching ${den} on top and bottom.`,
        `Restriction: the original denominator ${den} = 0 when x = 0.`, `Answer: ${ans}`]};
  }
  const r1 = randIntNonZero(-9,9), r2 = randIntNonZero(-9,9);
  if(r1===r2) return null;
  const B = -(r1+r2), C = r1*r2;
  const num = poly([[1,"x²"],[B,"x"],[C,""]]);
  const den = `x${pmTerm(-r1)}`;
  const ans = `x${pmTerm(-r2)}, where x ≠ ${r1}`;
  return {q:`<span class='frac'><span class='frac-num'>${num}</span><span class='frac-den'>${den}</span></span>`, a:qClean(ans),
    steps:[`Factor the top: (${den})(x${pmTerm(-r2)})`, `Cancel the matching (${den}) on top and bottom.`,
      `Restriction: the original denominator ${den} = 0 when x = ${r1}.`, `Answer: ${ans}`]};
});

// 8. Compound Inequalities (uses ###BAL###)
GENERATORS[8] = () => genSet(6, () => {
  const type = choice(["add3","mul3","neg3","or"]);
  const op = choice(["<","≤"]);
  if(type==="add3"){
    const b=randIntNonZero(-9,9), sLo=randInt(-9,5), sHi=sLo+randInt(2,9);
    const left=sLo+b, right=sHi+b, undo=pmRaw(-b);
    return {q:qClean(`${left} ${op} x${pmTerm(b)} ${op} ${right}`), a:`${sLo} ${op} x ${op} ${sHi}`,
      steps:[`${b<0?"Add":"Subtract"} ${Math.abs(b)} from ALL THREE parts — watch it happen:###BAL:${left},x${pmTerm(b)},${right};${op},${op};${undo},${undo},${undo};${sLo},x,${sHi}###`,
        `Answer: ${sLo} ${op} x ${op} ${sHi}`]};
  }
  if(type==="mul3"){
    const m=randInt(2,6), sLo=randInt(-9,5), sHi=sLo+randInt(2,9);
    const left=m*sLo, right=m*sHi;
    return {q:`${left} ${op} ${m}x ${op} ${right}`, a:`${sLo} ${op} x ${op} ${sHi}`,
      steps:[`Divide ALL THREE parts by ${m} — watch it happen:###BAL:${left},${m}x,${right};${op},${op};÷${m},÷${m},÷${m};${sLo},x,${sHi}###`,
        `Answer: ${sLo} ${op} x ${op} ${sHi}`]};
  }
  if(type==="neg3"){
    const m=-randInt(2,5), sLo=randInt(-9,3), sHi=sLo+randInt(2,8);
    const left=m*sHi, right=m*sLo;
    return {q:`${left} ${op} ${linTerm(m,"x")} ${op} ${right}`, a:`${sLo} ${op} x ${op} ${sHi}`,
      steps:[`Divide ALL THREE parts by ${m} — BOTH signs flip:###BAL:${left},${linTerm(m,"x")},${right};${op},${op};÷${m},÷${m},÷${m};${sHi},x,${sLo};${flipOp(op)},${flipOp(op)}###`,
        `Rewritten left-to-right: ${sLo} ${op} x ${op} ${sHi}`]};
  }
  const b1=randInt(2,9), s1=randIntNonZero(-9,9), c1=s1+b1;
  const b2=randInt(2,9), s2=randIntNonZero(-9,9), c2=s2+b2;
  const op1=choice(["<",">"]), op2=choice(["<",">"]);
  const undo1=pmRaw(-b1), undo2=pmRaw(-b2);
  return {q:qClean(`x + ${b1} ${op1} ${c1}  or  x + ${b2} ${op2} ${c2}`), a:qClean(`x ${op1} ${s1}  or  x ${op2} ${s2}`),
    steps:[`These are two SEPARATE inequalities — solve each one on its own.`,
      `First one:###BAL:x + ${b1},${c1};${op1};${undo1},${undo1};x,${s1}###`,
      `Second one:###BAL:x + ${b2},${c2};${op2};${undo2},${undo2};x,${s2}###`,
      `Answer: x ${op1} ${s1} or x ${op2} ${s2}`]};
});

// 9. Systems — Elimination
GENERATORS[9] = () => genSet(6, () => {
  const add = choice([true,false]);
  const x0=randInt(-6,9), y0=randInt(-6,9);
  if(add){
    const b=randInt(1,5), a1=randInt(1,5), a2=randIntNonZero(1,5);
    const C1=a1*x0+b*y0, C2=a2*x0-b*y0;
    return {q:`${a1===1?"":a1}x ${b===1?"+":"+ "+b}y = ${C1}  and  ${a2===1?"":a2}x ${b===1?"−":"− "+b}y = ${C2}`.replace("+ 1y","+ y").replace("− 1y","− y"),
      a:`x = ${x0}, y = ${y0}`,
      steps:[`The y's are opposites — ADD the equations: ${a1+a2}x = ${C1+C2}`, `x = ${x0}`, `Plug back in: ${a1===1?"":a1}(${x0}) + ${b===1?"":b}y = ${C1} → y = ${y0}`]};
  }
  const a=randInt(1,5), b1=randInt(1,6), b2=randIntNonZero(1,6);
  if(b1===b2) return null;
  const C1=a*x0+b1*y0, C2=a*x0+b2*y0;
  return {q:`${a===1?"":a}x + ${b1===1?"":b1}y = ${C1}  and  ${a===1?"":a}x + ${b2===1?"":b2}y = ${C2}`,
    a:`x = ${x0}, y = ${y0}`,
    steps:[`The x's match — SUBTRACT the equations: ${b1-b2}y = ${C1-C2}`, `y = ${y0}`, `Plug back in: ${a===1?"":a}x + ${b1===1?"":b1}(${y0}) = ${C1} → x = ${x0}`]};
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
    steps:[`Distribute ${c1===1?"":c1}x: ${poly([[c1*A,"x³"],[c1*B,"x²"],[c1*C,"x"]])}`,
      `Distribute ${pmRaw(p)}: ${poly([[p*A,"x²"],[p*B,"x"],[p*C,""]])}`,
      `Combine like terms: ${poly([[r3,"x³"],[r2,"x²"],[r1,"x"],[r0,""]])}`]};
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
    return {q, a, steps:[`GCF of ${A} and ${B} is ${g}; smallest power of x in both terms is x² → GCF = ${g}x²`,
      `Divide each term by ${g}x²: ${m}x and ${sign>0?"":"−"}${n}`, `Answer: ${a}`]};
  }
  const q = `${A}x² ${sign>0?"+":"−"} ${B}x`;
  const a = `${g}x(${m}x ${sign>0?"+":"−"} ${n})`;
  return {q, a, steps:[`GCF of ${A} and ${B} is ${g}; both terms have at least one x → GCF = ${g}x`,
    `Divide each term by ${g}x: ${m}x and ${sign>0?"":"−"}${n}`, `Answer: ${a}`]};
});

// 12. Difference of Squares
GENERATORS[12] = () => genSet(6, () => {
  const co = choice([1,1,1,2,3,5]), k = randInt(2,9);
  const A = co*co;
  const xTerm = co===1?"x²":`${A}x²`;
  const xLabel = co===1?"x":`${co}x`;
  return {q:`${xTerm} − ${k*k}`, a:`(${xLabel} − ${k})(${xLabel} + ${k})`,
    steps:[`Square root of ${xTerm} is ${xLabel}; square root of ${k*k} is ${k}.`,
      `Pattern: a² − b² = (a − b)(a + b)`, `Answer: (${xLabel} − ${k})(${xLabel} + ${k})`]};
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
    steps:[`a × c = ${A} × ${C} = ${A*C}. Two numbers that multiply to ${A*C} and add to ${B}: ${n1} and ${n2}`,
      `Split the middle term: ${poly([[A,"x²"],[n1,"x"],[n2,"x"],[C,""]])}`,
      `Group and factor each pair — it works out to: ${ans}`]};
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
    return {q:`${qText}  (leave a √ in it)`, a:`x = ${-p} ± √${T}`,
      steps:[`Move the constant: x²${pmTerm(b)} = ${-c}`,
        `Half of ${b} is ${p}, squared is ${p*p} — add to both sides: (x${pmTerm(p)})² = ${T}`,
        `Square root both sides (not a perfect square, so keep the √): x${pmTerm(p)} = ±√${T}`,
        `Answer: x = ${-p} ± √${T}`]};
  }
  const r1 = -p+s, r2 = -p-s;
  if(r1===r2) return null;
  return {q:qText, a:`x = ${r1}  or  x = ${r2}`,
    steps:[`Move the constant: x²${pmTerm(b)} = ${-c}`,
      `Half of ${b} is ${p}, squared is ${p*p} — add to both sides: (x${pmTerm(p)})² = ${T}`,
      `Square root both sides: x${pmTerm(p)} = ±${s}`,
      `Answer: x = ${r1} or x = ${r2}`]};
});

// 15. The Quadratic Formula (8 problems: ~6 rational + ~2 irrational)
GENERATORS[15] = () => genSet(8, () => {
  const irrational = Math.random() < 0.3;
  if(irrational){
    const p = randIntNonZero(-5,5), d = choice([2,3,5,6,7,8,10,11,13]);
    const b = 2*p, c = p*p - d;
    const qText = qClean(`${poly([[1,"x²"],[b,"x"],[c,""]])} = 0`);
    return {q:`${qText}  (leave a √ in it)`, a:`x = ${-p} ± √${d}`,
      steps:[`a=1, b=${b}, c=${c}`,
        `Discriminant: b²−4ac = ${diffStr(b*b,4*c)} = ${4*d}, √${4*d} = 2√${d}`,
        `x = (${pmRaw(-b)} ± 2√${d}) / 2`,
        `Answer: x = ${-p} ± √${d}`]};
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
  return {q:qText, a:`x = ${root1}  or  x = ${root2}`,
    steps:[`a=${a}, b=${b}, c=${c}`,
      `Discriminant: b²−4ac = ${disc}, √${disc} = ${sq}`,
      `x = (${pmRaw(-b)} ± ${sq}) / ${2*a}`,
      `Answer: x = ${root1} or x = ${root2}`]};
});

// 16. Multi-Step Word Problems
GENERATORS[16] = () => {
  const items = [];
  {
    const pct = choice([10,20,25,50]), P = 20*randInt(1,10);
    const sale = Math.round(P*(1-pct/100));
    items.push({q:`A $${P} shirt is ${pct}% off. Sale price?`, a:`$${sale}`,
      steps:[`${pct}% off means you pay ${100-pct}% of the original price.`, `Sale price = ${P} × ${(1-pct/100).toFixed(2)}`, `Answer: $${sale}`]});
  }
  {
    const pctInc = choice([10,20,25,50]);
    const O = pctInc===25?4*randInt(2,15) : pctInc===10?10*randInt(2,10) : pctInc===20?5*randInt(2,16) : 2*randInt(2,30);
    const N = Math.round(O*(1+pctInc/100));
    items.push({q:`Wage goes from $${O} to $${N}. Percent increase?`, a:`${pctInc}%`,
      steps:[`Percent increase = (new − old) ÷ old`, `(${N} − ${O}) ÷ ${O} = ${N-O} ÷ ${O} = ${(pctInc/100).toFixed(2)}`, `Answer: ${pctInc}%`]});
  }
  {
    const rate = randInt(20,80), t1 = randInt(2,6), t2 = randInt(2,8);
    const d1 = rate*t1, d2 = rate*t2;
    items.push({q:`A car goes ${d1} mi in ${t1} hrs. At that rate, how far in ${t2} hrs?`, a:`${d2} miles`,
      steps:[`Find the rate: ${d1} ÷ ${t1} = ${rate} mph`, `Multiply the rate by the new time: ${rate} × ${t2}`, `Answer: ${d2} miles`]});
  }
  {
    const x = randInt(5,60), sum = 3*x+3;
    items.push({q:`Three consecutive integers sum to ${sum}. Find them.`, a:`${x}, ${x+1}, ${x+2}`,
      steps:[`Let x, x+1, x+2 be the three integers.`, `x + (x+1) + (x+2) = ${sum} → 3x + 3 = ${sum} → 3x = ${sum-3} → x = ${x}`, `Answer: ${x}, ${x+1}, ${x+2}`]});
  }
  {
    const x = 2*randInt(2,30), sum = 2*x+2;
    items.push({q:`Two consecutive EVEN integers sum to ${sum}. Find them.`, a:`${x}, ${x+2}`,
      steps:[`Let x, x+2 be the two even integers.`, `x + (x+2) = ${sum} → 2x + 2 = ${sum} → 2x = ${sum-2} → x = ${x}`, `Answer: ${x}, ${x+2}`]});
  }
  {
    const rate = choice([2,4,5,10]), mult = randInt(1,9), P = 100*mult, t = randInt(1,5);
    const interest = mult*rate*t;
    items.push({q:`$${P} at ${rate}% simple interest for ${t} years. Interest earned?`, a:`$${interest}`,
      steps:[`Simple interest = Principal × rate × time`, `${P} × ${(rate/100).toFixed(2)} × ${t}`, `Answer: $${interest}`]});
  }
  return items;
};

// 17. Graphing Linear Equations (uses ###GRAPH###)
GENERATORS[17] = () => genSet(6, () => {
  const type = choice(["read","eval","slope"]);
  if(type==="read"){
    const m=randIntNonZero(-6,6), b=randInt(-9,9);
    const eqStr = qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`);
    return {q:`Find the slope and y-intercept of ${eqStr}. ###GRAPH:line;${m},${b};${eqStr}###`, a:`m = ${m}, b = ${b}`,
      steps:[`The number multiplying x is the slope.`, `The number standing alone is the y-intercept.`, `Answer: m = ${m}, b = ${b}`]};
  }
  if(type==="eval"){
    const m=randIntNonZero(-6,6), b=randInt(-9,9), x0=randIntNonZero(-5,5);
    const y0 = m*x0+b;
    const eqStr = qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`);
    return {q:`A line has slope ${m} and y-intercept ${b}. What is y when x = ${x0}? ###GRAPH:line;${m},${b};${eqStr}###`, a:`y = ${y0}`,
      steps:[`Plug into y = mx + b: y = ${m}(${x0})${pmTerm(b)}`, `y = ${m*x0}${pmTerm(b)}`, `Answer: y = ${y0}`]};
  }
  const x1=randInt(-5,5), x2=randIntNonZero(-5,5);
  if(x1===x2) return null;
  const m=randIntNonZero(-6,6), y1=randInt(-9,9), y2=y1+m*(x2-x1);
  return {q:`Find the slope between the points (${x1}, ${y1}) and (${x2}, ${y2}). ###GRAPH:points;${x1},${y1},${x2},${y2};(${x1},${y1}) and (${x2},${y2})###`, a:`m = ${m}`,
    steps:[`Slope = (change in y) ÷ (change in x) = (${diffStr(y2,y1)}) ÷ (${diffStr(x2,x1)})`, `= ${y2-y1} ÷ ${x2-x1}`, `Answer: m = ${m}`]};
});

// 18. Writing Linear Equations
GENERATORS[18] = () => genSet(6, () => {
  const type = choice(["intercept","point","parallel","perp","twopoint"]);
  if(type==="intercept"){
    const m=randIntNonZero(-6,6), b=randInt(-9,9);
    return {q:`Write the equation of a line through (0, ${b}) with slope ${m}.`, a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`),
      steps:[`The point (0,${b}) is already the y-intercept, so b = ${b}.`, `Plug in: y = ${linTerm(m,"x")}${pmTerm(b)}`, `Answer: y = ${linTerm(m,"x")}${pmTerm(b)}`]};
  }
  if(type==="point"){
    const m=randIntNonZero(-6,6), x0=randIntNonZero(-5,5), y0=randInt(-9,9);
    const b = y0 - m*x0;
    return {q:`Write the equation of a line through (${x0}, ${y0}) with slope ${m}.`, a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`),
      steps:[`Plug into y = mx + b: ${y0} = ${m}(${x0}) + b`, `Solve: ${y0} = ${m*x0} + b → b = ${b}`, `Answer: y = ${linTerm(m,"x")}${pmTerm(b)}`]};
  }
  if(type==="parallel"){
    const m=randIntNonZero(-9,9), b=randInt(-9,9);
    return {q:`What is the slope of a line parallel to ${qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`)}?`, a:`m = ${m}`,
      steps:[`Parallel lines have the same slope.`, `Answer: m = ${m}`]};
  }
  if(type==="perp"){
    const m=randIntNonZero(-9,9);
    if(Math.abs(m)===1) return null;
    const b=randInt(-9,9);
    const perp = fracStr(-1,m);
    return {q:`What is the slope of a line perpendicular to ${qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`)}?`, a:`m = ${perp}`,
      steps:[`Perpendicular slopes are negative reciprocals.`, `Flip ${m} to 1/${m}, then negate: ${perp}`, `Answer: m = ${perp}`]};
  }
  const x1=randInt(-5,5), x2=randIntNonZero(-5,5);
  if(x1===x2) return null;
  const m=randIntNonZero(-6,6), y1=randInt(-9,9), y2=y1+m*(x2-x1);
  const b = y1-m*x1;
  return {q:`Find the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2}), then write its equation using (${x1},${y1}).`, a:qClean(`y = ${linTerm(m,"x")}${pmTerm(b)}`),
    steps:[`Slope = (${diffStr(y2,y1)})÷(${diffStr(x2,x1)}) = ${y2-y1}÷${x2-x1} = ${m}`, `Plug into y = mx + b: ${y1} = ${m}(${x1}) + b → b = ${b}`, `Answer: y = ${linTerm(m,"x")}${pmTerm(b)}`]};
});

// 19. Functions & Function Notation
GENERATORS[19] = () => genSet(6, () => {
  const type = choice(["linear","quad","domain","range"]);
  if(type==="linear"){
    const m=randIntNonZero(-9,9), b=randInt(-9,9), x0=randInt(-9,9);
    const val = m*x0+b;
    return {q:qClean(`If f(x) = ${linTerm(m,"x")}${pmTerm(b)}, find f(${x0}).`), a:`${val}`,
      steps:[`Substitute x = ${x0}: f(${x0}) = ${m}(${x0})${pmTerm(b)}`, `Simplify: ${m*x0}${pmTerm(b)} = ${val}`, `Answer: ${val}`]};
  }
  if(type==="quad"){
    const B=randIntNonZero(-6,6), x0=randInt(-5,5);
    const val = x0*x0+B*x0;
    return {q:qClean(`If f(x) = x² ${pmTerm(B)}x, find f(${x0}).`), a:`${val}`,
      steps:[`Substitute x = ${x0}: f(${x0}) = ${x0}² ${pmTerm(B)}(${x0})`, `Simplify: ${x0*x0}${pmTerm(B*x0)} = ${val}`, `Answer: ${val}`]};
  }
  if(type==="domain"){
    const k=randIntNonZero(-9,9);
    return {q:qClean(`What is the domain of f(x) = 1/(x${pmTerm(k)})?`), a:`all real numbers except x = ${-k}`, check:`allrealnumbersexceptx=${-k}`,
      steps:[`A fraction is undefined when its denominator is 0.`, `x${pmTerm(k)} = 0 when x = ${-k}, so that value is excluded.`, `Answer: all real numbers except x = ${-k}`]};
  }
  return {q:`If f(x) = x² (for x ≥ 0), what is the range?`, a:`y ≥ 0`,
    steps:[`Squaring any x ≥ 0 can never produce a negative output.`, `The smallest output is 0, at x = 0.`, `Answer: y ≥ 0`]};
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
    ? [`Group like terms: (${A1} ${A2>=0?"+":"−"} ${Math.abs(A2)})x² + (${B1} ${B2>=0?"+":"−"} ${Math.abs(B2)})x + (${C1} ${C2>=0?"+":"−"} ${Math.abs(C2)})`, `Combine: ${ansStr}`, `Answer: ${ansStr}`]
    : [`Distribute the negative sign: ${p1} ${poly([[-A2,"x²"],[-B2,"x"],[-C2,""]])}`, `Combine like terms: (${diffStr(A1,A2)})x² + (${diffStr(B1,B2)})x + (${diffStr(C1,C2)})`, `Answer: ${ansStr}`];
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
    steps:[`First: ${b1} · ${b2} = ${first}`, `Outer + Inner: combine to give ${pmRaw(B)}x`, `Last: ${pmRaw(p)} · ${pmRaw(q)} = ${pmRaw(C)}`, `Answer: ${poly([[A,"x²"],[B,"x"],[C,""]])}`]};
});

// 22. Factoring Trinomials (a = 1)
GENERATORS[22] = () => genSet(6, () => {
  const n1=randIntNonZero(-9,9), n2=randIntNonZero(-9,9);
  if(n1===n2) return null;
  const B=n1+n2, C=n1*n2;
  const qText = qClean(`Factor: ${poly([[1,"x²"],[B,"x"],[C,""]])}`);
  const ans = qClean(`(x${pmTerm(n1)})(x${pmTerm(n2)})`);
  return {q:qText, a:ans,
    steps:[`Two numbers that multiply to ${C} and add to ${B}: ${n1} and ${n2}`, `Check: ${n1}×${n2}=${C}, ${n1}+${n2}=${B}`, `Answer: ${ans}`]};
});

// 23. Factoring by Grouping
GENERATORS[23] = () => genSet(6, () => {
  const type = choice(["pure","split"]);
  if(type==="pure"){
    const A=randIntNonZero(-9,9), B=randInt(2,9);
    const qText = qClean(`Factor by grouping: ${poly([[1,"x³"],[A,"x²"],[B,"x"],[A*B,""]])}`);
    const ans = qClean(`(x${pmTerm(A)})(x²${pmTerm(B)})`);
    return {q:qText, a:ans,
      steps:[`Group: (x³${pmTerm(A)}x²) + (${B}x${pmTerm(A*B)})`, `Pull GCFs: x²(x${pmTerm(A)}) + ${B}(x${pmTerm(A)})`, `Answer: ${ans}`]};
  }
  const p = choice([2,2,3,4]), q = choice([1,1,2]);
  const m = randIntNonZero(-6,6), n = randIntNonZero(-6,6);
  const A = p*q, Bmid = p*n + q*m, C = m*n;
  if(A<2) return null;
  const n1 = p*n, n2 = q*m;
  const qText = qClean(`Factor by grouping: ${poly([[A,"x²"],[Bmid,"x"],[C,""]])}  (split ${Bmid}x into ${n1}x and ${n2}x)`);
  const ans = qClean(`(${p===1?"":p}x${pmTerm(m)})(${q===1?"":q}x${pmTerm(n)})`);
  return {q:qText, a:ans,
    steps:[`Rewrite: ${poly([[A,"x²"],[n1,"x"],[n2,"x"],[C,""]])}`,
      `Group and pull the GCF from each pair.`,
      `Answer: ${ans}`]};
});

// 24. Special Factoring Patterns
GENERATORS[24] = () => genSet(6, () => {
  const type = choice(["sqplus","sqminus","cube"]);
  if(type==="sqplus"){
    const k=randInt(2,12);
    return {q:qClean(`Factor: ${poly([[1,"x²"],[2*k,"x"],[k*k,""]])}`), a:`(x + ${k})²`,
      steps:[`Square roots of outer terms: √x²=x, √${k*k}=${k}`, `Check middle: 2×x×${k}=${2*k}x ✓`, `Answer: (x + ${k})²`]};
  }
  if(type==="sqminus"){
    const k=randInt(2,12);
    return {q:qClean(`Factor: ${poly([[1,"x²"],[-2*k,"x"],[k*k,""]])}`), a:`(x − ${k})²`,
      steps:[`Square roots of outer terms: √x²=x, √${k*k}=${k}`, `Check middle: 2×x×${k}=${2*k}x ✓, subtracted so (x−${k})²`, `Answer: (x − ${k})²`]};
  }
  const k=randInt(2,6), sum=choice([true,false]);
  if(sum) return {q:`Factor: x³ + ${k*k*k}`, a:`(x + ${k})(x² − ${k}x + ${k*k})`,
    steps:[`Cube roots: ∛x³=x, ∛${k*k*k}=${k}`, `Pattern a³+b³=(a+b)(a²−ab+b²), plug in a=x, b=${k}`, `Answer: (x + ${k})(x² − ${k}x + ${k*k})`]};
  return {q:`Factor: x³ − ${k*k*k}`, a:`(x − ${k})(x² + ${k}x + ${k*k})`,
    steps:[`Cube roots: ∛x³=x, ∛${k*k*k}=${k}`, `Pattern a³−b³=(a−b)(a²+ab+b²), plug in a=x, b=${k}`, `Answer: (x − ${k})(x² + ${k}x + ${k*k})`]};
});

// 25. Solving Quadratics by Factoring
GENERATORS[25] = () => genSet(6, () => {
  const n1=randInt(-9,9), n2=randIntNonZero(-9,9);
  if(n1===n2) return null;
  const B=n1+n2, C=n1*n2;
  const r1=-n1, r2=-n2;
  const qText = qClean(`Solve: ${poly([[1,"x²"],[B,"x"],[C,""]])} = 0`);
  const checkStr = `x=${r1} or x=${r2}`;
  return {q:qText, a:`x = ${r1}  or  x = ${r2}`, check:checkStr,
    steps:[`Factor: (x${pmTerm(n1)})(x${pmTerm(n2)}) = 0`, `Set each factor to 0: x${pmTerm(n1)} = 0 or x${pmTerm(n2)} = 0`, `Answer: x = ${r1} or x = ${r2}`]};
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
    return {q:`Does ${eqStr} open up or down? ###GRAPH:parabola;${a},${h},${k};${eqStr}###`, a:dir,
      steps:[`Look at a, the number multiplying the squared part: a = ${a}`, `a is ${a>0?"positive, so it opens up.":"negative, so it opens down."}`, `Answer: ${dir}`]};
  }
  const a = choice([1,1,1,2,3]);
  const aPrefix = a===1?"":String(a);
  const eqStr = qClean(`y = ${aPrefix}(x${pmTerm(-h)})²${pmTerm(k)}`);
  if(type==="axis"){
    return {q:`What is the axis of symmetry of ${eqStr}? ###GRAPH:parabola;${a},${h},${k};${eqStr}###`, a:`x = ${h}`,
      steps:[`The axis of symmetry is the vertical line x = h.`, `h = ${h} here.`, `Answer: x = ${h}`]};
  }
  return {q:`Find the vertex of ${eqStr}. ###GRAPH:parabola;${a},${h},${k};${eqStr}###`, a:`h = ${h}, k = ${k}`,
    steps:[`Compare to (x − h)²: h = ${h}`, `The number added at the end is k: k = ${k}`, `Answer: h = ${h}, k = ${k}`]};
});

// 27. Rational Expression Operations (cat: rational)
GENERATORS[27] = () => genSet(6, () => {
  const type = choice(["mulCancelBin","mulCancelX","divX","divBin","addDiffDenom","subSameDenom"]);
  if(type==="mulCancelBin"){
    const k=randIntNonZero(2,9), m=randInt(2,9);
    const ans = `x/${m}, where x ≠ ${pmRaw(-k)}`;
    return {q:`<span class='frac'><span class='frac-num'>x</span><span class='frac-den'>x${pmTerm(k)}</span></span> × <span class='frac'><span class='frac-num'>x${pmTerm(k)}</span><span class='frac-den'>${m}</span></span> = ?`, a:ans,
      steps:[`Multiply across: x(x${pmTerm(k)}) / ${m}(x${pmTerm(k)})`, `Cancel the shared (x${pmTerm(k)})`, `Restriction: x${pmTerm(k)} = 0 when x = ${pmRaw(-k)}`, `Answer: ${ans}`]};
  }
  if(type==="mulCancelX"){
    const c1=randInt(2,12), c2=randInt(2,12);
    const ans = `${fracStr(c1,c2)}, where x ≠ 0`;
    return {q:`<span class='frac'><span class='frac-num'>${c1}</span><span class='frac-den'>x</span></span> × <span class='frac'><span class='frac-num'>x</span><span class='frac-den'>${c2}</span></span> = ?`, a:ans,
      steps:[`Multiply across: ${c1}x / ${c2}x`, `Cancel the shared x: ${c1}/${c2}`, `Restriction: x = 0`, `Answer: ${ans}`]};
  }
  if(type==="divX"){
    const c1=randInt(2,12), c2=randInt(2,12);
    const ans = `${fracStr(c1,c2)}, where x ≠ 0`;
    return {q:`<span class='frac'><span class='frac-num'>${c1}</span><span class='frac-den'>x</span></span> ÷ <span class='frac'><span class='frac-num'>${c2}</span><span class='frac-den'>x</span></span> = ?`, a:ans,
      steps:[`Flip the second fraction and multiply: ${c1}/x × x/${c2}`, `Cancel the shared x: ${c1}/${c2}`, `Restriction: x = 0`, `Answer: ${ans}`]};
  }
  if(type==="divBin"){
    const k=randIntNonZero(2,9), m=randInt(2,9), n=randInt(2,9);
    const ans = `${fracStr(n,m)}, where x ≠ ${pmRaw(-k)}`;
    return {q:`<span class='frac'><span class='frac-num'>x${pmTerm(k)}</span><span class='frac-den'>${m}</span></span> ÷ <span class='frac'><span class='frac-num'>x${pmTerm(k)}</span><span class='frac-den'>${n}</span></span> = ?`, a:ans,
      steps:[`Flip the second fraction and multiply: (x${pmTerm(k)})/${m} × ${n}/(x${pmTerm(k)})`, `Cancel the shared (x${pmTerm(k)}): ${n}/${m}`, `Restriction: x${pmTerm(k)} = 0 when x = ${pmRaw(-k)}`, `Answer: ${ans}`]};
  }
  if(type==="addDiffDenom"){
    const m=randInt(2,9);
    const ans = `(${m} + x)/${m}x, where x ≠ 0`;
    return {q:`<span class='frac'><span class='frac-num'>1</span><span class='frac-den'>x</span></span> + <span class='frac'><span class='frac-num'>1</span><span class='frac-den'>${m}</span></span> = ?  (common denominator is ${m}x)`, a:ans,
      steps:[`Common denominator: ${m}x`, `Rewrite each fraction over ${m}x: ${m}/${m}x + x/${m}x`, `Restriction: x = 0`, `Answer: ${ans}`]};
  }
  const c1=randInt(3,12), c2=randInt(1,c1-1);
  const diff=c1-c2;
  const diffStr = diff===1?"1/x":`${diff}/x`;
  const ans = `${diffStr}, where x ≠ 0`;
  return {q:`<span class='frac'><span class='frac-num'>${c1}</span><span class='frac-den'>x</span></span> − <span class='frac'><span class='frac-num'>${c2}</span><span class='frac-den'>x</span></span> = ?  (same denominator already)`, a:ans,
    steps:[`Same denominator, so just subtract the numerators: ${c1} − ${c2} = ${diff}`, `Restriction: x = 0`, `Answer: ${ans}`]};
});

// 28. Radical Operations (cat: foundations)
GENERATORS[28] = () => genSet(6, () => {
  const type = choice(["add","sub","mulProduct","mulSame","rationalize"]);
  if(type==="add"){
    const c1=randInt(2,12), c2=randInt(2,12), r=choice(SQUAREFREE);
    return {q:`${c1}√${r} + ${c2}√${r} = ?`, a:`${c1+c2}√${r}`,
      steps:[`Same radical, add the coefficients.`, `${c1} + ${c2} = ${c1+c2}`, `Answer: ${c1+c2}√${r}`]};
  }
  if(type==="sub"){
    const c2=randInt(2,9), c1=c2+randInt(1,9), r=choice(SQUAREFREE);
    const diff=c1-c2;
    return {q:`${c1}√${r} − ${c2}√${r} = ?`, a: diff===1?`√${r}`:`${diff}√${r}`,
      steps:[`Same radical, subtract the coefficients.`, `${c1} − ${c2} = ${diff}`, `Answer: ${diff===1?`√${r}`:`${diff}√${r}`}`]};
  }
  if(type==="mulProduct"){
    const sOpts = [4,6,8,9,10,12];
    const s = choice(sOpts);
    const divisors = [2,3,4,5,6].filter(j=>j>1 && j<s && s%j===0);
    if(!divisors.length) return null;
    const j = choice(divisors);
    const m = s*j, n = s/j;
    return {q:`√${m} × √${n} = ?`, a:`${s}`,
      steps:[`Multiply what's under the roots: ${m} × ${n} = ${m*n}`, `√${m*n} = ${s}`, `Answer: ${s}`]};
  }
  if(type==="mulSame"){
    const r=randInt(2,12);
    return {q:`√${r} × √${r} = ?`, a:`${r}`,
      steps:[`Multiply what's under the roots: ${r} × ${r} = ${r*r}`, `√${r*r} = ${r}`, `Answer: ${r}`]};
  }
  const r = choice(SQUAREFREE);
  return {q:`Rationalize: 1/√${r}`, a:`√${r}/${r}`,
    steps:[`Multiply top and bottom by √${r}.`, `(1×√${r}) / (√${r}×√${r}) = √${r}/${r}`, `Answer: √${r}/${r}`]};
});

// 29. Absolute Value Inequalities
GENERATORS[29] = () => genSet(6, () => {
  const type = choice(["between","or","plain"]);
  if(type==="between"){
    const b=randInt(-9,9), c=randInt(2,9), op=choice(["<","≤"]);
    const lo=b-c, hi=b+c;
    return {q:qClean(`Solve: |x${pmTerm(-b)}| ${op} ${c}`), a:`${lo} ${op} x ${op} ${hi}`,
      steps:[`Rewrite as between: −${c} ${op} x${pmTerm(-b)} ${op} ${c}`, `Add ${b} to all parts: ${lo} ${op} x ${op} ${hi}`, `Answer: ${lo} ${op} x ${op} ${hi}`]};
  }
  if(type==="or"){
    const b=randInt(-9,9), c=randInt(2,9), opOut=choice([">","≥"]), opIn=opOut===">"?"<":"≤";
    const lo=b-c, hi=b+c;
    return {q:qClean(`Solve: |x${pmTerm(-b)}| ${opOut} ${c}`), a:qClean(`x ${opOut} ${hi}  or  x ${opIn} ${lo}`),
      steps:[`Split with OR: x${pmTerm(-b)} ${opOut} ${c} OR x${pmTerm(-b)} ${opIn} −${c}`, `Solve each: x ${opOut} ${hi} OR x ${opIn} ${lo}`, `Answer: x ${opOut} ${hi} or x ${opIn} ${lo}`]};
  }
  const c=randInt(2,15), op=choice(["≤","<"]);
  return {q:`Solve: |x| ${op} ${c}`, a:`−${c} ${op} x ${op} ${c}`,
    steps:[`Rewrite as between: −${c} ${op} x ${op} ${c}`, `Answer: −${c} ${op} x ${op} ${c}`]};
});

// 30. Graphing Inequalities (uses ###GRAPH###)
GENERATORS[30] = () => genSet(6, () => {
  const type = choice(["circleOpen","circleClosed","boundary","shade"]);
  if(type==="circleOpen"){
    const v=randInt(-9,9), op=choice(["<",">"]);
    const dir = op==="<"?"left":"right";
    return {q:`On a number line, is x ${op} ${v} an open or closed circle at ${v}? ###GRAPH:numberline;${v},open,${dir};x ${op} ${v}###`, a:"open",
      steps:[`${op} does not include the number itself.`, `That means an open circle.`, `Answer: open`]};
  }
  if(type==="circleClosed"){
    const v=randInt(-9,9), op=choice(["≤","≥"]);
    const dir = op==="≤"?"left":"right";
    return {q:`On a number line, is x ${op} ${v} an open or closed circle at ${v}? ###GRAPH:numberline;${v},closed,${dir};x ${op} ${v}###`, a:"closed",
      steps:[`${op} includes the number itself.`, `That means a closed circle.`, `Answer: closed`]};
  }
  const m=randIntNonZero(-6,6), b=randInt(-9,9);
  const op=choice(["≥","≤",">","<"]);
  const dashed = (op===">"||op==="<");
  const above = (op===">"||op==="≥");
  const eqStr = qClean(`y ${op} ${linTerm(m,"x")}${pmTerm(b)}`);
  if(type==="boundary"){
    return {q:`For ${eqStr}, is the boundary line dashed or solid? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`, a:dashed?"dashed":"solid",
      steps:[`The symbol is ${op}${dashed?", strictly":", which includes equal to."}`, `${dashed?"< / > → dashed line.":"≤ / ≥ → solid line."}`, `Answer: ${dashed?"dashed":"solid"}`]};
  }
  return {q:`For ${eqStr}, which way do you shade? ###GRAPH:inequality;${m},${b},${dashed?"dashed":"solid"},${above?"above":"below"};${eqStr}###`, a:above?"above":"below",
    steps:[`The inequality says "y ${op}".`, `"y ${op}" always shades ${above?"above":"below"} the line.`, `Answer: ${above?"above":"below"}`]};
});

// 31. Direct & Inverse Variation
GENERATORS[31] = () => genSet(6, () => {
  const type = choice(["directY","inverseY","directX","workers"]);
  if(type==="directY"){
    const k=randInt(2,9), x1=randInt(2,9), x2=randIntNonZero(2,12);
    if(x1===x2) return null;
    const y1=k*x1, y2=k*x2;
    return {q:`y varies directly with x. y = ${y1} when x = ${x1}. Find y when x = ${x2}.`, a:`y = ${y2}`,
      steps:[`Find k: k = ${y1}/${x1} = ${k}`, `Use y = kx: y = ${k} × ${x2}`, `Answer: y = ${y2}`]};
  }
  if(type==="inverseY"){
    const x1=randInt(2,9), y1=randInt(2,9), k=x1*y1;
    const divisors=[2,3,4,5,6,7,8,9].filter(d=>d!==x1 && k%d===0);
    if(!divisors.length) return null;
    const x2=choice(divisors), y2=k/x2;
    return {q:`y varies inversely with x. y = ${y1} when x = ${x1}. Find y when x = ${x2}.`, a:`y = ${y2}`,
      steps:[`Find k: k = xy = ${x1} × ${y1} = ${k}`, `Use y = k/x: y = ${k}/${x2}`, `Answer: y = ${y2}`]};
  }
  if(type==="directX"){
    const k=randInt(2,9), x1=randInt(2,9), y1=k*x1, x3=randIntNonZero(2,12);
    if(x3===x1) return null;
    const y3=k*x3;
    return {q:`y varies directly with x. y = ${y1} when x = ${x1}. Find x when y = ${y3}.`, a:`x = ${x3}`,
      steps:[`Find k: k = ${y1}/${x1} = ${k}`, `Use y = kx: ${y3} = ${k}x, so x = ${x3}`, `Answer: x = ${x3}`]};
  }
  const w1=randInt(2,9), h1=randInt(2,9), k=w1*h1;
  const divisors=[2,3,4,5,6,7,8,9].filter(d=>d!==w1 && k%d===0);
  if(!divisors.length) return null;
  const w2=choice(divisors), h2=k/w2;
  return {q:`It takes ${w1} workers ${h1} hours to finish a job (inverse variation). How long for ${w2} workers?`, a:`${h2} hours`, check:`${h2}`,
    steps:[`Find k: k = workers × hours = ${w1} × ${h1} = ${k}`, `Use hours = k/workers: ${k}/${w2}`, `Answer: ${h2} hours`]};
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
    ? (subject==="money" ? `$${P} grows ${r}% per year. What is it worth after ${t} year${t>1?"s":""}?`
                          : `A population of ${P} grows ${r}% per year. What is it after ${t} year${t>1?"s":""}?`)
    : `A $${P} ${choice(["machine","laptop","car"])} depreciates ${r}% per year. What is it worth after ${t} year${t>1?"s":""}?`;
  const a = (growth && subject==="population") ? formatMoney(value) : `$${money}`;
  return {q, a,
    steps:[`${growth?"Growth":"Decay"} factor: 1 ${growth?"+":"−"} ${(r/100).toFixed(2)} = ${factor.toFixed(2)}`,
      `Plug in: y = ${P}(${factor.toFixed(2)})${toSup(t)}`, `Answer: ${a}`]};
});

// 33. Arithmetic Sequences
GENERATORS[33] = () => genSet(6, () => {
  const type = choice(["diff","diff","nth","nth","nth","nth"]);
  if(type==="diff"){
    const a1=randInt(-20,60), d=randIntNonZero(-9,9);
    return {q:`Find the common difference: ${a1}, ${a1+d}, ${a1+2*d}, ${a1+3*d}…`, a:`d = ${d}`,
      steps:[`Subtract consecutive terms: ${diffStr(a1+d,a1)} = ${d}`, `Answer: d = ${d}`]};
  }
  const a1=randInt(1,20), d=randIntNonZero(-9,9), n=randInt(5,25);
  const term=a1+(n-1)*d;
  return {q:`Find the ${n}th term of ${a1}, ${a1+d}, ${a1+2*d}… (d = ${d})`, a:`${term}`,
    steps:[`Use aₙ = a₁ + (n−1)d: a${toSub(n)} = ${a1} + (${n}−1)(${d})`, `a${toSub(n)} = ${a1} ${d*(n-1)>=0?"+":"−"} ${Math.abs(d*(n-1))}`, `Answer: ${term}`]};
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
    return {q:`Find the mean of: ${all.join(", ")}`, a:`${target}`,
      steps:[`Add them all: ${all.join("+")} = ${target*5}`, `Divide by 5: ${target*5} ÷ 5 = ${target}`, `Answer: ${target}`]};
  }
  if(type==="medianOdd"){
    const set = new Set();
    while(set.size<5) set.add(randInt(0,100));
    const vals = [...set];
    const sorted = [...vals].sort((a,b)=>a-b);
    const shuffled = [...vals].sort(()=>Math.random()-0.5);
    return {q:`Find the median of: ${shuffled.join(", ")}`, a:`${sorted[2]}`,
      steps:[`Sort: ${sorted.join(", ")}`, `Pick the middle value: ${sorted[2]}`, `Answer: ${sorted[2]}`]};
  }
  if(type==="mode"){
    const modeVal = randInt(0,20);
    const others = new Set([modeVal]);
    while(others.size<3) others.add(randInt(0,20));
    others.delete(modeVal);
    const otherVals = [...others];
    const vals = [modeVal,modeVal,modeVal,otherVals[0],otherVals[1]].sort(()=>Math.random()-0.5);
    return {q:`Find the mode of: ${vals.join(", ")}`, a:`${modeVal}`,
      steps:[`Count how many times each value appears.`, `${modeVal} appears three times — more than any other.`, `Answer: ${modeVal}`]};
  }
  if(type==="range"){
    const set = new Set();
    while(set.size<5) set.add(randInt(0,30));
    const vals = [...set];
    const range = Math.max(...vals)-Math.min(...vals);
    return {q:`Find the range of: ${vals.join(", ")}`, a:`${range}`,
      steps:[`Range = largest − smallest = ${Math.max(...vals)} − ${Math.min(...vals)}`, `Answer: ${range}`]};
  }
  const set = new Set();
  while(set.size<4) set.add(randInt(0,30));
  const vals=[...set];
  const sorted=[...vals].sort((a,b)=>a-b);
  const med = (sorted[1]+sorted[2])/2;
  const medStr = Number.isInteger(med)?String(med):med.toFixed(1);
  const shuffled=[...vals].sort(()=>Math.random()-0.5);
  return {q:`Find the median of: ${shuffled.join(", ")}  (even count — average the two middle values)`, a:medStr,
    steps:[`Sort: ${sorted.join(", ")}`, `Average the two middle values: (${sorted[1]} + ${sorted[2]}) ÷ 2`, `Answer: ${medStr}`]};
});



