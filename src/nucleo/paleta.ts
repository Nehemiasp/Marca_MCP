import { aHex, deltaE, leerColor, redondear, type RGB } from './color.js';
import { nombreVariable } from './exportadores.js';
import { coloresDeLaMarca } from './tokens.js';

export interface TokenCercano { token: string; valor: string; variable: string; deltaE: number }

/** Entre varios tokens con el mismo valor, se prefiere el que no es de la variante oscura. */
const prioridad = (ruta: string) => (ruta.startsWith('color.oscuro.') ? 1 : 0);

export function tokenExacto(hex: string): TokenCercano | undefined {
  const candidatos = coloresDeLaMarca().filter((c) => c.hex === hex.toUpperCase()).sort((a, b) => prioridad(a.ruta) - prioridad(b.ruta));
  const c = candidatos[0];
  return c ? { token: c.ruta, valor: c.hex, variable: nombreVariable(c.ruta), deltaE: 0 } : undefined;
}

export function tokenMasCercano(color: RGB): TokenCercano {
  let mejor: TokenCercano | undefined;
  for (const c of coloresDeLaMarca().sort((a, b) => prioridad(a.ruta) - prioridad(b.ruta))) {
    const d = deltaE(color, leerColor(c.hex)!);
    if (!mejor || d < mejor.deltaE - 1e-9) mejor = { token: c.ruta, valor: c.hex, variable: nombreVariable(c.ruta), deltaE: d };
  }
  return { ...mejor!, deltaE: redondear(mejor!.deltaE) };
}

export function interpretarDeltaE(d: number): string {
  if (d < 1) return 'imperceptible';
  if (d < 2.3) return 'apenas perceptible';
  if (d < 5) return 'perceptible a simple vista';
  if (d < 10) return 'claramente distinto';
  return 'muy distinto';
}

export interface ResultadoColor {
  entrada: string;
  hex: string;
  enPaleta: boolean;
  token?: string;
  variable?: string;
  masCercano: TokenCercano;
  interpretacion: string;
  veredicto: string;
}

export function revisarColor(entrada: string): ResultadoColor | null {
  const rgb = leerColor(entrada);
  if (!rgb) return null;
  const hex = aHex(rgb);
  const exacto = tokenExacto(hex);
  const cercano = exacto ?? tokenMasCercano(rgb);
  if (exacto) {
    return {
      entrada, hex, enPaleta: true, token: exacto.token, variable: exacto.variable,
      masCercano: exacto, interpretacion: 'idéntico',
      veredicto: `${hex} está en la paleta: es ${exacto.token}. Use var(${exacto.variable}) en lugar del valor.`
    };
  }
  const interp = interpretarDeltaE(cercano.deltaE);
  const casi = cercano.deltaE < 2.3 ? ' Es casi idéntico: probablemente es un error de transcripción.' : '';
  return {
    entrada, hex, enPaleta: false, masCercano: cercano, interpretacion: interp,
    veredicto: `${hex} NO está en la paleta. El token más cercano es ${cercano.token} (${cercano.valor}), con ΔE ${cercano.deltaE} (${interp}).${casi} Use var(${cercano.variable}).`
  };
}
