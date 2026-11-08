import { leerTexto } from './rutas.js';

/** Un token ya aplanado, con la referencia resuelta. */
export interface Token {
  /** Ruta con puntos, p. ej. `color.oscuro.acento`. */
  ruta: string;
  tipo: string;
  /** Valor tal como está en el archivo (puede ser una referencia `{color.blanco}`). */
  valorOriginal: unknown;
  /** Valor con las referencias resueltas. */
  valor: unknown;
  descripcion: string;
  categoria: string;
}

export interface ParContraste { texto: string; fondo: string; nivel: 'AA' | 'AAA'; uso: string }
export interface ParProhibido { texto: string; fondo: string; motivo: string }

export type NodoTokens = { [clave: string]: unknown };

export const CATEGORIAS = ['color', 'tipografia', 'espaciado', 'radio', 'sombra'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

const esObjeto = (v: unknown): v is NodoTokens => typeof v === 'object' && v !== null && !Array.isArray(v);
export const esToken = (v: unknown): v is NodoTokens => esObjeto(v) && '$value' in v;
const REFERENCIA = /^\{([^{}]+)\}$/;

export function leerTokensCrudos(): NodoTokens {
  return JSON.parse(leerTexto('tokens.json')) as NodoTokens;
}

/** Recorre el árbol DTCG y devuelve los tokens aplanados (heredando `$type` del grupo). */
export function aplanar(raiz: NodoTokens): Token[] {
  const salida: Token[] = [];
  const visitar = (nodo: NodoTokens, ruta: string[], tipoHeredado: string | undefined) => {
    const tipo = typeof nodo['$type'] === 'string' ? nodo['$type'] : tipoHeredado;
    if (esToken(nodo)) {
      salida.push({
        ruta: ruta.join('.'),
        tipo: tipo ?? 'desconocido',
        valorOriginal: nodo['$value'],
        valor: nodo['$value'],
        descripcion: typeof nodo['$description'] === 'string' ? nodo['$description'] : '',
        categoria: ruta[0] ?? ''
      });
      return;
    }
    for (const [clave, hijo] of Object.entries(nodo)) {
      if (clave.startsWith('$') || !esObjeto(hijo)) continue;
      visitar(hijo, [...ruta, clave], tipo);
    }
  };
  visitar(raiz, [], undefined);
  return resolverReferencias(salida);
}

/** Resuelve `{a.b}` dentro de valores (también dentro de objetos y listas). Lanza si hay referencia rota o ciclo. */
function resolverReferencias(tokens: Token[]): Token[] {
  const porRuta = new Map(tokens.map((t) => [t.ruta, t]));
  const enCurso = new Set<string>();
  const cache = new Map<string, unknown>();

  const resolverValor = (valor: unknown, origen: string): unknown => {
    if (typeof valor === 'string') {
      const m = REFERENCIA.exec(valor);
      if (!m) return valor;
      return resolverRuta(m[1]!, origen);
    }
    if (Array.isArray(valor)) return valor.map((v) => resolverValor(v, origen));
    if (esObjeto(valor)) return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, resolverValor(v, origen)]));
    return valor;
  };

  const resolverRuta = (ruta: string, origen: string): unknown => {
    if (cache.has(ruta)) return cache.get(ruta);
    const t = porRuta.get(ruta);
    if (!t) throw new Error(`El token «${origen}» hace referencia a «${ruta}», que no existe.`);
    if (enCurso.has(ruta)) throw new Error(`Referencia circular en «${ruta}».`);
    enCurso.add(ruta);
    const v = resolverValor(t.valorOriginal, ruta);
    enCurso.delete(ruta);
    cache.set(ruta, v);
    return v;
  };

  return tokens.map((t) => ({ ...t, valor: resolverRuta(t.ruta, t.ruta) }));
}

export interface ExtensionMarca {
  version?: string;
  pares: ParContraste[];
  paresProhibidos: ParProhibido[];
}

export function leerExtensionMarca(raiz: NodoTokens): ExtensionMarca {
  const ext = raiz['$extensions'];
  const marca = esObjeto(ext) && esObjeto(ext['marca']) ? ext['marca'] : {};
  return {
    version: typeof marca['version'] === 'string' ? marca['version'] : undefined,
    pares: Array.isArray(marca['pares']) ? (marca['pares'] as ParContraste[]) : [],
    paresProhibidos: Array.isArray(marca['paresProhibidos']) ? (marca['paresProhibidos'] as ParProhibido[]) : []
  };
}

export interface SistemaTokens {
  crudos: NodoTokens;
  tokens: Token[];
  extension: ExtensionMarca;
  porRuta: Map<string, Token>;
}

let cache: { clave: string; valor: SistemaTokens } | undefined;

export function cargarTokens(): SistemaTokens {
  const texto = leerTexto('tokens.json');
  if (cache?.clave === texto) return cache.valor;
  const crudos = JSON.parse(texto) as NodoTokens;
  const tokens = aplanar(crudos);
  const valor: SistemaTokens = {
    crudos,
    tokens,
    extension: leerExtensionMarca(crudos),
    porRuta: new Map(tokens.map((t) => [t.ruta, t]))
  };
  cache = { clave: texto, valor };
  return valor;
}

export function esCategoria(valor: string): valor is Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor);
}

/** Subárbol crudo (con `$value`, `$type`, etc.) de una categoría. */
export function subarbol(categoria: Categoria): NodoTokens {
  const nodo = cargarTokens().crudos[categoria];
  return esObjeto(nodo) ? nodo : {};
}

/** Tokens de color como mapa ruta → #RRGGBB (solo los que son colores opacos de 6 dígitos o se resuelven a ellos). */
export function coloresDeLaMarca(): { ruta: string; hex: string }[] {
  return cargarTokens()
    .tokens.filter((t) => t.tipo === 'color' && typeof t.valor === 'string' && /^#[0-9a-f]{6}$/i.test(t.valor))
    .map((t) => ({ ruta: t.ruta, hex: (t.valor as string).toUpperCase() }));
}
