# Maitena Joyas

E-commerce de joyería de plata para Uruguay.

```
GitHub → Vercel (Next.js + TypeScript) → Supabase (Postgres · Auth · Storage)

Compra: Checkout → Backend → Mercado Pago → Webhook → Backend → Supabase
        → pedido pagado + stock + emails
```

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase · Mercado Pago (Checkout Pro) · Resend.

## Estado del proyecto

| Paso | Contenido | Estado |
| --- | --- | --- |
| 0 | Proyecto, GitHub, `.env.example`, README | ✅ |
| 1 | Sistema de diseño, header, footer, home y categorías | ✅ |
| 2 | Catálogo y página de producto | ✅ |
| 3 | Carrito (persistente, con panel lateral y página `/carrito`) | ✅ |
| 4 | Esquema Supabase, RLS, stock | ⏳ |
| 5 | Checkout Uruguay + Mercado Pago + webhook | ⏳ |
| 6 | Emails (cliente, admin, tracking) | ⏳ |
| 7 | Panel `/admin` | ⏳ |
| 8 | Legales (términos, privacidad, cambios, envíos) | ⏳ |
| 9 | SEO, accesibilidad, QA y deploy | ⏳ |

## Requisitos

- Node.js 20 o superior
- npm

## Correr en local

```bash
npm install
cp .env.example .env.local   # completar valores (por ahora ninguno es necesario para ver la home)
npm run dev
```

Abrir <http://localhost:3000>.

## Variables de entorno

Están documentadas en [`.env.example`](.env.example). **Nunca** subas `.env.local` a GitHub.
Las claves secretas (`SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `RESEND_API_KEY`)
solo se usan en el servidor y no llevan prefijo `NEXT_PUBLIC_`.

## Productos demo

Mientras no está conectada la base de datos, la tienda muestra 12 productos de demostración
(`src/data/demo-products.ts`, con fotos de ejemplo en `public/demo/`), marcados como **Demo** y sin indexar
en buscadores. En el paso 4 pasan a ser filas de Supabase y se eliminan desde `/admin`, sin tocar código.

Toda la lectura de productos pasa por `src/lib/products.ts`: al conectar Supabase solo cambia el cuerpo de
esas funciones.

## Datos de la marca pendientes

`src/config/site.ts` tiene los datos de contacto (email, WhatsApp, Instagram, dirección) en `null`.
Mientras estén vacíos no se muestran en el sitio. Completarlos cuando se tengan.

Fotografías de categorías: `src/lib/categories.ts` (campo `image`). Mientras sea `null` se muestra un placeholder.

## Deploy (se completa en el paso 9)

1. Subir el repo a GitHub (rama `main` = producción).
2. En Vercel: *Add New → Project* → importar el repo.
3. Cargar las variables de `.env.example` en *Settings → Environment Variables*.
4. Cada push a `main` despliega a producción; cada rama/PR genera un preview.
