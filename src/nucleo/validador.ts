import { leerColor, razonContraste } from './color.js';
import { esToken, leerExtensionMarca, type NodoTokens } from './tokens.js';

export interface Informe {
  errores: string[];
  avisos: string[];
  tokens: number;
  pares: number;
}

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const DIMENSION = /^-?\d+(?:\.\d+)?(?:px|rem|em)$/;
const REFERENCIA = /^\{([^{}]+)\}$/;
const TIPOS = ['color', 'dimension', 'fontFamily', 'fontWeight', 'number', 'shadow', 'duration', 'cubicBezier'];

const esObjeto = (v: unknown): v is NodoTokens => typeof v === 'object' && v !== null && !Array.isArray(v);

interface Hoja { ruta: string; tipo: string | undefined; valor: unknown; descripcion: unknown }

function recorrer(raiz: NodoTokens, errores: string[]): Hoja[] {
  const hojas: Hoja[] = [];
  const visitar = (nodo: NodoTokens, ruta: string[], tipoHeredado: string | undefined) => {
    const tipo = typeof nodo['$type'] === 'string' ? nodo['$type'] : tipoHeredado;
    const nombre = ruta.join('.');
    if (esToken(nodo)) {
      hojas.push({ ruta: nombre, tipo, valor: nodo['$value'], descripcion: nodo['$description'] });
      return;
    }
    for (const [clave, hijo] of Object.entries(nodo)) {
      if (clave.startsWith('$')) continue;
      if (/[{}.]/.test(clave)) errores.push(`El nombre «${clave}» (${nombre || 'raíz'}) no puede contener «.», «{» ni «}».`);
      if (!esObjeto(hijo)) {
        errores.push(`«${[...ruta, clave].join('.')}» no es un grupo ni un token (le falta «$value»).`);
        continue;
      }
      visitar(hijo, [...ruta, clave], tipo);
    }
  };
  visitar(raiz, [], undefined);
  return hojas;
}

function validarValor(h: Hoja, errores: string[]) {
  const { ruta, tipo, valor } = h;
  if (typeof valor === 'string' && REFERENCIA.test(valor)) return; // se valida aparte
  switch (tipo) {
    case 'color':
      if (typeof valor !== 'string' || !HEX.test(valor)) errores.push(`«${ruta}»: color inválido (${JSON.stringify(valor)}); use #RRGGBB.`);
      break;
    case 'dimension':
      if (typeof valor !== 'string' || !DIMENSION.test(valor)) errores.push(`«${ruta}»: dimensión inválida (${JSON.stringify(valor)}); use px, rem o em.`);
      break;
    case 'fontFamily':
      if (!(typeof valor === 'string' || (Array.isArray(valor) && valor.length > 0 && valor.every((x) => typeof x === 'string'))))
        errores.push(`«${ruta}»: familia tipográfica inválida.`);
      break;
    case 'fontWeight':
      if (typeof valor !== 'number' || valor < 1 || valor > 1000) errores.push(`«${ruta}»: peso inválido (${JSON.stringify(valor)}).`);
      break;
    case 'number':
      if (typeof valor !== 'number') errores.push(`«${ruta}»: se esperaba un número.`);
      break;
    case 'shadow': {
      const lista = Array.isArray(valor) ? valor : [valor];
      for (const s of lista) {
        if (!esObjeto(s) || typeof s['color'] !== 'string' || !HEX.test(s['color']) || ['offsetX', 'offsetY', 'blur', 'spread'].some((k) => typeof s[k] !== 'string' || !DIMENSION.test(s[k] as string)))
          errores.push(`«${ruta}»: sombra inválida (se requieren color, offsetX, offsetY, blur y spread).`);
      }
      break;
    }
    case undefined:
      errores.push(`«${ruta}»: no tiene «$type» propio ni heredado.`);
      break;
    default:
      if (!TIPOS.includes(tipo!)) errores.push(`«${ruta}»: tipo «${tipo}» no reconocido.`);
  }
}

/** Revisa tokens.json: formato DTCG, descripciones, referencias y contraste de los pares permitidos. */
export function validarTokens(raiz: NodoTokens): Informe {
  const errores: string[] = [];
  const avisos: string[] = [];
  const hojas = recorrer(raiz, errores);
  const porRuta = new Map(hojas.map((h) => [h.ruta, h]));

  for (const h of hojas) {
    if (typeof h.descripcion !== 'string' || h.descripcion.trim() === '') errores.push(`«${h.ruta}»: falta «$description».`);
    validarValor(h, errores);
  }

  // Referencias: existen, no son circulares y apuntan a un tipo compatible.
  const resolver = (ruta: string, visitados: string[]): unknown => {
    const h = porRuta.get(ruta);
    if (!h) return undefined;
    if (visitados.includes(ruta)) {
      errores.push(`Referencia circular: ${[...visitados, ruta].join(' → ')}.`);
      return undefined;
    }
    if (typeof h.valor === 'string') {
      const m = REFERENCIA.exec(h.valor);
      if (m) return resolver(m[1]!, [...visitados, ruta]);
    }
    return h.valor;
  };
  for (const h of hojas) {
    const textos: string[] = [];
    const juntar = (v: unknown) => {
      if (typeof v === 'string') textos.push(v);
      else if (Array.isArray(v)) v.forEach(juntar);
      else if (esObjeto(v)) Object.values(v).forEach(juntar);
    };
    juntar(h.valor);
    for (const t of textos) {
      const m = REFERENCIA.exec(t);
      if (!m) continue;
      const destino = porRuta.get(m[1]!);
      if (!destino) {
        errores.push(`«${h.ruta}» hace referencia a «${m[1]}», que no existe.`);
        continue;
      }
      if (destino.tipo !== h.tipo) errores.push(`«${h.ruta}» (${h.tipo}) apunta a «${m[1]}» de otro tipo (${destino.tipo}).`);
      resolver(h.ruta, []);
    }
  }

  // Contraste de pares declarados.
  const ext = leerExtensionMarca(raiz);
  const colorDe = (ruta: string) => {
    const h = porRuta.get(ruta);
    if (!h) {
      errores.push(`Par de contraste: el token «${ruta}» no existe.`);
      return null;
    }
    if (h.tipo !== 'color') {
      errores.push(`Par de contraste: «${ruta}» no es un color.`);
      return null;
    }
    const v = resolver(ruta, []);
    const c = typeof v === 'string' ? leerColor(v) : null;
    if (!c) errores.push(`Par de contraste: «${ruta}» no tiene un color legible.`);
    return c;
  };
  if (ext.pares.length === 0) avisos.push('No hay pares texto/fondo declarados en $extensions.marca.pares.');
  for (const p of ext.pares) {
    const t = colorDe(p.texto);
    const f = colorDe(p.fondo);
    if (!t || !f) continue;
    const minimo = p.nivel === 'AAA' ? 7 : 4.5;
    const razon = razonContraste(t, f);
    if (razon < minimo) errores.push(`Contraste insuficiente: ${p.texto} sobre ${p.fondo} = ${razon.toFixed(2)}:1 (se exige ${p.nivel}, ≥ ${minimo}:1).`);
  }
  for (const p of ext.paresProhibidos) {
    const t = colorDe(p.texto);
    const f = colorDe(p.fondo);
    if (!t || !f) continue;
    if (razonContraste(t, f) >= 4.5) avisos.push(`El par prohibido ${p.texto} sobre ${p.fondo} en realidad cumple AA; revise si la prohibición sigue siendo necesaria.`);
  }

  return { errores, avisos, tokens: hojas.length, pares: ext.pares.length };
}
