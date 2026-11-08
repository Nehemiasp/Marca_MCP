import { leerTexto, listar } from './rutas.js';

export type FormatoCodigo = 'html' | 'react' | 'impresion';

export interface Componente {
  nombre: string;
  titulo: string;
  resumen: string;
  palabras: string[];
  tokens: string[];
  variantes: string[];
  estados: string[];
  /** Markdown completo sin el frontmatter. */
  cuerpo: string;
  /** Markdown completo tal como está en el archivo. */
  markdown: string;
}

const CLAVES_LISTA = new Set(['palabras', 'tokens', 'variantes', 'estados']);

/** Frontmatter mínimo: `clave: valor` y `clave: [a, b, c]`. Suficiente para estos archivos, sin dependencias. */
export function separarFrontmatter(md: string): { meta: Record<string, string | string[]>; cuerpo: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(md);
  if (!m) return { meta: {}, cuerpo: md };
  const meta: Record<string, string | string[]> = {};
  for (const linea of m[1]!.split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(linea);
    if (!kv) continue;
    const clave = kv[1]!;
    const valor = kv[2]!.trim();
    if (valor.startsWith('[') && valor.endsWith(']')) {
      meta[clave] = valor.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean);
    } else {
      meta[clave] = CLAVES_LISTA.has(clave) ? (valor ? [valor] : []) : valor;
    }
  }
  return { meta, cuerpo: m[2]! };
}

const lista = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const texto = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : (v ?? ''));

export function cargarComponente(nombre: string): Componente | undefined {
  if (!/^[a-z0-9-]+$/.test(nombre)) return undefined;
  let md: string;
  try {
    md = leerTexto('componentes', `${nombre}.md`);
  } catch {
    return undefined;
  }
  const { meta, cuerpo } = separarFrontmatter(md);
  return {
    nombre: texto(meta['nombre']) || nombre,
    titulo: texto(meta['titulo']),
    resumen: texto(meta['resumen']),
    palabras: lista(meta['palabras']),
    tokens: lista(meta['tokens']),
    variantes: lista(meta['variantes']),
    estados: lista(meta['estados']),
    cuerpo,
    markdown: md
  };
}

export function listarComponentes(): Componente[] {
  return listar('componentes')
    .filter((f) => f.endsWith('.md'))
    .map((f) => cargarComponente(f.replace(/\.md$/, '')))
    .filter((c): c is Componente => c !== undefined);
}

/** Texto bajo un encabezado (`## Título`), hasta el siguiente encabezado del mismo o mayor nivel. */
export function seccion(cuerpo: string, encabezado: string, nivel = 2): string {
  const lineas = cuerpo.split(/\r?\n/);
  const marca = '#'.repeat(nivel) + ' ';
  const inicio = lineas.findIndex((l) => l.startsWith(marca) && l.slice(marca.length).trim().toLowerCase() === encabezado.toLowerCase());
  if (inicio < 0) return '';
  let fin = lineas.length;
  let enBloque = false;
  for (let i = inicio + 1; i < lineas.length; i++) {
    const l = lineas[i]!;
    if (l.startsWith('```')) enBloque = !enBloque;
    if (!enBloque && /^#{1,6} /.test(l) && l.match(/^#+/)![0].length <= nivel) {
      fin = i;
      break;
    }
  }
  return lineas.slice(inicio + 1, fin).join('\n').trim();
}

const ENCABEZADO_FORMATO: Record<FormatoCodigo, string> = {
  html: 'HTML + CSS',
  react: 'React + Tailwind v4',
  impresion: 'Impresión (PDF)'
};

/** Extrae el código de ejemplo de un formato (incluye la nota que lo acompaña, si la hay). */
export function codigoDe(c: Componente, formato: FormatoCodigo): string {
  const ejemplos = seccion(c.cuerpo, 'Ejemplos de código');
  return seccion(ejemplos, ENCABEZADO_FORMATO[formato], 3);
}

export const FORMATOS: readonly FormatoCodigo[] = ['html', 'react', 'impresion'];
