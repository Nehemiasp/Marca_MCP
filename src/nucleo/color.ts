/** Utilidades de color: lectura, luminancia, contraste WCAG 2.x y diferencia perceptual ΔE2000. */

export interface RGB { r: number; g: number; b: number }
export interface Lab { L: number; a: number; b: number }

const NOMBRES: Record<string, string> = {
  white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000', blue: '#0000ff',
  gray: '#808080', grey: '#808080', transparent: '#00000000'
};

const aByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Acepta #rgb, #rrggbb, #rrggbbaa (ignora alfa), rgb(), rgba(), hsl() y unos pocos nombres. */
export function leerColor(entrada: string): RGB | null {
  const s = entrada.trim().toLowerCase();
  const nombre = NOMBRES[s];
  if (nombre !== undefined) return leerColor(nombre);

  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  const rgb = /^rgba?\(\s*([\d.]+)(%?)[\s,]+([\d.]+)(%?)[\s,]+([\d.]+)(%?)(?:[\s,/]+[\d.]+%?)?\s*\)$/.exec(s);
  if (rgb) {
    const val = (n: string, p: string) => (p ? (parseFloat(n) / 100) * 255 : parseFloat(n));
    return { r: aByte(val(rgb[1]!, rgb[2]!)), g: aByte(val(rgb[3]!, rgb[4]!)), b: aByte(val(rgb[5]!, rgb[6]!)) };
  }

  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+[\d.]+%?)?\s*\)$/.exec(s);
  if (hsl) {
    const h = (((parseFloat(hsl[1]!) % 360) + 360) % 360) / 360;
    const sat = Math.min(1, parseFloat(hsl[2]!) / 100);
    const l = Math.min(1, parseFloat(hsl[3]!) / 100);
    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
    const p = 2 * l - q;
    const f = (t: number) => {
      const x = (t + 1) % 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    };
    return { r: aByte(f(h + 1 / 3) * 255), g: aByte(f(h) * 255), b: aByte(f(h - 1 / 3) * 255) };
  }
  return null;
}

export function aHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((n) => aByte(n).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Normaliza a #RRGGBB en mayúsculas, o null si no se entiende. */
export function normalizarHex(entrada: string): string | null {
  const c = leerColor(entrada);
  return c ? aHex(c) : null;
}

const lineal = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminancia({ r, g, b }: RGB): number {
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

export function razonContraste(a: RGB, b: RGB): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, oscuro] = la >= lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

export interface ResultadoContraste {
  razon: number;
  AA: { normal: boolean; grande: boolean };
  AAA: { normal: boolean; grande: boolean };
}

export function evaluarContraste(razon: number): ResultadoContraste {
  return {
    razon,
    AA: { normal: razon >= 4.5, grande: razon >= 3 },
    AAA: { normal: razon >= 7, grande: razon >= 4.5 }
  };
}

export function aLab({ r, g, b }: RGB): Lab {
  const [R, G, B] = [lineal(r), lineal(g), lineal(b)] as const;
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)] as const;
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const rad = (g: number) => (g * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** CIE ΔE2000 (Sharma, Wu y Dalal, 2005). 0 = idéntico; ≈1 apenas perceptible; >5 claramente distinto. */
export function deltaE2000(c1: Lab, c2: Lab): number {
  const C1 = Math.hypot(c1.a, c1.b);
  const C2 = Math.hypot(c2.a, c2.b);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1 = (1 + G) * c1.a;
  const a2 = (1 + G) * c2.a;
  const Cp1 = Math.hypot(a1, c1.b);
  const Cp2 = Math.hypot(a2, c2.b);
  const hp = (b: number, a: number) => (b === 0 && a === 0 ? 0 : (deg(Math.atan2(b, a)) + 360) % 360);
  const h1 = hp(c1.b, a1);
  const h2 = hp(c2.b, a2);

  const dL = c2.L - c1.L;
  const dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(rad(dh / 2));

  const Lm = (c1.L + c2.L) / 2;
  const Cpm = (Cp1 + Cp2) / 2;
  let hm = h1 + h2;
  if (Cp1 * Cp2 === 0) hm = h1 + h2;
  else if (Math.abs(h1 - h2) <= 180) hm = (h1 + h2) / 2;
  else hm = (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2;

  const T = 1 - 0.17 * Math.cos(rad(hm - 30)) + 0.24 * Math.cos(rad(2 * hm)) + 0.32 * Math.cos(rad(3 * hm + 6)) - 0.2 * Math.cos(rad(4 * hm - 63));
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const Sc = 1 + 0.045 * Cpm;
  const Sh = 1 + 0.015 * Cpm * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

export function deltaE(a: RGB, b: RGB): number {
  return deltaE2000(aLab(a), aLab(b));
}

export const redondear = (n: number, decimales = 2) => Math.round(n * 10 ** decimales) / 10 ** decimales;
