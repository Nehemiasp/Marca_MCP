import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { revisarTexto } from '../src/nucleo/voz.js';

const leer = (f: string) => readFileSync(join(import.meta.dirname, '..', 'caso-de-estudio', f), 'utf8');

describe('material del caso de estudio', () => {
  for (const archivo of ['caso-de-estudio.md', 'guion-video.md']) {
    it(`${archivo}: sin errores de voz (título, palabras prohibidas)`, () => {
      const texto = leer(archivo).replace(/```[\s\S]*?```/g, ''); // el código no es prosa
      const errores = revisarTexto(texto).filter((h) => h.severidad === 'error' && !/«Product Designer»/.test(h.fragmento));
      expect(errores.map((e) => `${e.regla}: ${e.fragmento}`)).toEqual([]);
    });
  }

  it('las cifras del caso coinciden con el reporte de la evaluación', () => {
    const reporte = readFileSync(join(import.meta.dirname, '..', 'evals', 'reporte.md'), 'utf8');
    const fila = (nombre: string) => reporte.split('\n').find((l) => l.startsWith(`| ${nombre}`))!.split('|').map((c) => c.trim());
    const caso = leer('caso-de-estudio.md');
    const codigo = fila('Valores fuera de los tokens');
    expect(caso).toContain(`| ${codigo[2]} | ${codigo[3]} |`);
    const colores = fila('Colores renderizados fuera de la paleta');
    expect(caso).toContain(`| ${colores[2]} | ${colores[3]} |`);
    const fuentes = fila('Fuentes ajenas');
    expect(caso).toContain(`| ${fuentes[2]} | ${fuentes[3]} |`);
    const contraste = fila('Textos que no llegan a AA');
    expect(caso).toContain(`| ${contraste[2]} | ${contraste[3]} |`);
  });
});
