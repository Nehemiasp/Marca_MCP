import { describe, expect, it } from 'vitest';
import { leerReglasDeVoz, normalizarConLongitud, revisarTexto } from '../src/nucleo/voz.js';

const reglas = (t: string, c: 'general' | 'cliente' = 'general') => revisarTexto(t, { contexto: c }).map((h) => h.regla);

describe('voz.md', () => {
  it('se lee con todas sus listas', () => {
    const r = leerReglasDeVoz();
    expect(r.titulos.map((t) => t.termino)).toContain('Product Designer');
    expect(r.prohibidas.map((t) => t.termino)).toEqual(expect.arrayContaining(['innovador*', 'apasionad*', 'siguiente nivel', 'soluciones 360']));
    expect(r.relleno.length).toBeGreaterThan(5);
    expect(r.usted.find((t) => t.termino === 'tú')?.sugerencia).toBe('usted');
    expect(r.verificadas).toEqual([]);
  });
  it('normalizar conserva la longitud', () => {
    const s = 'Diseñador ÁÉÍ Úñ';
    expect(normalizarConLongitud(s)).toHaveLength(s.length);
    expect(normalizarConLongitud(s)).toBe('disenador aei un');
  });
});

describe('revisar_texto', () => {
  it('detecta el título incorrecto sin importar mayúsculas', () => {
    const h = revisarTexto('Soy Product Designer y también product designer.');
    expect(h.filter((x) => x.regla === 'titulo-incorrecto')).toHaveLength(2);
    expect(h[0]!.sugerencia).toBe('Diseñador UI/UX');
    expect(h[0]).toMatchObject({ linea: 1, columna: 5, fragmento: 'Product Designer', severidad: 'error' });
  });
  it('acepta «Diseñador UI/UX»', () => {
    expect(revisarTexto('Soy Diseñador UI/UX.')).toEqual([]);
  });
  it('detecta palabras prohibidas y sus variantes (comodín *), con y sin acentos', () => {
    expect(reglas('Un equipo innovador y apasionada.')).toEqual(['palabra-prohibida', 'palabra-prohibida']);
    expect(reglas('Llevamos todo al siguiente nivel con soluciones 360.')).toEqual(['palabra-prohibida', 'palabra-prohibida']);
    expect(reglas('INNOVADORES')).toEqual(['palabra-prohibida']);
  });
  it('no confunde palabras que solo contienen el término', () => {
    expect(reglas('Un estudio de innovaciones')).toEqual(['palabra-prohibida']);
    expect(reglas('Reinnovador')).toEqual([]); // no dentro de otra palabra
  });
  it('detecta frases de relleno como aviso', () => {
    const h = revisarTexto('En el mundo actual, hoy en día todo cambia.');
    expect(h.map((x) => x.regla)).toEqual(['relleno', 'relleno']);
    expect(h.every((x) => x.severidad === 'aviso')).toBe(true);
  });
  it('el trato de «tú» solo se revisa con contexto cliente', () => {
    const t = 'Si tú quieres, puedes escribirme y te respondo.';
    expect(reglas(t, 'general')).toEqual([]);
    const h = revisarTexto(t, { contexto: 'cliente' }).filter((x) => x.regla === 'trato-usted');
    expect(h.map((x) => x.fragmento.toLowerCase())).toEqual(['tú', 'quieres', 'puedes', 'te']);
    expect(h[1]!.sugerencia).toContain('quiere');
  });
  it('«usted» con clientes no genera hallazgos', () => {
    expect(revisarTexto('Si usted quiere, puede escribirme.', { contexto: 'cliente' })).toEqual([]);
  });
  it('marca cifras como por verificar', () => {
    const h = revisarTexto('Aumentó 40% la conversión, 3x más rápido, más de 20 clientes y 15 proyectos.');
    expect(h.filter((x) => x.regla === 'cifra-por-verificar').map((x) => x.fragmento)).toEqual(['40%', '3x', 'más de 20 clientes', '15 proyectos']);
    expect(h.every((x) => x.severidad === 'aviso')).toBe(true);
  });
  it('una cifra verificada en voz.md deja de marcarse', () => {
    const r = leerReglasDeVoz('## Cifras y clientes verificados\n- 15 proyectos entregados\n');
    expect(revisarTexto('Tengo 15 proyectos.', {}, r)).toEqual([]);
    expect(revisarTexto('Tengo 16 proyectos.', {}, r)).toHaveLength(1);
  });
  it('reporta línea y columna en textos de varias líneas', () => {
    const h = revisarTexto('Hola.\n\nSomos apasionados.');
    expect(h[0]).toMatchObject({ linea: 3, columna: 7 });
  });
  it('texto vacío o sin hallazgos devuelve lista vacía', () => {
    expect(revisarTexto('')).toEqual([]);
    expect(revisarTexto('Diseño interfaces pensadas para implementarse.')).toEqual([]);
  });
});
