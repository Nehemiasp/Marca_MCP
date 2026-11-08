/**
 * Ejemplo de integración para «Paridad» (comparador entre diseño y código):
 * leer la paleta y las tipografías de Marca MCP y detectar colores o fuentes fuera de la marca.
 *
 * Tres formas de obtener los datos (elija una):
 *  1. Archivo: `marca.tokens.plano.json` (herramienta exportar_tokens, formato json, o sitio/publico/tokens.plano.json).
 *  2. MCP por stdio:  node dist/stdio.js  → herramienta obtener_tokens / revisar_color.
 *  3. MCP por HTTP:   https://<su-dominio>/mcp (ver docs/remoto.md).
 * Este ejemplo usa la forma 1: no depende de nada más que del JSON plano.
 */
export type TokensPlanos = Record<string, string | number>;

interface Rgb { r: number; g: number; b: number }

const aRgb = (hex: string): Rgb | null => {
  const m = /^#([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
function lab({ r, g, b }: Rgb): [number, number, number] {
  const [R, G, B] = [lin(r), lin(g), lin(b)] as const;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const x = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047);
  const y = f(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const z = f((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
/** Distancia perceptual simple (CIE76) basta para decidir «dentro o fuera»; para el valor exacto use revisar_color (ΔE2000). */
const distancia = (a: Rgb, b: Rgb) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]!) as [number, number, number]);

export interface Desviacion { valor: string; token: string; distancia: number }

export function paletaDe(tokens: TokensPlanos): { token: string; hex: string }[] {
  return Object.entries(tokens)
    .filter(([ruta, v]) => ruta.startsWith('color.') && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v))
    .map(([token, v]) => ({ token, hex: String(v).toUpperCase() }));
}

/** Devuelve los colores que NO están en la paleta, con el token más cercano. `tolerancia` en unidades CIE76 (≈ΔE). */
export function coloresFueraDeMarca(colores: string[], tokens: TokensPlanos, tolerancia = 1): Desviacion[] {
  const paleta = paletaDe(tokens).map((p) => ({ ...p, rgb: aRgb(p.hex)! }));
  const fuera: Desviacion[] = [];
  for (const valor of new Set(colores)) {
    const rgb = aRgb(valor);
    if (!rgb) continue;
    const mejor = paleta.map((p) => ({ token: p.token, d: distancia(rgb, p.rgb) })).sort((a, b) => a.d - b.d)[0]!;
    if (mejor.d > tolerancia) fuera.push({ valor, token: mejor.token, distancia: Math.round(mejor.d * 100) / 100 });
  }
  return fuera;
}

/** Familias tipográficas permitidas según los tokens (la primera de cada pila). */
export function familiasDeMarca(tokens: TokensPlanos): string[] {
  return Object.entries(tokens)
    .filter(([ruta]) => ruta.startsWith('tipografia.familia.') && ruta !== 'tipografia.familia.codigo')
    .map(([, v]) => String(v).split(',')[0]!.trim().replace(/^"|"$/g, '').toLowerCase());
}

export function fuentesFueraDeMarca(familias: string[], tokens: TokensPlanos): string[] {
  const permitidas = new Set([...familiasDeMarca(tokens), 'system-ui', 'sans-serif', 'monospace', 'inherit']);
  return [...new Set(familias.map((f) => f.trim().replace(/^["']|["']$/g, '').toLowerCase()))].filter((f) => !permitidas.has(f));
}
