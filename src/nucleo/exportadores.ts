import { cargarTokens, type Token } from './tokens.js';

export type FormatoExportacion = 'css' | 'tailwind4' | 'scss' | 'json';
export const FORMATOS_EXPORTACION: readonly FormatoExportacion[] = ['css', 'tailwind4', 'scss', 'json'];

/** Nombre de la variable CSS de un token (convención compatible con Tailwind v4 `@theme`). */
export function nombreVariable(ruta: string): string {
  const [categoria, ...resto] = ruta.split('.');
  const nombre = resto.join('-');
  switch (categoria) {
    case 'color': return `--color-${nombre}`;
    case 'tipografia': {
      const [grupo, ...r] = resto;
      const n = r.join('-');
      switch (grupo) {
        case 'familia': return `--font-${n}`;
        case 'peso': return `--font-weight-${n}`;
        case 'tamano': return `--text-${n}`;
        case 'interlineado': return `--text-${n}--line-height`;
        case 'espaciado-letras': return `--tracking-${n}`;
        default: return `--${ruta.replace(/\./g, '-')}`;
      }
    }
    case 'espaciado': return `--spacing-${nombre}`;
    case 'radio': return `--radius-${nombre}`;
    case 'sombra': return `--shadow-${nombre}`;
    default: return `--${ruta.replace(/\./g, '-')}`;
  }
}

const comillas = (f: string) => (/\s/.test(f) ? `"${f}"` : f);

/** Valor de un token como texto CSS. */
export function valorCss(t: Token): string {
  const v = t.valor;
  if (t.tipo === 'fontFamily') return (Array.isArray(v) ? (v as string[]) : [String(v)]).map(comillas).join(', ');
  if (t.tipo === 'shadow') {
    const lista = Array.isArray(v) ? v : [v];
    return lista
      .map((s) => {
        const o = s as Record<string, string>;
        return `${o['offsetX']} ${o['offsetY']} ${o['blur']} ${o['spread']} ${o['color']}`;
      })
      .join(', ');
  }
  return String(v);
}

const TITULOS: Record<string, string> = {
  color: 'Color', tipografia: 'Tipografía', espaciado: 'Espaciado', radio: 'Radio', sombra: 'Sombra'
};

function porCategoria(): Map<string, Token[]> {
  const mapa = new Map<string, Token[]>();
  for (const t of cargarTokens().tokens) {
    const l = mapa.get(t.categoria) ?? [];
    l.push(t);
    mapa.set(t.categoria, l);
  }
  return mapa;
}

function bloqueVariables(sangria: string, prefijo = ''): string {
  const partes: string[] = [];
  for (const [cat, tokens] of porCategoria()) {
    partes.push(`${sangria}/* ${TITULOS[cat] ?? cat} */`);
    for (const t of tokens) {
      const nombre = nombreVariable(t.ruta);
      partes.push(`${sangria}${prefijo}${prefijo ? nombre.slice(2) : nombre}: ${valorCss(t)};`);
    }
    partes.push('');
  }
  partes.pop();
  return partes.join('\n');
}

const CABECERA = 'Generado por marca-mcp desde marca/tokens.json. No lo edite a mano.';

export function exportarTokens(formato: FormatoExportacion): { contenido: string; archivoSugerido: string } {
  switch (formato) {
    case 'css':
      return { archivoSugerido: 'marca.css', contenido: `/* ${CABECERA} */\n:root {\n${bloqueVariables('  ')}\n}\n` };
    case 'tailwind4':
      return {
        archivoSugerido: 'marca.css',
        contenido: `/* ${CABECERA} */\n/* Uso: @import "tailwindcss"; @import "./marca.css"; */\n@theme {\n${bloqueVariables('  ')}\n}\n`
      };
    case 'scss':
      return { archivoSugerido: '_marca.scss', contenido: `// ${CABECERA}\n${bloqueVariables('', '$').replace(/^\/\*(.*)\*\/$/gm, '//$1')}\n` };
    case 'json': {
      const plano: Record<string, string | number> = {};
      for (const t of cargarTokens().tokens) plano[t.ruta] = t.tipo === 'fontWeight' ? Number(t.valor) : valorCss(t);
      return { archivoSugerido: 'marca.tokens.plano.json', contenido: JSON.stringify(plano, null, 2) + '\n' };
    }
  }
}

/** Todas las variables CSS definidas por los tokens (para comprobar ejemplos de código). */
export function variablesDefinidas(): Set<string> {
  return new Set(cargarTokens().tokens.map((t) => nombreVariable(t.ruta)));
}
