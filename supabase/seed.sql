-- =====================================================================
-- MAITENA JOYAS · Productos de demostración
--
-- Sirven para ver el diseño antes de cargar el catálogo real. Están marcados con is_demo = true
-- (la tienda los muestra con la etiqueta "Demo" y sin indexar en buscadores).
-- Se eliminan desde /admin sin tocar código. Las fotos son ilustraciones en /public/demo.
--
-- Cómo aplicarlo: SQL Editor → pegar → Run (después de la migración). Es idempotente.
-- =====================================================================

insert into public.products (name, slug, description, price, category, stock, active, is_demo, created_at)
values
  ('Anillo Solitario', 'anillo-solitario', 'Anillo de plata de línea simple, con un único detalle central.', 1490, 'anillos', 4, true, true, now() - interval '2 days'),
  ('Anillo Trenzado', 'anillo-trenzado', 'Anillo de plata con textura trenzada, pensado para usar solo o combinado.', 1290, 'anillos', 8, true, true, now() - interval '40 days'),
  ('Anillo Fino', 'anillo-fino', 'Aro delgado de plata liso. Un básico para apilar.', 990, 'anillos', 0, true, true, now() - interval '90 days'),
  ('Pulsera Eslabones', 'pulsera-eslabones', 'Pulsera de plata de eslabones planos con cierre de mosquetón.', 2190, 'pulseras', 6, true, true, now() - interval '5 days'),
  ('Pulsera Rígida', 'pulsera-rigida', 'Pulsera de plata rígida de una sola pieza, de líneas limpias.', 1890, 'pulseras', 2, true, true, now() - interval '60 days'),
  ('Pulsera Cinta', 'pulsera-cinta', 'Pulsera de plata en formato cinta, ancha y ligeramente curva.', 1590, 'pulseras', 10, true, true, now() - interval '120 days'),
  ('Cadena Clásica', 'cadena-clasica', 'Cadena de plata de eslabón clásico, para usar sola o con dije.', 2490, 'cadenas', 5, true, true, now() - interval '12 days'),
  ('Cadena con Dije', 'cadena-con-dije', 'Cadena de plata fina con un dije pequeño en el centro.', 2990, 'cadenas', 3, true, true, now() - interval '75 days'),
  ('Cadena Barbada', 'cadena-barbada', 'Cadena de plata de eslabón barbado, de caída pareja y presencia sutil.', 3490, 'cadenas', 7, true, true, now() - interval '100 days'),
  ('Aros Argolla', 'aros-argolla', 'Argollas de plata de grosor fino y cierre a presión.', 1190, 'aros', 12, true, true, now() - interval '3 days'),
  ('Aros Botón', 'aros-boton', 'Aros de plata pequeños y redondos, discretos para todos los días.', 790, 'aros', 20, true, true, now() - interval '50 days'),
  ('Aros Colgantes', 'aros-colgantes', 'Aros de plata colgantes con un movimiento suave.', 1690, 'aros', 1, true, true, now() - interval '80 days')
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, alt, position)
select p.id, v.image_url, v.alt, v.position
  from (values
  ('anillo-solitario', '/demo/anillo-solitario-1.svg', 'Anillo Solitario — fotografía de ejemplo 1', 0),
  ('anillo-solitario', '/demo/anillo-solitario-2.svg', 'Anillo Solitario — fotografía de ejemplo 2', 1),
  ('anillo-solitario', '/demo/anillo-solitario-3.svg', 'Anillo Solitario — fotografía de ejemplo 3', 2),
  ('anillo-trenzado', '/demo/anillo-trenzado-1.svg', 'Anillo Trenzado — fotografía de ejemplo 1', 0),
  ('anillo-trenzado', '/demo/anillo-trenzado-2.svg', 'Anillo Trenzado — fotografía de ejemplo 2', 1),
  ('anillo-fino', '/demo/anillo-fino-1.svg', 'Anillo Fino — fotografía de ejemplo 1', 0),
  ('anillo-fino', '/demo/anillo-fino-2.svg', 'Anillo Fino — fotografía de ejemplo 2', 1),
  ('pulsera-eslabones', '/demo/pulsera-eslabones-1.svg', 'Pulsera Eslabones — fotografía de ejemplo 1', 0),
  ('pulsera-eslabones', '/demo/pulsera-eslabones-2.svg', 'Pulsera Eslabones — fotografía de ejemplo 2', 1),
  ('pulsera-eslabones', '/demo/pulsera-eslabones-3.svg', 'Pulsera Eslabones — fotografía de ejemplo 3', 2),
  ('pulsera-rigida', '/demo/pulsera-rigida-1.svg', 'Pulsera Rígida — fotografía de ejemplo 1', 0),
  ('pulsera-rigida', '/demo/pulsera-rigida-2.svg', 'Pulsera Rígida — fotografía de ejemplo 2', 1),
  ('pulsera-cinta', '/demo/pulsera-cinta-1.svg', 'Pulsera Cinta — fotografía de ejemplo 1', 0),
  ('cadena-clasica', '/demo/cadena-clasica-1.svg', 'Cadena Clásica — fotografía de ejemplo 1', 0),
  ('cadena-clasica', '/demo/cadena-clasica-2.svg', 'Cadena Clásica — fotografía de ejemplo 2', 1),
  ('cadena-clasica', '/demo/cadena-clasica-3.svg', 'Cadena Clásica — fotografía de ejemplo 3', 2),
  ('cadena-con-dije', '/demo/cadena-con-dije-1.svg', 'Cadena con Dije — fotografía de ejemplo 1', 0),
  ('cadena-con-dije', '/demo/cadena-con-dije-2.svg', 'Cadena con Dije — fotografía de ejemplo 2', 1),
  ('cadena-barbada', '/demo/cadena-barbada-1.svg', 'Cadena Barbada — fotografía de ejemplo 1', 0),
  ('cadena-barbada', '/demo/cadena-barbada-2.svg', 'Cadena Barbada — fotografía de ejemplo 2', 1),
  ('aros-argolla', '/demo/aros-argolla-1.svg', 'Aros Argolla — fotografía de ejemplo 1', 0),
  ('aros-argolla', '/demo/aros-argolla-2.svg', 'Aros Argolla — fotografía de ejemplo 2', 1),
  ('aros-argolla', '/demo/aros-argolla-3.svg', 'Aros Argolla — fotografía de ejemplo 3', 2),
  ('aros-boton', '/demo/aros-boton-1.svg', 'Aros Botón — fotografía de ejemplo 1', 0),
  ('aros-boton', '/demo/aros-boton-2.svg', 'Aros Botón — fotografía de ejemplo 2', 1),
  ('aros-colgantes', '/demo/aros-colgantes-1.svg', 'Aros Colgantes — fotografía de ejemplo 1', 0),
  ('aros-colgantes', '/demo/aros-colgantes-2.svg', 'Aros Colgantes — fotografía de ejemplo 2', 1)
  ) as v(slug, image_url, alt, position)
  join public.products p on p.slug = v.slug
 where not exists (
   select 1 from public.product_images i where i.product_id = p.id and i.position = v.position
 );
