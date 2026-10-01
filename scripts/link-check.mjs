// Recorre el sitio como un buscador y verifica que ningún enlace interno ni imagen dé error.
//
//   npm run links:check                          # contra http://localhost:3100 (npm run build && npx next start -p 3100)
//   npm run links:check -- https://tu-sitio.com  # contra el sitio publicado
//
// Parte de la portada, sigue los enlaces internos (sin entrar al panel ni a pedidos) y comprueba cada
// dirección encontrada. Sale con error si alguna no responde 200 (o redirige a una que no responde 200).
const base = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const SKIP = [/^\/admin/, /^\/api\//, /^\/pedido\//, /^\/_next\//];

const seen = new Map(); // ruta -> estado
const queue = ["/"];
const referrers = new Map();
const assets = new Map();

const abs = (path) => `${base}${path}`;

function normalize(href, from) {
  if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  let url;
  try {
    url = new URL(href, abs(from));
  } catch {
    return null;
  }
  if (url.origin !== new URL(base).origin) return null; // enlaces externos: no se rastrean
  return url.pathname.replace(/\/$/, "") || "/";
}

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  const res = await fetch(abs(path), { redirect: "manual" }).catch((e) => ({ status: 0, error: e.message }));
  seen.set(path, res.status);
  if (res.status >= 300 && res.status < 400) {
    const to = normalize(res.headers.get("location"), path);
    if (to && !seen.has(to)) queue.push(to);
    continue;
  }
  if (res.status !== 200) continue;
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) continue;

  const html = await res.text();
  for (const m of html.matchAll(/<a\b[^>]*?\shref="([^"]+)"/g)) {
    const to = normalize(m[1].replace(/&amp;/g, "&"), path);
    if (!to || SKIP.some((r) => r.test(to))) continue;
    if (!referrers.has(to)) referrers.set(to, path);
    if (!seen.has(to)) queue.push(to);
  }
  for (const m of html.matchAll(/<(?:img|source)\b[^>]*?\s(?:src|srcset)="([^"]+)"/g)) {
    const first = m[1].split(",")[0].trim().split(" ")[0].replace(/&amp;/g, "&");
    if (/^\/_next\/image/.test(first) || /^\/(?!_next)/.test(first)) assets.set(first, path);
  }
}

// Imágenes (las optimizadas de Next y las de /public): una sola comprobación por dirección.
const assetStatus = new Map();
for (const [src, from] of assets) {
  const res = await fetch(abs(src)).catch(() => ({ status: 0 }));
  assetStatus.set(src, { status: res.status, from });
}

let bad = 0;
console.log(`\nRastreo de ${base}\n`);
for (const [path, status] of [...seen].sort()) {
  const ok = status === 200 || (status >= 300 && status < 400);
  if (!ok) bad++;
  console.log(`  ${ok ? "✓" : "✗ FALLA"} ${String(status).padEnd(3)} ${path}${ok ? "" : `   (enlazada desde ${referrers.get(path) ?? "?"})`}`);
}
const badAssets = [...assetStatus].filter(([, v]) => v.status !== 200);
console.log(`\n  Imágenes revisadas: ${assetStatus.size} · con error: ${badAssets.length}`);
for (const [src, v] of badAssets) console.log(`  ✗ FALLA ${v.status} ${src}   (en ${v.from})`);
bad += badAssets.length;

console.log(`\nResultado: ${seen.size} páginas · ${bad} problemas\n`);
process.exitCode = bad ? 1 : 0;
