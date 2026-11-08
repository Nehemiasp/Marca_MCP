import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { auditarCodigo } from '../src/nucleo/auditor.js';
import { cargarTokens } from '../src/nucleo/tokens.js';
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

const CASOS = ['01-radio-de-5-px.md', '02-la-fuente-que-la-marca-no-tenia.md'];
const leerCaso = (f: string) => readFileSync(join(import.meta.dirname, '..', 'caso-de-estudio', 'casos', f), 'utf8');

describe('casos desarrollados', () => {
  for (const archivo of CASOS) {
    it(`${archivo}: sin errores de voz`, () => {
      const prosa = leerCaso(archivo).replace(/```[\s\S]*?```/g, '');
      expect(revisarTexto(prosa).filter((h) => h.severidad === 'error').map((e) => `${e.regla}: ${e.fragmento}`)).toEqual([]);
    });
    it(`${archivo}: todas las imágenes que cita existen`, () => {
      const rutas = [...leerCaso(archivo).matchAll(/\]\(((?:img|\.\.\/errores)\/[^)]+\.png)\)/g)].map((m) => m[1]!);
      expect(rutas.length).toBeGreaterThanOrEqual(2);
      for (const r of rutas) expect(existsSync(join(import.meta.dirname, '..', 'caso-de-estudio', 'casos', r)), r).toBe(true);
    });
  }

  it('caso del radio: los números siguen siendo ciertos', () => {
    const { porRuta } = cargarTokens();
    expect(porRuta.get('radio.sm')?.valor).toBe('6px');
    expect(Object.keys(Object.fromEntries([...porRuta].filter(([k]) => k.startsWith('radio.')))).length).toBe(6);
    expect(porRuta.get('radio.cuadro-mini')?.valor).toBe('4px');
    const svg = readFileSync(join(import.meta.dirname, '..', 'marca', 'assets', 'motivo-mini-claro.svg'), 'utf8');
    expect(svg).toContain('viewBox="0 0 212 212"');
    expect(svg).toContain('rx="14"');
    const escala = 56 / 212;
    expect(Math.round(14 * escala * 10) / 10).toBe(3.7);
    expect(Math.round((5 / 26) * 100)).toBe(19);
    expect(Math.round((6 / 26) * 100)).toBe(23);
    expect(Math.round((4 / 26) * 100)).toBe(15);
  });

  it('caso del radio: el componente ya no usa 5 px', () => {
    const md = readFileSync(join(import.meta.dirname, '..', 'marca', 'componentes', 'motivo-de-cuadros.md'), 'utf8');
    expect(md).not.toMatch(/\b5px\b|\[5px\]/);
  });

  it('casos: lo que dicen del auditor sigue siendo cierto (si se corrige, actualice los casos)', () => {
    // 01: el auditor no mira rx de un SVG.
    const svg = auditarCodigo('<svg><rect width="26" height="26" rx="5" fill="#0E1116"/></svg>', 'html');
    expect(svg.filter((h) => h.tipo === 'radio')).toEqual([]);
    // 02: deja pasar las genéricas como única familia, pero rechaza una fuente concreta.
    expect(auditarCodigo('code{font-family:monospace}', 'css')).toEqual([]);
    expect(auditarCodigo('body{font-family:sans-serif}', 'css')).toEqual([]);
    expect(auditarCodigo('code{font-family:Consolas,monospace}', 'css').map((h) => h.valor)).toEqual(['Consolas']);
    // 02: la regla original sí falla, con tres hallazgos.
    const original = 'code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em}';
    expect(auditarCodigo(original, 'css').map((h) => h.tipo)).toEqual(['fuente', 'fuente', 'tamano']);
  });

  it('caso de la fuente: el token y la regla existen, y Paridad ignora el token', () => {
    expect(cargarTokens().porRuta.has('tipografia.familia.codigo')).toBe(true);
    expect(readFileSync(join(import.meta.dirname, '..', 'marca', 'reglas.md'), 'utf8')).toContain('tipografia.familia.codigo');
    expect(readFileSync(join(import.meta.dirname, '..', 'ejemplos', 'paridad.ts'), 'utf8')).toContain("ruta !== 'tipografia.familia.codigo'");
  });
});
