// Kiddaboo Service Worker — Push Notifications + runtime caching

// Bump VERSION to invalidate all caches on the next activation.
const VERSION = "v2";
const ASSET_CACHE = `kiddaboo-assets-${VERSION}`;
const FONT_CACHE = `kiddaboo-fonts-${VERSION}`;
const KNOWN_CACHES = new Set([ASSET_CACHE, FONT_CACHE]);

// Handle incoming push messages
self.addEventListener("push", (event) => {
  let data = { title: "Kiddaboo", body: "You have a new notification" };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // If parsing fails, use the text as the body
    data.body = event.data?.text() || data.body;
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/browse",
      type: data.type || "general",
    },
    actions: data.actions || [],
    tag: data.tag || "kiddaboo-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click — navigate to the right page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/browse";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If an existing window is open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Service worker install — activate immediately
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Service worker activate — drop stale caches, claim existing clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("kiddaboo-") && !KNOWN_CACHES.has(k)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Runtime caching. Strategy by origin/asset:
//   - Supabase / Stripe / same-origin /api: never cached (live user data)
//   - Google + cdnfonts font files: cache-first (immutable, long-lived)
//   - Same-origin /assets/* (hashed JS/CSS chunks): cache-first — the
//     hash is the cache buster, so once cached they never need refetching
//   - Same-origin HTML navigations: network-first — guarantees the
//     bundle references in the HTML match the assets actually on the
//     server right now. After a deploy, cached HTML pointing at old
//     hashes would 404 against the new build; this avoids that.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline and not cached");
  }
}

function isNavigation(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Live data — let it hit the network.
  if (url.hostname.endsWith("supabase.co")) return;
  if (url.hostname.endsWith("stripe.com")) return;
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  // Fonts.
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "fonts.cdnfonts.com"
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Hashed immutable assets — cache forever.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // HTML (navigation) — network-first so the bundle references are fresh.
  if (isNavigation(request)) {
    event.respondWith(networkFirst(request, ASSET_CACHE));
  }
});
