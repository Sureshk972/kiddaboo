// Kiddaboo Service Worker — Push Notifications + runtime caching

// Bump VERSION to invalidate all caches on the next activation.
const VERSION = "v1";
const SHELL_CACHE = `kiddaboo-shell-${VERSION}`;
const FONT_CACHE = `kiddaboo-fonts-${VERSION}`;
const KNOWN_CACHES = new Set([SHELL_CACHE, FONT_CACHE]);

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
//   - Same-origin GETs (app shell — HTML, hashed JS/CSS, icons): SWR
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
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

  // Same-origin app shell.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
