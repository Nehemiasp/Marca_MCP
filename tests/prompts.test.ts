import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conectar } from './cliente.js';

let ctx: Awaited<ReturnType<typeof conectar>>;
beforeAll(async () => { ctx = await conectar(); });
afterAll(async () => { await ctx.cerrar(); });

const textoDe = (m: any) => (m.content.type === 'text' ? m.content.text : '');
const uris = (messages: any[]) => messages.filter((m) => m.content.type === 'resource').map((m) => m.content.resource.uri);

describe('prompts MCP', () => {
  it('lista los tres prompts con sus argumentos', async () => {
    const { prompts } = await ctx.cliente.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual(['crear_componente', 'pieza_de_marca', 'revisar_pantalla']);
    const crear = prompts.find((p) => p.name === 'crear_componente')!;
    expect(crear.arguments?.map((a) => a.name)).toEqual(['nombre', 'formato']);
    expect(crear.arguments?.every((a) => a.required)).toBe(true);
    const revisar = prompts.find((p) => p.name === 'revisar_pantalla')!;
    expect(revisar.arguments?.find((a) => a.name === 'lenguaje')?.required).toBeFalsy();
  });

  it('crear_componente arma tokens, reglas y componentes parecidos', async () => {
    const r = await ctx.cliente.getPrompt({ name: 'crear_componente', arguments: { nombre: 'aviso de cookies', formato: 'react' } });
    const u = uris(r.messages);
    expect(u).toEqual(expect.arrayContaining(['marca://tokens', 'marca://reglas']));
    expect(u.some((x) => x.startsWith('marca://componentes/'))).toBe(true);
    const t = textoDe(r.messages[0]);
    expect(t).toMatch(/React \+ Tailwind v4/);
    expect(t).toMatch(/auditar_codigo/);
    expect(t).toMatch(/aviso de cookies/);
  });

  it('crear_componente reconoce un componente que ya existe', async () => {
    const r = await ctx.cliente.getPrompt({ name: 'crear_componente', arguments: { nombre: 'boton', formato: 'html' } });
    expect(textoDe(r.messages[0])).toMatch(/Ya existe un componente llamado «boton»/);
    expect(uris(r.messages)).toContain('marca://componentes/boton');
  });

  it('crear_componente rechaza un formato inválido o un nombre vacío', async () => {
    await expect(ctx.cliente.getPrompt({ name: 'crear_componente', arguments: { nombre: 'x y', formato: 'vue' } })).rejects.toThrow();
    await expect(ctx.cliente.getPrompt({ name: 'crear_componente', arguments: { nombre: '', formato: 'html' } })).rejects.toThrow();
    await expect(ctx.cliente.getPrompt({ name: 'crear_componente', arguments: { nombre: 'tabla' } })).rejects.toThrow();
  });

  it('revisar_pantalla con código incluye el código y pide las herramientas de revisión', async () => {
    const r = await ctx.cliente.getPrompt({ name: 'revisar_pantalla', arguments: { entrada: 'a { color: #333; }', lenguaje: 'css' } });
    const t = textoDe(r.messages[0]);
    expect(t).toMatch(/auditar_codigo/);
    expect(t).toMatch(/revisar_contraste/);
    expect(t).toContain('a { color: #333; }');
    expect(t).toMatch(/No corrija el archivo/);
    expect(uris(r.messages)).toEqual(['marca://reglas', 'marca://voz']);
  });

  it('revisar_pantalla con descripción cambia los pasos y usa HTML por omisión', async () => {
    const d = await ctx.cliente.getPrompt({ name: 'revisar_pantalla', arguments: { entrada: 'Un hero con fondo azul degradado', lenguaje: 'descripcion' } });
    expect(textoDe(d.messages[0])).toMatch(/Deduzca los colores/);
    const h = await ctx.cliente.getPrompt({ name: 'revisar_pantalla', arguments: { entrada: '<p>hola</p>' } });
    expect(textoDe(h.messages[0])).toMatch(/lenguaje «html»/);
  });

  it('pieza_de_marca trae portada, motivo, voz y reglas para una propuesta', async () => {
    const r = await ctx.cliente.getPrompt({ name: 'pieza_de_marca', arguments: { tipo: 'propuesta', brief: 'Rediseño de panel para una pyme' } });
    const u = uris(r.messages);
    expect(u).toEqual(expect.arrayContaining(['marca://voz', 'marca://reglas', 'marca://tokens', 'marca://componentes/portada-de-documento', 'marca://componentes/motivo-de-cuadros']));
    const t = textoDe(r.messages[0]);
    expect(t).toMatch(/usted/);
    expect(t).toContain('Rediseño de panel para una pyme');
    expect(t).toMatch(/A4/);
  });

  for (const [tipo, formato] of [['tarjeta', '85 × 55'], ['redes', '1080 × 1350'], ['presentacion', '16:9']] as const) {
    it(`pieza_de_marca · ${tipo}`, async () => {
      const r = await ctx.cliente.getPrompt({ name: 'pieza_de_marca', arguments: { tipo, brief: 'prueba' } });
      expect(textoDe(r.messages[0])).toContain(formato);
      expect(uris(r.messages)).toContain('marca://componentes/motivo-de-cuadros');
    });
  }

  it('pieza_de_marca rechaza un tipo inválido', async () => {
    await expect(ctx.cliente.getPrompt({ name: 'pieza_de_marca', arguments: { tipo: 'volante', brief: 'x' } })).rejects.toThrow();
  });
});
