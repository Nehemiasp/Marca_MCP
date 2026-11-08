import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { auditarCodigo } from '../src/nucleo/auditor.js';
import { cargarTokens } from '../src/nucleo/tokens.js';
import { revisarTexto } from '../src/nucleo/voz.js';
import { CARPETA_EVALS, CARPETA_SALIDAS, leerCorrida, totalesDeCorrida } from '../evals/reporte.js';

const leer = (f: string) => readFileSync(join(import.meta.dirname, '..', 'caso-de-estudio', f), 'utf8');

describe('material del caso de estudio', () => {
  for (const archivo of ['caso-de-estudio.md', 'guion-video.md']) {
    it(`${archivo}: sin errores de voz (título, palabras prohibidas)`, () => {
      const texto = leer(archivo).replace(/```[\s\S]*?```/g, ''); // el código no es prosa
      const errores = revisarTexto(texto).filter((h) => h.severidad === 'error' && !/«Product Designer»/.test(h.fragmento));
      expect(errores.map((e) => `${e.regla}: ${e.fragmento}`)).toEqual([]);
    });
  }

  it('las cifras del caso coinciden con las corridas guardadas de la evaluación', () => {
    const sin = totalesDeCorrida(leerCorrida(CARPETA_SALIDAS, 'sin'));
    const con1 = totalesDeCorrida(leerCorrida(join(CARPETA_EVALS, 'historial', 'corrida-1-skill-original'), 'con'));
    const caso = leer('caso-de-estudio.md');
    for (const [nombre, a, b] of [
      ['Valores fuera de los tokens en el código', sin.codigo, con1.codigo],
      ['Colores renderizados fuera de la paleta', sin.colores, con1.colores],
      ['Fuentes ajenas a la marca', sin.fuentes, con1.fuentes],
      ['Textos que no llegan a AA de contraste', sin.contraste, con1.contraste],
      ['Fallos de voz', sin.voz, con1.voz]
    ] as const) expect(caso, nombre).toContain(`| ${nombre} | ${a} | ${b} |`);
    expect(caso).toContain(`| Piezas sin ningún hallazgo | ${sin.sinHallazgos} de ${sin.tareas} | ${con1.sinHallazgos} de ${con1.tareas} |`);
  });

  it('las cifras de «lo que probé después» coinciden con las corridas guardadas', () => {
    const sin = totalesDeCorrida(leerCorrida(CARPETA_SALIDAS, 'sin'));
    const c2 = totalesDeCorrida(leerCorrida(CARPETA_SALIDAS, 'con'));
    const c3 = totalesDeCorrida(leerCorrida(join(CARPETA_EVALS, 'variantes', 'hook'), 'con'));
    const h = totalesDeCorrida(leerCorrida(join(CARPETA_EVALS, 'variantes', 'hook-sin'), 'sin'));
    const c1 = totalesDeCorrida(leerCorrida(join(CARPETA_EVALS, 'historial', 'corrida-1-skill-original'), 'con'));
    const caso = leer('caso-de-estudio.md');
    expect(caso).toContain(`| Valores fuera de los tokens | ${c1.codigo} | ${c2.codigo} | ${c3.codigo} | ${h.codigo} |`);
    expect(caso).toContain(`| Piezas sin ningún hallazgo | ${c1.sinHallazgos} de 7 | ${c2.sinHallazgos} de 7 | ${c3.sinHallazgos} de 7 | ${h.sinHallazgos} de 7 |`);
    const audit = (t: typeof c1) => `${t.usoRevision['auditar_codigo']} de 7`;
    expect(caso).toContain(`| Veces que corrió \`auditar_codigo\` | ${audit(c1)} | ${audit(c2)} | ${audit(c3)} | ${audit(h)} |`);
    // El texto afirma «9 de 16 guardados bloqueados» y «de 130 errores a cero»:
    expect(`${h.hookBloqueos} de ${h.hookDisparos}`).toBe('9 de 16');
    expect(sin.codigo).toBe(130);
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

  it('casos: los hallazgos del auditor que contaron los casos ya están resueltos', () => {
    // 01: antes el auditor no miraba el rx de un SVG; ahora sí.
    const svg = auditarCodigo('<svg><rect width="26" height="26" rx="5" fill="#0E1116"/></svg>', 'html');
    expect(svg.filter((h) => h.tipo === 'radio').map((h) => h.valor)).toEqual(['rx="5"']);
    // 02: antes dejaba pasar las genéricas solas; ahora solo valen como respaldo.
    expect(auditarCodigo('code{font-family:monospace}', 'css').map((h) => h.valor)).toEqual(['monospace']);
    expect(auditarCodigo('body{font-family:sans-serif}', 'css').map((h) => h.valor)).toEqual(['sans-serif']);
    expect(auditarCodigo('code{font-family:"Instrument Sans", monospace}', 'css')).toEqual([]);
    expect(auditarCodigo('code{font-family:Consolas,monospace}', 'css').map((h) => h.valor)).toContain('Consolas');
    // 02: la regla original sigue fallando. Con el auditor de hoy son cuatro hallazgos (antes tres):
    // también se marca ui-monospace, que va sola, sin ninguna fuente de la marca.
    const original = 'code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em}';
    expect(auditarCodigo(original, 'css').map((h) => h.valor)).toEqual(['ui-monospace', 'SFMono-Regular', 'Menlo', '.88em']);
  });

  it('caso de la fuente: el token y la regla existen, y Paridad ignora el token', () => {
    expect(cargarTokens().porRuta.has('tipografia.familia.codigo')).toBe(true);
    expect(readFileSync(join(import.meta.dirname, '..', 'marca', 'reglas.md'), 'utf8')).toContain('tipografia.familia.codigo');
    expect(readFileSync(join(import.meta.dirname, '..', 'ejemplos', 'paridad.ts'), 'utf8')).toContain("ruta !== 'tipografia.familia.codigo'");
  });
});
