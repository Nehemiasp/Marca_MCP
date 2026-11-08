import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(import.meta.dirname, '..', 'caso-de-estudio', 'errores');
const registro = JSON.parse(readFileSync(join(DIR, 'registro.json'), 'utf8')) as Record<string, string>[];

describe('registro de errores', () => {
  it('cada entrada está completa, con salida no vacía y su captura', () => {
    expect(registro.length).toBeGreaterThanOrEqual(9);
    for (const e of registro) {
      for (const campo of ['id', 'fecha', 'fase', 'titulo', 'salida', 'causa', 'solucion', 'aprendizaje'])
        expect(e[campo]?.trim(), `${e['id']}: falta ${campo}`).toBeTruthy();
      expect(existsSync(join(DIR, `${e['id']}.png`)), `${e['id']}: falta la captura`).toBe(true);
    }
  });
  it('los ids son únicos', () => {
    expect(new Set(registro.map((e) => e['id'])).size).toBe(registro.length);
  });
});
