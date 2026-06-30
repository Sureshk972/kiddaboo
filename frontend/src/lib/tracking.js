import { supabase } from "./supabase";

const STORAGE_KEY = "kiddaboo.tracking.sessionId";
const FLUSH_INTERVAL_MS = 5000;
const FLUSH_THRESHOLD = 50;

let buffer = [];

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId() {
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function pushEvent(event) {
  buffer.push(event);
  if (buffer.length >= FLUSH_THRESHOLD) {
    flush();
  }
}

export function drainBuffer() {
  const out = buffer;
  buffer = [];
  return out;
}

export async function flush() {
  if (buffer.length === 0) return;
  const batch = drainBuffer();
  const { error } = await supabase.from("events").insert(batch);
  if (error) {
    console.warn("[tracking] flush failed:", error);
  }
}

export function initTracking() {
  const interval = setInterval(flush, FLUSH_INTERVAL_MS);
  const onUnload = () => {
    flush();
  };
  window.addEventListener("pagehide", onUnload);
  window.addEventListener("beforeunload", onUnload);
  return function teardown() {
    clearInterval(interval);
    window.removeEventListener("pagehide", onUnload);
    window.removeEventListener("beforeunload", onUnload);
  };
}

// Test-only: clear in-memory buffer between tests.
export function resetForTest() {
  buffer = [];
}
