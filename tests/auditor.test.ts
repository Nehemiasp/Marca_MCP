import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
    expect(h.map((x) => x.valor)).toEqual(['Inter', 'Arial', 'sans-serif']); // la genérica no sirve de respaldo de fuentes ajenas
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

describe('auditar_codigo · familias genéricas solo como respaldo', () => {
  const v = (css: string) => auditarCodigo(css, 'css').map((h) => `${h.severidad}:${h.valor}`);
  it('una genérica sola no pasa', () => {
    expect(v('body{font-family:sans-serif}')).toEqual(['error:sans-serif']);
    expect(v('code{font-family:monospace}')).toEqual(['error:monospace']);
    expect(v('p{font-family:system-ui, sans-serif}')).toEqual(['error:system-ui']); // un solo error por lista
  });
  it('una genérica antes de la fuente de la marca no pasa', () => {
    expect(v('p{font-family:system-ui, "Instrument Sans"}')).toEqual(['error:system-ui']);
    expect(auditarCodigo('p{font-family:system-ui, "Instrument Sans"}', 'css')[0]!.mensaje).toMatch(/antes de la fuente de la marca/);
  });
  it('después de una fuente de la marca sí vale como respaldo', () => {
    expect(v('p{font-family:"Instrument Sans", system-ui, sans-serif}')).toEqual([]);
    expect(v('h1{font-family:"Bricolage Grotesque", "Instrument Sans", sans-serif}')).toEqual([]);
  });
  it('var(), inherit y similares no se marcan', () => {
    expect(v('p{font-family:var(--font-texto)}')).toEqual([]);
    expect(v('code{font-family:var(--font-codigo)}')).toEqual([]);
    expect(v('p{font-family:inherit}')).toEqual([]);
    expect(v('p{font-family:unset}')).toEqual([]);
  });
  it('una fuente concreta de la pila de código escrita a mano sigue fallando', () => {
    expect(v('code{font-family:Consolas, monospace}')).toEqual(['error:Consolas', 'error:monospace']);
  });
  it('en JSX también', () => {
    expect(auditarCodigo("<p style={{ fontFamily: 'sans-serif' }} />", 'jsx').map((h) => h.tipo)).toEqual(['fuente']);
  });
});

describe('auditar_codigo · rx / ry de SVG', () => {
  const rx = (svg: string, l: 'html' | 'jsx' = 'html') => auditarCodigo(svg, l).filter((h) => h.tipo === 'radio');
  it('un radio fuera de la escala es error con el token más cercano', () => {
    const h = rx('<svg><rect width="26" height="26" rx="5" fill="var(--color-tinta)"/></svg>');
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ severidad: 'error', valor: 'rx="5"', regla: 'R-FORMA-1' });
    expect(h[0]!.token).toBe('radio.sm'); // 5 queda a igual distancia de 4 y 6: gana el primero de la escala
  });
  it('señala la línea y la columna del atributo, también en etiquetas de varias líneas', () => {
    const h = rx('<svg>\n  <rect\n    width="26" height="26"\n    rx="5"/>\n</svg>');
    expect(h[0]).toMatchObject({ linea: 4, columna: 5 });
  });
  it('un radio de la escala es válido', () => {
    expect(rx('<rect width="26" height="26" rx="4"/>')).toEqual([]);
    expect(rx('<rect width="40" height="40" rx="10"/>')).toEqual([]);
    expect(rx('<rect width="100" height="100" rx="14"/>')).toEqual([]);
  });
  it('una píldora (rx ≥ mitad de la altura) es válida, y en el límite exacto también', () => {
    expect(rx('<rect width="110" height="26" rx="13"/>')).toEqual([]);
    expect(rx('<rect width="110" height="26" rx="12.9"/>')).toHaveLength(1);
    expect(rx('<rect width="212" height="100" rx="50"/>')).toEqual([]);
  });
  it('ry se revisa igual, y rx="0" o sin rx no genera nada', () => {
    expect(rx('<rect width="26" height="26" ry="5"/>')).toHaveLength(1);
    expect(rx('<rect width="26" height="26" rx="0"/>')).toEqual([]);
    expect(rx('<rect width="26" height="26"/>')).toEqual([]);
  });
  it('JSX: rx={5} y rx="5"', () => {
    expect(rx('<rect width={26} height={26} rx={5} />', 'jsx')).toHaveLength(1);
    expect(rx('<rect width="26" height="26" rx="4px" />', 'jsx')).toEqual([]);
  });
  it('solo mira <rect>: un <ellipse> no es una esquina redondeada', () => {
    expect(rx('<ellipse cx="10" cy="10" rx="5" ry="3"/>')).toEqual([]);
  });
  it('no se revisa en CSS puro', () => {
    expect(auditarCodigo('rect{rx:5}', 'css').filter((h) => h.tipo === 'radio')).toEqual([]);
  });
  it('los SVG oficiales de la marca no tienen errores de radio', () => {
    for (const f of ['logo-claro', 'logo-oscuro', 'motivo-claro', 'motivo-oscuro', 'motivo-mini-claro', 'motivo-mini-oscuro']) {
      const svg = readFileSync(join(import.meta.dirname, '..', 'marca', 'assets', `${f}.svg`), 'utf8');
      expect(rx(svg).filter((h) => h.severidad === 'error'), f).toEqual([]);
    }
  });
});

describe('auditar_codigo · @font-face', () => {
  const v = (css: string) => auditarCodigo(css, 'css').map((h) => h.valor);
  it('declarar las fuentes de la marca y la de código es válido', () => {
    expect(v('@font-face{font-family:"Instrument Sans";font-weight:400;src:url(a.woff2)}')).toEqual([]);
    expect(v('@font-face{font-family:"JetBrains Mono";src:url(a.woff2)}')).toEqual([]);
  });
  it('en varias líneas también', () => {
    expect(v('@font-face {\n  font-family: "Bricolage Grotesque";\n  font-weight: 800;\n  src: url(a.woff2);\n}')).toEqual([]);
  });
  it('cargar otra fuente sigue siendo error', () => {
    expect(v('@font-face{font-family:"Inter";src:url(a.woff2)}')).toEqual(['Inter']);
    expect(auditarCodigo('@font-face{font-family:"Inter";src:url(a.woff2)}', 'css')[0]!.mensaje).toMatch(/@font-face carga/);
  });
  it('usar JetBrains Mono a mano fuera de un @font-face sigue siendo error (solo entra por el token)', () => {
    expect(v('code{font-family:"JetBrains Mono", monospace}')).toEqual(['JetBrains Mono', 'monospace']);
  });
  it('una regla normal después de un @font-face no hereda la excepción', () => {
    expect(v('@font-face{font-family:"JetBrains Mono";src:url(a.woff2)}\ncode{font-family:"JetBrains Mono", monospace}')).toEqual(['JetBrains Mono', 'monospace']);
  });
});

describe('auditar_codigo · listas de familias que empiezan con comillas', () => {
  const v = (css: string, l: 'css' | 'html' | 'jsx' = 'css') => auditarCodigo(css, l).map((h) => h.valor);
  it('revisa toda la lista aunque la primera familia vaya entre comillas', () => {
    expect(v('p{font-family:"Instrument Sans", Arial, sans-serif}')).toEqual(['Arial']);
    expect(v('p{font-family:"Inter", "Instrument Sans"}')).toEqual(['Inter']);
    expect(v("p{font-family:'Roboto', Georgia, serif}")).toEqual(['Roboto', 'Georgia', 'serif']);
  });
  it('una sola familia entre comillas sigue funcionando', () => {
    expect(v('p{font-family:"Instrument Sans"}')).toEqual([]);
    expect(v('p{font-family:"Inter"}')).toEqual(['Inter']);
  });
  it('en HTML con style y !important', () => {
    expect(v('<p style="font-family: \'Inter\', Arial">x</p>', 'html')).toEqual(['Inter', 'Arial']);
    expect(v('p{font-family:"Instrument Sans", Arial !important}')).toEqual(['Arial']);
  });
  it('JSX con la lista completa entre comillas', () => {
    expect(v("<p style={{ fontFamily: 'Instrument Sans, Arial' }} />", 'jsx')).toEqual(['Arial']);
  });
});

describe('auditar_codigo · font-family como atributo (SVG)', () => {
  const v = (c: string) => auditarCodigo(c, 'html').map((h) => h.valor);
  it('el atributo con comillas dobles y nombres con comillas simples es válido si usa la marca', () => {
    const logo = `<text font-family="'Bricolage Grotesque', 'Instrument Sans', system-ui, sans-serif" font-weight="800">Nehemias</text>`;
    expect(v(logo)).toEqual([]);
  });
  it('también en el logo oficial', () => {
    const svg = readFileSync(join(import.meta.dirname, '..', 'marca', 'assets', 'logo-claro.svg'), 'utf8');
    expect(auditarCodigo(svg, 'html').filter((h) => h.tipo === 'fuente')).toEqual([]);
  });
  it('una fuente ajena en el atributo se señala sin comillas sobrantes', () => {
    expect(v(`<text font-family="'Inter', Arial, sans-serif">x</text>`)).toEqual(['Inter', 'Arial', 'sans-serif']);
    expect(v(`<text font-family='Georgia'>x</text>`)).toEqual(['Georgia']);
  });
});
