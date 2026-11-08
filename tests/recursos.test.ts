import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conectar } from './cliente.js';

let ctx: Awaited<ReturnType<typeof conectar>>;
beforeAll(async () => { ctx = await conectar(); });
afterAll(async () => { await ctx.cerrar(); });

const leer = async (uri: string) => {
  const r = await ctx.cliente.readResource({ uri });
  const c = r.contents[0]!;
  return { ...c, texto: 'text' in c ? c.text : '' };
};

describe('recursos MCP', () => {
  it('lista los recursos fijos y las instancias de las plantillas', async () => {
    const { resources } = await ctx.cliente.listResources();
    const uris = resources.map((r) => r.uri);
    for (const u of ['marca://tokens', 'marca://componentes', 'marca://reglas', 'marca://voz', 'marca://tokens/color', 'marca://componentes/boton', 'marca://assets/motivo-claro'])
      expect(uris, u).toContain(u);
  });

  it('lista las plantillas de recursos', async () => {
    const { resourceTemplates } = await ctx.cliente.listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate).sort()).toEqual([
      'marca://assets/{nombre}', 'marca://componentes/{nombre}', 'marca://tokens/{categoria}'
    ]);
  });

  it('marca://tokens devuelve el JSON completo y válido', async () => {
    const r = await leer('marca://tokens');
    expect(r.mimeType).toBe('application/json');
    const json = JSON.parse(r.texto);
    expect(json.color.azul.$value).toBe('#043565');
  });

  it('marca://tokens/{categoria} devuelve solo esa categoría', async () => {
    const json = JSON.parse((await leer('marca://tokens/radio')).texto);
    expect(Object.keys(json)).toEqual(['radio']);
    expect(json.radio.pill.$value).toBe('999px');
  });

  it('una categoría inexistente da error claro', async () => {
    await expect(ctx.cliente.readResource({ uri: 'marca://tokens/magia' })).rejects.toThrow(/no existe/);
  });

  it('marca://componentes devuelve el índice con los nueve componentes', async () => {
    const indice = JSON.parse((await leer('marca://componentes')).texto) as { nombre: string; uri: string }[];
    expect(indice).toHaveLength(9);
    expect(indice.find((c) => c.nombre === 'boton')?.uri).toBe('marca://componentes/boton');
  });

  it('marca://componentes/{nombre} devuelve el markdown', async () => {
    const r = await leer('marca://componentes/aviso-destacado');
    expect(r.mimeType).toBe('text/markdown');
    expect(r.texto).toContain('# Aviso destacado');
  });

  it('un componente inexistente da error', async () => {
    await expect(ctx.cliente.readResource({ uri: 'marca://componentes/nada' })).rejects.toThrow(/no existe/);
  });

  it('marca://reglas y marca://voz devuelven markdown', async () => {
    expect((await leer('marca://reglas')).texto).toContain('Sin degradados');
    expect((await leer('marca://voz')).texto).toContain('Diseñador UI/UX');
  });

  it('marca://assets/{nombre} devuelve un SVG', async () => {
    const r = await leer('marca://assets/motivo-mini-oscuro');
    expect(r.mimeType).toBe('image/svg+xml');
    expect(r.texto.startsWith('<svg')).toBe(true);
  });

  it('un asset inexistente o con ruta peligrosa da error', async () => {
    await expect(ctx.cliente.readResource({ uri: 'marca://assets/nada' })).rejects.toThrow();
    await expect(ctx.cliente.readResource({ uri: 'marca://assets/..%2Ftokens' })).rejects.toThrow();
  });

  it('el servidor publica instrucciones en español', () => {
    expect(ctx.cliente.getInstructions()).toMatch(/solo lectura/);
  });
});
