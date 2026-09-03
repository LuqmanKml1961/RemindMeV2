const CACHE_NAME = "remindme-shell-v3";
const ASSET_CACHE = "remindme-assets-v2";
const OFFLINE_URL = "/offline";

// Pre-cached on install. Crucially these are served cache-first from the SW on every navigation
// so the app shell is available instantly offline. Next.js's hashed JS/CSS chunks under
// /_next/static/ are NOT enumerated here because their filenames change every build — they're
// runtime-cached on first visit (see the fetch handler), which is enough for full offline once
// the user has opened the app online at least once.
const APP_SHELL = ["/", "/manifest.webmanifest", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      // Skip the waiting phase and take control of already-open pages immediately, so the newest
      // push handler/badge/cache list is live without requiring a second page load.
      .then(() => self.skipWaiting())
  );
});

// Respond to SKIP_WAITING messages from PwaRegister so new deploys take over promptly.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  // A client telling us it's freshly loaded with a given URL — used to warm the cache with the
  // current route's hashed chunks so offline works after the very first visit. No-op by default;
  // kept as an extension point.
  if (event.data && event.data.type === "CACHE_URL" && event.data.url) {
    event.waitUntil(precacheUrl(event.data.url));
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== ASSET_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

async function precacheUrl(url) {
  try {
    const res = await fetch(url, { cache: "reload" });
    if (res.ok) {
      const clone = res.clone();
      const cache = await caches.open(ASSET_CACHE);
      await cache.put(url, clone);
    }
  } catch {
    // ignore — offline during a warm; the next online visit will cache it.
  }
}

// Caching strategy:
// - Navigation requests: network-first, fall back to the cached shell, then the offline page.
// - /_next/static/ & /icons/ (content-hashed / long-lived): cache-first, with a background
//   re-fetch to refresh the copy (stale-while-revalidate).
// - Everything else (e.g. API calls): network-first, fall back to cache; never cache POSTs.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests from our scope.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never intercept the service worker itself or push API calls — they must hit the network.
  if (url.pathname === "/sw.js" || url.pathname.startsWith("/api/")) return;

  // Navigations: prefer the network for fresh HTML, serve cached shell/offline as fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigations so the route shell is available offline later.
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match(OFFLINE_URL);
          })
        )
    );
    return;
  }

  // Content-hashed build assets: serve from cache instantly, refresh in the background.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Everything else: network-first with cache fallback (e.g. manifest, other GETs).
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// --- Push notifications (the core reason this SW exists) ---

// This fires even if the browser/PWA was fully killed — the OS push service wakes just this
// service worker to show the notification.
self.addEventListener("push", (event) => {
  let data = { title: "RemindMe", body: "Your reminder is due", reminderId: null };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  // requireInteraction is only supported in Chromium browsers — using it on iOS/Safari/Firefox
  // silently breaks the notification or has no effect.
  const isChromium = /chrome|chromium|edg/i.test(self.navigator.userAgent);

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-badge.png",
      tag: data.reminderId ? `reminder-${data.reminderId}` : undefined,
      data: { reminderId: data.reminderId },
      requireInteraction: isChromium,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const reminderId = event.notification.data?.reminderId;
  const targetUrl = reminderId ? `/?reminder=${reminderId}` : "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            if (
              "navigate" in client &&
              client.url &&
              client.url.split("#")[0].split("?")[0] === new URL(targetUrl, self.location.origin).pathname
            ) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // Note: iOS Safari historically rejects openWindow from a notification-click, throwing a
        // TypeError — guard so the promise rejects gracefully.
        return self.clients.openWindow(targetUrl).catch(() => undefined);
      })
  );
});
