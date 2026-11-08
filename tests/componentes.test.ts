import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { cargarComponente, codigoDe, FORMATOS, listarComponentes, seccion, separarFrontmatter } from '../src/nucleo/componentes.js';
import { cargarTokens } from '../src/nucleo/tokens.js';
import { rutaSegura, leerTexto } from '../src/nucleo/rutas.js';

const ESPERADOS = [
  'aviso-destacado', 'bloque-de-contacto', 'boton', 'encabezado-de-seccion', 'etiqueta',
  'motivo-de-cuadros', 'portada-de-documento', 'tabla', 'tarjeta-de-proyecto'
];
const SECCIONES = ['Para qué sirve', 'Cuándo no usarlo', 'Variantes y estados', 'Tokens que usa', 'Accesibilidad', 'Ejemplos de código'];

describe('componentes documentados', () => {
  const todos = listarComponentes();

  it('están los nueve componentes pedidos', () => {
    expect(todos.map((c) => c.nombre).sort()).toEqual(ESPERADOS);
  });

  for (const nombre of ESPERADOS) {
    describe(nombre, () => {
      const c = cargarComponente(nombre)!;
      it('tiene frontmatter completo', () => {
        expect(c.nombre).toBe(nombre);
        expect(c.titulo).not.toBe('');
        expect(c.resumen.length).toBeGreaterThan(20);
        expect(c.palabras.length).toBeGreaterThan(3);
        expect(c.tokens.length).toBeGreaterThan(2);
      });
      it('usa solo tokens que existen', () => {
        const { porRuta } = cargarTokens();
        for (const t of c.tokens) expect(porRuta.has(t), `${nombre}: token «${t}» no existe`).toBe(true);
      });
      it('sigue la plantilla (secciones)', () => {
        for (const s of SECCIONES) expect(seccion(c.cuerpo, s), `${nombre}: falta «${s}»`).not.toBe('');
      });
      it('trae código en HTML+CSS, React+Tailwind v4 e impresión', () => {
        for (const f of FORMATOS) {
          const codigo = codigoDe(c, f);
          expect(codigo, `${nombre}: sin código ${f}`).toMatch(/```/);
        }
      });
      it('el código de impresión usa @media print o @page', () => {
        expect(codigoDe(c, 'impresion')).toMatch(/@media print|@page/);
      });
    });
  }

  it('un nombre inválido o inexistente no carga nada', () => {
    expect(cargarComponente('no-existe')).toBeUndefined();
    expect(cargarComponente('../tokens')).toBeUndefined();
  });
});

describe('frontmatter', () => {
  it('lee valores y listas', () => {
    const { meta, cuerpo } = separarFrontmatter('---\nnombre: x\npalabras: [a, b , c]\n---\n# Hola');
    expect(meta['nombre']).toBe('x');
    expect(meta['palabras']).toEqual(['a', 'b', 'c']);
    expect(cuerpo).toBe('# Hola');
  });
  it('sin frontmatter devuelve el texto tal cual', () => {
    expect(separarFrontmatter('# Solo').cuerpo).toBe('# Solo');
  });
});

describe('archivos de la marca', () => {
  it('reglas y voz existen y tienen contenido clave', () => {
    expect(leerTexto('reglas.md')).toMatch(/solo acento/i);
    expect(leerTexto('reglas.md')).toMatch(/Sin degradados/);
    expect(leerTexto('voz.md')).toMatch(/Nunca «Product Designer»/);
  });
  it('los assets SVG y las fuentes existen', () => {
    for (const f of ['logo-claro', 'logo-oscuro', 'motivo-claro', 'motivo-oscuro', 'motivo-mini-claro', 'motivo-mini-oscuro'])
      expect(existsSync(rutaSegura('assets', `${f}.svg`))).toBe(true);
    for (const f of ['bricolage-grotesque-latin-800-normal', 'instrument-sans-latin-400-normal', 'instrument-sans-latin-500-normal', 'instrument-sans-latin-600-normal', 'instrument-sans-latin-700-normal'])
      expect(existsSync(rutaSegura('assets', 'fuentes', `${f}.woff2`))).toBe(true);
  });
  it('los SVG solo usan colores de la paleta', () => {
    const paleta = new Set(cargarTokens().tokens.filter((t) => t.tipo === 'color').map((t) => String(t.valor).toUpperCase()));
    for (const f of ['motivo-claro', 'motivo-oscuro', 'motivo-mini-claro', 'motivo-mini-oscuro', 'logo-claro', 'logo-oscuro']) {
      const svg = leerTexto('assets', `${f}.svg`);
      for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) expect(paleta.has(hex.toUpperCase()), `${f}: ${hex} fuera de paleta`).toBe(true);
      expect(svg).not.toMatch(/gradient/i);
    }
  });
});
