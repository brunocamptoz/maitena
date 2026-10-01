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
| 4 | Esquema Supabase, RLS, stock | ✅ |
| 5 | Checkout Uruguay + Mercado Pago + webhook | ✅ código y pruebas · ⏳ falta probar con credenciales reales |
| 6 | Emails (cliente, admin, tracking) | ✅ código y pruebas · ⏳ falta configurar Resend |
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

La base viene con 12 productos de demostración (`supabase/seed.sql`, fotos de ejemplo en `public/demo/`),
marcados como **Demo** y sin indexar en buscadores. Se eliminan desde `/admin` sin tocar código.

## Base de datos

Todo lo de Supabase (tablas, seguridad, stock, cómo aplicar la migración y cómo verificarla con
`npm run db:check`) está explicado en [`supabase/README.md`](supabase/README.md).

## Mercado Pago (Checkout Pro)

**Cómo funciona una compra** (nunca se confía en el navegador para saber si se pagó):

```
/checkout → createCheckout (servidor) → create_order (SQL: precios de la base + reserva de stock)
         → preferencia de Mercado Pago (monto = el del pedido, vence con la reserva) → el comprador paga en Mercado Pago
         → Mercado Pago avisa a /api/webhooks/mercadopago (firma verificada)
         → el servidor consulta el pago REAL a la API de Mercado Pago → apply_payment (SQL, idempotente)
         → pedido pagado + stock descontado
/pedido/[token]  ← el comprador vuelve acá; la página lee el estado de la base (y, si el aviso se demora,
                   consulta el pago a Mercado Pago como red de seguridad)
```

**Qué tenés que configurar** (una sola vez):

1. En [Tus integraciones](https://www.mercadopago.com.uy/developers/panel/app) creá una aplicación con el producto
   **Checkout Pro**.
2. Copiá el **Access Token de prueba** (Credenciales de prueba) a `MERCADOPAGO_ACCESS_TOKEN` en `.env.local`.
3. El aviso de pagos necesita una dirección pública: conectá el repo a Vercel y cargá allí las variables de
   `.env.example` (incluida `NEXT_PUBLIC_SITE_URL` con el dominio real). Con `localhost` Mercado Pago no puede
   avisar ni devolver al comprador (el checkout igual funciona, pero el pedido no se confirma solo).
4. En *Tus integraciones → tu aplicación → Webhooks → Configurar notificaciones*: URL
   `https://TU-DOMINIO/api/webhooks/mercadopago`, evento **Pagos**. Guardá y copiá la **Clave secreta** a
   `MERCADOPAGO_WEBHOOK_SECRET` (en Vercel). El panel tiene pestañas **Modo de prueba** y **Modo productivo**, cada una con
   su URL y su clave: cargá la misma URL en ambas y poné las dos claves separadas por coma (`clavePrueba,claveProduccion`).
5. Probá con [compras de prueba](https://www.mercadopago.com.uy/developers/es/docs/checkout-pro/integration-test/test-purchases)
   (cuenta de prueba de comprador + tarjetas de prueba).
6. Para vender de verdad: cambiá a las credenciales de **producción** (Access Token y Clave secreta) y hacé una
   compra real de monto bajo para comprobar todo el circuito.

Reglas de pago en [`src/config/payments.ts`](src/config/payments.ts): modo binario (solo aprobado/rechazado), sin
pagos en efectivo (Abitab/RedPagos) y máximo de pedidos sin pagar por email.

**Costos de envío:** mientras no estén cargados el checkout no cobra (así no se regala el envío por olvido).
Se cargan desde `/admin` (paso 7); hasta entonces, ver [`supabase/README.md`](supabase/README.md).

## Emails (Resend)

Cuando un pedido queda **pagado** salen dos correos, cada uno una sola vez (aunque Mercado Pago repita el aviso):
confirmación al comprador y "Nueva venta" al administrador. El de **envío con seguimiento** al comprador queda listo
para usarse desde `/admin` (paso 7). Las plantillas están en `src/lib/email/templates.ts`; en desarrollo se ven en
`/api/dev/emails/confirmacion`, `/venta` y `/envio`.

**Configurar (una sola vez):**

1. Creá una cuenta gratuita en [resend.com](https://resend.com) y generá una **API Key**.
2. Cargá en `.env.local` **y en Vercel**: `RESEND_API_KEY`, `EMAIL_FROM` y `ADMIN_NOTIFICATION_EMAIL`
   (ver `.env.example`). Después, Redeploy.

**Sin dominio propio** (situación actual): Resend solo permite enviar desde `onboarding@resend.dev` y **únicamente a
tu propio email de cuenta**. Para probar, poné ese mismo email en `ADMIN_NOTIFICATION_EMAIL` y en `EMAIL_REDIRECT_TO`
(así recibís también el correo del comprador, marcado como prueba).

**Antes de vender de verdad hace falta un dominio** (ej. `maitenajoyas.com.uy`):

1. En Resend → *Domains* → agregá el dominio. Resend te muestra unos registros DNS (**SPF**, **DKIM** y opcionalmente DMARC).
2. Cargá esos registros en el panel donde compraste el dominio y esperá a que Resend lo marque como *Verified*.
3. Cambiá `EMAIL_FROM` a `Maitena Joyas <pedidos@tudominio.com>`, **vaciá `EMAIL_REDIRECT_TO`** y hacé Redeploy.

## Pruebas

```bash
npm test          # firma del webhook, estados de pago, preferencia, validaciones (sin red)
npm run db:check  # seguridad, stock concurrente y webhook completo contra tu Supabase real
npm run mp:check  # token de Mercado Pago (país, medios de pago, preferencia); nunca muestra el token
```

`mp:check` conviene volver a correrlo al cambiar de credenciales de prueba a las de producción.

`webhook:check` verifica el webhook PUBLICADO: firma un aviso de prueba con tu clave secreta (copiala también a `.env.local`) y lo envía
al sitio. Sirve para saber si la clave cargada en Vercel es la correcta: `npm run webhook:check -- https://tu-sitio.vercel.app`.

## Datos de la marca pendientes

`src/config/site.ts` tiene los datos de contacto (email, WhatsApp, Instagram, dirección) en `null`.
Mientras estén vacíos no se muestran en el sitio. Completarlos cuando se tengan.

Fotografías de categorías: `src/lib/categories.ts` (campo `image`). Mientras sea `null` se muestra un placeholder.

## Deploy en Vercel

1. El repo está en GitHub (rama `main` = producción).
2. En Vercel: *Add New → Project* → importar el repo (Next.js se detecta solo).
3. Cargar en *Settings → Environment Variables* (Production y Preview):

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | la de `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la de `.env.local` |
   | `SUPABASE_SERVICE_ROLE_KEY` | la de `.env.local` (secreta) |
   | `MERCADOPAGO_ACCESS_TOKEN` | el de `.env.local` (secreto) |
   | `MERCADOPAGO_WEBHOOK_SECRET` | la clave secreta del webhook (se obtiene después del primer deploy) |

   **No copies** `NEXT_PUBLIC_SITE_URL=http://localhost:3000` ni `ALLOW_UNCONFIGURED_SHIPPING`. Si `NEXT_PUBLIC_SITE_URL`
   no está, el sitio usa solo la dirección de producción que da Vercel; cuando tengas dominio propio, cargalo ahí.
4. Después del primer deploy, configurar el webhook de Mercado Pago (ver arriba) y cargar `MERCADOPAGO_WEBHOOK_SECRET`.
   Las variables nuevas se aplican en el siguiente deploy (*Deployments → Redeploy*).
5. Cada push a `main` despliega a producción; cada rama o PR genera un preview.
