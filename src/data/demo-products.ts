/**
 * PRODUCTOS DE DEMOSTRACIÓN.
 *
 * Sirven solo para ver el diseño antes de cargar el catálogo real. Cuando se conecte Supabase
 * (paso 4) pasan a ser filas de la base con `is_demo = true` y se eliminan desde /admin
 * sin tocar código. Las fotografías son ilustraciones de ejemplo en /public/demo.
 */
import type { Product } from "@/lib/types";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const photos = (slug: string, name: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    url: `/demo/${slug}-${i + 1}.svg`,
    alt: `${name} — fotografía de ejemplo ${i + 1}`,
  }));

type Seed = Omit<Product, "images" | "isDemo" | "createdAt"> & {
  photos: number;
  age: number;
};

const seeds: Seed[] = [
  // ── Anillos ──────────────────────────────────────────────
  {
    id: "demo-anillo-solitario",
    slug: "anillo-solitario",
    name: "Anillo Solitario",
    description: "Anillo de plata de línea simple, con un único detalle central.",
    price: 1490,
    category: "anillos",
    stock: 4,
    photos: 3,
    age: 2,
  },
  {
    id: "demo-anillo-trenzado",
    slug: "anillo-trenzado",
    name: "Anillo Trenzado",
    description: "Anillo de plata con textura trenzada, pensado para usar solo o combinado.",
    price: 1290,
    category: "anillos",
    stock: 8,
    photos: 2,
    age: 40,
  },
  {
    id: "demo-anillo-fino",
    slug: "anillo-fino",
    name: "Anillo Fino",
    description: "Aro delgado de plata liso. Un básico para apilar.",
    price: 990,
    category: "anillos",
    stock: 0,
    photos: 2,
    age: 90,
  },
  // ── Pulseras ─────────────────────────────────────────────
  {
    id: "demo-pulsera-eslabones",
    slug: "pulsera-eslabones",
    name: "Pulsera Eslabones",
    description: "Pulsera de plata de eslabones planos con cierre de mosquetón.",
    price: 2190,
    category: "pulseras",
    stock: 6,
    photos: 3,
    age: 5,
  },
  {
    id: "demo-pulsera-rigida",
    slug: "pulsera-rigida",
    name: "Pulsera Rígida",
    description: "Pulsera de plata rígida de una sola pieza, de líneas limpias.",
    price: 1890,
    category: "pulseras",
    stock: 2,
    photos: 2,
    age: 60,
  },
  {
    id: "demo-pulsera-cinta",
    slug: "pulsera-cinta",
    name: "Pulsera Cinta",
    description: "Pulsera de plata en formato cinta, ancha y ligeramente curva.",
    price: 1590,
    category: "pulseras",
    stock: 10,
    photos: 1,
    age: 120,
  },
  // ── Cadenas ──────────────────────────────────────────────
  {
    id: "demo-cadena-clasica",
    slug: "cadena-clasica",
    name: "Cadena Clásica",
    description: "Cadena de plata de eslabón clásico, para usar sola o con dije.",
    price: 2490,
    category: "cadenas",
    stock: 5,
    photos: 3,
    age: 12,
  },
  {
    id: "demo-cadena-con-dije",
    slug: "cadena-con-dije",
    name: "Cadena con Dije",
    description: "Cadena de plata fina con un dije pequeño en el centro.",
    price: 2990,
    category: "cadenas",
    stock: 3,
    photos: 2,
    age: 75,
  },
  {
    id: "demo-cadena-barbada",
    slug: "cadena-barbada",
    name: "Cadena Barbada",
    description: "Cadena de plata de eslabón barbado, de caída pareja y presencia sutil.",
    price: 3490,
    category: "cadenas",
    stock: 7,
    photos: 2,
    age: 100,
  },
  // ── Aros ─────────────────────────────────────────────────
  {
    id: "demo-aros-argolla",
    slug: "aros-argolla",
    name: "Aros Argolla",
    description: "Argollas de plata de grosor fino y cierre a presión.",
    price: 1190,
    category: "aros",
    stock: 12,
    photos: 3,
    age: 3,
  },
  {
    id: "demo-aros-boton",
    slug: "aros-boton",
    name: "Aros Botón",
    description: "Aros de plata pequeños y redondos, discretos para todos los días.",
    price: 790,
    category: "aros",
    stock: 20,
    photos: 2,
    age: 50,
  },
  {
    id: "demo-aros-colgantes",
    slug: "aros-colgantes",
    name: "Aros Colgantes",
    description: "Aros de plata colgantes con un movimiento suave.",
    price: 1690,
    category: "aros",
    stock: 1,
    photos: 2,
    age: 80,
  },
];

export const demoProducts: Product[] = seeds.map(({ photos: n, age, ...p }) => ({
  ...p,
  images: photos(p.slug, p.name, n),
  createdAt: daysAgo(age),
  isDemo: true,
}));
