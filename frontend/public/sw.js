// Kiddaboo Service Worker — Push Notifications

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

// Service worker activate — claim existing clients
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
