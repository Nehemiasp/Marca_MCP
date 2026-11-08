#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { formatear, lenguajeDe, revisarArchivo } from './revisar-archivo.js';
import { esPrincipal } from './nucleo/principal.js';

/**
 * Hook PostToolUse de Claude Code (Write | Edit | MultiEdit): revisa el archivo recién guardado contra la marca.
 * Si hay errores, sale con código 2 y escribe los hallazgos en stderr: Claude Code se los devuelve al agente para que los corrija.
 * Solo lectura: no modifica el archivo.
 */
export function procesarHook(entrada: string): { codigo: 0 | 2; stderr: string } {
  let ruta: string | undefined;
  try {
    const j = JSON.parse(entrada) as { tool_input?: { file_path?: unknown } };
    if (typeof j.tool_input?.file_path === 'string') ruta = j.tool_input.file_path;
  } catch {
    return { codigo: 0, stderr: '' };
  }
  if (!ruta || !lenguajeDe(ruta)) return { codigo: 0, stderr: '' };
  const informe = revisarArchivo(ruta);
  if (informe.errores === 0) return { codigo: 0, stderr: '' };
  return {
    codigo: 2,
    stderr: `${formatear(ruta, informe)}\nCorrija los errores (los avisos son opcionales) y vuelva a guardar el archivo. Use las variables de los tokens, p. ej. var(--color-azul), var(--text-lg), var(--radius-md).\n`
  };
}

if (esPrincipal(import.meta.url)) {
  const r = procesarHook(readFileSync(0, 'utf8'));
  if (r.stderr) process.stderr.write(r.stderr);
  process.exit(r.codigo);
}
