import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El repositorio tiene que poder descargarse en Windows. Un nombre reservado (CON, AUX, NUL…) como carpeta o archivo
 * hace que Git falle con «invalid path» (pasó con las carpetas «con» de la evaluación).
 */
const RAIZ = join(import.meta.dirname, '..');
const IGNORAR = new Set(['node_modules', 'dist', '.git', '.vercel']);
const RESERVADO = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const INVALIDOS = /[<>:"|?*\u0000-\u001f]/;

function rutas(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (IGNORAR.has(e.name)) return [];
    const ruta = join(dir, e.name);
    return e.isDirectory() ? [ruta, ...rutas(ruta)] : [ruta];
  });
}
const todas = rutas(RAIZ).map((r) => relative(RAIZ, r));

describe('rutas compatibles con Windows', () => {
  it('hay rutas que revisar', () => {
    expect(todas.length).toBeGreaterThan(100);
  });
  it('ningún componente de ruta es un nombre reservado de Windows', () => {
    const malos = todas.filter((r) => r.split(sep).some((parte) => RESERVADO.test(parte)));
    expect(malos).toEqual([]);
  });
  it('ninguna ruta tiene caracteres no válidos ni termina en punto o espacio', () => {
    const malos = todas.filter((r) => r.split(sep).some((p) => INVALIDOS.test(p) || /[. ]$/.test(p)));
    expect(malos).toEqual([]);
  });
  it('ninguna ruta relativa pasa de 150 caracteres (Windows limita a 260 con la carpeta de instalación)', () => {
    expect(todas.filter((r) => r.length > 150)).toEqual([]);
  });
  it('la prueba detecta lo que debe detectar', () => {
    for (const malo of ['con', 'CON', 'aux.txt', 'Nul', 'com1', 'lpt9.log', 'PRN']) expect(RESERVADO.test(malo), malo).toBe(true);
    for (const bueno of ['con-servidor', 'sin-servidor', 'conexion', 'consola.ts', 'aux-1', 'component']) expect(RESERVADO.test(bueno), bueno).toBe(false);
  });
});
