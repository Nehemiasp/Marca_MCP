import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conectar } from './cliente.js';

let ctx: Awaited<ReturnType<typeof conectar>>;
beforeAll(async () => { ctx = await conectar(); });
afterAll(async () => { await ctx.cerrar(); });

async function llamar(name: string, args: Record<string, unknown>) {
  const r = await ctx.cliente.callTool({ name, arguments: args });
  const texto = (r.content as { type: string; text?: string }[]).map((c) => c.text ?? '').join('\n');
  return { ...r, texto, s: r.structuredContent as any };
}

describe('catálogo de herramientas', () => {
  it('publica las nueve herramientas, todas de solo lectura y con descripción en español', async () => {
    const { tools } = await ctx.cliente.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'auditar_codigo', 'buscar_componente', 'exportar_tokens', 'obtener_asset', 'obtener_componente',
      'obtener_tokens', 'revisar_color', 'revisar_contraste', 'revisar_texto'
    ]);
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint, t.name).toBe(true);
      expect(t.description!.length, t.name).toBeGreaterThan(60);
      expect(t.inputSchema, t.name).toBeDefined();
      expect(t.outputSchema, t.name).toBeDefined();
    }
  });
});

describe('obtener_tokens', () => {
  it('sin categoría devuelve los 59 tokens', async () => {
    const r = await llamar('obtener_tokens', {});
    expect(r.s.total).toBe(59);
    expect(r.s.tokens.find((t: any) => t.ruta === 'color.azul')).toMatchObject({ valor: '#043565', variable: '--color-azul' });
  });
  it('filtra por categoría', async () => {
    const r = await llamar('obtener_tokens', { categoria: 'radio' });
    expect(r.s.tokens.map((t: any) => t.ruta)).toEqual(['radio.sm', 'radio.md', 'radio.lg', 'radio.cuadro', 'radio.pill']);
  });
  it('rechaza una categoría inválida', async () => {
    const r = await llamar('obtener_tokens', { categoria: 'magia' });
    expect(r.isError).toBe(true);
  });
});

describe('buscar_componente', () => {
  it('encuentra el aviso', async () => {
    const r = await llamar('buscar_componente', { consulta: 'algo para mostrar un aviso' });
    expect(r.s.resultados[0].nombre).toBe('aviso-destacado');
    expect(r.s.resultados[0].resumen).toMatch(/azul/);
  });
  it('sin coincidencias lista los disponibles', async () => {
    const r = await llamar('buscar_componente', { consulta: 'xyzzy qwerty' });
    expect(r.s.resultados).toEqual([]);
    expect(r.s.disponibles).toHaveLength(9);
    expect(r.texto).toMatch(/Disponibles/);
  });
  it('valida entrada: consulta corta y límite fuera de rango', async () => {
    expect((await llamar('buscar_componente', { consulta: 'a' })).isError).toBe(true);
    expect((await llamar('buscar_componente', { consulta: 'tabla', limite: 0 })).isError).toBe(true);
    expect((await llamar('buscar_componente', { consulta: 'tabla', limite: 10 })).isError).toBe(true);
  });
  it('límite en el borde: 1 y 9', async () => {
    expect((await llamar('buscar_componente', { consulta: 'botón tarjeta tabla aviso', limite: 1 })).s.resultados).toHaveLength(1);
    expect((await llamar('buscar_componente', { consulta: 'botón tarjeta tabla aviso', limite: 9 })).isError).toBeFalsy();
  });
});

describe('obtener_componente', () => {
  it('devuelve un formato', async () => {
    const r = await llamar('obtener_componente', { nombre: 'boton', formato: 'react' });
    expect(Object.keys(r.s.codigo)).toEqual(['react']);
    expect(r.s.codigo.react).toMatch(/export function Boton/);
    expect(r.s.tokens.find((t: any) => t.ruta === 'radio.md').valor).toBe('10px');
    expect(r.s.variantes).toEqual(['principal', 'secundario', 'texto']);
  });
  it('por omisión devuelve los tres formatos', async () => {
    const r = await llamar('obtener_componente', { nombre: 'tabla' });
    expect(Object.keys(r.s.codigo).sort()).toEqual(['html', 'impresion', 'react']);
    expect(r.s.codigo.impresion).toMatch(/@media print/);
  });
  it('un nombre inexistente da un error con sugerencias', async () => {
    const r = await llamar('obtener_componente', { nombre: 'botones' });
    expect(r.isError).toBe(true);
    expect(r.texto).toMatch(/no existe/);
  });
  it('rechaza formato inválido y nombre con ruta peligrosa', async () => {
    expect((await llamar('obtener_componente', { nombre: 'boton', formato: 'vue' })).isError).toBe(true);
    const r = await llamar('obtener_componente', { nombre: '../tokens' });
    expect(r.isError).toBe(true);
  });
});

describe('revisar_color', () => {
  it('color de la paleta', async () => {
    const r = await llamar('revisar_color', { color: '#043565' });
    expect(r.s).toMatchObject({ enPaleta: true, token: 'color.azul' });
  });
  it('color fuera de la paleta con ΔE', async () => {
    const r = await llamar('revisar_color', { color: '#0A3D80' });
    expect(r.s.enPaleta).toBe(false);
    expect(r.s.masCercano.token).toBe('color.azul');
    expect(r.s.masCercano.deltaE).toBeGreaterThan(0);
    expect(r.texto).toMatch(/ΔE/);
  });
  it('color ilegible da un error en español', async () => {
    const r = await llamar('revisar_color', { color: 'azulito' });
    expect(r.isError).toBe(true);
    expect(r.texto).toMatch(/No entiendo el color/);
  });
});

describe('revisar_contraste', () => {
  it('tinta sobre fondo: AAA', async () => {
    const r = await llamar('revisar_contraste', { texto: 'color.tinta', fondo: 'color.fondo' });
    expect(r.s.AAA).toEqual({ normal: true, grande: true });
    expect(r.s.paresDeLaMarca).toBe('permitido');
    expect(r.s.razon).toBeGreaterThan(15);
  });
  it('acepta colores escritos', async () => {
    const r = await llamar('revisar_contraste', { texto: '#000', fondo: '#fff' });
    expect(r.s.razon).toBe(21);
  });
  it('apagado sobre suave: no cumple AA normal y está prohibido', async () => {
    const r = await llamar('revisar_contraste', { texto: 'color.apagado', fondo: 'color.suave' });
    expect(r.s.AA.normal).toBe(false);
    expect(r.s.AA.grande).toBe(true);
    expect(r.s.paresDeLaMarca).toBe('prohibido');
    expect(r.texto).toMatch(/prohibido/);
  });
  it('mismo color: 1:1 y no cumple nada', async () => {
    const r = await llamar('revisar_contraste', { texto: '#777', fondo: '#777' });
    expect(r.s.razon).toBe(1);
    expect(r.s.AA.grande).toBe(false);
    expect(r.texto).toMatch(/NO cumple/);
  });
  it('un color inválido da error', async () => {
    expect((await llamar('revisar_contraste', { texto: 'nada', fondo: '#fff' })).isError).toBe(true);
    expect((await llamar('revisar_contraste', { texto: '#fff', fondo: 'nada' })).isError).toBe(true);
  });
});

describe('auditar_codigo', () => {
  it('devuelve hallazgos con línea y token sugerido', async () => {
    const r = await llamar('auditar_codigo', { lenguaje: 'css', codigo: 'h1 {\n  color: #333;\n  font-family: Inter;\n  border-radius: 8px;\n}' });
    expect(r.s.resumen).toMatchObject({ errores: 3, cumple: false });
    expect(r.s.hallazgos.map((h: any) => [h.linea, h.tipo])).toEqual([[2, 'color'], [3, 'fuente'], [4, 'radio']]);
    expect(r.texto).toMatch(/L2:/);
  });
  it('código limpio cumple', async () => {
    const r = await llamar('auditar_codigo', { lenguaje: 'css', codigo: 'a { color: var(--color-azul); }' });
    expect(r.s.resumen.cumple).toBe(true);
    expect(r.texto).toMatch(/Sin hallazgos/);
  });
  it('valida entrada: vacío, lenguaje inválido y demasiado largo', async () => {
    expect((await llamar('auditar_codigo', { lenguaje: 'css', codigo: '' })).isError).toBe(true);
    expect((await llamar('auditar_codigo', { lenguaje: 'python', codigo: 'x' })).isError).toBe(true);
    expect((await llamar('auditar_codigo', { lenguaje: 'css', codigo: 'a'.repeat(200_001) })).isError).toBe(true);
  });
  it('no modifica nada: devuelve el mismo resultado dos veces', async () => {
    const a = await llamar('auditar_codigo', { lenguaje: 'css', codigo: 'a{color:#123456}' });
    const b = await llamar('auditar_codigo', { lenguaje: 'css', codigo: 'a{color:#123456}' });
    expect(a.s).toEqual(b.s);
  });
});

describe('revisar_texto', () => {
  it('el título incorrecto es error', async () => {
    const r = await llamar('revisar_texto', { texto: 'Soy un Product Designer apasionado.' });
    expect(r.s.hallazgos.map((h: any) => h.regla)).toEqual(['titulo-incorrecto', 'palabra-prohibida']);
    expect(r.s.resumen.cumple).toBe(false);
  });
  it('contexto cliente activa el trato de usted', async () => {
    const g = await llamar('revisar_texto', { texto: 'Si quieres, escríbeme.' });
    const c = await llamar('revisar_texto', { texto: 'Si quieres, escríbeme.', contexto: 'cliente' });
    expect(g.s.hallazgos).toHaveLength(0);
    expect(c.s.hallazgos.map((h: any) => h.regla)).toEqual(['trato-usted', 'trato-usted']);
  });
  it('texto correcto cumple', async () => {
    const r = await llamar('revisar_texto', { texto: 'Diseñador UI/UX. Interfaces pensadas para implementarse.' });
    expect(r.s.resumen).toMatchObject({ total: 0, cumple: true });
  });
  it('valida entrada: texto vacío y contexto inválido', async () => {
    expect((await llamar('revisar_texto', { texto: '' })).isError).toBe(true);
    expect((await llamar('revisar_texto', { texto: 'hola', contexto: 'amigo' })).isError).toBe(true);
  });
});

describe('exportar_tokens', () => {
  for (const [formato, marca] of [['css', ':root {'], ['tailwind4', '@theme {'], ['scss', '$color-azul: #043565;'], ['json', '"color.azul": "#043565"']] as const) {
    it(`formato ${formato}`, async () => {
      const r = await llamar('exportar_tokens', { formato });
      expect(r.s.contenido).toContain(marca);
      expect(r.s.formato).toBe(formato);
    });
  }
  it('rechaza un formato inválido', async () => {
    expect((await llamar('exportar_tokens', { formato: 'less' })).isError).toBe(true);
  });
});

describe('obtener_asset', () => {
  it('logo claro y oscuro', async () => {
    expect((await llamar('obtener_asset', { nombre: 'logo', variante: 'claro' })).s.archivo).toBe('logo-claro.svg');
    expect((await llamar('obtener_asset', { nombre: 'logo', variante: 'oscuro' })).s.svg).toMatch(/^<svg/);
  });
  it('motivo mini según el fondo', async () => {
    expect((await llamar('obtener_asset', { nombre: 'motivo', variante: 'mini' })).s.archivo).toBe('motivo-mini-claro.svg');
    const r = await llamar('obtener_asset', { nombre: 'motivo', variante: 'mini', fondo: 'oscuro' });
    expect(r.s).toMatchObject({ archivo: 'motivo-mini-oscuro.svg', variante: 'mini-oscuro', uri: 'marca://assets/motivo-mini-oscuro' });
  });
  it('el logo no tiene versión mini', async () => {
    const r = await llamar('obtener_asset', { nombre: 'logo', variante: 'mini' });
    expect(r.isError).toBe(true);
    expect(r.texto).toMatch(/no tiene versión mini/);
  });
  it('rechaza nombres inválidos', async () => {
    expect((await llamar('obtener_asset', { nombre: '../tokens', variante: 'claro' })).isError).toBe(true);
  });
});

describe('solo lectura', () => {
  it('el código fuente del servidor no escribe archivos ni usa la red', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const base = join(import.meta.dirname, '..', 'src');
    const archivos = [...readdirSync(base).map((f) => join(base, f)), ...readdirSync(join(base, 'nucleo')).map((f) => join(base, 'nucleo', f))].filter((f) => f.endsWith('.ts'));
    for (const f of archivos.filter((x) => !x.endsWith('http-nodo.ts'))) { // http-nodo.ts solo ESCUCHA conexiones; no hace llamadas salientes
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/writeFile|appendFile|createWriteStream|unlinkSync|rmSync|mkdirSync|(?:await|return|=)\s+fetch\(|globalThis\.fetch|\bhttps?\.request|\bnet\.connect|node:https?\b|node:net\b|XMLHttpRequest/);
    }
  });
});
