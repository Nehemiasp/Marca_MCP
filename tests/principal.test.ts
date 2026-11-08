import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { esPrincipal } from '../src/nucleo/principal.js';

describe('esPrincipal (detectar ejecución directa)', () => {
  it('coincide cuando el script es el módulo', () => {
    expect(esPrincipal('file:///home/u/proyecto/src/hook.ts', '/home/u/proyecto/src/hook.ts', false)).toBe(true);
  });
  it('no coincide con otro módulo ni sin argumento', () => {
    expect(esPrincipal('file:///home/u/a.ts', '/home/u/b.ts', false)).toBe(false);
    expect(esPrincipal('file:///home/u/a.ts', undefined)).toBe(false);
  });
  it('en Windows: la URL real del módulo es file:///C:/… y la comparación ingenua fallaba', () => {
    const ruta = 'C:\\Users\\nehem\\Downloads\\Pr\\Marca_MCP\\src\\hook.ts';
    const urlReal: string = 'file:///C:/Users/nehem/Downloads/Pr/Marca_MCP/src/hook.ts';
    expect(pathToFileURL(ruta, { windows: true }).href).toBe(urlReal);
    expect(urlReal === ('file://' + ruta) as string).toBe(false); // el defecto original
    expect(esPrincipal(urlReal, ruta, true)).toBe(true); // la corrección
  });
  it('rutas con espacios y letras acentuadas', () => {
    const ruta = 'C:\\Users\\Nehemías Pérez\\Mi Carpeta\\src\\hook.ts';
    const url = pathToFileURL(ruta, { windows: true }).href;
    expect(esPrincipal(url, ruta, true)).toBe(true);
  });
  it('ningún script del proyecto usa la comparación ingenua', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const raiz = join(import.meta.dirname, '..');
    const archivos = ['src', 'sitio', 'caso-de-estudio', 'evals'].flatMap((d) => {
      const dir = join(raiz, d);
      return readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.ts')).map((e) => join(e.parentPath, e.name));
    });
    for (const f of archivos) expect(readFileSync(f, 'utf8'), f).not.toMatch(/file:\/\/\$\{process\.argv\[1\]\}/);
  });
});
