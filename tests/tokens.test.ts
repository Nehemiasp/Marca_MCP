import { describe, expect, it } from 'vitest';
import { cargarTokens, CATEGORIAS, coloresDeLaMarca, subarbol } from '../src/nucleo/tokens.js';
import { validarTokens } from '../src/nucleo/validador.js';
import { leerTokensCrudos } from '../src/nucleo/tokens.js';
import { rutaSegura } from '../src/nucleo/rutas.js';

const base = () => structuredClone(leerTokensCrudos());

describe('tokens.json de la marca', () => {
  it('es válido (DTCG, referencias y contraste)', () => {
    const informe = validarTokens(leerTokensCrudos());
    expect(informe.errores).toEqual([]);
  });
  it('contiene los tokens conocidos con su valor', () => {
    const { porRuta } = cargarTokens();
    expect(porRuta.get('color.azul')?.valor).toBe('#043565');
    expect(porRuta.get('color.oscuro.acento')?.valor).toBe('#8DB6E8');
    expect(porRuta.get('color.oscuro.texto')?.valor).toBe('#FFFFFF'); // referencia resuelta
    expect(porRuta.get('color.oscuro.texto')?.valorOriginal).toBe('{color.blanco}');
  });
  it('cada categoría existe y tiene tokens', () => {
    const { tokens } = cargarTokens();
    for (const c of CATEGORIAS) expect(tokens.some((t) => t.categoria === c)).toBe(true);
    expect(Object.keys(subarbol('radio'))).toContain('pill');
  });
  it('lista los colores de la paleta como #RRGGBB', () => {
    const colores = coloresDeLaMarca();
    expect(colores.length).toBeGreaterThanOrEqual(12);
    expect(colores.every((x) => /^#[0-9A-F]{6}$/.test(x.hex))).toBe(true);
  });
});

describe('validador', () => {
  it('detecta un color mal escrito', () => {
    const t = base();
    (t['color'] as any).tinta.$value = 'negro';
    expect(validarTokens(t).errores.join('\n')).toMatch(/color\.tinta.*color inválido/);
  });
  it('detecta referencias que no existen', () => {
    const t = base();
    (t['color'] as any).oscuro.texto.$value = '{color.nada}';
    expect(validarTokens(t).errores.join('\n')).toMatch(/color\.nada.*no existe/);
  });
  it('detecta referencias circulares', () => {
    const t = base();
    (t['color'] as any).tinta.$value = '{color.texto}';
    (t['color'] as any).texto.$value = '{color.tinta}';
    expect(validarTokens(t).errores.join('\n')).toMatch(/circular/);
  });
  it('detecta una referencia a otro tipo', () => {
    const t = base();
    (t['color'] as any).tinta.$value = '{radio.sm}';
    expect(validarTokens(t).errores.join('\n')).toMatch(/otro tipo/);
  });
  it('exige descripción en cada token', () => {
    const t = base();
    delete (t['color'] as any).tinta.$description;
    expect(validarTokens(t).errores.join('\n')).toMatch(/falta «\$description»/);
  });
  it('detecta contraste insuficiente en un par declarado', () => {
    const t = base();
    (t['color'] as any).apagado.$value = '#BBBBBB';
    expect(validarTokens(t).errores.join('\n')).toMatch(/Contraste insuficiente: color\.apagado sobre color\.fondo/);
  });
  it('acepta un par justo en el límite AA (4.5:1)', () => {
    const t = base();
    // #767676 sobre blanco ≈ 4.54:1
    (t['color'] as any).apagado.$value = '#767676';
    (t['color'] as any).fondo.$value = '#FFFFFF';
    expect(validarTokens(t).errores.filter((e) => e.includes('color.apagado sobre color.fondo'))).toEqual([]);
  });
  it('detecta un par que apunta a un token inexistente', () => {
    const t = base();
    (t['$extensions'] as any).marca.pares.push({ texto: 'color.fantasma', fondo: 'color.fondo', nivel: 'AA', uso: 'x' });
    expect(validarTokens(t).errores.join('\n')).toMatch(/color\.fantasma.*no existe/);
  });
});

describe('rutas seguras', () => {
  it('no permite salir de la carpeta marca/', () => {
    expect(() => rutaSegura('..', 'package.json')).toThrow();
    expect(() => rutaSegura('componentes', '..', '..', 'CLAUDE.md')).toThrow();
    expect(rutaSegura('tokens.json')).toMatch(/marca[\\/]tokens\.json$/);
  });
});
