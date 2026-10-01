/** Reglas de tienda que se comparten entre el sitio público y (más adelante) el admin. */

/** Con este stock disponible o menos se muestra "Últimas unidades" en la tienda y "Poco stock" en el listado del panel. */
export const LOW_STOCK_THRESHOLD = 3;

/** Un producto se considera "Nuevo" durante estos días desde su publicación. */
export const NEW_PRODUCT_DAYS = 30;

/** A partir de esta cantidad de productos en un listado aparece el filtro por precio. */
export const PRICE_FILTER_MIN_PRODUCTS = 12;

/** Tope de seguridad por línea del carrito (además del stock). */
export const MAX_QTY_PER_LINE = 99;
