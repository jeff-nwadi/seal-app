/* Seal service worker.
 *
 * Hand-rolled (not `next-pwa`) because:
 *   - Next 16 App Router + Turbopack + `next-pwa` is unmaintained and
 *     brittle.
 *   - The app's needs are simple: pre-cache the shell, network-first
 *     for HTML/API, cache-first for hashed static assets, offline
 *     fallback for navigation requests.
 *
 * Versioned via the cache name. Bump `CACHE_VERSION` whenever the
 * shell changes so the install handler drops the old cache.
 *
 * Lifecycle:
 *   install    → pre-cache the shell
 *   activate   → drop the old cache
 *   fetch      → route by request type (see `onFetch`)
 *
 * Scope: this file is served from `/sw.js` (the Next.js public/ dir
 * exposes it as a static asset at the site root), so its scope is
 * the entire origin. Anything we don't want cached here is matched
 * by `onFetch` and passes through.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `seal-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `seal-runtime-${CACHE_VERSION}`;
const SHELL = ["/", "/sign-in", "/sign-up", "/offline", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Pre-cache the shell. We use { cache: "reload" } to bypass any
      // HTTP cache and ensure the shell is current. Each add is
      // try/catch'd — a single failure (e.g. /offline doesn't exist
      // yet at install time) shouldn't fail the whole install.
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch (err) {
            console.warn("[sw] failed to pre-cache", url, err);
          }
        }),
      );
      // Activate the new SW immediately on first install so the user
      // gets the new shell without a refresh.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      // Take control of all open clients so the new SW intercepts
      // fetches immediately (otherwise the old SW keeps serving until
      // the next navigation).
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle GETs. POST/PUT/etc always go to the network.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Same-origin only. Cross-origin (e.g. UploadThing CDN, image hosts)
  // is handled by the browser's HTTP cache; we don't double-cache it.
  if (url.origin !== self.location.origin) return;

  // Route by request type.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (isApi(url)) {
    // The capsule API uses a session cookie; caching it would risk
    // serving one user's response to another. Always go to the network.
    event.respondWith(fetch(request));
    return;
  }
  // Everything else: try network, fall back to runtime cache, then
  // bail. (Images, fonts, etc.)
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

async function handleNavigation(request) {
  // Network-first so the user always sees the latest HTML when online.
  try {
    const fresh = await fetch(request);
    // Only cache successful HTML responses. Errors and redirects pass
    // through to the browser untouched.
    if (fresh && fresh.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (_) {
    // Offline. Fall back to the pre-cached shell, then a dedicated
    // /offline page if the shell isn't there.
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline");
    if (offline) return offline;
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Stale-while-revalidate: serve from cache, refresh in the
    // background. Drops the network cost on repeat visits.
    fetch(request)
      .then((res) => {
        if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    return new Response("Asset unavailable offline", { status: 504 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (_) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("Unavailable", { status: 504 });
  }
}

// ---------------------------------------------------------------------------
// Routing helpers
// ---------------------------------------------------------------------------

function isStaticAsset(url) {
  // Hashed Next chunks live under /_next/static/ — content-hashed so
  // they're safe to cache forever.
  if (url.pathname.startsWith("/_next/static/")) return true;
  // Anything in /images/, /icons/, etc.
  if (url.pathname.startsWith("/images/")) return true;
  if (url.pathname.startsWith("/icon-")) return true;
  if (url.pathname === "/favicon-32.png" || url.pathname === "/favicon.ico")
    return true;
  // Fonts.
  if (url.pathname.startsWith("/fonts/")) return true;
  return false;
}

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

// ---------------------------------------------------------------------------
// Update flow — when a new SW is waiting, prompt the user (or auto-skip).
// The page-side `RegisterSW` component listens for `controllerchange`
// and posts a toast.
// ---------------------------------------------------------------------------

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
