/**
 * Lee una variable de entorno del servidor limpiando errores típicos de copiado: espacios, saltos de
 * línea y comillas de más (un solo espacio invisible en una clave secreta hace que todo falle en silencio).
 * Devuelve undefined si no está o quedó vacía.
 */
export function serverEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const cleaned = raw.trim().replace(/^(["'])([\s\S]*)\1$/, "$2").trim();
  return cleaned === "" ? undefined : cleaned;
}
