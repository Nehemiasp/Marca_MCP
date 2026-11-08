import { listarComponentes, type Componente } from './componentes.js';

const ALTA = 3;
const PARO = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas', 'para', 'por', 'con', 'sin', 'que', 'algo', 'quiero', 'necesito',
  'hacer', 'crear', 'mostrar', 'muestra', 'y', 'o', 'en', 'a', 'al', 'se', 'mi', 'su', 'como', 'hay', 'tipo', 'cosa', 'donde', 'poner', 'usar'
]);

export const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function raiz(palabra: string): string {
  let p = sinAcentos(palabra);
  if (p.length > 4 && p.endsWith('es')) p = p.slice(0, -2);
  else if (p.length > 3 && p.endsWith('s')) p = p.slice(0, -1);
  return p;
}

export function terminos(consulta: string): string[] {
  return sinAcentos(consulta)
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length > 1 && !PARO.has(t))
    .map(raiz);
}

const coincide = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));

export interface ResultadoBusqueda {
  nombre: string;
  titulo: string;
  resumen: string;
  uri: string;
  puntaje: number;
  coincidencias: string[];
}

function puntuar(c: Componente, ts: string[]): { puntos: number; coincidencias: string[] } {
  const campos = [
    { palabras: [c.nombre.replace(/-/g, ' '), c.titulo].flatMap((x) => x.split(/\s+/)).map(raiz), peso: ALTA },
    { palabras: c.palabras.flatMap((p) => p.split(/\s+/)).map(raiz), peso: ALTA },
    { palabras: c.resumen.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(raiz), peso: 1 }
  ];
  let puntos = 0;
  const coincidencias = new Set<string>();
  for (const t of ts) {
    let mejor = 0;
    for (const campo of campos) {
      if (campo.palabras.some((p) => coincide(p, t))) mejor = Math.max(mejor, campo.peso);
    }
    if (mejor > 0) coincidencias.add(t);
    puntos += mejor;
  }
  return { puntos, coincidencias: [...coincidencias] };
}

export function buscarComponentes(consulta: string, limite = 5): ResultadoBusqueda[] {
  const ts = terminos(consulta);
  if (ts.length === 0) return [];
  const maximo = ts.length * ALTA;
  return listarComponentes()
    .map((c) => {
      const { puntos, coincidencias } = puntuar(c, ts);
      return {
        nombre: c.nombre, titulo: c.titulo, resumen: c.resumen, uri: `marca://componentes/${c.nombre}`,
        puntaje: Math.round((puntos / maximo) * 100), coincidencias
      };
    })
    .filter((r) => r.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre))
    .slice(0, limite);
}
