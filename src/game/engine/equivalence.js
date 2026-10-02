/* ===================== ANSWER-EQUIVALENCE ENGINE =====================
   Not a full algebra engine — it normalizes symbols/spacing, treats
   comma/"or"-separated parts as an unordered set (so "x=5 or x=-13" and
   "x=-13 or x=5" both count), and sorts purely-parenthesized factor
   groups so "(x-5)(x+5)" matches "(x+5)(x-5)". Anything cleverer than
   that (restructured inequalities, reordered polynomial terms) can miss
   a real match — that's what the manual override button is for. */
const SUP_MAP = {"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁻":"-"};
function normalizeMath(raw){
  let s = raw;
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, ch => SUP_MAP[ch] || ch);
  s = s.replace(/[−–—]/g, "-");
  s = s.replace(/[×]/g, "*");
  s = s.replace(/[÷]/g, "/");
  s = s.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/≠/g, "!=");
  s = s.replace(/±/g, "+-").replace(/\+\/-/g, "+-");
  s = s.replace(/[√]\(([^()]+)\)/g, "sqrt$1");
  s = s.replace(/[√]/g, "sqrt");
  s = s.replace(/sqrt\(([^()]+)\)/gi, "sqrt$1");
  s = s.toLowerCase();
  s = s.replace(/\^/g, "");
  s = s.replace(/(\d)\s*x\s*(?=\d)/gi, "$1*"); // "5.2 x 10" -> multiply, not variable x
  s = s.replace(/(\d),(\d{3})(?!\d)/g, "$1$2"); // strip thousands separators
  s = s.replace(/(\d),(\d{3})(?!\d)/g, "$1$2");
  return s;
}
function splitClauses(s){
  return s.split(/\s*,\s*|\s+or\s+/i).map(x=>x.trim()).filter(Boolean);
}
function cleanClause(c){
  c = c.replace(/\$/g,"").replace(/%/g,"");
  c = c.replace(/\b(miles?|mi|dollars?|years?\s*old|hours?|hrs?|seconds?|secs?|where|when)\b/g,"");
  c = c.replace(/≈/g,"");
  c = c.replace(/\s+/g,"");
  return c;
}
function groupSortIfPureParens(c){
  if(/^(\([^()]+\))+$/.test(c)){
    const groups = c.match(/\([^()]+\)/g) || [];
    groups.sort();
    return groups.join("");
  }
  return c;
}
export function parseNumeric(c){
  const m = c.match(/^[a-z]?=?(-?\d+(\.\d+)?(\/\d+(\.\d+)?)?)$/);
  if(!m) return null;
  const val = m[1];
  if(val.includes("/")){
    const parts = val.split("/").map(Number);
    if(parts.length!==2 || parts[1]===0 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return parts[0]/parts[1];
  }
  const n = Number(val);
  return isNaN(n) ? null : n;
}
export function clauseEquals(a,b){
  if(a===b) return true;
  const na = parseNumeric(a), nb = parseNumeric(b);
  if(na!==null && nb!==null) return Math.abs(na-nb) < 1e-6;
  return false;
}
export function canonicalClauses(raw){
  const normalized = normalizeMath(raw);
  return splitClauses(normalized).map(cleanClause).map(groupSortIfPureParens).filter(Boolean);
}
export function checkEquivalence(userRaw, correctRaw){
  if(!userRaw || !userRaw.trim()) return false;
  const userClauses = canonicalClauses(userRaw);
  const correctClauses = canonicalClauses(correctRaw);
  if(userClauses.length !== correctClauses.length) return false;
  const remaining = correctClauses.slice();
  for(const uc of userClauses){
    const idx = remaining.findIndex(cc => clauseEquals(uc, cc));
    if(idx === -1) return false;
    remaining.splice(idx,1);
  }
  return true;
}

// For a guided-practice step whose blanks form an unordered SET (flagged
// anyOrder:true) rather than fixed positions — e.g. "two numbers that
// multiply to 8 and add to 9" accepts 1-then-8 OR 8-then-1 equally. Tries
// every pairing of typed values to expected answers and returns the pairing
// that gets the most blanks right, so a student who nails the set but
// swapped the order still sees everything marked correct.
function permutations(arr){
  if(arr.length<=1) return [arr];
  const result=[];
  arr.forEach((_,i)=>{
    const rest = arr.slice(0,i).concat(arr.slice(i+1));
    permutations(rest).forEach(p=>result.push([arr[i],...p]));
  });
  return result;
}
export function matchAnyOrder(vals, answers){
  const idxs = answers.map((_,i)=>i);
  let best = {count:-1, perm:idxs};
  permutations(idxs).forEach(perm=>{
    let count=0;
    vals.forEach((v,i)=>{ if(checkEquivalence(v, answers[perm[i]])) count++; });
    if(count>best.count) best={count,perm};
  });
  const flags = vals.map((v,i)=>checkEquivalence(v, answers[best.perm[i]]));
  return {flags, matched: best.count===vals.length};
}

