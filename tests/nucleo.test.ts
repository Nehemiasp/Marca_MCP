import { describe, expect, it } from 'vitest';
import { revisarColor, tokenMasCercano, interpretarDeltaE } from '../src/nucleo/paleta.js';
import { buscarComponentes, terminos } from '../src/nucleo/busqueda.js';
import { exportarTokens, nombreVariable, variablesDefinidas } from '../src/nucleo/exportadores.js';
import { codigoDe, listarComponentes } from '../src/nucleo/componentes.js';
import { leerColor } from '../src/nucleo/color.js';

describe('revisar_color (núcleo)', () => {
  it('un color de la paleta devuelve su token', () => {
    const r = revisarColor('#043565')!;
    expect(r).toMatchObject({ enPaleta: true, token: 'color.azul', variable: '--color-azul' });
    expect(r.masCercano.deltaE).toBe(0);
  });
  it('acepta formatos distintos del mismo color', () => {
    expect(revisarColor('rgb(4, 53, 101)')!.token).toBe('color.azul');
    expect(revisarColor('#0e1116')!.token).toBe('color.tinta');
  });
  it('blanco resuelve a color.blanco y no a color.oscuro.texto', () => {
    expect(revisarColor('#fff')!.token).toBe('color.blanco');
  });
  it('un color fuera de la paleta propone el más cercano con ΔE', () => {
    const r = revisarColor('#0A3D80')!;
    expect(r.enPaleta).toBe(false);
    expect(r.masCercano.token).toBe('color.azul');
    expect(r.masCercano.deltaE).toBeGreaterThan(2);
    expect(r.masCercano.deltaE).toBeLessThan(10);
  });
  it('un color casi idéntico lo señala como probable error de transcripción', () => {
    expect(revisarColor('#043566')!.veredicto).toMatch(/casi idéntico/);
  });
  it('devuelve null si no entiende el color', () => {
    expect(revisarColor('azulito')).toBeNull();
  });
  it('el más cercano de rojo puro es un token existente', () => {
    expect(tokenMasCercano(leerColor('#FF0000')!).deltaE).toBeGreaterThan(20);
  });
  it('interpreta ΔE por tramos', () => {
    expect([0.5, 1.5, 3, 7, 20].map(interpretarDeltaE)).toEqual(['imperceptible', 'apenas perceptible', 'perceptible a simple vista', 'claramente distinto', 'muy distinto']);
  });
});

describe('buscar_componente (núcleo)', () => {
  it('«algo para mostrar un aviso» encuentra el aviso destacado primero', () => {
    expect(buscarComponentes('algo para mostrar un aviso')[0]!.nombre).toBe('aviso-destacado');
  });
  it('encuentra por sinónimos y plurales', () => {
    expect(buscarComponentes('tabla de precios')[0]!.nombre).toBe('tabla');
    expect(buscarComponentes('tarjetas de mis proyectos')[0]!.nombre).toBe('tarjeta-de-proyecto');
    expect(buscarComponentes('CTA')[0]!.nombre).toBe('boton');
    expect(buscarComponentes('portada de una propuesta')[0]!.nombre).toBe('portada-de-documento');
    expect(buscarComponentes('código QR y correo')[0]!.nombre).toBe('bloque-de-contacto');
  });
  it('ignora acentos y mayúsculas', () => {
    expect(buscarComponentes('PÍLDORA')[0]!.nombre).toBe('etiqueta');
  });
  it('respeta el límite y devuelve vacío si no hay nada', () => {
    expect(buscarComponentes('botón tarjeta tabla aviso', 2)).toHaveLength(2);
    expect(buscarComponentes('xyzzy qwerty')).toEqual([]);
    expect(buscarComponentes('de la el')).toEqual([]);
  });
  it('los términos se normalizan', () => {
    expect(terminos('Algo para mostrar un AVISO')).toEqual(['aviso']);
  });
});

describe('exportar_tokens (núcleo)', () => {
  it('css define todas las variables dentro de :root', () => {
    const { contenido } = exportarTokens('css');
    expect(contenido).toMatch(/:root \{/);
    expect(contenido).toContain('--color-azul: #043565;');
    expect(contenido).toContain('--font-titulo: "Bricolage Grotesque", "Instrument Sans", system-ui, sans-serif;');
    expect(contenido).toContain('--text-base--line-height: 26px;');
    expect(contenido).toContain('--shadow-suave: 0px 1px 2px 0px #0E11160F;');
    expect(contenido).toContain('--color-oscuro-texto: #FFFFFF;');
  });
  it('tailwind4 usa @theme', () => {
    const { contenido, archivoSugerido } = exportarTokens('tailwind4');
    expect(contenido).toMatch(/@theme \{/);
    expect(contenido).toContain('--radius-pill: 999px;');
    expect(archivoSugerido).toBe('marca.css');
  });
  it('scss usa variables $ y comentarios //', () => {
    const { contenido } = exportarTokens('scss');
    expect(contenido).toContain('$color-tinta: #0E1116;');
    expect(contenido).toContain('// Color');
    expect(contenido).not.toContain('/*');
  });
  it('json plano es parseable con rutas como claves', () => {
    const json = JSON.parse(exportarTokens('json').contenido);
    expect(json['color.azul']).toBe('#043565');
    expect(json['tipografia.peso.extranegrita']).toBe(800);
    expect(Object.keys(json).length).toBe(60);
  });
  it('los nombres de variable siguen la convención', () => {
    expect(nombreVariable('color.oscuro.acento')).toBe('--color-oscuro-acento');
    expect(nombreVariable('tipografia.interlineado.2xl')).toBe('--text-2xl--line-height');
    expect(nombreVariable('espaciado.base')).toBe('--spacing-base');
  });
  it('no hay dos tokens con el mismo nombre de variable', () => {
    expect(variablesDefinidas().size).toBe(60);
  });
});

describe('coherencia entre componentes y tokens', () => {
  it('todas las var(--…) de los ejemplos existen como tokens', () => {
    const definidas = variablesDefinidas();
    for (const c of listarComponentes()) {
      for (const f of ['html', 'impresion'] as const) {
        const codigo = codigoDe(c, f);
        const locales = new Set([...codigo.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!)); // variables definidas en el propio ejemplo
        for (const m of codigo.matchAll(/var\((--[\w-]+)/g)) {
          expect(definidas.has(m[1]!) || locales.has(m[1]!), `${c.nombre}/${f}: ${m[1]} no existe`).toBe(true);
        }
      }
    }
  });
  it('el código HTML y React de los componentes pasa su propia auditoría (sin errores)', async () => {
    const { auditarCodigo } = await import('../src/nucleo/auditor.js');
    for (const c of listarComponentes()) {
      const html = codigoDe(c, 'html').replace(/^```\w*\n|```$/gm, '');
      const react = codigoDe(c, 'react').replace(/^```\w*\n|```$/gm, '');
      const eh = auditarCodigo(html, 'html').filter((h) => h.severidad === 'error');
      const er = auditarCodigo(react, 'jsx').filter((h) => h.severidad === 'error');
      expect(eh, `${c.nombre} html: ${JSON.stringify(eh.map((x) => x.mensaje))}`).toEqual([]);
      expect(er, `${c.nombre} react: ${JSON.stringify(er.map((x) => x.mensaje))}`).toEqual([]);
    }
  });
});
