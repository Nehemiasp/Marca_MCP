import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conectar } from './cliente.js';
import { PASOS } from '../caso-de-estudio/recorrido/pasos.js';
import { revisarTexto } from '../src/nucleo/voz.js';

const RAIZ = join(import.meta.dirname, '..', 'caso-de-estudio');
const DOC = readFileSync(join(RAIZ, 'recorrido-claude-desktop.md'), 'utf8');
const GUARDADAS = JSON.parse(readFileSync(join(RAIZ, 'recorrido', 'capturas', 'salidas.json'), 'utf8')) as Record<string, string>;

let ctx: Awaited<ReturnType<typeof conectar>>;
beforeAll(async () => { ctx = await conectar(); });
afterAll(async () => { await ctx.cerrar(); });

const salida = async (i: number) => {
  const p = PASOS[i]!;
  const r = await ctx.cliente.callTool({ name: p.herramienta, arguments: p.args });
  return (r.content as { text: string }[]).map((c) => c.text).join('\n');
};

describe('recorrido con capturas', () => {
  it('hay una captura por llamada y el documento las incluye todas', () => {
    expect(PASOS).toHaveLength(9);
    PASOS.forEach((p, n) => {
      const archivo = `${String(n + 1).padStart(2, '0')}-${p.id}.png`;
      expect(existsSync(join(RAIZ, 'recorrido', 'capturas', archivo)), archivo).toBe(true);
      expect(DOC, archivo).toContain(`recorrido/capturas/${archivo}`);
    });
  });

  it('las capturas no están desactualizadas: coinciden con lo que devuelve el servidor hoy', async () => {
    for (const [n, p] of PASOS.entries()) expect(await salida(n), p.id).toBe(GUARDADAS[p.id]);
  });

  it('lo que el documento afirma coincide con las salidas', async () => {
    const borrador = await salida(4);
    const errores = (borrador.match(/\[error\]/g) ?? []).length;
    const avisos = (borrador.match(/\[aviso\]/g) ?? []).length;
    expect(DOC).toContain(`**${errores} errores y ${avisos} avisos**`);
    expect(`${errores}/${avisos}`).toBe('8/2');
    expect(await salida(5)).toMatch(/^Sin hallazgos/);
    expect(await salida(8)).toMatch(/^Sin hallazgos/);
    expect(await salida(6)).toMatch(/Par prohibido por la marca/);
    expect(await salida(0)).toMatch(/portada-de-documento \(67%\)/);
    expect(DOC).toContain('67 %');
  });

  it('el documento aclara que no son capturas de Claude Desktop y qué no se probó', () => {
    expect(DOC).toMatch(/No son capturas de la interfaz de Claude Desktop/);
    expect(DOC).toMatch(/nunca se abrió desde Claude Desktop/);
  });

  it('el documento cumple la voz de la marca', () => {
    const prosa = DOC.replace(/```[\s\S]*?```/g, '').replace(/^>.*$/gm, '');
    expect(revisarTexto(prosa).filter((h) => h.severidad === 'error').map((e) => `${e.regla}: ${e.fragmento}`)).toEqual([]);
  });
});
