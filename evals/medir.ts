/// <reference lib="dom" />
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { auditarCodigo, resumirHallazgos } from '../src/nucleo/auditor.js';
import { aHex, deltaE, evaluarContraste, leerColor, razonContraste, redondear } from '../src/nucleo/color.js';
import { coloresDeLaMarca } from '../src/nucleo/tokens.js';
import { revisarTexto } from '../src/nucleo/voz.js';
import { rutaSegura } from '../src/nucleo/rutas.js';
import type { Tarea } from './tareas.js';

export interface Metricas {
  /** Hallazgos de auditar_codigo sobre el HTML fuente. */
  codigoErrores: number;
  codigoAvisos: number;
  /** Colores distintos realmente renderizados que no están en la paleta (ΔE ≥ 1). */
  coloresFueraDePaleta: number;
  coloresFueraDePaletaLista: string[];
  /** Familias tipográficas distintas renderizadas que no son de la marca. */
  fuentesAjenas: number;
  fuentesAjenasLista: string[];
  /** Textos cuyo contraste no llega a AA (4.5:1, o 3:1 si es texto grande). */
  fallosContraste: number;
  paresContrasteRevisados: number;
  /** Hallazgos de revisar_texto. */
  vozErrores: number;
  vozAvisos: number;
  vozDetalle: string[];
  /** Hay degradados o sombras fuera de los tokens (según auditar_codigo). */
  degradados: number;
  texto: string;
}

const FUENTES_MARCA = ['bricolage grotesque', 'instrument sans'];
const GENERICAS = ['system-ui', 'sans-serif', 'serif', 'monospace', 'ui-sans-serif', '-apple-system', 'blinkmacsystemfont'];

interface MuestraTexto { texto: string; color: string; bg: string; size: number; weight: number; family: string }
interface MuestraColores { colores: string[] }

function rgbDeCss(css: string): { r: number; g: number; b: number; a: number } | null {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(css);
  return m ? { r: +m[1]!, g: +m[2]!, b: +m[3]!, a: m[4] === undefined ? 1 : +m[4] } : null;
}

/** Abre el HTML en un navegador y mide lo que realmente se ve (no solo lo que dice el código). */
export async function medirSalida(rutaHtml: string, tarea: Tarea, rutaCaptura?: string): Promise<Metricas> {
  const html = readFileSync(rutaHtml, 'utf8');
  const hallazgos = auditarCodigo(html, 'html');
  const resumen = resumirHallazgos(hallazgos);

  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: tarea.viewport, deviceScaleFactor: 1 });
    // tsx/esbuild envuelve las funciones con __name(); el navegador no lo conoce.
    await pagina.addInitScript('window.__name = (f) => f;');
    await pagina.goto('file://' + rutaHtml, { waitUntil: 'load', timeout: 20_000 }).catch(() => undefined);
    // Las fuentes de la marca se tratan como instaladas en la máquina: así se ven igual en las dos condiciones.
    const fuentes = [
      ['Bricolage Grotesque', 800, 'bricolage-grotesque-latin-800-normal'],
      ['Instrument Sans', 400, 'instrument-sans-latin-400-normal'],
      ['Instrument Sans', 500, 'instrument-sans-latin-500-normal'],
      ['Instrument Sans', 600, 'instrument-sans-latin-600-normal'],
      ['Instrument Sans', 700, 'instrument-sans-latin-700-normal']
    ] as const;
    await pagina.addStyleTag({
      content: fuentes
        .map(([f, p, a]) => `@font-face{font-family:"${f}";font-weight:${p};src:local("${f}"),url("file://${rutaSegura('assets', 'fuentes', `${a}.woff2`)}") format("woff2");}`)
        .join('\n')
    });
    await pagina.evaluate(() => document.fonts.ready).catch(() => undefined);
    await pagina.waitForTimeout(300);

    const muestras = await pagina.evaluate((): MuestraTexto[] => {
      const salida: MuestraTexto[] = [];
      const visto = new Set<Element>();
      const alfa = (c: string) => {
        const m = /rgba?\(([^)]+)\)/.exec(c);
        if (!m) return 1;
        const p = m[1]!.split(/[,\s/]+/).filter(Boolean);
        return p.length > 3 ? parseFloat(p[3]!) : 1;
      };
      const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (recorrido.nextNode()) {
        const nodo = recorrido.currentNode;
        const t = (nodo.textContent ?? '').trim();
        const el = nodo.parentElement;
        if (!t || !el || visto.has(el) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
        visto.add(el);
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
        let bg = 'rgb(255, 255, 255)';
        for (let e: Element | null = el; e; e = e.parentElement) {
          const b = getComputedStyle(e).backgroundColor;
          if (alfa(b) >= 0.99) { bg = b; break; }
        }
        salida.push({ texto: t.slice(0, 50), color: cs.color, bg, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) || 400, family: cs.fontFamily });
      }
      return salida;
    });

    const coloresRender = await pagina.evaluate((): MuestraColores => {
      const set = new Set<string>();
      const alfa = (c: string) => {
        const m = /rgba?\(([^)]+)\)/.exec(c);
        if (!m) return 0;
        const p = m[1]!.split(/[,\s/]+/).filter(Boolean);
        return p.length > 3 ? parseFloat(p[3]!) : 1;
      };
      for (const el of Array.from(document.body.querySelectorAll('*')).concat([document.body, document.documentElement])) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none') continue;
        const tieneTexto = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
        if (tieneTexto && alfa(cs.color) > 0.5) set.add(cs.color);
        if (alfa(cs.backgroundColor) > 0.5) set.add(cs.backgroundColor);
        for (const lado of ['Top', 'Right', 'Bottom', 'Left'] as const) {
          const ancho = parseFloat(cs.getPropertyValue(`border-${lado.toLowerCase()}-width`));
          const c = cs.getPropertyValue(`border-${lado.toLowerCase()}-color`);
          if (ancho > 0 && cs.getPropertyValue(`border-${lado.toLowerCase()}-style`) !== 'none' && alfa(c) > 0.5) set.add(c);
        }
      }
      return { colores: [...set] };
    });

    if (rutaCaptura) await pagina.screenshot({ path: rutaCaptura, fullPage: tarea.paginaCompleta });

    // ── Colores fuera de la paleta ──
    const paleta = coloresDeLaMarca().map((c) => leerColor(c.hex)!);
    const fuera = new Set<string>();
    for (const css of coloresRender.colores) {
      const c = rgbDeCss(css);
      if (!c) continue;
      const rgb = { r: c.r, g: c.g, b: c.b };
      if (!paleta.some((p) => deltaE(rgb, p) < 1)) fuera.add(aHex(rgb));
    }

    // ── Fuentes ajenas ──
    const familias = new Set<string>();
    for (const m of muestras) {
      const primera = m.family.split(',')[0]!.trim().replace(/^["']|["']$/g, '');
      familias.add(primera);
    }
    const ajenas = [...familias].filter((f) => !FUENTES_MARCA.includes(f.toLowerCase()) && !GENERICAS.includes(f.toLowerCase()));
    // Una fuente genérica como primera opción también es ajena a la marca.
    for (const f of familias) if (GENERICAS.includes(f.toLowerCase()) && !ajenas.includes(f)) ajenas.push(f);

    // ── Contraste ──
    let fallos = 0;
    for (const m of muestras) {
      const t = rgbDeCss(m.color);
      const f = rgbDeCss(m.bg);
      if (!t || !f) continue;
      const grande = m.size >= 24 || (m.size >= 18.66 && m.weight >= 700);
      const nivel = evaluarContraste(razonContraste(t, f));
      if (!(grande ? nivel.AA.grande : nivel.AA.normal)) fallos++;
    }

    // ── Voz ──
    const texto = muestras.map((m) => m.texto).join('\n');
    const textoCompleto = await pagina.evaluate(() => document.body.innerText);
    const voz = revisarTexto(textoCompleto, { contexto: tarea.contexto });
    const vozErrores = voz.filter((h) => h.severidad === 'error');

    return {
      codigoErrores: resumen.errores,
      codigoAvisos: resumen.avisos,
      coloresFueraDePaleta: fuera.size,
      coloresFueraDePaletaLista: [...fuera].sort(),
      fuentesAjenas: ajenas.length,
      fuentesAjenasLista: ajenas.sort(),
      fallosContraste: fallos,
      paresContrasteRevisados: muestras.length,
      vozErrores: vozErrores.length,
      vozAvisos: voz.length - vozErrores.length,
      vozDetalle: voz.map((h) => `${h.regla}: «${h.fragmento}»`),
      degradados: hallazgos.filter((h) => h.tipo === 'degradado').length,
      texto: redondearTexto(texto)
    };
  } finally {
    await navegador.close();
  }
}

const redondearTexto = (t: string) => t.slice(0, 600);
export { redondear };
