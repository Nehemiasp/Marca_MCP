import { sinAcentos } from './busqueda.js';
import { leerTexto } from './rutas.js';

export type ReglaVoz = 'titulo-incorrecto' | 'palabra-prohibida' | 'relleno' | 'trato-usted' | 'cifra-por-verificar';
export type Severidad = 'error' | 'aviso';

interface Termino { termino: string; sugerencia?: string }
export interface ReglasDeVoz {
  titulos: Termino[];
  prohibidas: Termino[];
  relleno: Termino[];
  usted: Termino[];
  verificadas: string[];
}

const SECCIONES: Record<string, keyof ReglasDeVoz> = {
  'titulos incorrectos': 'titulos',
  'palabras prohibidas': 'prohibidas',
  'frases de relleno': 'relleno',
  'trato con clientes (usted)': 'usted',
  'cifras y clientes verificados': 'verificadas'
};

const NO_TERMINOS = /^\(.*\)$/;

/** Lee las listas de `voz.md`: viñetas `- término → sugerencia` dentro de las secciones conocidas. */
export function leerReglasDeVoz(md = leerTexto('voz.md')): ReglasDeVoz {
  const reglas: ReglasDeVoz = { titulos: [], prohibidas: [], relleno: [], usted: [], verificadas: [] };
  let actual: keyof ReglasDeVoz | undefined;
  for (const linea of md.split(/\r?\n/)) {
    const h = /^##\s+(.*)$/.exec(linea);
    if (h) {
      actual = SECCIONES[sinAcentos(h[1]!.trim())];
      continue;
    }
    if (!actual) continue;
    const v = /^\s*[-*]\s+(.*)$/.exec(linea);
    if (!v) continue;
    const contenido = v[1]!.trim().replace(/^`(.*)`$/, '$1');
    if (!contenido || NO_TERMINOS.test(contenido)) continue;
    if (actual === 'verificadas') {
      reglas.verificadas.push(contenido);
      continue;
    }
    const [termino, sugerencia] = contenido.split(/\s*(?:→|->)\s*/, 2);
    if (termino) reglas[actual].push({ termino: termino.trim(), sugerencia: sugerencia?.trim() });
  }
  return reglas;
}

/** Normaliza carácter a carácter (sin acentos, minúsculas) conservando la longitud para mapear posiciones. */
export function normalizarConLongitud(s: string): string {
  let r = '';
  for (const ch of s) {
    const base = ch.normalize('NFD').charAt(0).toLowerCase();
    r += ch.length === 1 ? base : ch; // los pares sustitutos se dejan igual para no cambiar la longitud
  }
  return r;
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function aRegex(termino: string): RegExp {
  const comodin = termino.endsWith('*');
  const base = escapar(normalizarConLongitud(comodin ? termino.slice(0, -1) : termino).trim());
  return new RegExp(`(?<![\\p{L}\\p{N}])${base}${comodin ? '\\p{L}*' : ''}(?![\\p{L}\\p{N}])`, 'gu');
}

export interface HallazgoTexto {
  regla: ReglaVoz;
  severidad: Severidad;
  fragmento: string;
  linea: number;
  columna: number;
  mensaje: string;
  sugerencia: string;
}

const PATRONES_CIFRAS: RegExp[] = [
  /\b\d+(?:[.,]\d+)?\s?%/g,
  /\b\d+(?:[.,]\d+)?\s?[x×]\b/gi,
  /\bmás de \d+[\d.,]*(?:\s+\p{L}+)?/giu,
  /\b\d+[\d.,]*\+?\s+(?:clientes|proyectos|marcas|empresas|usuarios|años|productos|equipos)\b/giu
];

function posicion(texto: string, indice: number): { linea: number; columna: number } {
  const antes = texto.slice(0, indice);
  const linea = antes.split('\n').length;
  return { linea, columna: indice - (antes.lastIndexOf('\n') + 1) + 1 };
}

export interface OpcionesRevision { contexto?: 'general' | 'cliente' }

export function revisarTexto(texto: string, opciones: OpcionesRevision = {}, reglas = leerReglasDeVoz()): HallazgoTexto[] {
  const norm = normalizarConLongitud(texto);
  const crudos: { h: HallazgoTexto; inicio: number; fin: number }[] = [];
  const buscar = (lista: Termino[], regla: ReglaVoz, severidad: Severidad, mensaje: (f: string, t: Termino) => string, sugerir: (t: Termino) => string) => {
    for (const t of lista) {
      for (const m of norm.matchAll(aRegex(t.termino))) {
        const original = texto.slice(m.index, m.index + m[0].length);
        crudos.push({
          inicio: m.index, fin: m.index + m[0].length,
          h: { regla, severidad, fragmento: original, ...posicion(texto, m.index), mensaje: mensaje(original, t), sugerencia: sugerir(t) }
        });
      }
    }
  };

  buscar(reglas.titulos, 'titulo-incorrecto', 'error',
    (f) => `«${f}» no es su título. Su título es «Diseñador UI/UX».`,
    (t) => t.sugerencia ?? 'Diseñador UI/UX');
  buscar(reglas.prohibidas, 'palabra-prohibida', 'error',
    (f) => `«${f}» es una palabra de relleno que la marca evita.`,
    (t) => t.sugerencia ?? 'Reemplácela por un hecho concreto o elimínela.');
  buscar(reglas.relleno, 'relleno', 'aviso',
    (f) => `«${f}» es una frase de relleno; no aporta información.`,
    () => 'Elimine la frase y vaya directo a la idea.');
  if (opciones.contexto === 'cliente') {
    buscar(reglas.usted, 'trato-usted', 'error',
      (f) => `Con clientes se trata de «usted»; «${f}» es trato de «tú».`,
      (t) => (t.sugerencia ? `Use «${t.sugerencia}».` : 'Use el trato de «usted».'));
  }

  const verificadas = reglas.verificadas.map(normalizarConLongitud);
  for (const patron of PATRONES_CIFRAS) {
    for (const m of texto.matchAll(patron)) {
      const f = normalizarConLongitud(m[0]).trim();
      if (verificadas.some((v) => v.includes(f))) continue;
      crudos.push({
        inicio: m.index!, fin: m.index! + m[0].length,
        h: {
          regla: 'cifra-por-verificar', severidad: 'aviso', fragmento: m[0], ...posicion(texto, m.index!),
          mensaje: `«${m[0]}» es una cifra: use cifras y clientes solo si son reales.`,
          sugerencia: 'Verifique el dato; si es real, agréguelo a «Cifras y clientes verificados» en voz.md.'
        }
      });
    }
  }
  // Dentro de una misma regla, un fragmento que se solapa con otro (p. ej. «siguiente nivel» y «al siguiente nivel») se cuenta una sola vez: gana el más largo.
  const conservados: typeof crudos = [];
  const ordenados = [...crudos].sort((a, b) => a.inicio - b.inicio || b.fin - b.inicio - (a.fin - a.inicio));
  for (const c of ordenados) {
    const solapa = conservados.some((k) => k.h.regla === c.h.regla && c.inicio < k.fin && k.inicio < c.fin);
    if (!solapa) conservados.push(c);
  }
  return conservados.map((c) => c.h).sort((a, b) => a.linea - b.linea || a.columna - b.columna);
}
