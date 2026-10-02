import { CAT, SUGGESTED_ORDER, TOPICS } from "./data/topics.js";
import { DICTIONARY_SECTIONS } from "./data/dictionary.js";
import { BOSS_LEVELS, bossHellGenerators } from "./engine/boss-tiers.js";
import { GENERATORS, choice } from "./engine/generators.js";
import { checkEquivalence, matchAnyOrder } from "./engine/equivalence.js";
import { diagnoseMistake } from "./engine/mistakes.js";
import { serializeBackup, parseBackup, backupFileName } from "./backup.js";
import { recordResult, dueTopics, nextDueDay, passed, localDay, daysBetween } from "./review.js";
import { buildPlan, scoreRegions, recommendStart, REGION_ORDER } from "./placement.js";
import { shouldInsertWarmup, nextMissStreak, isPerfectRun } from "./adaptive.js";
import { dailyProblems, dailyDoneToday, DAILY_XP_PER_CORRECT, DAILY_BONUS_XP } from "./daily.js";
import { SHOP_ITEMS, itemById, balance, buy, canUse, isOwned } from "./shop.js";
import { createSoundPlayer } from "./sound.js";
import { ACHIEVEMENTS, EMPTY_STATS, newBadges, achievementById } from "./achievements.js";
import { addActivity, buildReport, describeScore } from "./report.js";
import { L, getLang, setLang, locale, deviceLang, rememberDeviceLang } from "./i18n.js";
import { loadContentTable, applyContentLanguage, contentLoaded } from "./localize.js";

function checkAnswerFor(p){ return p.check || p.a; }

/* getTopicProblems(t): returns the active practice-problem set for a topic —
   a rerolled procedural set if one is stored, otherwise the original
   hand-written t.problems. Nothing here ever mutates TOPICS itself. */
function getTopicProblems(t){
  return (state.customProblems && state.customProblems[t.id]) || t.problems;
}
// Note: Boss Battle does NOT reuse a topic's rerolled/customProblems set —
// buildBossPool() (below) always calls each topic's generator function fresh,
// so Boss Battle problems are independent of whatever a player rerolled on
// the home screen. That's intentional (every Boss Battle is its own fresh
// "dice roll"), it just means there's no link between the two.


function rerollTopicProblems(topicId){
  const t = TOPICS.find(x=>x.id===topicId);
  if(!t || !GENERATORS[topicId]) return;
  const fresh = GENERATORS[topicId](t);
  if(!Array.isArray(fresh) || !fresh.length) return;
  if(!state.customProblems) state.customProblems = {};
  state.customProblems[topicId] = fresh;
  state.customLang = getLang();
  state.mastered[topicId] = [];
  if(state.masteredDates) delete state.masteredDates[topicId];
  markTopicReset(topicId);
  saveState();
  render();
}
function markTopicReset(topicId){
  if(state.review) delete state.review[topicId];
  if(!state.topicResets) state.topicResets = {};
  state.topicResets[topicId] = Date.now();
}


/* ===================== SOUND ===================== */
// Muting is a per-device preference (kept outside the learner's synced progress).
const SOUND_KEY = "algebraQuestSound";
function soundMuted(){ try{ return localStorage.getItem(SOUND_KEY)==="off"; }catch{ return false; } }
function setSoundMuted(m){ try{ localStorage.setItem(SOUND_KEY, m ? "off" : "on"); }catch{ /* storage unavailable: the choice just won't persist */ } }
const soundPlayer = createSoundPlayer({
  makeContext: ()=>{ const AC = window.AudioContext || window.webkitAudioContext; return AC ? new AC() : null; },
  isMuted: soundMuted,
});
function playSound(name){ soundPlayer.play(name); }

/* ===================== STATE ===================== */
export const LEGACY_STORAGE_KEY = "algebraQuestState_v1";
// Which localStorage slot the current learner is saved in, and an optional hook
// called after every save (used to sync signed-in learners to the server).
let storageKey = LEGACY_STORAGE_KEY;
let onSaveHook = null;
function defaultState(){
  return {xp:0, bestStreak:0, mastered:{}, customProblems:{}, theme:"clean", name:"", masteredDates:{}, avatar:"root",
    updatedAt:0, resetAt:0, topicResets:{}, review:{}, placement:null, placementDismissed:false, daily:null, dailyCount:0, owned:[], frame:"", badges:{}, stats:{...EMPTY_STATS}, activity:[], lang:"", customLang:""};
  // lang = "en" | "es" chosen for this learner ("" = follow the device / browser language, see i18n.js)
  // review[topicId] = {box, due, last, at} spaced-review schedule (see review.js).
  // activity = recent finished sessions [{at, mode, title, correct, total}], newest first (see report.js).
  // badges = {achievementId: ms earned}; stats = counters behind the badges (see achievements.js).
  // owned = shop item ids; frame = equipped avatar frame id or "" (see shop.js).
  // daily = {day, correct, total} for the last completed Daily Challenge; dailyCount = challenges completed in all.
  // placement = {at, regions:{cat:{correct,total,level}}, start:topicId|null} from the check-in; placementDismissed = card hidden.
  // updatedAt = ms of the last save; resetAt / topicResets[topicId] = ms of a full / per-topic reset. Used by sync
  // so a reset on one device isn't undone by merging with another device's older progress.
  // mastered[topicId] = [idx,...]; customProblems[topicId] = [{q,a,...}] when rerolled; theme = selected visual theme id;
  // name = learner's name, used to personalize summary-screen messages; masteredDates[topicId] = ISO date string of when that topic was first fully mastered
  // avatar = id into AVATARS, the little character shown in the mark badge (defaults to the original √ mark)
}
function loadState(){
  try{
    const raw = localStorage.getItem(storageKey);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  }catch(e){ return defaultState(); }
}
function saveState(){
  state.updatedAt = Date.now();
  try{ localStorage.setItem(storageKey, JSON.stringify(state)); }catch(e){}
  if(onSaveHook) onSaveHook(state);
}
let state = loadState();
let streak = 0;

/* ===================== THEMES =====================
   Each entry's a/b/c feed the little gradient swatch preview in the theme
   menu — purely decorative, not read anywhere else. */
const THEMES = [
  {id:"clean",    name:"Clean",        es:"Claro",         a:"#ffffff", b:"#eaf0fa", c:"#1f4e96"},
  {id:"midnight", name:"Midnight",     es:"Medianoche",    a:"#141b2e", b:"#8b7cf6", c:"#e8b84b"},
  {id:"neon",     name:"Neon Arcade",  es:"Arcade Neón",   a:"#15151e", b:"#22e0ff", c:"#c24bff"},
  {id:"forest",   name:"Forest",       es:"Bosque",        a:"#1e2b22", b:"#5fd9a0", c:"#e8d28a"},
  {id:"sunset",   name:"Sunset",       es:"Atardecer",     a:"#36254c", b:"#ff6f61", c:"#ff9a4d"},
  {id:"pink",     name:"Pink Stardust",es:"Polvo de Estrellas Rosa", a:"#fff3fa", b:"#ff2d87", c:"#c2186b"},
  // Premium themes: unlocked in the shop (ids match the shop items in shop.js)
  {id:"glam",     name:"Glam Paradise",es:"Paraíso Glam",  a:"#3a1140", b:"#ff3fa4", c:"#f5c15a", premium:true},
  {id:"tide",     name:"Mermaid Tide", es:"Marea de Sirena", a:"#0b3342", b:"#2fe0d0", c:"#6aa8ff", premium:true},
  {id:"holo",     name:"Holo Pop",     es:"Holo Pop",      a:"#ffffff", b:"#5b3df5", c:"#c2307e", premium:true},
];
// The themes this learner may use: the free ones, plus any premium theme they own.
function availableThemes(){ return THEMES.filter(t=>!t.premium || isOwned(state && state.owned, t.id)); }
function themeName(id){ const t = THEMES.find(x=>x.id===id) || THEMES[0]; return L(t.name, t.es); }
function applyTheme(id){
  const valid = availableThemes().some(t=>t.id===id) ? id : "clean";
  document.documentElement.setAttribute("data-theme", valid);
  applyFrame();
}
// The equipped avatar frame is a data attribute on <html>; CSS draws the ring around every character badge.
function applyFrame(){
  const f = state && state.frame && canUse(state.owned, "frame", state.frame) ? state.frame : "";
  if(f) document.documentElement.setAttribute("data-frame", f);
  else document.documentElement.removeAttribute("data-frame");
}
applyTheme(state.theme);

/* ===================== AVATARS =====================
   The little character badge in the top-left of the hub card. "root" is the
   original √ mark, kept as the default so nobody's save file changes look
   without them choosing a new one. */
const AVATARS = [
  {id:"root",          icon:"√",  label:"Classic", es:"Clásico"},
  {id:"fox",           icon:"🦊", label:"Fox", es:"Zorro"},
  {id:"owl",           icon:"🦉", label:"Owl", es:"Búho"},
  {id:"dragon",        icon:"🐉", label:"Dragon", es:"Dragón"},
  {id:"unicorn",       icon:"🦄", label:"Unicorn", es:"Unicornio"},
  {id:"robot",         icon:"🤖", label:"Robot", es:"Robot"},
  {id:"wizard",        icon:"🧙", label:"Wizard", es:"Mago"},
  {id:"ninja",         icon:"🥷", label:"Ninja", es:"Ninja"},
  {id:"cat",           icon:"🐱", label:"Cat", es:"Gato"},
  {id:"lion",          icon:"🦁", label:"Lion", es:"León"},
  {id:"alien",         icon:"👾", label:"Alien", es:"Alienígena"},
  {id:"star",          icon:"🌟", label:"Star", es:"Estrella"},
  {id:"clean-panda",   icon:"🐼", label:"Clean Panda", es:"Panda Claro"},
  {id:"midnight-bat",  icon:"🦇", label:"Midnight Bat", es:"Murciélago de Medianoche"},
  {id:"neon-ghost",    icon:"👻", label:"Neon Ghost", es:"Fantasma Neón"},
  {id:"forest-deer",   icon:"🦌", label:"Forest Deer", es:"Ciervo del Bosque"},
  {id:"sunset-dolphin",icon:"🐬", label:"Sunset Dolphin", es:"Delfín del Atardecer"},
  {id:"pink-fairy",    icon:"🧚", label:"Stardust Fairy", es:"Hada de Polvo de Estrellas"},
  {id:"octopus",       icon:"🐙", label:"Octopus", es:"Pulpo"},
  {id:"raccoon",       icon:"🦝", label:"Raccoon", es:"Mapache"},
];
const FREE_AVATAR_IDS = AVATARS.map(a=>a.id);
const FREE_THEME_IDS = () => THEMES.filter(t=>!t.premium).map(t=>t.id);
function allowedAvatars(){
  const owned = SHOP_ITEMS.filter(i=>i.kind==="avatar" && isOwned(state.owned, i.id)).map(i=>({id:i.id, icon:i.icon, label:i.label, es:i.es}));
  return AVATARS.concat(owned);
}
function avatarIcon(id){ const a = allowedAvatars().find(x=>x.id===id); return a ? a.icon : "√"; }
let themePanelOpen = false;
let avatarPanelOpen = false;
let nameSaveTimer = null;
let bossPanelOpen = false;
function setTheme(id){
  if(!availableThemes().some(t=>t.id===id)) return;
  state.theme = id;
  saveState();
  applyTheme(id);
  themePanelOpen = false;
  render();
}
function setAvatar(id){
  if(!allowedAvatars().some(a=>a.id===id)) return;
  state.avatar = id;
  saveState();
  avatarPanelOpen = false;
  render();
}
// Registered once (not inside renderHome) so repeated opens/closes never pile
// up duplicate listeners — each just checks whether the panel is open.
document.addEventListener("click", e=>{
  if(!themePanelOpen) return;
  if(e.target.closest(".theme-row")) return;
  themePanelOpen = false;
  render();
});
document.addEventListener("keydown", e=>{
  if(!themePanelOpen) return;
  if(e.key==="Escape"){
    themePanelOpen = false;
    render();
    const btn = document.getElementById("themeToggleBtn");
    if(btn) btn.focus();
  }
});
// Same registered-once pattern as the theme panel, for the avatar picker.
document.addEventListener("click", e=>{
  if(!avatarPanelOpen) return;
  if(e.target.closest(".brand")) return;
  avatarPanelOpen = false;
  render();
});
document.addEventListener("keydown", e=>{
  if(!avatarPanelOpen) return;
  if(e.key==="Escape"){
    avatarPanelOpen = false;
    render();
    const btn = document.getElementById("avatarBtn");
    if(btn) btn.focus();
  }
});
// Same registered-once pattern as the theme panel, for the boss-mode panel.
document.addEventListener("click", e=>{
  if(!bossPanelOpen) return;
  if(e.target.closest("#bossBtn") || e.target.closest(".boss-panel")) return;
  bossPanelOpen = false;
  render();
});
document.addEventListener("keydown", e=>{
  if(!bossPanelOpen) return;
  if(e.key==="Escape"){
    bossPanelOpen = false;
    render();
    const btn = document.getElementById("bossBtn");
    if(btn) btn.focus();
  }
});

function isMastered(topicId, idx){
  return (state.mastered[topicId]||[]).includes(idx);
}
function setMastered(topicId, idx, total){
  if(!state.mastered[topicId]) state.mastered[topicId] = [];
  if(!state.mastered[topicId].includes(idx)) state.mastered[topicId].push(idx);
  // Stamp the date the first time this topic becomes fully mastered — never
  // overwritten afterward, so it stays "when it was first done" even through
  // later replays.
  if(total!==undefined && state.mastered[topicId].length>=total && !state.masteredDates[topicId]){
    state.masteredDates[topicId] = new Date().toISOString();
  }
}
function masteredDateLabel(topicId){
  const iso = state.masteredDates && state.masteredDates[topicId];
  if(!iso) return null;
  const d = new Date(iso);
  if(isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale(), {month:"short", day:"numeric"});
}
function topicMasteredCount(topicId){
  return (state.mastered[topicId]||[]).length;
}
function level(){ return Math.floor(state.xp/100)+1; }
function xpIntoLevel(){ return state.xp%100; }
// Short line under the title — starts as a plain orientation line for a brand
// new player, then becomes a real progress readout once they've started, and
// a genuine payoff line once every topic is mastered. Tied to real state
// rather than random flavor text, so "keep going" only ever shows up when
// there's actually something to keep going on.
function isTopicMastered(t){ return topicMasteredCount(t.id) >= getTopicProblems(t).length; }
function heroLine(){
  const total = TOPICS.length;
  const done = TOPICS.filter(isTopicMastered).length;
  if(done===0) return L("34 topics · self-check practice","34 temas · práctica con autocomprobación");
  if(done===total) return L("Every region cleared — legendary.","Todas las regiones completadas — ¡legendario!");
  return L(`${done} / ${total} topics mastered · keep going`,`${done} / ${total} temas dominados · ¡sigue así!`);
}

/* ===================== VIEW STATE ===================== */
let view = "home"; // home | quest | summary
let session = null; // {mode:'topic'|'boss', title, cat, problems:[...], pos, revealed, results:[], correctCount}
let lastFocusedInput = null; // tracks which text input (answerInput or a .blankInput) last had focus, for symbol-button insertion

function startTopic(topicId){
  const t = TOPICS.find(x=>x.id===topicId);
  const guided = (t.guided||[]).map((p,gi)=>({topicId:t.id, idx:"g"+gi, q:p.q, a:p.a, check:p.check, steps:p.steps, blanks:p.blanks, howTo:t.howTo, kind:"guided"}));
  const practice = getTopicProblems(t).map((p,idx)=>({topicId:t.id, idx, q:p.q, a:p.a, check:p.check, steps:p.steps, howTo:t.howTo, kind:"practice"}));
  session = {
    mode:"topic", title:t.title, cat:t.cat, topicId:t.id,
    terms:t.terms||[], examples:t.examples||[],
    learnPhase: (t.examples && t.examples.length) ? "intro" : null, exPos:0,
    guidedCount:guided.length, practiceCount:practice.length,
    problems: guided.concat(practice),
    pos:0, revealed:false, autoResult:null, attempts:0, retryFlash:false,
    results:[], correctCount:0, why:t.why,
    peekOpen:false, peekPos:0, termsOpen:false, draftAnswer:"", draftBlanks:null,
  };
  view = "quest";
  render();
}
// Boss Battle now draws from one of five hand-authored difficulty tiers
// (BOSS_LEVELS) instead of a single random mix — see startBoss(levelId).
// Builds one freshly randomized problem set for a Boss Battle tier. For
// easy/medium/hard/nightmare, it reuses each listed topic's own practice
// generator (GENERATORS[topicId]) and keeps one random item per topic —
// the same engine behind the per-topic 🎲 reroll button, so every battle
// in that tier is different. Hell Mode draws from its own dedicated
// generator functions instead, since its problems go past any one topic.
function buildBossPool(level){
  let raw;
  if(level.generator){
    raw = bossHellGenerators.map(fn=>fn());
  }else{
    raw = level.topics.map(topicId=>{
      const t = TOPICS.find(x=>x.id===topicId);
      const items = GENERATORS[topicId] ? GENERATORS[topicId]() : null;
      const p = (items && items.length) ? choice(items) : choice(getTopicProblems(t));
      return {...p, topicId, cat:t.cat};
    });
  }
  return raw.map((p,idx)=>({...p, idx, kind:"practice"}));
}
function startBoss(levelId){
  const level = BOSS_LEVELS.find(l=>l.id===levelId);
  if(!level) return;
  const pool = buildBossPool(level);
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  session = {
    mode:"boss", bossLevel:level.id, xpPerCorrect:level.xpPerCorrect,
    title:L(`Boss Battle — ${level.name}`,`Batalla de jefe — ${level.name}`), cat:null, learnPhase:null, guidedCount:0, practiceCount:pool.length,
    problems: pool, pos:0, revealed:false, autoResult:null, attempts:0, retryFlash:false,
    results:[], correctCount:0, why:null,
    peekOpen:false, peekPos:0, termsOpen:false, draftAnswer:"", draftBlanks:null,
  };
  bossPanelOpen = false;
  view = "quest";
  render();
}
// ---- Spaced review ----
const REVIEW_TOPICS_PER_SESSION = 5;
const REVIEW_PROBLEMS_PER_TOPIC = 2;
function startReview(){
  const due = dueTopics(state.review, new Date(), REVIEW_TOPICS_PER_SESSION);
  if(!due.length) return;
  const pool = [];
  due.forEach(topicId=>{
    const t = TOPICS.find(x=>x.id===topicId);
    if(!t) return;
    const items = (GENERATORS[topicId] ? GENERATORS[topicId]() : null) || getTopicProblems(t);
    const picks = items.slice();
    for(let i=picks.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [picks[i],picks[j]]=[picks[j],picks[i]]; }
    picks.slice(0, REVIEW_PROBLEMS_PER_TOPIC).forEach(p=> pool.push({...p, topicId, cat:t.cat}));
  });
  if(!pool.length) return;
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  session = {
    mode:"review", xpPerCorrect:12, reviewTopics:due,
    title:L("Daily Review","Repaso diario"), cat:null, learnPhase:null, guidedCount:0, practiceCount:pool.length,
    problems: pool.map((p,idx)=>({...p, idx, kind:"practice"})), pos:0, revealed:false, autoResult:null, attempts:0, retryFlash:false,
    results:[], correctCount:0, why:null,
    peekOpen:false, peekPos:0, termsOpen:false, draftAnswer:"", draftBlanks:null,
  };
  view = "quest";
  render();
}
// When a topic session or review finishes, schedule each topic it covered.
function recordReviewResults(){
  const tally = {}; // topicId -> [{correct, hinted, attempts}] for real (non-warm-up) practice problems
  session.problems.forEach((p,i)=>{
    if(p.kind!=="practice" || p.scaffold || session.results[i]===undefined) return;
    const m = (session.meta && session.meta[i]) || {};
    (tally[p.topicId] || (tally[p.topicId]=[])).push({
      correct: session.results[i]==="good",
      hinted: !!m.hinted,
      // Revealing the answer instead of typing one never counts as a clean run.
      attempts: m.typed ? (m.attempts||1) : 99,
    });
  });
  let review = state.review || {};
  Object.entries(tally).forEach(([id,rows])=>{
    const c = rows.filter(r=>r.correct).length, n = rows.length;
    // In a review a topic passes only if all its problems are right; in a topic run the usual 80% applies.
    const ok = session.mode==="review" ? c===n : passed(c,n);
    // A perfect run (no hints, no retries) pushes the next review one step further out.
    const perfect = ok && isPerfectRun(rows);
    if(perfect) bumpStat("perfect");
    review = recordResult(review, Number(id), ok, new Date(), perfect ? 1 : 0);
  });
  if(session.mode==="review") bumpStat("reviews");
  state.review = review;
  saveState();
}
// ---- Warm-up: a fresh problem from the same topic, with the rule and first step already shown ----
function insertWarmup(){
  const t = TOPICS.find(x=>x.id===session.topicId);
  if(!t) return false;
  const have = new Set(session.problems.map(x=>x.q));
  const items = ((GENERATORS[t.id] ? GENERATORS[t.id](t) : null) || []).filter(x=>!have.has(x.q));
  if(!items.length) return false;
  const n = (session.warmups||0) + 1;
  const pick = items[Math.floor(Math.random()*items.length)];
  session.problems.splice(session.pos+1, 0, {...pick, topicId:t.id, cat:t.cat, howTo:t.howTo, idx:"w"+n, kind:"practice", scaffold:true});
  session.warmups = n;
  session.missStreak = 0;
  return true;
}
function reviewCardHTML(){
  const due = dueTopics(state.review);
  if(due.length){
    const names = due.slice(0,3).map(id=>{ const t=TOPICS.find(x=>x.id===id); return t ? t.title : ""; }).filter(Boolean).join(", ");
    const more = due.length>3 ? L(` +${due.length-3} more`,` +${due.length-3} más`) : "";
    return `<div class="review-card due">
      <div class="review-text"><div class="review-title">🔁 ${L("Daily Review","Repaso diario")} <span class="review-count">${L(`${due.length} due`,`${due.length} pendientes`)}</span></div>
      <div class="review-sub">${names}${more}</div></div>
      <button type="button" class="review-go" id="reviewBtn">${L("Start review","Empezar repaso")}</button></div>`;
  }
  const next = nextDueDay(state.review);
  if(next){
    const n = daysBetween(localDay(), next);
    return `<div class="review-card done"><div class="review-text"><div class="review-title">✅ ${L("Review is all caught up","El repaso está al día")}</div>
      <div class="review-sub">${L(`Next review ${n===1 ? "tomorrow" : "in "+n+" days"}`,`Próximo repaso ${n===1 ? "mañana" : "en "+n+" días"}`)}</div></div></div>`;
  }
  return "";
}

// ---- Daily Challenge: the same 5 questions all day (see daily.js), bonus XP once per day ----
function startDaily(){
  const today = localDay();
  if(dailyDoneToday(state.daily, today)) return;
  const pool = dailyProblems(today, TOPICS, REGION_ORDER, (topicId)=>{
    const t = TOPICS.find(x=>x.id===topicId);
    return (GENERATORS[topicId] ? GENERATORS[topicId](t) : null) || getTopicProblems(t);
  });
  session = {
    mode:"daily", xpPerCorrect:DAILY_XP_PER_CORRECT, day:today,
    title:L("Daily Challenge","Reto diario"), cat:null, learnPhase:null, guidedCount:0, practiceCount:pool.length,
    problems: pool.map((p,idx)=>({...p, idx, kind:"practice"})), pos:0, revealed:false, autoResult:null, attempts:0, retryFlash:false,
    results:[], correctCount:0, why:null,
    peekOpen:false, peekPos:0, termsOpen:false, draftAnswer:"", draftBlanks:null,
  };
  view = "quest";
  render();
}
function finishBoss(){
  bumpStat("bosses");
  if(session.correctCount===session.problems.length) bumpStat("bossPerfect");
  saveState();
}
function finishDaily(){
  state.daily = {day:session.day, correct:session.correctCount, total:session.problems.length};
  state.dailyCount = (state.dailyCount||0) + 1;
  state.xp += DAILY_BONUS_XP;
  playSound("fanfare");
  session.xpEarned = (session.xpEarned||0) + DAILY_BONUS_XP;
  session.dailyBonus = DAILY_BONUS_XP;
  saveState();
}
function dailyCardHTML(){
  const today = localDay();
  if(dailyDoneToday(state.daily, today)){
    const d = state.daily;
    return `<div class="daily-card done"><div class="review-text"><div class="review-title">✅ ${L("Daily Challenge done","Reto diario completado")}</div>
      <div class="review-sub">${L(`${d.correct}/${d.total} right today · ${state.dailyCount} completed in all · a new one tomorrow`,`${d.correct}/${d.total} correctas hoy · ${state.dailyCount} completados en total · mañana hay uno nuevo`)}</div></div></div>`;
  }
  return `<div class="daily-card"><div class="review-text"><div class="review-title">⭐ ${L("Daily Challenge","Reto diario")}</div>
    <div class="review-sub">${L(`5 mixed questions, the same for everyone today · +${DAILY_BONUS_XP} bonus XP`,`5 preguntas variadas, las mismas para todos hoy · +${DAILY_BONUS_XP} XP de bono`)}</div></div>
    <button type="button" class="review-go" id="dailyBtn">${L("Play","Jugar")}</button></div>`;
}

// ---- Progress report (see report.js) ----
// Recorded when a session is finished: what it was and how many real practice problems were right.
function logActivity(){
  const real = session.problems
    .map((p,i)=>({p, r:session.results[i]}))
    .filter(x=>x.p.kind==="practice" && !x.p.scaffold && x.r!==undefined);
  if(!real.length) return;
  state.activity = addActivity(state.activity, {
    at: Date.now(), mode: session.mode, title: session.title,
    topicId: session.topicId, bossLevel: session.bossLevel,   // so the report can show the name in the current language
    correct: real.filter(x=>x.r==="good").length, total: real.length,
  });
  saveState();
}
const activityLabel = (mode)=>({topic:L("Topic","Tema"), review:L("Daily Review","Repaso diario"), daily:L("Daily Challenge","Reto diario"), boss:L("Boss Battle","Batalla de jefe"), placement:L("Check-in","Chequeo")}[mode] || mode);
function activityText(e){
  const label = activityLabel(e.mode);
  let title = e.title || "";
  if(e.mode==="topic" && e.topicId){ const t = TOPICS.find(x=>x.id===e.topicId); if(t) title = t.title; }
  else if(e.mode==="boss" && e.bossLevel){ const l = BOSS_LEVELS.find(x=>x.id===e.bossLevel); if(l) title = L(l.name,l.es); }
  else if(e.mode!=="topic" && e.mode!=="boss") title = "";   // Daily Review / Daily Challenge / Check-in: the label says it all
  // Older entries have only a stored title, which may already start with the label.
  return !title ? label : (title.startsWith(label) || title.startsWith("Boss Battle")) ? title : `${label}: ${title}`;
}
function whenText(at){
  const days = Math.round((new Date().setHours(0,0,0,0) - new Date(at).setHours(0,0,0,0)) / 86400000);
  const time = new Date(at).toLocaleTimeString(locale(),{hour:"numeric", minute:"2-digit"});
  if(days<=0) return L(`Today, ${time}`,`Hoy, ${time}`);
  if(days===1) return L(`Yesterday, ${time}`,`Ayer, ${time}`);
  return `${new Date(at).toLocaleDateString(locale(),{month:"short", day:"numeric"})}, ${time}`;
}
function openReport(){ view = "report"; render(); }
function renderReport(){
  const labels = {}; Object.keys(CAT).forEach(k=>{ labels[k] = L(CAT[k].label, CAT[k].es); });
  const r = buildReport(state, TOPICS, {
    regionOrder: REGION_ORDER, labels, problemCount: t=>getTopicProblems(t).length,
    badgesEarned: Object.keys(state.badges||{}).length, badgesTotal: ACHIEVEMENTS.length,
  });
  const chip = lv => lv ? `<span class="rp-chip lvl-${lv}">${(PLACEMENT_LEVEL[lv]||PLACEMENT_LEVEL.needs).icon} ${L((PLACEMENT_LEVEL[lv]||PLACEMENT_LEVEL.needs).label,(PLACEMENT_LEVEL[lv]||PLACEMENT_LEVEL.needs).es)}</span>` : "";
  const tile = (n,l)=>`<div class="rp-tile"><div class="rp-n">${n}</div><div class="rp-l">${l}</div></div>`;
  const nextReviewText = r.reviewsDue ? L(`${r.reviewsDue} topic${r.reviewsDue>1?"s":""} due now`,`${r.reviewsDue} ${r.reviewsDue>1?"temas pendientes":"tema pendiente"} ahora`)
    : r.nextReview ? L(`Next review ${r.nextReview}`,`Próximo repaso ${r.nextReview}`) : L("No reviews scheduled yet","Todavía no hay repasos programados");
  app.innerHTML = `
  <div class="view-enter report">
    <div class="report-head">
      <div>
        <h1>${L("Progress report","Informe de progreso")}${r.name ? ` · ${escapeHtml(r.name)}` : ""}</h1>
        <p>Algebra Quest · ${new Date().toLocaleDateString(locale(),{month:"long", day:"numeric", year:"numeric"})} · ${r.lastPlayed ? L(`last played ${whenText(r.lastPlayed).toLowerCase()}`,`última vez que jugó: ${whenText(r.lastPlayed).toLowerCase()}`) : L("no sessions yet","todavía no hay sesiones")}</p>
      </div>
      <div class="report-actions no-print">
        <button class="btn btn-ghost" id="printBtn">🖨️ ${L("Print / Save as PDF","Imprimir / Guardar como PDF")}</button>
        <button class="btn btn-ghost" id="homeBtn">${L("Back to map","Volver al mapa")}</button>
      </div>
    </div>

    <div class="rp-tiles">
      ${tile(L("Lv ","Nv ")+r.level, L("Level","Nivel"))}
      ${tile(r.xp, L("Total XP","XP total"))}
      ${tile(r.topicsMastered+"/"+r.totalTopics, L("Topics mastered","Temas dominados"))}
      ${tile(r.rightAnswers, L("Right answers","Respuestas correctas"))}
      ${tile(r.badgesEarned+"/"+r.badgesTotal, L("Badges","Insignias"))}
      ${tile(r.dailies, L("Daily challenges","Retos diarios"))}
    </div>

    <h2 class="rp-h">${L("Progress by area","Progreso por área")}</h2>
    <div class="rp-areas">${r.regions.map(x=>`
      <div class="rp-area">
        <div class="rp-area-top"><span>${CAT[x.cat].icon} ${x.label} ${chip(x.checkin)}</span><span>${x.mastered}/${x.total} ${L("topics","temas")}</span></div>
        <div class="rp-bar" role="img" aria-label="${x.pct}% ${L("mastered","dominado")}"><div class="rp-bar-fill" style="width:${x.pct}%;--cat:${CAT[x.cat].color}"></div></div>
      </div>`).join("")}</div>

    <h2 class="rp-h">${L("Where to help","Dónde ayudar")}</h2>
    ${r.attention.length
      ? `<ul class="rp-list">${r.attention.map(a=>`<li class="kind-${a.kind}">${a.text}</li>`).join("")}</ul>`
      : `<p class="rp-empty">${L("Nothing flagged right now.","No hay nada señalado por ahora.")}${r.checkinDone ? "" : L(" The check-in (🧭 on the map) shows which areas need work."," El chequeo (🧭 en el mapa) muestra qué áreas necesitan trabajo.")}</p>`}
    ${r.suggestedStart ? `<p class="rp-note">${L("Suggested starting point from the check-in:","Punto de partida sugerido por el chequeo:")} <strong>${r.suggestedStart}</strong></p>` : ""}
    <p class="rp-note">${L("Daily Review","Repaso diario")}: ${nextReviewText} · ${L(`${r.reviewsDone} review${r.reviewsDone===1?"":"s"} finished`,`${r.reviewsDone} ${r.reviewsDone===1?"repaso terminado":"repasos terminados"}`)} · ${L("best answer streak","mejor racha de respuestas")} ${r.bestStreak}</p>

    <h2 class="rp-h">${L("Recent activity","Actividad reciente")}</h2>
    ${r.recent.length
      ? `<table class="rp-table"><thead><tr><th>${L("When","Cuándo")}</th><th>${L("What","Qué")}</th><th>${L("Score","Puntuación")}</th></tr></thead><tbody>${r.recent.map(e=>`
        <tr><td>${whenText(e.at)}</td><td>${escapeHtml(activityText(e))}</td><td>${describeScore(e)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="rp-empty">${L("No finished sessions yet. They will show up here.","Todavía no hay sesiones terminadas. Aparecerán aquí.")}</p>`}
  </div>`;
  document.getElementById("homeBtn").addEventListener("click", backHome);
  document.getElementById("printBtn").addEventListener("click", ()=>window.print());
}

// ---- Achievements: counters, unlock detection and the pop-up (see achievements.js) ----
function bumpStat(key, n=1){
  state.stats = {...EMPTY_STATS, ...(state.stats||{})};
  state.stats[key] += n;
}
// Records any newly earned badges. `silent` is used when loading a learner, so existing progress is
// credited quietly instead of firing a pop-up for every old milestone.
function checkAchievements(silent){
  const fresh = newBadges(state, TOPICS, t=>getTopicProblems(t).length);
  if(!fresh.length) return;
  state.badges = {...(state.badges||{})};
  fresh.forEach(b=>{ state.badges[b.id] = b.at; });
  saveState();
  if(!silent) showBadgeToast(fresh.map(b=>achievementById(b.id)).filter(Boolean));
}
function showBadgeToast(list){
  if(!list.length || typeof document==="undefined") return;
  const el = document.createElement("div");
  el.className = "badge-toast";
  el.setAttribute("role","status");
  el.innerHTML = list.map(a=>`<div class="bt-row"><span class="bt-icon" aria-hidden="true">${a.icon}</span><span><strong>${L("Badge earned!","¡Insignia ganada!")}</strong> ${L(a.title,a.es)}</span></div>`).join("");
  el.addEventListener("click", ()=>el.remove());
  document.body.appendChild(el);
  setTimeout(()=>playSound("badge"), 450);
  announce(L(`Badge earned: ${list.map(a=>a.title).join(", ")}`,`Insignia ganada: ${list.map(a=>a.es).join(", ")}`));
  setTimeout(()=>el.remove(), 5000);
}
function openBadges(){ view = "badges"; render(); }
function renderBadges(){
  const have = state.badges || {};
  const count = ACHIEVEMENTS.filter(a=>have[a.id]).length;
  const tiles = ACHIEVEMENTS.map(a=>{
    const when = have[a.id];
    return `<div class="badge-tile${when ? " earned" : " locked"}">
      <div class="badge-icon" aria-hidden="true">${when ? a.icon : "🔒"}</div>
      <div class="badge-title">${L(a.title,a.es)}</div>
      <div class="badge-desc">${L(a.desc,a.esDesc)}</div>
      ${when ? `<div class="badge-date">${new Date(when).toLocaleDateString(locale(),{month:"short", day:"numeric", year:"numeric"})}</div>` : ""}
    </div>`;
  }).join("");
  app.innerHTML = `
  <div class="view-enter">
  <div class="topbar">
    <div class="brand">
      <div class="mark">${avatarIcon(state.avatar)}</div>
      <div><h1>${L("Badges","Insignias")}</h1><p>${L(`<span id="badgeCount">${count}</span> of ${ACHIEVEMENTS.length} earned`,`<span id="badgeCount">${count}</span> de ${ACHIEVEMENTS.length} ganadas`)}</p></div>
    </div>
    ${statsBarHTML()}
  </div>
  <div class="badge-grid">${tiles}</div>
  <div class="btn-row"><button class="btn btn-ghost" id="homeBtn">${L("Back to map","Volver al mapa")}</button></div>
  </div>`;
  document.getElementById("homeBtn").addEventListener("click", backHome);
}

// ---- Shop: premium characters and avatar frames, bought with spendable XP (see shop.js) ----
let pendingBuy = null;
let shopMsg = "";
function openShop(){ view = "shop"; pendingBuy = null; shopMsg = ""; render(); }
function shopItemHTML(item){
  const owned = isOwned(state.owned, item.id);
  const equipped = item.kind==="avatar" ? state.avatar===item.id : item.kind==="theme" ? state.theme===item.id : state.frame===item.id;
  const visual = item.kind==="avatar"
    ? `<span class="shop-icon">${item.icon}</span>`
    : item.kind==="theme"
      ? `<span class="shop-icon shop-icon-theme"><span class="theme-prev theme-prev-${item.id}" role="img" aria-label="${L(`Preview of the ${item.label} theme`,`Vista previa del tema ${item.es}`)}"></span></span>`
      : `<span class="shop-icon"><span class="frame-prev frame-${item.id}">√</span></span>`;
  let action;
  if(owned){
    action = equipped
      ? `<button type="button" class="shop-btn on" data-unequip="${item.id}" aria-pressed="true">✓ ${L("Equipped","Puesto")}</button>`
      : `<button type="button" class="shop-btn" data-equip="${item.id}">${L("Equip","Ponerse")}</button>`;
  }else{
    const can = buy(state.xp, state.owned, item.id).ok;
    const confirming = pendingBuy===item.id;
    action = `<button type="button" class="shop-btn buy${confirming ? " confirm" : ""}" data-buy="${item.id}" ${can ? "" : "disabled"}>${
      !can ? `${item.price} XP` : confirming ? L("Tap again to buy","Toca otra vez para comprar") : L(`Buy · ${item.price} XP`,`Comprar · ${item.price} XP`)}</button>`;
  }
  return `<div class="shop-item${owned ? " owned" : ""}">${visual}<div class="shop-name">${L(item.label,item.es)}</div>${action}</div>`;
}
function renderShop(){
  const bal = balance(state.xp, state.owned);
  const section = (kind,title)=>`<h3 class="shop-h" aria-level="2">${title}</h3><div class="shop-grid">${SHOP_ITEMS.filter(i=>i.kind===kind).map(shopItemHTML).join("")}</div>`;
  app.innerHTML = `
  <div class="view-enter">
  <div class="topbar">
    <div class="brand">
      <div class="mark">${avatarIcon(state.avatar)}</div>
      <div><h1>${L("Shop","Tienda")}</h1><p>${L("Spend XP on new looks. Your level never goes down.","Gasta XP en looks nuevos. Tu nivel nunca baja.")}</p></div>
    </div>
    ${statsBarHTML()}
  </div>
  <div class="shop-balance">${L(`You have <strong id="shopBalance">${bal}</strong> XP to spend`,`Tienes <strong id="shopBalance">${bal}</strong> XP para gastar`)}</div>
  ${shopMsg ? `<div class="shop-msg" role="status">${shopMsg}</div>` : ""}
  ${section("theme",L("Themes","Temas"))}
  ${section("avatar",L("Characters","Personajes"))}
  ${section("frame",L("Frames","Marcos"))}
  <div class="btn-row"><button class="btn btn-ghost" id="homeBtn">${L("Back to map","Volver al mapa")}</button></div>
  </div>`;
  document.getElementById("homeBtn").addEventListener("click", backHome);
  app.querySelectorAll("[data-buy]").forEach(btn=>btn.addEventListener("click", ()=>{
    const id = btn.dataset.buy;
    if(pendingBuy!==id){ pendingBuy = id; shopMsg = ""; render(); return; }
    const res = buy(state.xp, state.owned, id);
    pendingBuy = null;
    if(res.ok){
      state.owned = res.owned;
      const item = itemById(id);
      if(item.kind==="avatar") state.avatar = id; else if(item.kind==="theme") state.theme = id; else state.frame = id;   // equip what you just bought
      saveState(); applyTheme(state.theme);
      checkAchievements();
      shopMsg = L(`${item.label} is yours and equipped!`,`¡${item.es} es tuyo y ya lo tienes puesto!`);
      playSound("buy");
      burstConfetti();
    }else{
      shopMsg = res.reason==="poor" ? L(`You need ${res.short} more XP for that.`,`Te faltan ${res.short} XP para eso.`) : L("That one isn't available.","Ese no está disponible.");
    }
    render();
  }));
  app.querySelectorAll("[data-equip]").forEach(btn=>btn.addEventListener("click", ()=>{
    const item = itemById(btn.dataset.equip);
    if(!item || !canUse(state.owned, item.kind, item.id, item.kind==="theme" ? FREE_THEME_IDS() : FREE_AVATAR_IDS)) return;
    if(item.kind==="avatar") state.avatar = item.id; else if(item.kind==="theme") state.theme = item.id; else state.frame = item.id;
    saveState(); applyTheme(state.theme); shopMsg = ""; render();
  }));
  app.querySelectorAll("[data-unequip]").forEach(btn=>btn.addEventListener("click", ()=>{
    const item = itemById(btn.dataset.unequip);
    if(!item) return;
    if(item.kind==="frame") state.frame = ""; else if(item.kind==="theme") state.theme = "clean"; else state.avatar = "root";
    saveState(); applyTheme(state.theme); shopMsg = ""; render();
  }));
}

// ---- Placement check-in ----
function startPlacement(){
  const plan = buildPlan(TOPICS, SUGGESTED_ORDER);
  const pool = [];
  plan.forEach(({cat, topicIds})=>{
    const used = {};
    topicIds.forEach(topicId=>{
      const t = TOPICS.find(x=>x.id===topicId);
      const items = ((GENERATORS[topicId] ? GENERATORS[topicId]() : null) || getTopicProblems(t)).slice();
      for(let i=items.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; }
      const n = used[topicId] = (used[topicId]||0);
      used[topicId]++;
      pool.push({...items[n % items.length], topicId, cat});
    });
  });
  session = {
    mode:"placement", xpPerCorrect:0,
    title:L("Check-in","Chequeo"), cat:null, learnPhase:null, guidedCount:0, practiceCount:pool.length,
    problems: pool.map((p,idx)=>({...p, idx, kind:"practice"})), pos:0, revealed:false, autoResult:null, attempts:0, retryFlash:false,
    results:[], correctCount:0, why:null,
    peekOpen:false, peekPos:0, termsOpen:false, draftAnswer:"", draftBlanks:null,
  };
  view = "quest";
  render();
}
function finishPlacement(){
  const results = session.problems.map((p,i)=>({cat:p.cat, topicId:p.topicId, correct: session.results[i]==="good"}));
  const regions = scoreRegions(results);
  const start = recommendStart(regions, results, TOPICS, SUGGESTED_ORDER);
  state.placement = {at: Date.now(), regions, start};
  state.placementDismissed = true;
  saveState();
}
function placementCardHTML(){
  if(state.placement || state.placementDismissed) return "";
  return `<div class="placement-card">
    <div class="review-text"><div class="review-title">🧭 ${L("Find your starting point","Encuentra tu punto de partida")}</div>
    <div class="review-sub">${L("A short check-in: 2 questions from each area, about 10 minutes. No hints, no XP, and nothing is graded.","Un chequeo corto: 2 preguntas de cada área, unos 10 minutos. Sin pistas, sin XP y nada se califica.")}</div></div>
    <div class="placement-actions"><button type="button" class="review-go" id="placementCardBtn">${L("Start check-in","Empezar chequeo")}</button>
    <button type="button" class="btn-link" id="placementDismissBtn">${L("Not now","Ahora no")}</button></div></div>`;
}
const PLACEMENT_LEVEL = {
  solid:{label:"Solid", es:"Sólido", icon:"✅"}, getting:{label:"Getting there", es:"En camino", icon:"🟡"}, needs:{label:"Needs work", es:"Necesita trabajo", icon:"🔁"},
};
function placementChip(cat){
  const row = state.placement && state.placement.regions && state.placement.regions[cat];
  if(!row) return "";
  const lv = PLACEMENT_LEVEL[row.level] || PLACEMENT_LEVEL.needs;
  return `<span class="placement-chip lvl-${row.level}" title="${L(`Check-in: ${row.correct} of ${row.total} right`,`Chequeo: ${row.correct} de ${row.total} correctas`)}">${lv.icon} ${L(lv.label,lv.es)}</span>`;
}

function backHome(){
  view = "home"; session = null; render();
}
/* ---- language (English / Dominican Spanish) ----
   The choice is saved with the learner (state.lang) and remembered on the device so the sign-in screens match. */
function languageReady(lang){ return lang!=="es" || contentLoaded(); }
function applyLanguageNow(lang){ applyContentLanguage(lang); setLang(lang); refreshVoices(); }
// Resolves to the language actually in use: if the Spanish text can't be downloaded (offline the first time), stay in English.
async function ensureLanguage(lang){
  if(lang==="es"){
    try{ await loadContentTable("es"); }
    catch{ lang = "en"; }
  }
  applyLanguageNow(lang);
  return lang;
}
// Rerolled practice sets were generated in the old language; make fresh ones (same length, so mastery counts stay valid).
function regenerateCustomProblems(){
  const sets = state.customProblems || {};
  state.customLang = getLang();
  Object.keys(sets).forEach(id=>{
    const t = TOPICS.find(x=>x.id===Number(id));
    const fresh = t && GENERATORS[t.id] ? GENERATORS[t.id](t) : null;
    if(Array.isArray(fresh) && fresh.length){
      sets[id] = fresh;
      if(state.mastered[id]) state.mastered[id] = state.mastered[id].filter(i=>i<fresh.length);
    }else delete sets[id];
  });
}
async function changeLanguage(next){
  if(next===getLang()) return;
  const got = await ensureLanguage(next);
  if(got!==next){ announce(L("Couldn't load Spanish. Check your connection and try again.","No se pudo cargar el español. Revisa tu conexión e inténtalo de nuevo.")); return; }
  state.lang = next;
  rememberDeviceLang(next);
  regenerateCustomProblems();
  saveState();
  reseedDisplay();
  render();
  announce(L("Language: English","Idioma: español"));
}
export function currentLanguage(){ return getLang(); }
// Used by the sign-in screens, which are outside the game: switch language without a learner loaded.
export async function setDeviceLanguage(lang){
  await ensureLanguage(lang);
  rememberDeviceLang(lang);
}
function advanceToExamples(){
  session.learnPhase = "examples"; session.exPos = 0; render();
}
function nextExample(){
  if(session.exPos < session.examples.length-1){ session.exPos++; render(); }
  else { session.learnPhase = null; render(); }
}
function skipToReveal(){
  session.revealed = true; session.autoResult = null; render();
}
// Jumps straight past the intro + worked examples into the first practice
// question (guided, if the topic has any, otherwise straight to practice).
function skipExamples(){
  session.learnPhase = null; render();
}
// Jumps from guided practice straight into the independent practice problems,
// marking nothing as done either way — it's purely a navigation shortcut.
function skipGuidedPractice(){
  if(session.mode!=="topic" || session.pos >= session.guidedCount) return;
  session.pos = session.guidedCount;
  session.revealed=false; session.autoResult=null; session.attempts=0; session.retryFlash=false;
  session.blankAnswers=null; session.blankCorrect=null;
  session.draftAnswer=""; session.draftBlanks=null; session.hintLevel=0; session.diagnosis=null;
  render();
}
// Picks whichever worked example best matches the problem the student is
// currently stuck on, so the "view examples" peek doesn't always just show
// example #1 — it tries to land on the one that's actually relevant.
const EXAMPLE_MATCH_MARKERS = [
  "⁰","⁻","√","≥","≤","±","≠","or","even","odd","negative","zero","discriminant",
  "axis of symmetry","rationalize","consecutive","inverse variation","direct variation",
  "perpendicular","parallel","dashed","solid","shade above","shade below","open circle",
  "closed circle","median","mode","range","cube","cubes","denominator","fraction","decimal",
  // Spanish equivalents, so the best-example match works in both languages
  "par","impar","negativo","cero","discriminante","eje de simetría","racionaliza","consecutivo",
  "variación inversa","variación directa","paralela","discontinua","continua","por encima","por debajo",
  "círculo abierto","círculo cerrado","mediana","moda","rango","cubos","denominador","fracción",
];
const MATCH_STOPWORDS = new Set(["the","is","of","to","and","or","in","on","for","with","that",
  "this","are","be","as","at","by","from","into","it","its","you","your","find","answer","step",
  "steps","final","solve","what","does","do","value","values","number","numbers","same","each",
  "both","one","two","three","four","five","six","first","second","third","get","gets","use",
  "using","term","terms","equation","equations","write","plug","check","watch","leave","sign",
  "signs","side","sides","answers",
  // Spanish filler words
  "para","como","cada","esto","esta","este","estos","estas","con","los","las","una","uno","dos","tres",
  "cuatro","cinco","paso","pasos","respuesta","halla","resuelve","usa","valor","valores","número","números",
  "mismo","misma","ambos","primero","segundo","tercero","signo","signos","lado","lados","término","términos",
  "ecuación","ecuaciones","escribe","comprueba","fíjate","cuando","donde","sobre","entre","tiene","luego",
  "después","antes","solo","también","porque","cualquier","siempre","nunca","todos","todas","puedes","necesitas"]);
function significantWords(text){
  const plain = stripTags(String(text)).toLowerCase();
  return (plain.match(/[a-záéíóúñü]+/g) || []).filter(w => w.length>=4 && !MATCH_STOPWORDS.has(w));
}
function pickBestExampleIndex(problem, examples){
  if(!examples || examples.length<=1) return 0;
  const probRaw = [problem.q, (problem.steps||[]).join(" "), problem.a].join(" ");
  const probLower = probRaw.toLowerCase();
  const probWords = new Set(significantWords(probRaw));
  let bestIdx = 0, bestScore = 0;
  examples.forEach((ex,i)=>{
    const exRaw = [ex.title, ex.lines.join(" ")].join(" ");
    const exLower = exRaw.toLowerCase();
    let score = 0;
    EXAMPLE_MATCH_MARKERS.forEach(m=>{
      if(exLower.includes(m) && probLower.includes(m)) score += 3;
    });
    significantWords(exRaw).forEach(w=>{ if(probWords.has(w)) score += 1; });
    if(score > bestScore){ bestScore = score; bestIdx = i; }
  });
  return bestIdx;
}
// These two toggle an inline reference panel that appears right under the
// problem card (not a separate screen), so the problem stays on-screen while
// looking something up. Opening one closes the other, so they never stack.
function openExamplesPeek(){
  const p = session.problems[session.pos];
  session.peekPos = pickBestExampleIndex(p, session.examples);
  session.peekOpen = true;
  session.termsOpen = false;
  render();
}
function closeExamplesPeek(){
  session.peekOpen = false;
  render();
}
function openTermsPeek(){
  session.termsOpen = true;
  session.peekOpen = false;
  render();
}
function closeTermsPeek(){
  session.termsOpen = false;
  render();
}
function peekNextExample(){
  if(session.peekPos < session.examples.length-1){ session.peekPos++; render(); }
}
function peekPrevExample(){
  if(session.peekPos > 0){ session.peekPos--; render(); }
}
// ---- Hints: the topic's rule first, then the first step of the worked solution ----
function hintsFor(p){
  const t = TOPICS.find(x=>x.id===p.topicId);
  return {
    rule: p.howTo || (t && t.howTo) || "",
    step: (p.steps && p.steps.length) ? p.steps[0] : "",
  };
}
function hintBoxHTML(p){
  const level = session.hintLevel || 0;
  if(!level) return "";
  const {rule, step} = hintsFor(p);
  let html = "";
  if(rule) html += `<div class="hint-box"><span class="lbl">💡 ${L("Remember","Recuerda")}</span>${renderStepText(rule)}</div>`;
  if(level>=2 && step) html += `<div class="hint-box"><span class="lbl">💡 ${L("First step","Primer paso")}</span>${renderStepText(step)}</div>`;
  return html;
}
function hintButtonHTML(p){
  const level = session.hintLevel || 0;
  const {rule, step} = hintsFor(p);
  if(level===0 && (rule || step)) return `<button class="btn-link" id="hintBtn">💡 ${L("Need a hint?","¿Necesitas una pista?")}</button>`;
  if(level===1 && step) return `<button class="btn-link" id="hintBtn">💡 ${L("Show another hint","Mostrar otra pista")}</button>`;
  return "";
}
function showNextHint(){
  const input = document.getElementById("answerInput");
  if(input) session.draftAnswer = input.value;
  const {rule, step} = hintsFor(session.problems[session.pos]);
  const level = session.hintLevel || 0;
  // Skip straight to the first step when there is no rule to show.
  session.hintLevel = (level===0 && !rule && step) ? 2 : level + 1;
  render();
  const inp = document.getElementById("answerInput");
  if(inp) inp.focus();
}
function tryAgain(){
  session.retryFlash = false;
  render();
  const inp = document.getElementById("answerInput");
  if(inp) inp.focus();
}
function submitTyped(){
  const input = document.getElementById("answerInput");
  if(!input) return;
  const text = input.value;
  if(!text.trim()){
    input.classList.add("shake");
    setTimeout(()=>input.classList.remove("shake"), 400);
    input.focus();
    return;
  }
  const p = session.problems[session.pos];
  const matched = checkEquivalence(text, checkAnswerFor(p));
  const threshold = (p.kind==="guided" || session.mode==="placement") ? 1 : 2;
  session.attempts = (session.attempts||0) + 1;
  session.diagnosis = matched ? null : diagnoseMistake(text, checkAnswerFor(p));
  if(matched) announce(L("Correct!","¡Correcto!"));
  else if(session.attempts < threshold) announce(L(`Not quite. ${session.diagnosis ? session.diagnosis.message : "Give it one more try."}`,`Casi. ${session.diagnosis ? session.diagnosis.message : "Inténtalo una vez más."}`));
  else announce(L(`Not quite. The answer is ${stripTags(String(p.a))}. ${session.diagnosis ? session.diagnosis.message : ""}`,`Casi. La respuesta es ${stripTags(String(p.a))}. ${session.diagnosis ? session.diagnosis.message : ""}`));
  if(!matched && session.attempts < threshold){
    session.retryFlash = true;
    if(p.kind==="practice" && session.mode!=="placement" && !(session.hintLevel>0)) session.hintLevel = 1; // a miss shows the rule
    render();
    const inp = document.getElementById("answerInput");
    if(inp){ inp.focus(); inp.select(); }
    return;
  }
  session.revealed = true;
  session.autoResult = {matched, userText:text, showHowTo: !matched && session.attempts>=threshold};
  render();
}
function submitBlanks(){
  const p = session.problems[session.pos];
  const inputs = Array.from(app.querySelectorAll(".blankInput, .blankSelect"));
  if(!inputs.length) return;
  let anyEmpty = false;
  inputs.forEach(inp=>{ if(!inp.value.trim()) anyEmpty = true; });
  if(anyEmpty){
    inputs.forEach(inp=>{
      if(!inp.value.trim()){
        inp.classList.add("shake");
        setTimeout(()=>inp.classList.remove("shake"), 400);
      }
    });
    return;
  }
  const userVals = p.blanks.map(step => step.answers.map(()=>""));
  const correctFlags = p.blanks.map(step => step.answers.map(()=>false));
  let allCorrect = true;
  // Pass 1: just collect what was typed into each blank.
  inputs.forEach(inp=>{
    const si = +inp.dataset.si, bi = +inp.dataset.bi;
    userVals[si][bi] = inp.value;
  });
  // Pass 2: grade each step. A step marked anyOrder has several blanks whose
  // answers form an unordered set (e.g. "two numbers that multiply to X and
  // add to Y") — any arrangement the student types is accepted, since the
  // math doesn't care which box a number landed in.
  p.blanks.forEach((step, si)=>{
    if(step.anyOrder && step.answers.length > 1){
      const result = matchAnyOrder(userVals[si], step.answers);
      correctFlags[si] = result.flags;
      if(!result.matched) allCorrect = false;
    }else{
      step.answers.forEach((expected, bi)=>{
        const ok = checkEquivalence(userVals[si][bi], expected);
        correctFlags[si][bi] = ok;
        if(!ok) allCorrect = false;
      });
    }
  });
  session.attempts = (session.attempts||0) + 1;
  session.revealed = true;
  session.blankAnswers = userVals;
  session.blankCorrect = correctFlags;
  session.autoResult = {matched: allCorrect, showHowTo: !allCorrect};
  render();
}
function mark(correct){
  const p = session.problems[session.pos];
  session.results[session.pos] = correct ? "good" : "bad";
  (session.meta || (session.meta = []))[session.pos] = {hinted:(session.hintLevel||0)>0, attempts:session.attempts||0, typed:!!session.autoResult};
  const xpBefore = state.xp;
  const lvBefore = level();
  const topicObj = session.mode==="topic" ? TOPICS.find(x=>x.id===session.topicId) : null;
  const wasMastered = topicObj ? isTopicMastered(topicObj) : false;
  if(session.mode==="placement"){
    if(correct) session.correctCount++;
  }else if(correct){
    session.correctCount++;
    streak++;
    if(streak>state.bestStreak) state.bestStreak = streak;
    state.xp += (session.mode==="boss" || session.mode==="review" || session.mode==="daily") ? (session.xpPerCorrect||14) : (p.scaffold ? 4 : p.kind==="guided" ? 6 : 10);
    if(session.mode==="topic" && p.kind==="practice" && !p.scaffold) setMastered(session.topicId, p.idx, session.practiceCount);
    if(streak>0 && streak%5===0) burstConfetti();
  }else{
    streak = 0;
    state.xp += 2;
  }
  session.xpEarned = (session.xpEarned||0) + (state.xp - xpBefore);
  if(session.mode!=="placement"){ bumpStat("answers"); if(correct) bumpStat("correct"); }
  if(session.mode!=="placement"){
    // One sound per answer, the most meaningful first: topic mastered > level up > streak of 5 > right/wrong.
    if(correct && topicObj && !wasMastered && isTopicMastered(topicObj)) playSound("mastered");
    else if(level() > lvBefore) playSound("levelup");
    else if(correct && streak>0 && streak%5===0) playSound("streak");
    else playSound(correct ? "correct" : "wrong");
  }
  // Two misses in a row on real practice: slip a warm-up in next.
  if(session.mode==="topic" && p.kind==="practice"){
    session.missStreak = nextMissStreak(session.missStreak||0, {correct, warmup:!!p.scaffold});
    if(shouldInsertWarmup({missStreak:session.missStreak, warmupsUsed:session.warmups||0, problemsLeft:session.problems.length-1-session.pos})) insertWarmup();
  }
  saveState();
  setTimeout(()=>{
    if(session.pos < session.problems.length-1){
      session.pos++; session.revealed=false; session.autoResult=null;
      session.attempts=0; session.retryFlash=false;
      session.blankAnswers=null; session.blankCorrect=null;
      session.draftAnswer=""; session.draftBlanks=null; session.hintLevel=0; session.diagnosis=null;
      if(session.problems[session.pos].scaffold) session.hintLevel = 2; // warm-ups open with the rule and first step shown
      render();
      checkAchievements();
    }else{
      if(session.mode==="topic" || session.mode==="review") recordReviewResults();
      if(session.mode==="placement") finishPlacement();
      if(session.mode==="daily") finishDaily();
      if(session.mode==="boss") finishBoss();
      logActivity();
      checkAchievements();
      view="summary"; render();
      if(session.correctCount===session.problems.length) burstConfetti();
    }
  }, 650);
  render();
}
function resetProgress(){
  state = defaultState(); state.resetAt = Date.now(); streak=0; saveState(); applyTheme(state.theme); render();
}
function resetTopicProgress(topicId){
  state.mastered[topicId] = [];
  if(state.masteredDates) delete state.masteredDates[topicId];
  markTopicReset(topicId);
  saveState();
  render();
}
// Double-click-to-confirm for a small icon button (shows a tick, waits for a
// second tap within the window, then reverts). Returns true on the confirming tap.
let pendingIconConfirm = null;
function confirmIconBtn(btn){
  if(pendingIconConfirm===btn.id){
    pendingIconConfirm = null;
    return true;
  }
  pendingIconConfirm = btn.id;
  const oldText = btn.textContent, oldTitle = btn.title;
  btn.textContent = "✓";
  btn.title = L("Tap again to confirm reset","Toca otra vez para confirmar el reinicio");
  btn.classList.add("confirm-pending");
  setTimeout(()=>{
    if(btn && document.body.contains(btn)){
      btn.textContent = oldText; btn.title = oldTitle; btn.classList.remove("confirm-pending");
    }
    if(pendingIconConfirm===btn.id) pendingIconConfirm = null;
  }, 2200);
  return false;
}

/* ===================== RENDER ===================== */
const app = document.getElementById("app");

/* ---- motion helpers: smooth, reduced-motion-aware tweens for numbers & bar widths.
   These only touch on-screen text/width — they never change state.xp, state.mastered,
   or anything that gets saved; saveState() has already run with the real values by
   the time any of this is called. ---- */
function reducedMotion(){ return matchMedia("(prefers-reduced-motion: reduce)").matches; }
function animateNumber(el, from, to, duration){
  if(!el) return;
  from = Number(from); to = Number(to);
  if(reducedMotion() || from===to){ el.textContent = to; return; }
  const start = performance.now();
  function step(now){
    if(!el) return;
    const t = Math.min(1, (now-start)/duration);
    const eased = 1 - Math.pow(1-t, 3);
    el.textContent = Math.round(from + (to-from)*eased);
    if(t<1) requestAnimationFrame(step);
    else el.textContent = to;
  }
  requestAnimationFrame(step);
}
function animateBarWidth(el, fromPct, toPct){
  if(!el) return;
  if(reducedMotion() || fromPct===toPct){ el.style.width = toPct+"%"; return; }
  el.style.width = fromPct+"%";
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{ if(el) el.style.width = toPct+"%"; });
  });
}
// "Last displayed" snapshots, seeded from the real saved state whenever a learner is
// loaded so the first render never animates from 0 — only genuine changes during play do.
let lastXPDisplayed, lastLevelDisplayed, lastProgDisplayed, celebratedTopics;
function reseedDisplay(){
  lastXPDisplayed = xpIntoLevel();
  lastLevelDisplayed = level();
  lastProgDisplayed = {};
  TOPICS.forEach(t=>{
    lastProgDisplayed[t.id] = Math.round((topicMasteredCount(t.id)/getTopicProblems(t).length)*100);
  });
  celebratedTopics = new Set(
    TOPICS.filter(t=>topicMasteredCount(t.id)===getTopicProblems(t).length).map(t=>t.id)
  );
}
reseedDisplay();

/* ===================== PROFILE SWITCHING (used by the React shell) =====================
   loadLearner() points the game at a storage slot and optionally seeds it with a
   starting state (e.g. merged from the server), then re-renders from the home screen. */
/** @param {{key?: string, initial?: object | null, onSave?: ((state: any) => void) | null}} [opts] */
export function loadLearner({key, initial=null, onSave=null} = {}){
  storageKey = key || LEGACY_STORAGE_KEY;
  onSaveHook = onSave || null;
  state = initial ? Object.assign(defaultState(), initial) : loadState();
  try{ localStorage.setItem(storageKey, JSON.stringify(state)); }catch(e){}
  streak = 0; view = "home"; session = null;
  applyTheme(state.theme);
  const finish = ()=>{
    // Re-rolled sets saved in the other language (e.g. chosen on another device) are regenerated in this one.
    if(Object.keys(state.customProblems||{}).length && (state.customLang||"en")!==getLang()){ regenerateCustomProblems(); saveState(); }
    checkAchievements(true); reseedDisplay(); render();
  };
  const want = state.lang || deviceLang();
  if(languageReady(want)){ applyLanguageNow(want); finish(); }
  else ensureLanguage(want).then(finish);
}
// A newer copy of the current learner's progress arrived from the server.
/** @param {object} next */
export function applyRemoteState(next){
  state = Object.assign(defaultState(), next);
  try{ localStorage.setItem(storageKey, JSON.stringify(state)); }catch(e){}
  applyTheme(state.theme);
  checkAchievements(true);
  const want = state.lang || getLang();
  if(want!==getLang()){ ensureLanguage(want).then(()=>{ if(view==="home"){ reseedDisplay(); render(); } }); return; }
  if(view==="home"){ reseedDisplay(); render(); }
}
/** @param {string} key */
export function readLocalState(key){
  try{ const raw = localStorage.getItem(key); return raw ? Object.assign(defaultState(), JSON.parse(raw)) : null; }
  catch(e){ return null; }
}
export function currentState(){ return state; }
export function stopGame(){ if(window.speechSynthesis) speechSynthesis.cancel(); }

// Tell screen readers something (a result, a badge) without moving focus. Cleared first so repeating the same
// message is still announced.
function announce(msg){
  const el = document.getElementById("srAnnounce");
  if(!el) return;
  el.textContent = "";
  setTimeout(()=>{ el.textContent = msg; }, 60);
}
// When the learner moves to a different screen, put focus on its heading so screen reader and keyboard users
// start at the top of the new content instead of on a button that no longer exists.
let lastRenderedView = null;
function focusScreenHeading(){
  const h = app.querySelector("h1, h2");
  if(!h) return;
  h.setAttribute("tabindex","-1");
  h.focus({preventScroll:true});
}
function render(){
  const changed = view !== lastRenderedView;
  const first = lastRenderedView === null;
  lastRenderedView = view;
  renderView();
  if(changed && !first) focusScreenHeading();
}
function renderView(){
  if(window.speechSynthesis) speechSynthesis.cancel();
  if(view==="home") return renderHome();
  if(view==="quest"){
    if(session.learnPhase==="intro") return renderIntro();
    if(session.learnPhase==="examples") return renderExamples();
    return renderQuest();
  }
  if(view==="summary") return renderSummary();
  if(view==="dictionary") return renderDictionary();
  if(view==="shop") return renderShop();
  if(view==="badges") return renderBadges();
  if(view==="report") return renderReport();
}

function statsBarHTML(){
  return `
  <div class="stats">
    <div class="stat-chip level"><span class="ico">⭐</span>${L("Lv","Nv")} ${level()}</div>
    <div class="stat-chip streak"><span class="ico">🔥</span>${streak}</div>
  </div>`;
}

function themePanelHTML(){
  const swatches = availableThemes().map(t=>{
    const pressed = state.theme===t.id;
    return `<button type="button" class="theme-swatch" data-theme-pick="${t.id}" role="option" aria-selected="${pressed}">
      <span class="swatch-dot" style="--sw-a:${t.a};--sw-b:${t.b};--sw-c:${t.c}" aria-hidden="true"></span>
      <span>${L(t.name,t.es)}</span>
      <span class="swatch-check" aria-hidden="true">✓</span>
    </button>`;
  }).join("");
  return `<div class="theme-panel" id="themePanel" role="listbox" aria-label="${L("Choose a visual theme","Elige un tema visual")}">${swatches}</div>`;
}

function avatarPanelHTML(){
  const options = allowedAvatars().map(a=>{
    const pressed = (state.avatar||"root")===a.id;
    return `<button type="button" class="avatar-swatch" data-avatar-pick="${a.id}" role="option" aria-selected="${pressed}" title="${L(a.label,a.es)}">
      <span class="avatar-swatch-icon" aria-hidden="true">${a.icon}</span>
      <span class="avatar-swatch-check" aria-hidden="true">✓</span>
    </button>`;
  }).join("");
  return `<div class="avatar-panel" id="avatarPanel" role="listbox" aria-label="${L("Choose your character","Elige tu personaje")}">${options}</div>`;
}
function bossPanelHTML(){
  const modes = BOSS_LEVELS.map(l=>`
    <button type="button" class="boss-mode-btn" data-boss-level="${l.id}" style="--mode-color:${l.color}">
      <span class="boss-mode-icon">${l.icon}</span>
      <span class="boss-mode-text">
        <span class="boss-mode-name">${L(l.name,l.es)}</span>
        <span class="boss-mode-tagline">${L(l.tagline,l.esTagline)}</span>
      </span>
      <span class="boss-mode-count">🎲 ${l.count} ${L("Q","P")}</span>
    </button>`).join("");
  return `<div class="boss-panel" id="bossPanel" role="group" aria-label="${L("Choose a Boss Battle difficulty","Elige la dificultad de la Batalla de jefe")}">${modes}</div>`;
}
function renderHome(){
  const regions = ["foundations","expressions","equations","graphing","factoring","rational","quadratics","applications"];
  const curTheme = availableThemes().find(t=>t.id===state.theme) || THEMES[0];
  let html = `
  <div class="hub-card">
    <div class="topbar">
      <div class="brand">
        <button type="button" class="mark" id="avatarBtn" aria-haspopup="listbox" aria-expanded="${avatarPanelOpen}" title="${L("Change your character","Cambia tu personaje")}">${avatarIcon(state.avatar)}</button>
        ${avatarPanelOpen ? avatarPanelHTML() : ""}
        <div>
          <h1>Algebra Quest</h1>
          <p>${heroLine()}</p>
        </div>
      </div>
      ${statsBarHTML()}
    </div>
    <div class="xpbar-wrap">
      <div class="xpbar-top"><span>XP</span><span>${L(`<span id="xpNum">${xpIntoLevel()}</span> / 100 to Level ${level()+1}`,`<span id="xpNum">${xpIntoLevel()}</span> / 100 para el Nivel ${level()+1}`)}</span></div>
      <div class="xpbar-track"><div class="xpbar-fill" id="xpFill" style="width:${xpIntoLevel()}%"></div></div>
    </div>
  </div>
  <div class="theme-row">
    <div class="name-field">
      <input type="text" id="nameInput" class="name-input${state.name ? " has-name" : ""}" placeholder="${L("Add your name","Agrega tu nombre")}" value="${escapeHtml(state.name||"")}" maxlength="24" aria-label="${L("Your name, used to personalize messages","Tu nombre, que se usa para personalizar los mensajes")}">
    </div>
    <button type="button" class="theme-toggle" id="dictionaryBtn" title="${L("Terminology &amp; formula dictionary","Diccionario de términos y fórmulas")}">📖 ${L("Dictionary","Diccionario")}</button>
    <button type="button" class="theme-toggle" id="reportBtn" title="${L("Progress report for parents and teachers","Informe de progreso para padres y maestros")}">📊 ${L("Report","Informe")}</button>
    <button type="button" class="theme-toggle" id="badgesBtn" title="${L("See your badges","Mira tus insignias")}">🏅 ${L("Badges","Insignias")} <span class="badge-count">${Object.keys(state.badges||{}).length}/${ACHIEVEMENTS.length}</span></button>
    <button type="button" class="theme-toggle" id="soundBtn" aria-pressed="${!soundMuted()}" title="${L("Turn sound effects on or off","Activa o desactiva los efectos de sonido")}">${soundMuted() ? L("🔇 Muted","🔇 Silenciado") : L("🔊 Sound","🔊 Sonido")}</button>
    <button type="button" class="theme-toggle" id="shopBtn" title="${L("Spend XP on new characters and frames","Gasta XP en personajes y marcos nuevos")}">🛍️ ${L("Shop","Tienda")}</button>
    <button type="button" class="theme-toggle" id="placementBtn" title="${L("Short check-in to find where to start","Chequeo corto para encontrar por dónde empezar")}">🧭 ${state.placement ? L("Retake check-in","Repetir chequeo") : L("Check-in","Chequeo")}</button>
    <button type="button" class="theme-toggle" id="langBtn" lang="${getLang()==="es" ? "en" : "es"}" title="${L("Cambiar a español","Switch to English")}"><span aria-hidden="true">${getLang()==="es" ? "🇺🇸" : "🇩🇴"}</span> ${getLang()==="es" ? "English" : "Español"}</button>
    <button type="button" class="theme-toggle" id="themeToggleBtn" aria-haspopup="listbox" aria-expanded="${themePanelOpen}" title="${L("Change visual theme","Cambia el tema visual")}">
      <span class="swatch-dot" style="--sw-a:${curTheme.a};--sw-b:${curTheme.b};--sw-c:${curTheme.c}" aria-hidden="true"></span>
      ${L("Theme","Tema")}: ${L(curTheme.name,curTheme.es)}
    </button>
    ${themePanelOpen ? themePanelHTML() : ""}
  </div>
  ${reviewCardHTML()}
  ${dailyCardHTML()}
  ${placementCardHTML()}`;

  // Track which topics just became fully mastered this render, so only those
  // get the one-time badge glow (not every topic that was already mastered before).
  const newlyMastered = [];
  // The topic's internal id (t.id) is just a stable key used for progress
  // tracking/generators — topics aren't added to this file in id order, so
  // showing t.id on the card looks like a random jumble of numbers. What the
  // player actually sees is a clean 1..34 count-up in on-screen order instead.
  let displayNum = 0;

  regions.forEach(cat=>{
    const topics = TOPICS.filter(t=>t.cat===cat)
      .sort((a,b)=> SUGGESTED_ORDER.indexOf(a.id) - SUGGESTED_ORDER.indexOf(b.id));
    const regionCleared = topics.every(isTopicMastered);
    html += `<div class="region-label"><span class="region-icon" style="--cat:${CAT[cat].color}">${CAT[cat].icon}</span>${L(CAT[cat].label,CAT[cat].es)}${placementChip(cat)}${regionCleared ? `<span class="region-cleared">${L("Region cleared ✓","Región completada ✓")}</span>` : ""}</div>`;
    html += `<div class="topic-grid">`;
    topics.forEach(t=>{
      displayNum++;
      const done = topicMasteredCount(t.id);
      const total = getTopicProblems(t).length;
      const pct = Math.round((done/total)*100);
      const isMasteredNow = done===total;
      const justCompleted = isMasteredNow && !celebratedTopics.has(t.id);
      if(justCompleted) newlyMastered.push(t.id);
      const badge = isMasteredNow ? `<div class="mastered-badge${justCompleted ? " badge-glow" : ""}">🏆</div>` : "";
      const dateLabel = masteredDateLabel(t.id);
      html += `
      <div class="topic-card" style="--cat:${CAT[t.cat].color}" data-topic="${t.id}">
        ${badge}
        <button type="button" class="topic-reset-btn" id="resetTopic-${t.id}" data-topic-reset="${t.id}" title="${L("Reset this topic's progress","Reinicia el progreso de este tema")}">↻</button>
        <button type="button" class="topic-reroll-btn" id="rerollTopic-${t.id}" data-topic-reroll="${t.id}" title="${L("Get new practice problems for this topic","Consigue problemas de práctica nuevos para este tema")}">🎲</button>
        <div class="num">${displayNum}</div>
        <div class="ttitle"><button type="button" class="topic-open" data-topic-open="${t.id}">${t.title}<span class="sr-only">, ${L(`${done} of ${total} mastered`,`${done} de ${total} dominados`)}${state.placement && state.placement.start===t.id ? L(", suggested starting point",", punto de partida sugerido") : ""}</span></button></div>
        ${state.placement && state.placement.start===t.id ? `<div class="start-here">⭐ ${L("Start here","Empieza aquí")}</div>` : ""}
        <div class="prog-label">${done} / ${total} ${L("mastered","dominados")}${dateLabel ? ` <span class="prog-date">· ${dateLabel}</span>` : ""}</div>
        <div class="prog-track"><div class="prog-fill" data-topic-prog="${t.id}" style="width:${pct}%"></div></div>
      </div>`;
    });
    html += `</div>`;
  });

  html += `
  <button class="boss-card" id="bossBtn" aria-haspopup="true" aria-expanded="${bossPanelOpen}">
    <div class="bicon">⚔️</div>
    <div>
      <h3 aria-level="2">${L("Boss Battle","Batalla de jefe")}</h3>
      <p>${L("Pick a difficulty — Easy through Hell Mode — for a focused challenge round.","Elige una dificultad — de Fácil a Modo Infierno — para una ronda de reto enfocada.")}</p>
    </div>
  </button>
  ${bossPanelOpen ? bossPanelHTML() : ""}
  <div class="reset-row"><button id="exportBtn" title="${L("Save your progress to a file","Guarda tu progreso en un archivo")}">${L("Export progress","Exportar progreso")}</button><button id="importBtn" title="${L("Load progress from a saved file","Carga el progreso desde un archivo guardado")}">${L("Import progress","Importar progreso")}</button><button id="resetBtn">${L("Reset all progress","Reiniciar todo el progreso")}</button><input type="file" id="importFile" accept="application/json,.json" hidden><div id="backupMsg" role="status" aria-live="polite"></div></div>
  `;

  app.innerHTML = html;
  app.querySelectorAll(".topic-card").forEach(el=>{
    // The whole card is clickable for mouse and touch; keyboard users use the real button inside it
    // (Enter / Space on it produce a click that bubbles up to here).
    el.addEventListener("click", ()=> startTopic(Number(el.dataset.topic)));
  });
  app.querySelectorAll(".topic-reset-btn").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      const topicId = Number(btn.dataset.topicReset);
      if(confirmIconBtn(btn)) resetTopicProgress(topicId);
    });
    // Enter/Space on a focused button fires a keydown that bubbles up to the
    // card's own keydown listener (click-time stopPropagation doesn't stop a
    // keydown), which would also open the topic. Stop it here too.
    btn.addEventListener("keydown", e=>{ if(e.key==="Enter" || e.key===" ") e.stopPropagation(); });
  });
  app.querySelectorAll(".topic-reroll-btn").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      const topicId = Number(btn.dataset.topicReroll);
      if(confirmIconBtn(btn)) rerollTopicProblems(topicId);
    });
    btn.addEventListener("keydown", e=>{ if(e.key==="Enter" || e.key===" ") e.stopPropagation(); });
  });
  document.getElementById("bossBtn").addEventListener("click", e=>{
    e.stopPropagation();
    bossPanelOpen = !bossPanelOpen;
    render();
  });
  if(bossPanelOpen){
    app.querySelectorAll(".boss-mode-btn").forEach(btn=>{
      btn.addEventListener("click", e=>{
        e.stopPropagation();
        startBoss(btn.dataset.bossLevel);
      });
    });
  }
  const backupMsg = document.getElementById("backupMsg");
  document.getElementById("exportBtn").addEventListener("click", ()=>{
    const blob = new Blob([serializeBackup(state)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = backupFileName(state);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    backupMsg.textContent = L("Progress saved to a file.","Progreso guardado en un archivo.");
  });
  document.getElementById("importBtn").addEventListener("click", ()=> document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", async e=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    try{
      const next = parseBackup(await file.text(), defaultState());
      state = next; streak = 0; saveState(); applyTheme(state.theme); render();
    }catch(err){
      backupMsg.textContent = err.message;
    }
  });
  document.getElementById("resetBtn").addEventListener("click", ()=>{
    if(confirmInline("resetBtn",L("Reset ALL progress?","¿Reiniciar TODO el progreso?"))) resetProgress();
  });

  const nameInput = document.getElementById("nameInput");
  // Save as she types (debounced) but never re-render from this listener —
  // a full renderHome() would rebuild the input and drop her cursor mid-word.
  nameInput.addEventListener("input", ()=>{
    state.name = nameInput.value.slice(0,24);
    nameInput.classList.toggle("has-name", !!state.name);
    clearTimeout(nameSaveTimer);
    nameSaveTimer = setTimeout(saveState, 400);
  });
  nameInput.addEventListener("blur", ()=>{
    clearTimeout(nameSaveTimer);
    state.name = nameInput.value.trim().slice(0,24);
    saveState();
  });

  document.getElementById("langBtn").addEventListener("click", ()=> changeLanguage(getLang()==="es" ? "en" : "es"));
  document.getElementById("reportBtn").addEventListener("click", openReport);
  document.getElementById("badgesBtn").addEventListener("click", openBadges);
  document.getElementById("soundBtn").addEventListener("click", ()=>{
    setSoundMuted(!soundMuted());
    render();
    playSound("correct"); // a little preview when turning it on (silent when turning it off)
  });
  document.getElementById("shopBtn").addEventListener("click", openShop);
  document.getElementById("placementBtn").addEventListener("click", startPlacement);
  const placementCardBtn = document.getElementById("placementCardBtn");
  if(placementCardBtn) placementCardBtn.addEventListener("click", startPlacement);
  const placementDismissBtn = document.getElementById("placementDismissBtn");
  if(placementDismissBtn) placementDismissBtn.addEventListener("click", ()=>{ state.placementDismissed = true; saveState(); render(); });
  const dailyBtn = document.getElementById("dailyBtn");
  if(dailyBtn) dailyBtn.addEventListener("click", startDaily);
  const reviewBtn = document.getElementById("reviewBtn");
  if(reviewBtn) reviewBtn.addEventListener("click", startReview);
  document.getElementById("dictionaryBtn").addEventListener("click", ()=>{
    view = "dictionary";
    render();
  });

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  themeToggleBtn.addEventListener("click", e=>{
    e.stopPropagation();
    themePanelOpen = !themePanelOpen;
    render();
    if(themePanelOpen){
      const firstSwatch = document.querySelector(".theme-swatch");
      if(firstSwatch) firstSwatch.focus();
    }
  });
  app.querySelectorAll(".theme-swatch").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      setTheme(btn.dataset.themePick);
      document.getElementById("themeToggleBtn").focus();
    });
  });

  const avatarBtn = document.getElementById("avatarBtn");
  avatarBtn.addEventListener("click", e=>{
    e.stopPropagation();
    avatarPanelOpen = !avatarPanelOpen;
    render();
    if(avatarPanelOpen){
      const firstSwatch = document.querySelector(".avatar-swatch");
      if(firstSwatch) firstSwatch.focus();
    }
  });
  app.querySelectorAll(".avatar-swatch").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      setAvatar(btn.dataset.avatarPick);
      const reopened = document.getElementById("avatarBtn");
      if(reopened) reopened.focus();
    });
  });

  // Smoothly tween the XP number + bar, and each topic's progress bar, from what was
  // last shown to the real (already-saved) current value. A level-up resets XP%100
  // to a smaller number, which would look like it ran backwards, so that case just
  // snaps to the new values instead of tweening.
  const curXP = xpIntoLevel(), curLevel = level();
  if(curLevel !== lastLevelDisplayed){
    const xpNumEl = document.getElementById("xpNum");
    if(xpNumEl) xpNumEl.textContent = curXP;
    const xpFillEl = document.getElementById("xpFill");
    if(xpFillEl) xpFillEl.style.width = curXP+"%";
  }else{
    animateNumber(document.getElementById("xpNum"), lastXPDisplayed, curXP, 400);
    animateBarWidth(document.getElementById("xpFill"), lastXPDisplayed, curXP);
  }
  lastXPDisplayed = curXP;
  lastLevelDisplayed = curLevel;

  TOPICS.forEach(t=>{
    const done = topicMasteredCount(t.id);
    const pct = Math.round((done/getTopicProblems(t).length)*100);
    const fillEl = app.querySelector(`.prog-fill[data-topic-prog="${t.id}"]`);
    animateBarWidth(fillEl, lastProgDisplayed[t.id]===undefined ? pct : lastProgDisplayed[t.id], pct);
    lastProgDisplayed[t.id] = pct;
  });
  newlyMastered.forEach(id=> celebratedTopics.add(id));
}

// small inline double-click confirm so we never rely on window.confirm()
let pendingConfirm = null;
function confirmInline(id, label){
  const btn = document.getElementById(id);
  if(pendingConfirm===id){ pendingConfirm=null; return true; }
  pendingConfirm = id;
  const old = btn.textContent;
  btn.textContent = L("Tap again to confirm","Toca otra vez para confirmar");
  setTimeout(()=>{ if(btn) btn.textContent = old; if(pendingConfirm===id) pendingConfirm=null; }, 2200);
  return false;
}

function renderIntro(){
  const catColor = CAT[session.cat].color;
  const catIcon = CAT[session.cat].icon;
  let termsHtml = "";
  if(session.terms && session.terms.length){
    termsHtml = `
    <div class="terms-box">
      <span class="lbl">📖 ${L("Key Terms","Términos clave")}</span>
      ${session.terms.map(t=>`
        <div class="term-row">
          <div class="term-name">${t.term}</div>
          <div class="term-def">${t.def}</div>
          <div class="term-ex">${L("Example","Ejemplo")}: ${t.example}</div>
        </div>`).join("")}
    </div>`;
  }
  const html = `
  <div class="questbar">
    <button class="backbtn" id="backBtn" aria-label="${L("Back","Atrás")}">←</button>
    <div class="region-badge" style="--cat:${catColor}">${catIcon}</div>
    <div class="qtitle">
      <h2 aria-level="1">${session.title}</h2>
      <div class="sub">${L("Let's learn this one","Vamos a aprender este tema")}</div>
    </div>
    ${statsBarHTML()}
  </div>
  <div class="why-strip"><span class="star">★</span><span>${session.why}</span></div>
  <div class="card">
    <div class="tag-row">
      <div class="tag" style="--cat:${catColor}">${L("Before you start","Antes de empezar")}</div>
      <button class="play-btn" id="playIntroBtn" title="${L("Read this aloud","Léelo en voz alta")}">🔊</button>
    </div>
    ${termsHtml}
    <div class="btn-row">
      <button class="btn btn-primary" id="toExamplesBtn">${L(`See ${session.examples.length} Example${session.examples.length===1?"":"s"} →`,`Ver ${session.examples.length} ${session.examples.length===1?"ejemplo":"ejemplos"} →`)}</button>
    </div>
    <button class="btn-link" id="skipExamplesBtn">${L("Skip examples → go straight to practice","Saltar los ejemplos → ir directo a practicar")}</button>
  </div>`;
  app.innerHTML = '<div class="view-enter">' + html + '</div>';
  document.getElementById("backBtn").addEventListener("click", backHome);
  document.getElementById("toExamplesBtn").addEventListener("click", advanceToExamples);
  document.getElementById("skipExamplesBtn").addEventListener("click", skipExamples);
  wireSpeakButton("playIntroBtn", ()=>{
    let parts = [session.why];
    (session.terms||[]).forEach(t=>{
      parts.push(L(`${t.term}. ${t.def}. For example, ${t.example}.`,`${t.term}. ${t.def}. Por ejemplo, ${t.example}.`));
    });
    return speechFromHTML(parts.join(" "));
  });
}

function renderExamples(){
  const catColor = CAT[session.cat].color;
  const catIcon = CAT[session.cat].icon;
  const ex = session.examples[session.exPos];
  const isLast = session.exPos === session.examples.length-1;
  let dots = "";
  session.examples.forEach((_,i)=>{
    dots += `<span class="${i===session.exPos ? "current" : ""}"></span>`;
  });
  const html = `
  <div class="questbar">
    <button class="backbtn" id="backBtn" aria-label="${L("Back","Atrás")}">←</button>
    <div class="region-badge" style="--cat:${catColor}">${catIcon}</div>
    <div class="qtitle">
      <h2 aria-level="1">${session.title}</h2>
      <div class="sub">${L(`Example ${session.exPos+1} of ${session.examples.length}`,`Ejemplo ${session.exPos+1} de ${session.examples.length}`)}</div>
    </div>
    ${statsBarHTML()}
  </div>
  <div class="dots">${dots}</div>
  <div class="card">
    <div class="tag-row">
      <div class="tag" style="--cat:${catColor}">${L("Worked Example","Ejemplo resuelto")}</div>
      <button class="play-btn" id="playExampleBtn" title="${L("Read this example aloud","Lee este ejemplo en voz alta")}">🔊</button>
    </div>
    <div class="example-card">
      <div class="ex-title">${ex.title}</div>
      ${ex.lines.map(l=>`<div class="ex-line">${renderStepText(l)}</div>`).join("")}
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="nextExBtn">${isLast ? L("Start Guided Practice →","Empezar la práctica guiada →") : L("Next Example →","Siguiente ejemplo →")}</button>
    </div>
    ${!isLast ? `<button class="btn-link" id="skipExamplesBtn">${L("Skip remaining examples → go straight to practice","Saltar los ejemplos que faltan → ir directo a practicar")}</button>` : ""}
  </div>`;
  app.innerHTML = '<div class="view-enter">' + html + '</div>';
  document.getElementById("backBtn").addEventListener("click", backHome);
  document.getElementById("nextExBtn").addEventListener("click", nextExample);
  const skipExBtn = document.getElementById("skipExamplesBtn");
  if(skipExBtn) skipExBtn.addEventListener("click", skipExamples);
  wireSpeakButton("playExampleBtn", ()=> speechFromHTML(ex.title + ". " + ex.lines.join(". ")));
}

function renderDictionary(){
  const sectionsHtml = DICTIONARY_SECTIONS.map(sec=>`
    <div class="region-label"><span class="dot" style="background:var(--accent)"></span>${sec.title}</div>
    <div class="terms-box">
      ${sec.entries.map(t=>`
        <div class="term-row">
          <div class="term-name">${t.term}</div>
          <div class="term-def">${t.def}</div>
          ${t.example ? `<div class="term-ex">${L("Example","Ejemplo")}: ${t.example}</div>` : ""}
        </div>`).join("")}
    </div>`).join("");
  const html = `
  <div class="questbar">
    <button class="backbtn" id="backBtn" aria-label="${L("Back","Atrás")}">←</button>
    <div class="qtitle">
      <h2 aria-level="1">${L("Terminology &amp; Formulas","Términos y fórmulas")}</h2>
      <div class="sub">${L("A quick reference — not graded","Una referencia rápida — no se califica")}</div>
    </div>
    ${statsBarHTML()}
  </div>
  ${sectionsHtml}
  `;
  app.innerHTML = '<div class="view-enter">' + html + '</div>';
  document.getElementById("backBtn").addEventListener("click", backHome);
}

function renderQuest(){
  const p = session.problems[session.pos];
  const crossTopic = session.mode==="boss" || session.mode==="review" || session.mode==="placement" || session.mode==="daily";
  const catColor = crossTopic ? CAT[p.cat].color : CAT[session.cat].color;
  const catIcon = crossTopic ? CAT[p.cat].icon : CAT[session.cat].icon;
  let catLabel;
  if(crossTopic){
    catLabel = TOPICS.find(t=>t.id===p.topicId).title;
  }else if(p.kind==="guided"){
    catLabel = L(`Guided Practice ${session.pos+1} of ${session.guidedCount}`,`Práctica guiada ${session.pos+1} de ${session.guidedCount}`);
  }else if(p.scaffold){
    catLabel = L("Warm-up · doesn't count against you","Calentamiento · no cuenta en tu contra");
  }else{
    const n = session.problems.slice(session.guidedCount, session.pos+1).filter(x=>!x.scaffold).length;
    catLabel = L(`Problem ${n} of ${session.practiceCount}`,`Problema ${n} de ${session.practiceCount}`);
  }

  let dots = "";
  session.problems.forEach((_,i)=>{
    let cls = "";
    if(session.results[i]==="good") cls="done-good";
    else if(session.results[i]==="bad") cls="done-bad";
    if(i===session.pos) cls += " current";
    dots += `<span class="${cls}"></span>`;
  });

  let html = `
  <div class="questbar">
    <button class="backbtn" id="backBtn" aria-label="${L("Back","Atrás")}">←</button>
    <div class="region-badge" style="--cat:${catColor}">${catIcon}</div>
    <div class="qtitle">
      <h2 aria-level="1">${session.title}</h2>
      <div class="sub">${session.pos+1} / ${session.problems.length}</div>
    </div>
    ${statsBarHTML()}
  </div>
  <div class="dots">${dots}</div>`;

  if(p.scaffold){
    html += `<div class="why-strip warmup-note"><span class="star">🌱</span><span>${L("Let's try a warm-up first. The rule and first step are shown to help.","Probemos primero un calentamiento. Te mostramos la regla y el primer paso para ayudarte.")}</span></div>`;
  }else if(session.mode==="topic"){
    html += `<div class="why-strip"><span class="star">★</span><span>${session.why}</span></div>`;
  }

  const hasExamples = session.mode==="topic" && session.examples && session.examples.length;
  const hasTerms = session.mode==="topic" && session.terms && session.terms.length;

  html += `
  <div class="card">
    <div class="tag-row">
      <div class="tag" style="--cat:${catColor}">${catLabel}</div>
      <div class="tag-actions">
        ${hasTerms ? `<button class="play-btn" id="viewTermsBtn" aria-pressed="${!!session.termsOpen}" title="${L("Key terms &amp; formulas for this topic","Términos clave y fórmulas de este tema")}">📘</button>` : ""}
        ${hasExamples ? `<button class="play-btn" id="viewExamplesBtn" aria-pressed="${!!session.peekOpen}" title="${L("Stuck? View the worked examples","¿Atascado? Mira los ejemplos resueltos")}">📖</button>` : ""}
      </div>
    </div>
    <div class="qtext-row">
      <div class="qtext">${renderStepText(p.q)}</div>
      <button class="play-btn" id="playQBtn" title="${L("Read this question aloud","Lee esta pregunta en voz alta")}">🔊</button>
    </div>`;

  const usesBlanks = p.kind==="guided" && p.blanks && p.blanks.length;

  if(session.revealed && session.autoResult){
    const ok = session.autoResult.matched;
    html += `<div class="reveal-enter">`;
    html += `
    <div class="feedback ${ok ? "feedback-good feedback-flash-good" : "feedback-bad feedback-flash-bad"}">
      ${ok ? L("✅ Correct!","✅ ¡Correcto!") : (usesBlanks ? L("🤔 Let's check each step:","🤔 Revisemos cada paso:") : L("🤔 Not quite — take a look:","🤔 Casi — mira esto:"))}
    </div>`;
    if(usesBlanks && session.blankAnswers){
      html += `<div class="blank-sheet reveal">`;
      p.blanks.forEach((step, si)=>{
        const parts = step.template.split("{{}}");
        let row = `<div class="blank-row"><span class="blank-label">${step.label}</span> `;
        parts.forEach((part, pi)=>{
          row += renderStepText(part);
          if(pi < parts.length-1){
            const userVal = session.blankAnswers[si][pi];
            const correct = session.blankCorrect[si][pi];
            const expected = step.answers[pi];
            if(correct){
              row += `<span class="blank-filled blank-correct">${escapeHtml(userVal)} ✓</span>`;
            }else{
              row += `<span class="blank-filled blank-wrong">${escapeHtml(userVal)} ✗ → <span class="blank-correct-answer">${escapeHtml(expected)}</span></span>`;
            }
          }
        });
        row += `</div>`;
        html += row;
      });
      html += `</div>`;
    }else{
      html += `<div class="you-typed">${L("You typed","Escribiste")}: <strong>${escapeHtml(session.autoResult.userText)}</strong></div>`;
      if(!session.autoResult.matched && session.diagnosis) html += `<div class="mistake-note">💬 ${session.diagnosis.message}</div>`;
    }
    html += `<div class="answer-box"><span class="lbl">${L("Answer","Respuesta")}</span>${p.a}</div>`;
    if(session.autoResult.showHowTo && p.steps && p.steps.length){
      html += `
      <div class="howto-box">
        <span class="lbl">📘 ${L("Step-by-step breakdown","Desglose paso a paso")}</span>
        <ol class="howto-steps">${p.steps.map(s=>`<li>${renderStepText(s)}</li>`).join("")}</ol>
      </div>`;
    }
    if(ok){
      html += `
      <div class="btn-row">
        <button class="btn btn-primary" id="nextBtn">${L("Next →","Siguiente →")}</button>
      </div>`;
    }else{
      html += `
      <div class="btn-row">
        <button class="btn btn-bad" id="nextBtn">${L("Continue →","Continuar →")}</button>
        <button class="btn btn-ghost" id="overrideBtn">${L("Actually, that's right ✔︎","En realidad, está bien ✔︎")}</button>
      </div>`;
    }
    html += `</div>`;
  }else if(session.revealed){
    const markedResult = session.results[session.pos];
    const flashCls = markedResult==="good" ? " box-flash-good" : markedResult==="bad" ? " box-flash-bad" : "";
    html += `<div class="reveal-enter">`;
    html += `<div class="answer-box${flashCls}"><span class="lbl">${L("Answer","Respuesta")}</span>${p.a}</div>`;
    if(p.steps && p.steps.length){
      html += `
      <div class="howto-box">
        <span class="lbl">📘 ${L("Step-by-step breakdown","Desglose paso a paso")}</span>
        <ol class="howto-steps">${p.steps.map(s=>`<li>${renderStepText(s)}</li>`).join("")}</ol>
      </div>`;
    }
    html += `
    <div class="btn-row">
      <button class="btn btn-good" id="gotIt">${L("✅ Got it right","✅ Lo hice bien")}</button>
      <button class="btn btn-bad" id="missedIt">${L("❌ Missed it","❌ Fallé")}</button>
    </div>`;
    html += `</div>`;
  }else if(usesBlanks){
    html += `<div class="blank-sheet">`;
    p.blanks.forEach((step, si)=>{
      const parts = step.template.split("{{}}");
      let row = `<div class="blank-row"><span class="blank-label">${step.label}</span> `;
      parts.forEach((part, pi)=>{
        row += renderStepText(part);
        if(pi < parts.length-1){
          const draftVal = (session.draftBlanks && session.draftBlanks[si+"-"+pi]) || "";
          const opts = step.options && step.options[pi];
          if(opts){
            row += `<select class="blankSelect" data-si="${si}" data-bi="${pi}">
              <option value=""${draftVal?"":" selected"}>${L("Choose…","Elige…")}</option>
              ${opts.map(o=>`<option value="${escapeHtml(o)}"${o===draftVal?" selected":""}>${escapeHtml(o)}</option>`).join("")}
            </select>`;
          }else{
            row += `<input type="text" class="blankInput" data-si="${si}" data-bi="${pi}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escapeHtml(draftVal)}">`;
          }
        }
      });
      row += `</div>`;
      html += row;
    });
    html += `</div>`;
    html += `
    <div class="symbol-row">${SYMBOLS.map(s=>`<button type="button" class="symBtn${s.label.includes(" ")?" symBtnWide":""}" data-sym="${s.insert}" title="${L(s.title,s.es)}">${escapeHtml(L(s.label,s.esLabel||s.label))}</button>`).join("")}</div>
    <div class="btn-row"><button class="btn btn-primary" id="checkBlanksBtn">${L("Check","Comprobar")}</button></div>
    <button class="btn-link" id="skipBtn">${L("I'd rather just reveal the answer","Prefiero ver la respuesta directamente")}</button>
    ${p.kind==="guided" ? `<button class="btn-link" id="skipGuidedBtn">${L("Skip guided practice → start the problems","Saltar la práctica guiada → empezar los problemas")}</button>` : ""}`;
  }else{
    if(p.kind==="guided" && p.steps && p.steps.length){
      html += `<div class="hint-box"><span class="lbl">💡 ${L("Hint","Pista")}</span>${renderStepText(p.steps[0])}</div>`;
    }
    if(session.retryFlash){
      const note = session.diagnosis ? session.diagnosis.message : L("Give it one more try!","¡Inténtalo una vez más!");
      html += `<div class="feedback feedback-bad">🤔 ${L("Not quite.","Casi.")} ${note}</div>`;
    }
    if(p.kind==="practice" && session.mode!=="placement") html += hintBoxHTML(p);
    html += `
    <div class="answer-input-row">
      <input type="text" id="answerInput" placeholder="${L("Type your answer here…","Escribe tu respuesta aquí…")}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escapeHtml(session.draftAnswer||"")}">
      <button class="btn btn-primary" id="checkBtn">${L("Check","Comprobar")}</button>
    </div>
    <div class="symbol-row">${SYMBOLS.map(s=>`<button type="button" class="symBtn${s.label.includes(" ")?" symBtnWide":""}" data-sym="${s.insert}" title="${L(s.title,s.es)}">${escapeHtml(L(s.label,s.esLabel||s.label))}</button>`).join("")}</div>
    ${p.kind==="practice" && session.mode!=="placement" ? hintButtonHTML(p) : ""}
    <button class="btn-link" id="skipBtn">${session.mode==="placement" ? L("I don't know this one","No sé esta") : L("I'd rather just reveal the answer","Prefiero ver la respuesta directamente")}</button>
    ${p.kind==="guided" ? `<button class="btn-link" id="skipGuidedBtn">${L("Skip guided practice → start the problems","Saltar la práctica guiada → empezar los problemas")}</button>` : ""}`;
  }
  html += `</div>`;

  // Key Terms / Worked Examples open as an inline panel right under the
  // problem card (not a separate screen) so the problem stays visible —
  // at most one of the two is open at a time (see openTermsPeek/openExamplesPeek).
  if(hasTerms && session.termsOpen){
    html += `
    <div class="card inline-ref reveal-enter">
      <div class="tag-row">
        <div class="tag" style="--cat:${catColor}">📘 ${L("Key Terms &amp; Formulas","Términos clave y fórmulas")}</div>
        <div class="tag-actions">
          <button class="play-btn" id="playTermsBtn" title="${L("Read these aloud","Léelos en voz alta")}">🔊</button>
          <button class="play-btn" id="closeTermsInlineBtn" title="${L("Close","Cerrar")}" aria-label="${L("Close","Cerrar")}">✕</button>
        </div>
      </div>
      <div class="terms-box">
        ${session.terms.map(t=>`
          <div class="term-row">
            <div class="term-name">${t.term}</div>
            <div class="term-def">${t.def}</div>
            ${t.example ? `<div class="term-ex">${L("Example","Ejemplo")}: ${t.example}</div>` : ""}
          </div>`).join("")}
      </div>
    </div>`;
  }
  if(hasExamples && session.peekOpen){
    const ex = session.examples[session.peekPos];
    const isFirst = session.peekPos === 0;
    const isLast = session.peekPos === session.examples.length-1;
    html += `
    <div class="card inline-ref reveal-enter">
      <div class="tag-row">
        <div class="tag" style="--cat:${catColor}">📖 ${L(`Worked Example ${session.peekPos+1} of ${session.examples.length}`,`Ejemplo resuelto ${session.peekPos+1} de ${session.examples.length}`)}</div>
        <div class="tag-actions">
          <button class="play-btn" id="playPeekBtn" title="${L("Read this example aloud","Lee este ejemplo en voz alta")}">🔊</button>
          <button class="play-btn" id="closeExamplesInlineBtn" title="${L("Close","Cerrar")}" aria-label="${L("Close","Cerrar")}">✕</button>
        </div>
      </div>
      <div class="example-card">
        <div class="ex-title">${ex.title}</div>
        ${ex.lines.map(l=>`<div class="ex-line">${renderStepText(l)}</div>`).join("")}
      </div>
      <div class="btn-row">
        ${!isFirst ? `<button class="btn btn-ghost" id="peekPrevBtn">${L("← Prev","← Anterior")}</button>` : ""}
        ${!isLast ? `<button class="btn btn-ghost" id="peekNextBtn">${L("Next →","Siguiente →")}</button>` : ""}
      </div>
    </div>`;
  }

  app.innerHTML = '<div class="view-enter">' + html + '</div>';
  document.getElementById("backBtn").addEventListener("click", backHome);
  if(hasExamples){
    document.getElementById("viewExamplesBtn").addEventListener("click", ()=>{
      if(session.peekOpen) closeExamplesPeek(); else openExamplesPeek();
    });
  }
  if(hasTerms){
    document.getElementById("viewTermsBtn").addEventListener("click", ()=>{
      if(session.termsOpen) closeTermsPeek(); else openTermsPeek();
    });
  }
  if(hasTerms && session.termsOpen){
    document.getElementById("closeTermsInlineBtn").addEventListener("click", closeTermsPeek);
    wireSpeakButton("playTermsBtn", ()=> speechFromHTML(session.terms.map(t=> t.term + ". " + t.def).join(". ")));
    document.querySelector(".inline-ref")?.scrollIntoView({behavior:"smooth", block:"nearest"});
  }
  if(hasExamples && session.peekOpen){
    const ex = session.examples[session.peekPos];
    document.getElementById("closeExamplesInlineBtn").addEventListener("click", closeExamplesPeek);
    wireSpeakButton("playPeekBtn", ()=> speechFromHTML(ex.title + ". " + ex.lines.join(". ")));
    const prevBtn = document.getElementById("peekPrevBtn");
    if(prevBtn) prevBtn.addEventListener("click", peekPrevExample);
    const nextBtn = document.getElementById("peekNextBtn");
    if(nextBtn) nextBtn.addEventListener("click", peekNextExample);
    document.querySelector(".inline-ref")?.scrollIntoView({behavior:"smooth", block:"nearest"});
  }
  if(session.revealed && session.autoResult){
    document.getElementById("nextBtn").addEventListener("click", ()=>mark(session.autoResult.matched));
    const ov = document.getElementById("overrideBtn");
    if(ov) ov.addEventListener("click", ()=>mark(true));
  }else if(session.revealed){
    document.getElementById("gotIt").addEventListener("click", ()=>mark(true));
    document.getElementById("missedIt").addEventListener("click", ()=>mark(false));
  }else if(usesBlanks){
    document.getElementById("checkBlanksBtn").addEventListener("click", submitBlanks);
    document.getElementById("skipBtn").addEventListener("click", skipToReveal);
    const skipGuidedBtn1 = document.getElementById("skipGuidedBtn");
    if(skipGuidedBtn1) skipGuidedBtn1.addEventListener("click", skipGuidedPractice);
    lastFocusedInput = null;
    const blankInputs = app.querySelectorAll(".blankInput");
    blankInputs.forEach(inp=>{
      inp.addEventListener("focus", ()=>{ lastFocusedInput = inp; });
      inp.addEventListener("input", ()=>{
        if(!session.draftBlanks) session.draftBlanks = {};
        session.draftBlanks[inp.dataset.si+"-"+inp.dataset.bi] = inp.value;
      });
      inp.addEventListener("keydown", e=>{ if(e.key==="Enter") submitBlanks(); });
    });
    app.querySelectorAll(".blankSelect").forEach(sel=>{
      sel.addEventListener("change", ()=>{
        if(!session.draftBlanks) session.draftBlanks = {};
        session.draftBlanks[sel.dataset.si+"-"+sel.dataset.bi] = sel.value;
      });
    });
    if(blankInputs[0]){ lastFocusedInput = blankInputs[0]; blankInputs[0].focus(); }
    app.querySelectorAll(".symBtn").forEach(btn=>{
      btn.addEventListener("click", ()=> insertSymbol(btn.dataset.sym));
    });
  }else{
    document.getElementById("checkBtn").addEventListener("click", submitTyped);
    const hintBtn = document.getElementById("hintBtn");
    if(hintBtn) hintBtn.addEventListener("click", showNextHint);
    document.getElementById("skipBtn").addEventListener("click", skipToReveal);
    const skipGuidedBtn2 = document.getElementById("skipGuidedBtn");
    if(skipGuidedBtn2) skipGuidedBtn2.addEventListener("click", skipGuidedPractice);
    const inp = document.getElementById("answerInput");
    inp.addEventListener("focus", ()=>{ lastFocusedInput = inp; });
    inp.addEventListener("input", ()=>{ session.draftAnswer = inp.value; });
    inp.addEventListener("keydown", e=>{ if(e.key==="Enter") submitTyped(); });
    lastFocusedInput = inp;
    inp.focus();
    app.querySelectorAll(".symBtn").forEach(btn=>{
      btn.addEventListener("click", ()=> insertSymbol(btn.dataset.sym));
    });
  }
  wireSpeakButton("playQBtn", ()=> speechFromHTML(p.q));
}
// Digits come first so the whole row can double as an on-screen keypad —
// every answer on this site can be typed with the mouse alone, keyboard
// numbers or not. "x" is included too since almost every answer needs the
// variable. The minus sign deliberately appears TWICE, as two differently
// labeled buttons that insert the exact same character (see the note on
// MINUS_SUBTRACT/MINUS_NEGATIVE below) — that's a labeling-only distinction
// for the student, not a parsing change, so it can't affect how answers are
// checked.
const DIGIT_SYMBOLS = ["0","1","2","3","4","5","6","7","8","9"].map(d=>(
  {label:d, insert:d, title:`Type ${d}`, es:`Escribe ${d}`}
));
const SYMBOLS = [
  ...DIGIT_SYMBOLS,
  {label:"x", insert:"x", title:"The letter x", es:"La letra x"},
  {label:"=", insert:"=", title:"Equals", es:"Igual"},
  {label:"+", insert:"+", title:"Plus", es:"Más"},
  {label:"− subtract", esLabel:"− restar", insert:"−", title:"Subtraction — goes BETWEEN two things, e.g. x² − 6 (x squared, then subtract 6)", es:"Resta — va ENTRE dos cosas, p. ej., x² − 6 (x al cuadrado, y luego resta 6)"},
  {label:"(−) negative", esLabel:"(−) negativo", insert:"-", title:"Negative sign — goes right in FRONT of one number, e.g. a negative exponent like x^-3, or a negative answer like x = -5", es:"Signo negativo — va justo ANTES de un número, p. ej., un exponente negativo como x^-3, o una respuesta negativa como x = -5"},
  {label:"×", insert:"×", title:"Times", es:"Por"},
  {label:"÷", insert:"÷", title:"Divide", es:"Dividido entre"},
  {label:"/", insert:"/", title:"Fraction bar — e.g. 1/x^3", es:"Barra de fracción — p. ej., 1/x^3"},
  {label:".", insert:".", title:"Decimal point — e.g. 0.5", es:"Punto decimal — p. ej., 0.5"},
  {label:"(", insert:"(", title:"Open parenthesis — e.g. (x+2)^2", es:"Abrir paréntesis — p. ej., (x+2)^2"},
  {label:")", insert:")", title:"Close parenthesis", es:"Cerrar paréntesis"},
  {label:"√", insert:"√", title:"Square root", es:"Raíz cuadrada"},
  {label:"^", insert:"^", title:"Exponent — e.g. x^2 for x squared. For a negative exponent use the (−) negative button right after the ^, e.g. x^-3. To subtract something AFTER an exponent, use the − subtract button instead, e.g. x^2-6", es:"Exponente — p. ej., x^2 para x al cuadrado. Para un exponente negativo usa el botón (−) negativo justo después del ^, p. ej., x^-3. Para restar algo DESPUÉS de un exponente, usa el botón − restar, p. ej., x^2-6"},
  {label:"±", insert:"±", title:"Plus or minus", es:"Más o menos"},
  {label:"<", insert:"<", title:"Less than", es:"Menor que"},
  {label:">", insert:">", title:"Greater than", es:"Mayor que"},
  {label:"≤", insert:"≤", title:"Less than or equal", es:"Menor o igual que"},
  {label:"≥", insert:"≥", title:"Greater than or equal", es:"Mayor o igual que"},
  {label:"≠", insert:"≠", title:"Not equal", es:"Distinto de"},
];

/* ===================== READ ALOUD (TEXT-TO-SPEECH) ===================== */
let scratchDiv = null;
function speechFromHTML(html){
  // Replace a ###GRAPH:...### marker with its caption (or a generic phrase) — it can't be read aloud as-is.
  let s = String(html).replace(/###GRAPH:[a-z]+;[^;#]*;?([^#]*)###/g, (m, caption) => {
    return caption && caption.trim() ? L(` the graph showing ${caption.trim()} `,` la gráfica que muestra ${caption.trim()} `) : L(" the graph shown "," la gráfica mostrada ");
  });
  // Strip any other visual markers that might sneak into spoken text.
  s = s.replace(/###DP:[^#]*###/g, " ").replace(/###BAL:[^#]*###/g, " ");
  // Replace stacked-fraction spans with "X over Y" before stripping tags.
  s = s.replace(/<span class=['"]frac['"]>\s*<span class=['"]frac-num['"]>([\s\S]*?)<\/span>\s*<span class=['"]frac-den['"]>([\s\S]*?)<\/span>\s*<\/span>/g,
    (m, num, den) => ` ${stripTags(num)} ${L("over","sobre")} ${stripTags(den)} `);
  // Strip any remaining tags and decode entities via a scratch element.
  if(!scratchDiv) scratchDiv = document.createElement("div");
  scratchDiv.innerHTML = s;
  const text = scratchDiv.textContent || scratchDiv.innerText || "";
  return normalizeMathForSpeech(text);
}
function stripTags(html){
  if(!scratchDiv) scratchDiv = document.createElement("div");
  scratchDiv.innerHTML = String(html);
  return scratchDiv.textContent || scratchDiv.innerText || "";
}
function normalizeMathForSpeech(text){
  let t = String(text);
  const es = getLang()==="es";
  // Superscripts (already-rendered unicode) and caret notation.
  const SUP_WORDS = es
    ? {"²":"al cuadrado","³":"al cubo","⁴":"a la cuarta potencia","⁵":"a la quinta potencia",
       "⁶":"a la sexta potencia","⁷":"a la séptima potencia","⁸":"a la octava potencia","⁹":"a la novena potencia"}
    : {"²":"squared","³":"cubed","⁴":"to the 4th power","⁵":"to the 5th power",
       "⁶":"to the 6th power","⁷":"to the 7th power","⁸":"to the 8th power","⁹":"to the 9th power"};
  t = t.replace(/[²³⁴⁵⁶⁷⁸⁹]/g, ch => " " + SUP_WORDS[ch] + " ");
  t = t.replace(/\^(\d+)/g, (m, n) => {
    if(n==="2") return L(" squared "," al cuadrado ");
    if(n==="3") return L(" cubed "," al cubo ");
    return L(` to the ${n}th power `,` a la potencia ${n} `);
  });
  t = t.replace(/\^(\w+)/g, L(" to the power of $1 "," a la potencia $1 "));
  // Roots.
  t = t.replace(/√/g, L(" the square root of "," la raíz cuadrada de "));
  // Absolute value bars |x|
  t = t.replace(/\|([^|]+)\|/g, L(" the absolute value of $1 "," el valor absoluto de $1 "));
  // Plus/minus.
  t = t.replace(/±/g, L(" plus or minus "," más o menos "));
  // Comparisons.
  t = t.replace(/≤/g, L(" is less than or equal to "," es menor o igual que "));
  t = t.replace(/≥/g, L(" is greater than or equal to "," es mayor o igual que "));
  t = t.replace(/≠/g, L(" is not equal to "," es distinto de "));
  t = t.replace(/</g, L(" is less than "," es menor que "));
  t = t.replace(/>/g, L(" is greater than "," es mayor que "));
  // Times/divide/minus variants.
  t = t.replace(/[×·]/g, L(" times "," por "));
  t = t.replace(/÷/g, L(" divided by "," entre "));
  t = t.replace(/[−–—]/g, L(" minus "," menos "));
  // Equals / arrow.
  t = t.replace(/→/g, L(" leads to "," da "));
  t = t.replace(/=/g, L(" equals "," es igual a "));
  // Money and percent.
  t = t.replace(/\$(\d[\d,.]*)/g, L("$1 dollars ","$1 dólares "));
  t = t.replace(/(\d)\s?%/g, L("$1 percent","$1 por ciento"));
  // Collapse whitespace.
  t = t.replace(/\s+/g, " ").trim();
  return t;
}
// Pick the best-sounding available voice instead of the OS default robotic one.
// Browsers/OSes expose varying voice lists; we rank by name patterns known to
// sound more natural (Google's cloud voices, Microsoft's "Online/Natural"
// voices, Apple's premium/enhanced voices) and fall back gracefully.
let cachedVoices = [];
let bestVoice = null;
function refreshVoices(){
  if(!window.speechSynthesis) return;
  cachedVoices = speechSynthesis.getVoices() || [];
  if(!cachedVoices.length){ bestVoice = null; return; }
  const wanted = getLang()==="es" ? /^es(-|_|$)/i : /^en(-|_|$)/i;
  const langVoices = cachedVoices.filter(v => wanted.test(v.lang));
  const pool = langVoices.length ? langVoices : cachedVoices;
  const rank = v => {
    const n = v.name.toLowerCase();
    let score = 0;
    if(/natural/.test(n)) score += 50;          // MS Edge "Online (Natural)" voices
    if(/online/.test(n)) score += 20;
    if(/neural/.test(n)) score += 40;
    if(/enhanced|premium/.test(n)) score += 35;  // Apple enhanced voices
    if(/google/.test(n)) score += 25;            // Chrome's Google voices (good quality)
    if(/samantha|ava|allison|nicky|zoe/.test(n)) score += 15; // pleasant Apple names
    if(/^microsoft (aria|jenny|guy)/.test(n)) score += 30;
    if(/female/.test(n)) score += 2;
    if(v.lang.toLowerCase()==="en-us") score += 5;
    if(getLang()==="es"){
      const vl = v.lang.toLowerCase().replace("_","-");
      if(vl==="es-do") score += 12;                               // Dominican Spanish, when the device has it
      else if(vl==="es-us" || vl==="es-419" || vl==="es-mx") score += 8; // closest Latin American voices
      if(/paulina|monica|sabina|jorge|diego|helena|laura/.test(n)) score += 4;
    }
    if(v.localService===false) score += 3; // cloud voices are often higher quality
    return score;
  };
  bestVoice = pool.slice().sort((a,b)=>rank(b)-rank(a))[0] || null;
}
if(window.speechSynthesis){
  refreshVoices();
  speechSynthesis.addEventListener && speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}

function wireSpeakButton(btnId, textFn){
  const btn = document.getElementById(btnId);
  if(!btn || !window.speechSynthesis) { if(btn) btn.style.display="none"; return; }
  btn.addEventListener("click", ()=>{
    if(speechSynthesis.speaking){
      speechSynthesis.cancel();
      btn.textContent = "🔊";
      return;
    }
    const text = textFn();
    if(!text) return;
    if(!cachedVoices.length) refreshVoices();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1.03;
    if(bestVoice) utter.voice = bestVoice;
    utter.lang = bestVoice ? bestVoice.lang : (getLang()==="es" ? "es-US" : "en-US");
    utter.onend = ()=>{ btn.textContent = "🔊"; };
    utter.onerror = ()=>{ btn.textContent = "🔊"; };
    btn.textContent = "⏸";
    speechSynthesis.speak(utter);
  });
}

function insertSymbol(sym){
  let inp = lastFocusedInput;
  if(!inp || !app.contains(inp)){
    inp = document.activeElement;
  }
  if(!inp || inp.tagName !== "INPUT" || !app.contains(inp)){
    inp = document.getElementById("answerInput") || app.querySelector(".blankInput");
  }
  if(!inp) return;
  const start = inp.selectionStart!=null ? inp.selectionStart : inp.value.length;
  const end = inp.selectionEnd!=null ? inp.selectionEnd : inp.value.length;
  inp.value = inp.value.slice(0,start) + sym + inp.value.slice(end);
  const pos = start + sym.length;
  inp.focus();
  inp.setSelectionRange(pos,pos);
}
function dpVisual(keep, moved, suffix){
  const chips = moved.map((d,i)=>`<span class="dp-digit">${d}<sup>${i+1}</sup></span>`).join("");
  return `<span class="dp-visual">${keep}${chips}${suffix||""}</span>`;
}
function balanceVisual(cols, rels, op, result, resultRels){
  resultRels = resultRels || rels;
  const n = cols.length;
  const colTemplate = Array(n*2-1).fill("auto").join(" ");
  function row(items, rs, extraClass){
    let out = "";
    for(let i=0;i<n;i++){
      out += `<span class="bal-cell ${extraClass||""}">${items[i]!==undefined?items[i]:""}</span>`;
      if(i<n-1) out += `<span class="bal-rel">${rs[i]!==undefined?rs[i]:""}</span>`;
    }
    return out;
  }
  return `<div class="bal-box" style="grid-template-columns:${colTemplate}">
    ${row(cols, rels)}
    ${row(op, rels.map(()=>""), "bal-op-cell")}
    <span class="bal-divider" style="grid-column:1/-1"></span>
    ${row(result, resultRels, "bal-result-cell")}
  </div>`;
}
/* ===================== GRAPH VISUAL (actual coordinate-plane rendering) ===================== */
const G_SIZE = 240, G_UNIT = 14, G_ORIGIN = 120, G_RANGE = 8;
let graphIdCounter = 0;
function gx(x){ return G_ORIGIN + x*G_UNIT; }
function gy(y){ return G_ORIGIN - y*G_UNIT; }
function graphGridSVG(clipId){
  let s = "";
  // light grid lines every 2 units
  for(let i=-G_RANGE;i<=G_RANGE;i+=2){
    if(i===0) continue;
    s += `<line x1="${gx(i)}" y1="${gy(-G_RANGE)}" x2="${gx(i)}" y2="${gy(G_RANGE)}" stroke="var(--border)" stroke-width="1"/>`;
    s += `<line x1="${gx(-G_RANGE)}" y1="${gy(i)}" x2="${gx(G_RANGE)}" y2="${gy(i)}" stroke="var(--border)" stroke-width="1"/>`;
  }
  // axes
  s += `<line x1="${gx(-G_RANGE)}" y1="${gy(0)}" x2="${gx(G_RANGE)}" y2="${gy(0)}" stroke="var(--fg-muted)" stroke-width="1.5"/>`;
  s += `<line x1="${gx(0)}" y1="${gy(-G_RANGE)}" x2="${gx(0)}" y2="${gy(G_RANGE)}" stroke="var(--fg-muted)" stroke-width="1.5"/>`;
  // a few tick labels
  [-5,5].forEach(v=>{
    s += `<text x="${gx(v)}" y="${gy(0)+12}" font-size="9" fill="var(--fg-muted)" text-anchor="middle">${v}</text>`;
    s += `<text x="${gx(0)-6}" y="${gy(v)+3}" font-size="9" fill="var(--fg-muted)" text-anchor="end">${v}</text>`;
  });
  s += `<text x="${gx(0)-6}" y="${gy(0)+12}" font-size="9" fill="var(--fg-muted)" text-anchor="end">0</text>`;
  return s;
}
function buildGraphSVG(innerSVG, caption){
  const id = "gclip" + (graphIdCounter++);
  const rectX = gx(-G_RANGE), rectY = gy(G_RANGE), rectW = G_RANGE*2*G_UNIT, rectH = G_RANGE*2*G_UNIT;
  const svg = `<svg viewBox="0 0 ${G_SIZE} ${G_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="${id}"><rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}"/></clipPath></defs>
    ${graphGridSVG(id)}
    <g clip-path="url(#${id})">${innerSVG}</g>
  </svg>`;
  return `<div class="graph-wrap">${svg}${caption ? `<span class="graph-cap">${caption}</span>` : ""}</div>`;
}
function graphVisual(type, paramsCsv, caption){
  const parts = paramsCsv.split(",").map(p=>p.trim());
  let inner = "";
  const lineColor = "var(--cat-graphing)";
  if(type==="line"){
    const m = parseFloat(parts[0]), b = parseFloat(parts[1]);
    const y1 = m*(-G_RANGE)+b, y2 = m*G_RANGE+b;
    inner += `<line x1="${gx(-G_RANGE)}" y1="${gy(y1)}" x2="${gx(G_RANGE)}" y2="${gy(y2)}" stroke="${lineColor}" stroke-width="2.5"/>`;
    inner += `<circle cx="${gx(0)}" cy="${gy(b)}" r="4" fill="${lineColor}"/>`;
  }else if(type==="parabola"){
    const a = parseFloat(parts[0]), h = parseFloat(parts[1]), k = parseFloat(parts[2]);
    let pts = "";
    for(let x=-G_RANGE; x<=G_RANGE; x+=0.25){
      const y = a*(x-h)*(x-h)+k;
      pts += `${gx(x)},${gy(y)} `;
    }
    inner += `<polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="2.5"/>`;
    inner += `<circle cx="${gx(h)}" cy="${gy(k)}" r="4" fill="var(--ex-red)"/>`;
  }else if(type==="points"){
    const [x1,y1,x2,y2] = parts.map(Number);
    inner += `<line x1="${gx(x1)}" y1="${gy(y1)}" x2="${gx(x2)}" y2="${gy(y2)}" stroke="var(--border)" stroke-width="2" stroke-dasharray="4 3"/>`;
    inner += `<circle cx="${gx(x1)}" cy="${gy(y1)}" r="4.5" fill="${lineColor}"/>`;
    inner += `<circle cx="${gx(x2)}" cy="${gy(y2)}" r="4.5" fill="${lineColor}"/>`;
  }else if(type==="inequality"){
    const m = parseFloat(parts[0]), b = parseFloat(parts[1]), dashed = parts[2]==="dashed", above = parts[3]==="above";
    const y1 = m*(-G_RANGE)+b, y2 = m*G_RANGE+b;
    const shadeY1 = above ? gy(G_RANGE) : gy(-G_RANGE);
    inner += `<polygon points="${gx(-G_RANGE)},${gy(y1)} ${gx(G_RANGE)},${gy(y2)} ${gx(G_RANGE)},${shadeY1} ${gx(-G_RANGE)},${shadeY1}" fill="${lineColor}" opacity="0.18"/>`;
    inner += `<line x1="${gx(-G_RANGE)}" y1="${gy(y1)}" x2="${gx(G_RANGE)}" y2="${gy(y2)}" stroke="${lineColor}" stroke-width="2.5" ${dashed ? 'stroke-dasharray="6 5"' : ""}/>`;
  }else if(type==="numberline"){
    const value = parseFloat(parts[0]), closed = parts[1]==="closed", dir = parts[2];
    const y = gy(0);
    // reuse the horizontal strip; draw ticks -10..10 scaled to fit range -8..8 visually (use G_RANGE directly, values expected within range)
    for(let i=-G_RANGE;i<=G_RANGE;i+=2){
      inner += `<line x1="${gx(i)}" y1="${y-5}" x2="${gx(i)}" y2="${y+5}" stroke="var(--fg-muted)" stroke-width="1"/>`;
    }
    if(dir==="left"){
      inner += `<line x1="${gx(value)}" y1="${y}" x2="${gx(-G_RANGE)}" y2="${y}" stroke="${lineColor}" stroke-width="3.5"/>`;
      inner += `<polygon points="${gx(-G_RANGE)},${y} ${gx(-G_RANGE)+8},${y-5} ${gx(-G_RANGE)+8},${y+5}" fill="${lineColor}"/>`;
    }else if(dir==="right"){
      inner += `<line x1="${gx(value)}" y1="${y}" x2="${gx(G_RANGE)}" y2="${y}" stroke="${lineColor}" stroke-width="3.5"/>`;
      inner += `<polygon points="${gx(G_RANGE)},${y} ${gx(G_RANGE)-8},${y-5} ${gx(G_RANGE)-8},${y+5}" fill="${lineColor}"/>`;
    }
    inner += `<circle cx="${gx(value)}" cy="${y}" r="6" fill="${closed ? lineColor : "var(--surface)"}" stroke="${lineColor}" stroke-width="2.5"/>`;
  }
  return buildGraphSVG(inner, caption);
}
function renderStepText(step){
  step = step.replace(/###DP:([^:]*):([^:]*):([^#]*)###/g, (m, keep, movedCsv, suffix) => {
    const moved = movedCsv ? movedCsv.split(",") : [];
    return dpVisual(keep, moved, suffix);
  });
  step = step.replace(/###BAL:([^#]*)###/g, (m, body) => {
    const groups = body.split(";").map(g => g.length ? g.split(",") : []);
    const [cols, rels, op, result, resultRels] = groups;
    return balanceVisual(cols, rels, op, result, resultRels && resultRels.length ? resultRels : null);
  });
  step = step.replace(/###GRAPH:([a-z]+);([^;#]*);?([^#]*)###/g, (m, type, paramsCsv, caption) => {
    return graphVisual(type, paramsCsv, caption || "");
  });
  return step;
}
function escapeHtml(s){
  return s.replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function nameGreeting(){
  const n = (state.name||"").trim();
  return n ? `, ${n}` : "";
}

function renderPlacementSummary(){
  const res = state.placement || {regions:{}, start:null};
  const recommended = res.start ? TOPICS.find(t=>t.id===res.start) : null;
  const rows = REGION_ORDER.map(cat=>{
    const r = res.regions[cat];
    if(!r) return "";
    const lv = PLACEMENT_LEVEL[r.level] || PLACEMENT_LEVEL.needs;
    return `<div class="pl-row lvl-${r.level}">
      <span class="pl-name"><span class="region-icon" style="--cat:${CAT[cat].color}">${CAT[cat].icon}</span>${L(CAT[cat].label,CAT[cat].es)}</span>
      <span class="pl-level">${lv.icon} ${L(lv.label,lv.es)} <span class="pl-score">${r.correct}/${r.total}</span></span></div>`;
  }).join("");
  app.innerHTML = `
  <div class="view-enter">
  <div class="topbar">
    <div class="brand">
      <div class="mark">${avatarIcon(state.avatar)}</div>
      <div><h1>Algebra Quest</h1><p>${L("Check-in complete","Chequeo completado")}</p></div>
    </div>
    ${statsBarHTML()}
  </div>
  <div class="summary placement-summary">
    <div style="font-size:46px">🧭</div>
    <div class="epic-sub">${L("Here's your map","Este es tu mapa")}</div>
    <div class="big">${recommended ? L(`Nice work${nameGreeting()}! A good place to start is <strong>${recommended.title}</strong>.`,`¡Buen trabajo${nameGreeting()}! Un buen lugar para empezar es <strong>${recommended.title}</strong>.`) : L(`Wow${nameGreeting()}, you're solid everywhere! Try a Boss Battle.`,`¡Wow${nameGreeting()}, dominas todo! Prueba una Batalla de jefe.`)}</div>
    <div class="pl-list">${rows}</div>
    <div class="btn-row">
      <button class="btn btn-ghost" id="homeBtn">${L("Back to map","Volver al mapa")}</button>
      ${recommended ? `<button class="btn btn-primary" id="startHereBtn">${L("Start","Empezar")}: ${recommended.title} →</button>` : ""}
    </div>
  </div>
  </div>`;
  document.getElementById("homeBtn").addEventListener("click", backHome);
  const sh = document.getElementById("startHereBtn");
  if(sh) sh.addEventListener("click", ()=>startTopic(recommended.id));
}
function renderSummary(){
  if(session.mode==="placement") return renderPlacementSummary();
  const total = session.problems.length;
  const correct = session.correctCount;
  const pct = Math.round((correct/total)*100);
  let sub, msg;
  if(pct===100){ sub = L("FLAWLESS RUN","PARTIDA PERFECTA"); msg = L(`Congratulations${nameGreeting()}! You just leveled up in Math Mastery!! 🎉`,`¡Felicidades${nameGreeting()}! ¡Acabas de subir de nivel en el dominio de las matemáticas! 🎉`); }
  else if(pct>=80){ sub = L("Great job","Excelente trabajo"); msg = L(`Way to go${nameGreeting()} — one step closer to Math Mastery!!`,`¡Así se hace${nameGreeting()} — un paso más cerca de dominar las matemáticas!`); }
  else if(pct>=50){ sub = L("Nice work","Buen trabajo"); msg = L(`Keep it up${nameGreeting()} — you're climbing toward Math Mastery!!`,`Sigue así${nameGreeting()} — vas subiendo hacia el dominio de las matemáticas!`); }
  else { sub = L("Good effort","Buen esfuerzo"); msg = L(`Every lap makes you stronger${nameGreeting()} — onward to Math Mastery!!`,`Cada vuelta te hace más fuerte${nameGreeting()} — ¡adelante hacia el dominio de las matemáticas!`); }

  const nextTopic = session.mode==="topic" ? TOPICS.find(t=>t.id===session.topicId+1) : null;

  app.innerHTML = `
  <div class="view-enter">
  <div class="topbar">
    <div class="brand">
      <div class="mark">${avatarIcon(state.avatar)}</div>
      <div><h1>Algebra Quest</h1><p>${L(`${session.title} complete`,`${session.title} completado`)}</p></div>
    </div>
    ${statsBarHTML()}
  </div>
  <div class="summary">
    <div style="font-size:46px">${pct===100 ? "🏆" : "✨"}</div>
    <div class="epic-sub">${sub}</div>
    <div class="big epic">${msg}</div>
    ${session.dailyBonus ? `<div class="daily-bonus">⭐ ${L("Daily Challenge bonus","Bono del Reto diario")}: +${session.dailyBonus} XP</div>` : ""}
    <div class="stats-row">
      <div><div class="n">${correct}/${total}</div><div class="l">${L("Correct","Correctas")}</div></div>
      <div><div class="n">+${session.xpEarned!==undefined ? session.xpEarned : correct*10+(total-correct)*2}</div><div class="l">${L("XP earned","XP ganado")}</div></div>
      <div><div class="n">${state.bestStreak}</div><div class="l">${L("Best streak","Mejor racha")}</div></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" id="homeBtn">${L("Back to map","Volver al mapa")}</button>
      ${nextTopic ? `<button class="btn btn-primary" id="nextBtn">${L("Next","Siguiente")}: ${nextTopic.title} →</button>` : ""}
    </div>
  </div>
  </div>`;
  document.getElementById("homeBtn").addEventListener("click", backHome);
  if(nextTopic){
    document.getElementById("nextBtn").addEventListener("click", ()=>startTopic(nextTopic.id));
  }
}

/* ===================== CONFETTI ===================== */
const canvas = document.getElementById("confettiCanvas");
const ctx = canvas.getContext("2d");
function resizeCanvas(){ canvas.width = innerWidth; canvas.height = innerHeight; }
resizeCanvas();
addEventListener("resize", resizeCanvas);
let particles = [];
// Read straight off the active theme's own palette so confetti always matches
// (and goes properly pink for Pink Stardust) without a separate color list to maintain.
function currentConfettiColors(){
  const cs = getComputedStyle(document.documentElement);
  const vars = ["--accent","--accent-2","--accent-3","--cat-equations","--cat-applications","--cat-expressions"];
  const colors = vars.map(v=>cs.getPropertyValue(v).trim()).filter(Boolean);
  return colors.length ? colors : ["#1f4e96","#c9821f","#6b3fa0","#1e8a4c","#c0392b","#0f8b8d"];
}
function burstConfetti(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cx = innerWidth/2;
  const confettiColors = currentConfettiColors();
  for(let i=0;i<70;i++){
    particles.push({
      x:cx + (Math.random()-0.5)*120, y: innerHeight*0.3,
      vx:(Math.random()-0.5)*9, vy:-Math.random()*9-3,
      g:0.28, size:5+Math.random()*4, color:confettiColors[i%confettiColors.length],
      rot:Math.random()*Math.PI, vrot:(Math.random()-0.5)*0.3, life:0,
    });
  }
  if(!rafRunning){ rafRunning = true; requestAnimationFrame(tick); }
}
let rafRunning = false;
function tick(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles.forEach(p=>{
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vrot; p.life++;
    ctx.save();
    ctx.translate(p.x,p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
    ctx.restore();
  });
  particles = particles.filter(p=>p.y < innerHeight+40 && p.life<240);
  if(particles.length>0){ requestAnimationFrame(tick); } else { rafRunning=false; ctx.clearRect(0,0,canvas.width,canvas.height); }
}


export function boot(){
  render();
}
