import { describe, expect, it } from 'vitest';
import { auditarCodigo, resumirHallazgos } from '../src/nucleo/auditor.js';

const tipos = (codigo: string, lenguaje: 'css' | 'html' | 'jsx') => auditarCodigo(codigo, lenguaje).map((h) => `${h.tipo}:${h.severidad}`);

describe('auditar_codigo · colores', () => {
  it('señala un color fuera de la paleta con línea, token cercano y ΔE', () => {
    const h = auditarCodigo('a { color: #333; }\n.b { background: #0A3D80; }', 'css');
    const azul = h.find((x) => x.linea === 2)!;
    expect(azul.severidad).toBe('error');
    expect(azul.token).toBe('color.azul');
    expect(azul.mensaje).toMatch(/ΔE/);
    expect(azul.sugerencia).toContain('var(--color-azul)');
    expect(h.find((x) => x.linea === 1)?.severidad).toBe('error');
  });
  it('un valor correcto pero escrito a mano es un aviso, no un error', () => {
    const h = auditarCodigo('a { color: #043565; }', 'css');
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ severidad: 'aviso', token: 'color.azul', regla: 'R-COLOR-1' });
  });
  it('var(--color-…) no genera hallazgos', () => {
    expect(auditarCodigo('a { color: var(--color-azul); background: var(--color-fondo); }', 'css')).toEqual([]);
  });
  it('la definición de variables con valores de la paleta no se marca, pero con valores ajenos sí', () => {
    expect(auditarCodigo(':root {\n  --color-tinta: #0E1116;\n}', 'css')).toEqual([]);
    expect(auditarCodigo(':root {\n  --primario: #FF5500;\n}', 'css')[0]?.severidad).toBe('error');
  });
  it('entiende rgb(), hsl(), #abc y nombres', () => {
    expect(tipos('a{color:rgb(14,17,22)}', 'css')).toEqual(['color:aviso']);
    expect(tipos('a{color:hsl(0,100%,50%)}', 'css')).toEqual(['color:error']);
    expect(tipos('a{color:#fff}', 'css')).toEqual(['color:aviso']);
    expect(tipos('a{background: black}', 'css')).toEqual(['color:error']);
  });
  it('ignora anclas y referencias url(#id)', () => {
    expect(auditarCodigo('<a href="#abc">x</a><rect fill="url(#fade)"/>', 'html')).toEqual([]);
  });
  it('ignora comentarios y conserva los números de línea', () => {
    const h = auditarCodigo('/* color: #ff0000 */\n\n.a { color: #ff0000; }', 'css');
    expect(h).toHaveLength(1);
    expect(h[0]!.linea).toBe(3);
  });
  it('en Tailwind señala la paleta por defecto y bg-white/bg-black', () => {
    const h = auditarCodigo('<div className="bg-gray-100 text-blue-600 border-white bg-black bg-tinta text-azul">', 'jsx');
    expect(h.map((x) => x.valor).sort()).toEqual(['bg-black', 'bg-gray-100', 'border-white', 'text-blue-600']);
    expect(h.find((x) => x.valor === 'border-white')?.severidad).toBe('aviso');
  });
  it('en CSS puro no interpreta clases de Tailwind', () => {
    expect(auditarCodigo('.bg-gray-100 { }', 'css')).toEqual([]);
  });
});

describe('auditar_codigo · fuentes', () => {
  it('permite las fuentes de la marca y las genéricas', () => {
    expect(auditarCodigo("body { font-family: 'Instrument Sans', system-ui, sans-serif; }", 'css')).toEqual([]);
    expect(auditarCodigo('h1 { font-family: "Bricolage Grotesque", sans-serif; }', 'css')).toEqual([]);
  });
  it('señala fuentes ajenas', () => {
    const h = auditarCodigo('body { font-family: Inter, Arial, sans-serif; }', 'css');
    expect(h.map((x) => x.valor)).toEqual(['Inter', 'Arial']);
    expect(h[0]!.sugerencia).toContain('--font-texto');
  });
  it('señala fuentes en style de JSX, Google Fonts y utilidades de Tailwind', () => {
    expect(tipos("<p style={{ fontFamily: 'Roboto' }} />", 'jsx')).toContain('fuente:error');
    expect(tipos('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap" rel="stylesheet">', 'html')).toEqual(['fuente:error']);
    expect(tipos('<p class="font-sans font-[Inter]">', 'html')).toEqual(['fuente:error', 'fuente:error']);
    expect(auditarCodigo('<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;700">', 'html')).toEqual([]);
  });
  it('no marca var(--font-…)', () => {
    expect(auditarCodigo('p { font-family: var(--font-texto); }', 'css')).toEqual([]);
  });
});

describe('auditar_codigo · tamaños', () => {
  it('un tamaño fuera de la escala es error con el token más cercano', () => {
    const h = auditarCodigo('p { font-size: 17px; }', 'css');
    expect(h[0]).toMatchObject({ tipo: 'tamano', severidad: 'error', token: 'tipografia.tamano.base' });
  });
  it('un tamaño de la escala escrito a mano es aviso; rem se convierte', () => {
    expect(auditarCodigo('p { font-size: 16px; }', 'css')[0]).toMatchObject({ severidad: 'aviso', token: 'tipografia.tamano.base' });
    expect(auditarCodigo('p { font-size: 1.125rem; }', 'css')[0]).toMatchObject({ severidad: 'aviso', token: 'tipografia.tamano.lg' });
    expect(auditarCodigo('p { font-size: 1.3rem; }', 'css')[0]?.severidad).toBe('error');
  });
  it('no toca unidades de impresión ni var()', () => {
    expect(auditarCodigo('p { font-size: 11pt; font-size: var(--text-sm); }', 'css')).toEqual([]);
  });
  it('JSX: fontSize numérico y text-[..px] / text-7xl', () => {
    expect(tipos('<p style={{ fontSize: 15 }} />', 'jsx')).toEqual(['tamano:error']);
    expect(tipos('<p className="text-[15px] text-7xl text-lg" />', 'jsx')).toEqual(['tamano:error', 'tamano:error']);
  });
});

describe('auditar_codigo · radios, sombras y degradados', () => {
  it('radios', () => {
    expect(auditarCodigo('a { border-radius: 8px; }', 'css')[0]).toMatchObject({ tipo: 'radio', severidad: 'error', token: 'radio.sm' });
    expect(auditarCodigo('a { border-radius: 10px; }', 'css')[0]).toMatchObject({ severidad: 'aviso', token: 'radio.md' });
    expect(auditarCodigo('a { border-radius: 9999px; }', 'css')[0]).toMatchObject({ severidad: 'aviso', token: 'radio.pill' });
    expect(auditarCodigo('a { border-radius: var(--radius-md); }', 'css')).toEqual([]);
    expect(auditarCodigo('a { border-radius: 0; }', 'css')).toEqual([]);
  });
  it('radios en Tailwind', () => {
    const h = auditarCodigo('<div className="rounded rounded-xl rounded-[8px] rounded-full rounded-md rounded-lg">', 'jsx');
    expect(h.map((x) => `${x.valor}:${x.severidad}`)).toEqual(['rounded:error', 'rounded-xl:error', 'rounded-[8px]:error', 'rounded-full:aviso']);
  });
  it('«rounded» en prosa de HTML no se confunde con una clase', () => {
    expect(auditarCodigo('<p>Un botón rounded y una caja con shadow</p>', 'html')).toEqual([]);
  });
  it('sombras', () => {
    expect(auditarCodigo('a { box-shadow: 0 4px 12px rgba(0,0,0,.3); }', 'css').some((h) => h.tipo === 'sombra')).toBe(true);
    expect(auditarCodigo('a { box-shadow: none; box-shadow: var(--shadow-suave); }', 'css')).toEqual([]);
    expect(tipos('<div className="shadow-lg shadow-suave">', 'jsx')).toEqual(['sombra:error']);
  });
  it('degradados', () => {
    expect(tipos('a { background: linear-gradient(#0E1116, #043565); }', 'css')).toContain('degradado:error');
    expect(tipos('<div class="bg-gradient-to-r from-azul to-tinta">', 'html')).toEqual(['degradado:error']);
  });
});

describe('resumen y límites', () => {
  it('cuenta errores, avisos y tipos', () => {
    const r = resumirHallazgos(auditarCodigo('a { color: #043565; background: #123; border-radius: 3px; }', 'css'));
    expect(r).toMatchObject({ total: 3, errores: 2, avisos: 1, cumple: false });
    expect(r.porTipo).toEqual({ color: 2, radio: 1 });
  });
  it('código limpio cumple', () => {
    const r = resumirHallazgos(auditarCodigo('a { color: var(--color-tinta); padding: var(--spacing-md); }', 'css'));
    expect(r.cumple).toBe(true);
  });
  it('no se cuelga con código largo', () => {
    const largo = '.x { color: var(--color-tinta); }\n'.repeat(5000);
    const t = Date.now();
    expect(auditarCodigo(largo, 'css')).toEqual([]);
    expect(Date.now() - t).toBeLessThan(3000);
  });
});
