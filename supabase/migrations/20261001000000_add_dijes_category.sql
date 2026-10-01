-- Nueva categoría de productos: dijes.
-- Se ejecuta en Supabase → SQL Editor → New query → pegar → Run. Es idempotente (se puede correr dos veces).
--
-- Una sola sentencia y sin nada más en la consulta: Postgres no permite usar un valor de enum recién agregado
-- dentro de la misma transacción en la que se creó.
alter type public.product_category add value if not exists 'dijes';
