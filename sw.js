// 助っ人レーダー service worker: works offline, picks up new data on the next visit.
const CACHE = "raiyoho-20261103g";
const CORE = ["./", "./index.html", "./detail.2d817845b9.json", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // the page itself: network first so new data shows up, cached copy when offline
  const base = new URL("./", self.location).pathname;
  if (req.mode === "navigate" && url.pathname !== base && url.pathname !== base + "index.html") return;  // e.g. the /beta/ sub-site
  if (url.origin === location.origin && !url.pathname.startsWith(base)) return;
  if (url.origin === location.origin && url.pathname.slice(base.length).indexOf("/") >= 0 && !url.pathname.startsWith(base + "icons/")) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req, { cache: "no-store" }).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  // own files and web fonts: cache first, refresh in the background
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
