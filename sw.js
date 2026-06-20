/* 대전 한 바퀴 — 서비스워커
   - 같은 출처(local) 파일만 캐시. 카카오 지도 SDK·지도 타일 등 외부 요청은 건드리지 않음.
   - HTML(내비게이션)은 네트워크 우선 → 온라인이면 항상 최신, 오프라인이면 캐시.
   - 그 외 같은 출처 자원은 캐시 우선.
   ※ 배포본을 갱신했는데 옛 화면이 보이면 아래 버전을 v2, v3...으로 올리세요. */
const CACHE = "daejeon-pwa-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  // 외부 출처(카카오 SDK, 지도 타일, 폰트 등)는 가로채지 않음 — 항상 네트워크
  if (url.origin !== self.location.origin) return;

  // HTML 문서: 네트워크 우선
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // 그 외 같은 출처 자원: 캐시 우선, 없으면 네트워크 후 캐시에 저장
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      });
    })
  );
});
