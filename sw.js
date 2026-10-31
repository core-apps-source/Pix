const CACHE = "pix-v3";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./static/style.css",
  "./static/script.js",
  "./static/pessoas.js",
  "./static/icons/icon-192.png",
  "./static/icons/icon-512.png",
  "./static/icons/icon-maskable-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;

  evento.respondWith(
    caches.match(pedido).then((cacheHit) => {
      const buscaRede = fetch(pedido)
        .then((resposta) => {
          if (resposta && resposta.ok && resposta.type !== "opaque") {
            const clone = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(pedido, clone));
          }
          return resposta;
        })
        .catch(() => cacheHit || caches.match("./index.html"));
      return cacheHit || buscaRede;
    })
  );
});
