import { pathToFileURL } from 'node:url';

/**
 * ¿Este módulo es el que se está ejecutando directamente (node archivo.js / tsx archivo.ts)?
 * Compara la URL del módulo con la ruta del script convertida con pathToFileURL, que funciona igual en Windows
 * (file:///C:/Users/…) y en macOS o Linux. La comparación ingenua con `file://${ruta}` falla en Windows.
 */
export function esPrincipal(urlModulo: string, argv1: string | undefined = process.argv[1], windows?: boolean): boolean {
  if (!argv1) return false;
  return urlModulo === pathToFileURL(argv1, windows === undefined ? undefined : { windows }).href;
}
