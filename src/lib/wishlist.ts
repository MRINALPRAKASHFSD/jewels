// Frontend wishlist. Storage adapter is swappable (e.g. per-user backend table later).
import { useSyncExternalStore } from "react";

const KEY = "elan:wishlist";
type Adapter = { load: () => string[]; save: (ids: string[]) => void };

const localAdapter: Adapter = {
  load: () => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
  },
  save: (ids) => localStorage.setItem(KEY, JSON.stringify(ids)),
};

let adapter = localAdapter;
let ids: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY: string[] = [];

function ensure() {
  if (!loaded && typeof window !== "undefined") { ids = adapter.load(); loaded = true; }
}
function emit() { listeners.forEach((l) => l()); }

export const wishlist = {
  setAdapter(a: Adapter) { adapter = a; loaded = false; ensure(); emit(); },
  toggle(id: string) {
    ensure();
    ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    adapter.save(ids); emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) { loaded = false; ensure(); emit(); } };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
  },
  snapshot() { ensure(); return ids; },
};

export function useWishlist() {
  const list = useSyncExternalStore(wishlist.subscribe, wishlist.snapshot, () => EMPTY);
  return { ids: list, has: (id: string) => list.includes(id), toggle: wishlist.toggle, count: list.length };
}
