import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { auditarCodigo, resumirHallazgos, type Lenguaje } from './nucleo/auditor.js';
import { revisarTexto } from './nucleo/voz.js';

/** Revisión de un archivo contra la marca: la misma lógica que las herramientas auditar_codigo y revisar_texto, sin MCP. Solo lectura. */
const LENGUAJES: Record<string, Lenguaje> = {
  '.css': 'css', '.html': 'html', '.htm': 'html', '.svg': 'html', '.jsx': 'jsx', '.tsx': 'jsx'
};

export interface InformeArchivo {
  revisable: boolean;
  errores: number;
  avisos: number;
  lineas: string[];
}

export function lenguajeDe(ruta: string): Lenguaje | undefined {
  return LENGUAJES[extname(ruta).toLowerCase()];
}

/** Texto visible de un HTML/JSX: sin etiquetas, scripts, estilos ni bloques de código. */
function textoVisible(fuente: string): string {
  return fuente
    .replace(/<(script|style|pre|code|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

export function revisarArchivo(ruta: string, contexto: 'general' | 'cliente' = 'general'): InformeArchivo {
  const lenguaje = lenguajeDe(ruta);
  if (!lenguaje || !existsSync(ruta)) return { revisable: false, errores: 0, avisos: 0, lineas: [] };
  const fuente = readFileSync(ruta, 'utf8');
  const codigo = auditarCodigo(fuente, lenguaje);
  const r = resumirHallazgos(codigo);
  const lineas = codigo.map((h) => `L${h.linea}:${h.columna} [${h.severidad}] ${h.tipo}: ${h.mensaje} → ${h.sugerencia}`);
  let errores = r.errores;
  let avisos = r.avisos;
  if (lenguaje !== 'css') {
    for (const h of revisarTexto(textoVisible(fuente), { contexto })) {
      lineas.push(`[${h.severidad}] voz (${h.regla}): ${h.mensaje} → ${h.sugerencia}`);
      if (h.severidad === 'error') errores++;
      else avisos++;
    }
  }
  return { revisable: true, errores, avisos, lineas };
}

/** Texto para humanos (CLI) o para el agente (hook). */
export function formatear(ruta: string, i: InformeArchivo): string {
  if (!i.revisable) return `${ruta}: tipo de archivo no revisable (use .css, .html, .svg, .jsx o .tsx).`;
  const cabecera = i.errores === 0 && i.avisos === 0 ? `${ruta}: sin hallazgos. Todo sale de los tokens y de la voz de la marca.` : `${ruta}: ${i.errores} error(es) y ${i.avisos} aviso(s) contra la marca.`;
  return [cabecera, ...i.lineas.map((l) => `  ${l}`)].join('\n');
}
