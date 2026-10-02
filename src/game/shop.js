// Cosmetics shop: premium themes, characters and avatar frames bought with XP. Pure logic, no DOM.
//
// Levels come from lifetime XP (state.xp), which spending never reduces. What a learner can spend is
// lifetime XP minus the price of everything they own, so there is no separate "spent" number to get out
// of step between devices: the owned lists simply merge by union.

export const SHOP_ITEMS = [
  // Premium themes (appear in the theme picker once owned)
  { id: "glam", kind: "theme", icon: "💖", label: "Glam Paradise", es: "Paraíso Glam", price: 800 },
  { id: "tide", kind: "theme", icon: "🧜", label: "Mermaid Tide", es: "Marea de Sirena",  price: 800 },
  { id: "holo", kind: "theme", icon: "💿", label: "Holo Pop", es: "Holo Pop",      price: 900 },
  // Characters (shown in the avatar picker once owned)
  { id: "rocket",    kind: "avatar", icon: "🚀",   label: "Rocket", es: "Cohete",     price: 150 },
  { id: "trex",      kind: "avatar", icon: "🦖",   label: "T-Rex", es: "T-Rex",      price: 150 },
  { id: "shark",     kind: "avatar", icon: "🦈",   label: "Shark", es: "Tiburón",      price: 200 },
  { id: "wolf",      kind: "avatar", icon: "🐺",   label: "Wolf", es: "Lobo",       price: 200 },
  { id: "eagle",     kind: "avatar", icon: "🦅",   label: "Eagle", es: "Águila",      price: 250 },
  { id: "tiger",     kind: "avatar", icon: "🐯",   label: "Tiger", es: "Tigre",      price: 250 },
  { id: "astronaut", kind: "avatar", icon: "🧑‍🚀", label: "Astronaut", es: "Astronauta",  price: 350 },
  { id: "hero",      kind: "avatar", icon: "🦸",   label: "Hero", es: "Héroe",       price: 350 },
  { id: "genie",     kind: "avatar", icon: "🧞",   label: "Genie", es: "Genio",      price: 450 },
  { id: "mermaid",   kind: "avatar", icon: "🧜",   label: "Mermaid", es: "Sirena",    price: 450 },
  // Frames (a ring around the character badge)
  { id: "gold",      kind: "frame",  icon: "🟡",   label: "Gold Ring", es: "Aro Dorado",     price: 250 },
  { id: "flame",     kind: "frame",  icon: "🔥",   label: "Flame Ring", es: "Aro de Fuego",    price: 350 },
  { id: "rainbow",   kind: "frame",  icon: "🌈",   label: "Rainbow Ring", es: "Aro Arcoíris",  price: 450 },
  { id: "galaxy",    kind: "frame",  icon: "🌌",   label: "Galaxy Ring", es: "Aro Galáctico",   price: 600 },
];

export const itemById = (id) => SHOP_ITEMS.find((i) => i.id === id) || null;
const ownedList = (owned) => (Array.isArray(owned) ? owned : []).filter((id) => itemById(id));

// Total price of what is owned (unknown ids are ignored, e.g. from a newer version).
export function spentOn(owned) {
  return ownedList(owned).reduce((sum, id) => sum + itemById(id).price, 0);
}

// XP available to spend; never negative.
export function balance(xp, owned) {
  return Math.max(0, (Number.isFinite(xp) ? xp : 0) - spentOn(owned));
}

export const isOwned = (owned, id) => ownedList(owned).includes(id);

// Result of trying to buy: {ok:true, owned:[...]} or {ok:false, reason}.
export function buy(xp, owned, id) {
  const item = itemById(id);
  if (!item) return { ok: false, reason: "unknown" };
  if (isOwned(owned, id)) return { ok: false, reason: "owned" };
  if (balance(xp, owned) < item.price) return { ok: false, reason: "poor", short: item.price - balance(xp, owned) };
  return { ok: true, owned: [...ownedList(owned), id] };
}

// May this avatar / frame / theme be used? Free avatars and themes always can; premium ones must be owned.
export function canUse(owned, kind, id, freeIds = []) {
  if (kind === "frame") return id === "" || isOwned(owned, id);
  const item = itemById(id);
  return !item ? freeIds.includes(id) : isOwned(owned, id);
}

export function mergeOwned(a, b) {
  return [...new Set([...ownedList(a), ...ownedList(b)])];
}
