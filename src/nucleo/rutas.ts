import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Carpeta `marca/`. Por defecto está junto al código (src/nucleo o dist/nucleo → ../../marca).
 * Puede cambiarse con MARCA_DIR (solo para pruebas o para apuntar a otra marca).
 * Todo acceso a archivos pasa por aquí: solo lectura y siempre dentro de esa carpeta.
 */
export function carpetaMarca(): string {
  const entorno = process.env['MARCA_DIR'];
  if (entorno) return resolve(entorno);
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'marca');
}

/** Resuelve una ruta relativa dentro de `marca/` y rechaza cualquier intento de salir de ella. */
export function rutaSegura(...partes: string[]): string {
  const base = carpetaMarca();
  const destino = resolve(base, ...partes);
  if (destino !== base && !destino.startsWith(base + sep)) {
    throw new Error('Ruta fuera de la carpeta de la marca.');
  }
  return destino;
}

/**
 * Lee un archivo de `marca/` como texto, igual en cualquier sistema: finales de línea LF (Git en Windows los convierte a CRLF
 * al descargar) y sin la marca BOM (el Bloc de notas la agrega al guardar y rompe JSON.parse).
 */
export function normalizarTexto(texto: string): string {
  return texto.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

export function leerTexto(...partes: string[]): string {
  return normalizarTexto(readFileSync(rutaSegura(...partes), 'utf8'));
}

export function existe(...partes: string[]): boolean {
  return existsSync(rutaSegura(...partes));
}

export function listar(...partes: string[]): string[] {
  return readdirSync(rutaSegura(...partes)).sort();
}

export { join };
