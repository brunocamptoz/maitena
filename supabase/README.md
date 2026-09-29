# Base de datos (Supabase)

| Archivo | Qué hace |
| --- | --- |
| `migrations/20260929000000_init_schema.sql` | Tablas, seguridad (RLS), funciones de stock/pedidos/pagos y bucket de fotos |
| `seed.sql` | 12 productos de demostración (se borran desde `/admin`) |

La base solo se modifica con archivos de `migrations/` (nunca a mano desde el panel de Supabase), así el
esquema queda versionado en GitHub. Cada cambio futuro es un archivo nuevo con fecha.

## Aplicarla por primera vez

1. Supabase → **SQL Editor** → *New query*.
2. Pegar el contenido de `migrations/20260929000000_init_schema.sql` → **Run**.
3. Nueva query, pegar `seed.sql` → **Run**.
4. Comprobar todo: `npm run db:check` (crea datos de prueba, verifica seguridad y stock, y los borra).

Ambos archivos son idempotentes: si se ejecutan dos veces no duplican nada.

## Ajustes de Supabase que hay que hacer en el panel

- **Authentication → Sign In / Providers → desactivar "Allow new users to sign up".** Los compradores no
  tienen cuenta; solo existe el administrador, que se crea a mano (ver abajo).
- **Database → Extensions → `pg_cron`** activada (la migración intenta activarla sola). Libera cada 5 minutos
  el stock de las compras abandonadas.

## Crear el usuario administrador (se hace al armar el panel `/admin`)

1. **Authentication → Users → Add user** con tu email y una contraseña larga (marcar *Auto Confirm User*).
2. En el SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'TU_EMAIL_AQUÍ';
   ```

## Cómo está protegida

- **Público (clave pública):** solo lee productos publicados y sus fotos, y solo columnas seguras. El stock
  real y las reservas no se pueden leer (solo `available_stock`). No puede escribir ni ejecutar funciones.
- **Administrador:** gestiona productos, fotos, tarifas de envío y ajustes; lee pedidos y solo puede corregir
  datos de envío y notas (nunca montos, pagos ni estados: esos cambian mediante funciones del servidor).
- **Servidor (clave secreta):** único que crea pedidos y registra pagos, siempre vía funciones
  (`create_order`, `apply_payment`, `cancel_order`, …). La clave secreta nunca llega al navegador.
- Toda tabla nueva debe activar RLS y otorgar permisos de forma explícita (la migración configura los
  privilegios por defecto para que nada quede expuesto sin querer).

## Cómo se maneja el stock

1. **Compra iniciada:** `create_order` bloquea las filas de los productos, comprueba stock y **reserva** las
   unidades en una sola transacción. Dos personas no pueden llevarse la última unidad. El precio siempre se
   lee de la base, nunca del navegador.
2. **Pago aprobado** (confirmado por el webhook contra la API de Mercado Pago): `apply_payment` convierte la
   reserva en venta (baja `stock`) y marca el pedido como pagado. Es idempotente: los reintentos del webhook
   no duplican nada.
3. **Pago pendiente de acreditación:** la reserva se extiende 24 h.
4. **Pago rechazado:** el cliente puede reintentar mientras dure la reserva (30 min por defecto).
5. **Abandonado:** al vencer la reserva el stock vuelve a estar disponible y el pedido se cancela (`expired`).
6. **Pago que llega después de vencer:** se reactiva el pedido si todavía hay stock; si ya se vendió, queda
   como `stock_shortfall` y aparece como "requiere atención" para reintegrar o contactar al cliente.
7. **Situaciones raras** (monto distinto, cobro doble, reembolso, pago tras cancelación manual): el pedido
   queda marcado `needs_attention` con el motivo; nunca se resuelven en silencio.

## Cargar los costos de envío (hasta que exista `/admin`)

El checkout no cobra mientras `shipping_configured` sea `false`. En el SQL Editor, con TUS valores
(pesos uruguayos; `0` = envío gratis):

```sql
-- Costo general y (opcional) envío gratis desde cierto monto. Ej.: 300 y gratis desde 3000.
update public.store_settings
   set shipping_default_cost = 300,
       free_shipping_from    = null,      -- o un número, ej. 3000
       shipping_configured   = true;

-- Tarifa propia de un departamento (opcional; el resto usa el costo general).
insert into public.shipping_rates (department, cost) values ('Montevideo', 150)
on conflict (department) do update set cost = excluded.cost;
```

## Antes de lanzar

- **Numeración de pedidos:** las pruebas consumen números. Antes de la primera venta real, con la tabla
  `orders` sin pedidos de prueba, reiniciá el contador:
  `alter table public.orders alter column order_number restart with 1001;`
- Borrar los productos demo desde `/admin` y comprobar con `npm run db:check`.

## Pendiente de definir con el negocio

- **Costos de envío:** no están inventados. `store_settings.shipping_configured` arranca en `false`; se cargan
  desde `/admin` (costo general y por departamento, y envío gratis desde cierto monto).
- **Medios de pago en efectivo (Abitab, RedPagos):** quedaron excluidos al inicio (`src/config/payments.ts`)
  porque su acreditación demora días y mantendrían el stock reservado. Se pueden habilitar más adelante.
