import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { coloresFueraDeMarca, familiasDeMarca, fuentesFueraDeMarca, paletaDe, type TokensPlanos } from '../ejemplos/paridad.js';
import { exportarTokens } from '../src/nucleo/exportadores.js';

const tokens = JSON.parse(exportarTokens('json').contenido) as TokensPlanos;

describe('ejemplo de integración para Paridad (JSON plano)', () => {
  it('lee la paleta completa', () => {
    expect(paletaDe(tokens).length).toBeGreaterThanOrEqual(12);
    expect(paletaDe(tokens).find((p) => p.token === 'color.azul')?.hex).toBe('#043565');
  });
  it('detecta colores fuera de la marca y propone el token más cercano', () => {
    const r = coloresFueraDeMarca(['#043565', '#0A3D80', '#FF5A36', '#0e1116'], tokens);
    expect(r.map((x) => x.valor)).toEqual(['#0A3D80', '#FF5A36']);
    expect(r[0]!.token).toBe('color.azul');
  });
  it('los colores de la paleta y los que no son hex de 6 dígitos no se marcan', () => {
    expect(coloresFueraDeMarca(['#FAFAF8', 'transparent', 'rgb(1,2,3)'], tokens)).toEqual([]);
  });
  it('detecta fuentes fuera de la marca', () => {
    expect(familiasDeMarca(tokens)).toEqual(['bricolage grotesque', 'instrument sans']);
    expect(fuentesFueraDeMarca(['Inter', '"Instrument Sans"', 'Georgia', 'sans-serif'], tokens)).toEqual(['inter', 'georgia']);
  });
  it('el JSON plano publicado en el sitio coincide con el de exportar_tokens', () => {
    const publicado = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'sitio', 'publico', 'tokens.plano.json'), 'utf8'));
    expect(publicado).toEqual(tokens);
  });
});
