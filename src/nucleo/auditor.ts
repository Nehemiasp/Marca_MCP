import { aHex, leerColor, redondear } from './color.js';
import { nombreVariable } from './exportadores.js';
import { tokenExacto, tokenMasCercano } from './paleta.js';
import { cargarTokens } from './tokens.js';

export type Lenguaje = 'css' | 'html' | 'jsx';
export type TipoHallazgo = 'color' | 'fuente' | 'tamano' | 'radio' | 'degradado' | 'sombra';

export interface HallazgoCodigo {
  linea: number;
  columna: number;
  tipo: TipoHallazgo;
  severidad: 'error' | 'aviso';
  valor: string;
  mensaje: string;
  sugerencia: string;
  token?: string;
  regla: string;
}

const COLORES_NOMBRADOS: Record<string, string> = {
  white: '#FFFFFF', black: '#000000', red: '#FF0000', green: '#008000', blue: '#0000FF', gray: '#808080', grey: '#808080',
  orange: '#FFA500', yellow: '#FFFF00', purple: '#800080', pink: '#FFC0CB', silver: '#C0C0C0', navy: '#000080', teal: '#008080'
};
const PROPIEDADES_COLOR = /(?:^|[\s;{"'(,])(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|fill|stroke|caret-color|text-decoration-color|accent-color|column-rule-color|backgroundColor|borderColor|outlineColor|textDecorationColor)\s*[:=]\s*[{"']?\s*([a-z]+)\b/gi;

/** Familias de la marca: la primera de cada pila de título y de texto (no la de código, que solo entra por su token). */
function familiasDeLaMarca(): string[] {
  const { porRuta } = cargarTokens();
  return ['tipografia.familia.titulo', 'tipografia.familia.texto'].flatMap((r) => {
    const v = porRuta.get(r)?.valor;
    const primera = Array.isArray(v) ? v[0] : v;
    return typeof primera === 'string' ? [primera.toLowerCase()] : [];
  });
}
/** Primera familia de la pila de código: puede declararse en un @font-face, pero no usarse a mano. */
function familiaDeCodigo(): string | undefined {
  const v = cargarTokens().porRuta.get('tipografia.familia.codigo')?.valor;
  const primera = Array.isArray(v) ? v[0] : v;
  return typeof primera === 'string' ? primera.toLowerCase() : undefined;
}
/** Genéricas: solo valen como respaldo, después de una familia de la marca. */
const FAMILIAS_GENERICAS = ['system-ui', 'sans-serif', 'serif', 'monospace', 'ui-sans-serif', 'ui-monospace', 'ui-serif', '-apple-system', 'blinkmacsystemfont', 'segoe ui'];
const VALORES_ESPECIALES = ['inherit', 'initial', 'unset', 'revert'];
const TAILWIND_PALETAS = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

const escalaTamanos = (): { ruta: string; px: number }[] =>
  cargarTokens().tokens.filter((t) => t.ruta.startsWith('tipografia.tamano.') || t.ruta.startsWith('tipografia.tamano-lienzo.')).map((t) => ({ ruta: t.ruta, px: parseFloat(String(t.valor)) }));
const escalaRadios = (): { ruta: string; px: number }[] =>
  cargarTokens().tokens.filter((t) => t.categoria === 'radio').map((t) => ({ ruta: t.ruta, px: parseFloat(String(t.valor)) }));

function aPx(valor: string): number | null {
  const m = /^(-?[\d.]+)(px|rem|em)$/.exec(valor.trim());
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return m[2] === 'px' ? n : n * 16;
}

function masCercano(lista: { ruta: string; px: number }[], px: number) {
  return lista.reduce((a, b) => (Math.abs(b.px - px) < Math.abs(a.px - px) ? b : a));
}

/**
 * Limpia el valor capturado de una declaración (font-family, border-radius…) fuera de JSX:
 * si va dentro de un atributo (style="…" / font-family="…") se queda con lo que hay entre las comillas del atributo.
 */
function valorDeAtributo(valor: string): string {
  const abre = valor.trimStart()[0];
  const resto = valor.trimStart().slice(1);
  const fin = '(?=\\s*\\/?>|\\s*$|\\s+[\\w:-]+=)';
  const cierre = abre === '"' || abre === "'" ? resto.search(new RegExp(`${abre}${fin}`)) : -1;
  return cierre >= 0 ? resto.slice(0, cierre) : (valor.split(new RegExp(`["']${fin}`))[0] ?? '');
}

/** Sustituye los comentarios por espacios para conservar las posiciones de línea y columna. */
function quitarComentarios(codigo: string, lenguaje: Lenguaje): string {
  const blanquear = (m: string) => m.replace(/[^\n]/g, ' ');
  let r = codigo.replace(/\/\*[\s\S]*?\*\//g, blanquear);
  if (lenguaje !== 'css') r = r.replace(/<!--[\s\S]*?-->/g, blanquear);
  if (lenguaje === 'jsx') r = r.replace(/(^|[\s;,{(])\/\/[^\n]*/g, (m, p) => p + blanquear(m.slice(p.length)));
  return r;
}

/** Revisa CSS, HTML o JSX. No corrige: devuelve hallazgos con la línea y el token sugerido. */
export function auditarCodigo(codigo: string, lenguaje: Lenguaje): HallazgoCodigo[] {
  const limpio = quitarComentarios(codigo, lenguaje);
  const lineas = limpio.split('\n');
  // Líneas dentro de un @font-face: ahí font-family declara el nombre de una fuente que se carga, no la usa.
  const lineasFontFace = new Set<number>();
  for (const bloque of limpio.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const desde = limpio.slice(0, bloque.index).split('\n').length;
    const hasta = desde + bloque[0].split('\n').length - 1;
    for (let n = desde; n <= hasta; n++) lineasFontFace.add(n);
  }
  const hallazgos: HallazgoCodigo[] = [];
  const vistos = new Set<string>();
  const agregar = (h: HallazgoCodigo) => {
    const clave = `${h.linea}:${h.columna}:${h.tipo}:${h.valor}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    hallazgos.push(h);
  };

  const esClaseUtil = lenguaje !== 'css';
  const esJsx = lenguaje === 'jsx';

  lineas.forEach((texto, i) => {
    const linea = i + 1;
    const esDefinicionDeVariable = /^\s*--[\w-]+\s*:/.test(texto);

    // ---- Colores literales: hex, rgb(), rgba(), hsl(), hsla() ----
    const reColor = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\b(?:rgba?|hsla?)\(\s*[^)]*\)/g;
    for (const m of texto.matchAll(reColor)) {
      const antes = texto.slice(0, m.index);
      if (/(?:href|xlink:href)\s*=\s*["']?$|url\(\s*["']?$/i.test(antes)) continue;
      const rgb = leerColor(m[0]);
      if (!rgb) continue;
      const hex = aHex(rgb);
      const exacto = tokenExacto(hex);
      const col = (m.index ?? 0) + 1;
      if (exacto) {
        if (esDefinicionDeVariable) continue;
        agregar({
          linea, columna: col, tipo: 'color', severidad: 'aviso', valor: m[0], token: exacto.token, regla: 'R-COLOR-1',
          mensaje: `${m[0]} coincide con el token ${exacto.token}, pero está escrito a mano.`,
          sugerencia: `Use var(${exacto.variable})${esClaseUtil ? ` o la utilidad de Tailwind (${utilidadColor(exacto.token)})` : ''}.`
        });
      } else {
        const c = tokenMasCercano(rgb);
        agregar({
          linea, columna: col, tipo: 'color', severidad: 'error', valor: m[0], token: c.token, regla: 'R-COLOR-1',
          mensaje: `${m[0]} (${hex}) no está en la paleta. Más cercano: ${c.token} (${c.valor}), ΔE ${c.deltaE}.`,
          sugerencia: `Use var(${c.variable}).`
        });
      }
    }

    // ---- Colores por nombre (white, black, gray…) en propiedades de color ----
    for (const m of texto.matchAll(PROPIEDADES_COLOR)) {
      const nombre = m[1]!.toLowerCase();
      const hex = COLORES_NOMBRADOS[nombre];
      if (!hex) continue;
      const rgb = leerColor(hex)!;
      const exacto = tokenExacto(hex);
      const c = exacto ?? tokenMasCercano(rgb);
      agregar({
        linea, columna: (m.index ?? 0) + 1, tipo: 'color', severidad: exacto ? 'aviso' : 'error', valor: nombre, token: c.token, regla: 'R-COLOR-1',
        mensaje: exacto ? `«${nombre}» equivale a ${c.token}.` : `«${nombre}» no está en la paleta. Más cercano: ${c.token} (${c.valor}), ΔE ${c.deltaE}.`,
        sugerencia: `Use var(${c.variable}).`
      });
    }

    // ---- Tailwind: paleta por defecto, blanco y negro ----
    if (esClaseUtil) {
      const reTw = new RegExp(`(?<![\\w-])(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|accent|caret|shadow)-(?:${TAILWIND_PALETAS})-\\d{2,3}(?:/\\d+)?(?![\\w-])`, 'g');
      for (const m of texto.matchAll(reTw)) {
        agregar({
          linea, columna: (m.index ?? 0) + 1, tipo: 'color', severidad: 'error', valor: m[0], regla: 'R-COLOR-1',
          mensaje: `«${m[0]}» es de la paleta por defecto de Tailwind, no de la marca.`,
          sugerencia: 'Use una utilidad de los tokens: tinta, texto, apagado, linea, suave, fondo, azul, azul-suave, blanco (p. ej. bg-tinta, text-azul).'
        });
      }
      for (const m of texto.matchAll(/(?<![\w-])(?:bg|text|border|ring|outline|fill|stroke)-(white|black)(?![\w-])/g)) {
        const nombre = m[1]!;
        const c = nombre === 'white' ? tokenExacto('#FFFFFF')! : tokenMasCercano(leerColor('#000000')!);
        agregar({
          linea, columna: (m.index ?? 0) + 1, tipo: 'color', severidad: nombre === 'white' ? 'aviso' : 'error', valor: m[0], token: c.token, regla: nombre === 'white' ? 'R-COLOR-4' : 'R-COLOR-1',
          mensaje: nombre === 'white' ? `«${m[0]}» equivale a ${c.token}; blanco puro solo va sobre tinta o azul.` : `«${m[0]}»: el negro puro no está en la paleta. Más cercano: ${c.token}.`,
          sugerencia: `Use ${utilidadColor(c.token, m[0].split('-')[0]!)}.`
        });
      }
    }

    // ---- Degradados ----
    for (const m of texto.matchAll(/\b(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|(?<![\w-])bg-(?:gradient-to-\w+|linear-\S+|radial\S*|conic\S*)/g)) {
      agregar({
        linea, columna: (m.index ?? 0) + 1, tipo: 'degradado', severidad: 'error', valor: m[0].trim(), regla: 'R-COLOR-3',
        mensaje: 'La marca no usa degradados.', sugerencia: 'Use un color plano de la paleta.'
      });
    }

    // ---- Fuentes ----
    // CSS y HTML: el valor es la lista completa hasta «;» o «}» (puede empezar con comillas: "Instrument Sans", Arial).
    // JSX: el valor es un único texto entre comillas (fontFamily: 'Roboto, sans-serif').
    const reFamilia = esJsx
      ? /(?:font-family|fontFamily)\s*[:=]\s*(?:\{\s*)?(?:"([^"]*)"|'([^']*)'|([^;}\n]*))/gi
      : /(?:font-family|fontFamily)\s*[:=]\s*([^;}\n]*)/gi;
    for (const m of texto.matchAll(reFamilia)) {
      let valor = esJsx ? (m[1] ?? m[2] ?? m[3] ?? '') : (m[1] ?? '');
      // En style="…" la lista termina en la comilla que cierra el atributo (seguida de «>», de otro atributo o del fin de línea).
      if (!esJsx) valor = valorDeAtributo(valor);
      valor = valor.replace(/\s*!important\s*$/i, '').trim();
      if (!valor || /var\(/.test(valor)) continue;
      const lista = valor.split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      const claves = lista.map((f) => f.toLowerCase());
      if (claves.every((k) => VALORES_ESPECIALES.includes(k))) continue;
      const marca = familiasDeLaMarca();
      if (lineasFontFace.has(linea)) {
        // En un @font-face se declara un nombre: vale una familia de la marca o la fuente de código del sistema.
        const declaradas = [...marca, ...(familiaDeCodigo() ? [familiaDeCodigo()!] : [])];
        if (!claves.every((k) => declaradas.includes(k))) {
          const f = lista.find((x) => !declaradas.includes(x.toLowerCase()))!;
          agregar({
            linea, columna: (m.index ?? 0) + 1, tipo: 'fuente', severidad: 'error', valor: f, token: 'tipografia.familia.texto', regla: 'R-TIPO-1',
            mensaje: `El @font-face carga la fuente «${f}», que no es de la marca (solo Bricolage Grotesque e Instrument Sans; JetBrains Mono solo para código).`,
            sugerencia: 'Cargue solo las fuentes de marca/assets/fuentes.'
          });
        }
        continue;
      }
      const posicionMarca = claves.findIndex((k) => marca.includes(k));
      let genericaReportada = false;
      lista.forEach((f, i) => {
        const k = claves[i]!;
        if (marca.includes(k) || VALORES_ESPECIALES.includes(k)) return;
        const columna = (m.index ?? 0) + 1;
        const sugerencia = `Use var(${nombreVariable('tipografia.familia.texto')}) para texto o var(${nombreVariable('tipografia.familia.titulo')}) para títulos.`;
        if (FAMILIAS_GENERICAS.includes(k)) {
          // Una genérica solo es respaldo: tiene que venir después de una familia de la marca.
          if ((posicionMarca === -1 || i < posicionMarca) && !genericaReportada) {
            genericaReportada = true;
            agregar({
              linea, columna, tipo: 'fuente', severidad: 'error', valor: f, token: 'tipografia.familia.texto', regla: 'R-TIPO-1',
              mensaje: posicionMarca === -1
                ? `«${f}» está sola: la lista no incluye ninguna fuente de la marca (Bricolage Grotesque o Instrument Sans). Una genérica solo vale como respaldo.`
                : `«${f}» va antes de la fuente de la marca. Una genérica solo vale como respaldo, al final de la lista.`,
              sugerencia
            });
          }
          return;
        }
        agregar({
          linea, columna, tipo: 'fuente', severidad: 'error', valor: f, token: 'tipografia.familia.texto', regla: 'R-TIPO-1',
          mensaje: `La fuente «${f}» no es de la marca (solo Bricolage Grotesque e Instrument Sans).`, sugerencia
        });
      });
    }
    for (const m of texto.matchAll(/fonts\.googleapis\.com\/css2?\?[^"'\s>)]*/g)) {
      for (const fam of m[0].matchAll(/family=([^:&]+)/g)) {
        const nombre = decodeURIComponent(fam[1]!.replace(/\+/g, ' '));
        if (familiasDeLaMarca().includes(nombre.toLowerCase())) continue;
        agregar({
          linea, columna: (m.index ?? 0) + 1, tipo: 'fuente', severidad: 'error', valor: nombre, token: 'tipografia.familia.texto', regla: 'R-TIPO-1',
          mensaje: `Se carga la fuente «${nombre}», que no es de la marca.`, sugerencia: 'Cargue solo Bricolage Grotesque (800) e Instrument Sans (400–700), o use los woff2 de marca/assets/fuentes.'
        });
      }
    }
    if (esClaseUtil) {
      for (const m of texto.matchAll(/(?<![\w-])font-(sans|serif|mono)(?![\w-])/g)) {
        agregar({
          linea, columna: (m.index ?? 0) + 1, tipo: 'fuente', severidad: 'error', valor: m[0], token: 'tipografia.familia.texto', regla: 'R-TIPO-1',
          mensaje: `«${m[0]}» usa la pila por defecto de Tailwind, no la de la marca.`, sugerencia: 'Use font-texto o font-titulo.'
        });
      }
      for (const m of texto.matchAll(/(?<![\w-])font-\[([^\]]+)\]/g)) {
        agregar({
          linea, columna: (m.index ?? 0) + 1, tipo: 'fuente', severidad: 'error', valor: m[0], token: 'tipografia.familia.texto', regla: 'R-TIPO-1',
          mensaje: `«${m[0]}» define una fuente a mano.`, sugerencia: 'Use font-texto o font-titulo.'
        });
      }
    }

    // ---- Tamaños de fuente ----
    const reTamano = /(?:font-size|fontSize)\s*[:=]\s*(?:\{\s*)?["']?\s*(-?[\d.]+(?:px|rem|em))/gi;
    const revisarTamano = (crudo: string, col: number, valorMostrado: string) => {
      const px = aPx(crudo);
      if (px === null) return;
      const escala = escalaTamanos();
      const exacto = escala.find((e) => Math.abs(e.px - px) < 0.01);
      if (exacto) {
        agregar({
          linea, columna: col, tipo: 'tamano', severidad: 'aviso', valor: valorMostrado, token: exacto.ruta, regla: 'R-TIPO-4',
          mensaje: `${valorMostrado} equivale a ${exacto.ruta}, pero está escrito a mano.`, sugerencia: `Use var(${nombreVariable(exacto.ruta)}).`
        });
      } else {
        const c = masCercano(escala, px);
        agregar({
          linea, columna: col, tipo: 'tamano', severidad: 'error', valor: valorMostrado, token: c.ruta, regla: 'R-TIPO-4',
          mensaje: `${valorMostrado} (${redondear(px)}px) no está en la escala tipográfica. Más cercano: ${c.ruta} (${c.px}px).`,
          sugerencia: `Use var(${nombreVariable(c.ruta)}).`
        });
      }
    };
    for (const m of texto.matchAll(reTamano)) revisarTamano(m[1]!, (m.index ?? 0) + 1, m[1]!);
    if (esJsx || lenguaje === 'html') {
      for (const m of texto.matchAll(/fontSize\s*:\s*(\d+(?:\.\d+)?)(?![\d.]*(?:px|rem|em|%|pt))/g)) revisarTamano(`${m[1]}px`, (m.index ?? 0) + 1, `${m[1]}`);
    }
    if (esClaseUtil) {
      for (const m of texto.matchAll(/(?<![\w-])text-\[(-?[\d.]+(?:px|rem|em))\]/g)) revisarTamano(m[1]!, (m.index ?? 0) + 1, m[0]);
      for (const m of texto.matchAll(/(?<![\w-])text-([6-9]xl)(?![\w-])/g)) {
        agregar({
          linea, columna: (m.index ?? 0) + 1, tipo: 'tamano', severidad: 'error', valor: m[0], token: 'tipografia.tamano.5xl', regla: 'R-TIPO-4',
          mensaje: `«${m[0]}» no existe en la escala tipográfica (llega a 5xl = 64px).`, sugerencia: 'Use text-5xl como máximo.'
        });
      }
    }

    // ---- Radios ----
    const reRadio = /(?:border-radius|borderRadius)\s*[:=]\s*(?:\{\s*)?(?:"([^"]*)"|'([^']*)'|([^;}\n]*))/gi;
    for (const m of texto.matchAll(reRadio)) {
      let valor = m[1] ?? m[2] ?? m[3] ?? '';
      if (!esJsx && m[3] !== undefined) valor = valorDeAtributo(m[3]);
      valor = valor.replace(/\s*!important\s*$/i, '').trim().replace(/[,}]+$/, '');
      if (!valor || /var\(|calc\(|inherit|initial|unset/.test(valor)) continue;
      for (const parte of valor.split(/[\s/]+/).filter(Boolean)) revisarRadio(parte, (m.index ?? 0) + 1, parte);
    }
    function revisarRadio(parte: string, col: number, mostrar: string) {
      if (/^0(px|rem|em|%)?$/.test(parte)) return;
      const px = /^[\d.]+$/.test(parte) ? parseFloat(parte) : aPx(parte);
      if (px === null) {
        if (parte === '50%' || parte === '100%') {
          agregar({ linea, columna: col, tipo: 'radio', severidad: 'aviso', valor: mostrar, token: 'radio.pill', regla: 'R-FORMA-1',
            mensaje: `${mostrar} no es un radio de la marca.`, sugerencia: `Si busca una píldora, use var(${nombreVariable('radio.pill')}).` });
        }
        return;
      }
      const escala = escalaRadios();
      const exacto = escala.find((e) => Math.abs(e.px - px) < 0.01);
      if (exacto) {
        agregar({ linea, columna: col, tipo: 'radio', severidad: 'aviso', valor: mostrar, token: exacto.ruta, regla: 'R-FORMA-1',
          mensaje: `${mostrar} equivale a ${exacto.ruta}, pero está escrito a mano.`, sugerencia: `Use var(${nombreVariable(exacto.ruta)}).` });
      } else if (px >= 999) {
        agregar({ linea, columna: col, tipo: 'radio', severidad: 'aviso', valor: mostrar, token: 'radio.pill', regla: 'R-FORMA-1',
          mensaje: `${mostrar} busca una píldora.`, sugerencia: `Use var(${nombreVariable('radio.pill')}).` });
      } else {
        const c = masCercano(escala.filter((e) => e.px < 999), px);
        agregar({ linea, columna: col, tipo: 'radio', severidad: 'error', valor: mostrar, token: c.ruta, regla: 'R-FORMA-1',
          mensaje: `${mostrar} no es un radio de la marca. Más cercano: ${c.ruta} (${c.px}px).`, sugerencia: `Use var(${nombreVariable(c.ruta)}).` });
      }
    }
    if (esClaseUtil) {
      for (const m of texto.matchAll(/(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|ee|es))?-\[(-?[\d.]+(?:px|rem|em))\]/g)) revisarRadio(m[1]!, (m.index ?? 0) + 1, m[0]);
      for (const m of texto.matchAll(/(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|ee|es))?-(xl|2xl|3xl|4xl)(?![\w-])/g)) {
        agregar({ linea, columna: (m.index ?? 0) + 1, tipo: 'radio', severidad: 'error', valor: m[0], token: 'radio.lg', regla: 'R-FORMA-1',
          mensaje: `«${m[0]}» no existe en los radios de la marca (sm, md, lg, cuadro, pill).`, sugerencia: 'Use rounded-lg como máximo, o rounded-pill.' });
      }
      for (const m of enCadenas(texto, /(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|ee|es))?(?![\w-])/g)) {
        agregar({ linea, columna: m.indice + 1, tipo: 'radio', severidad: 'error', valor: m.texto, token: 'radio.sm', regla: 'R-FORMA-1',
          mensaje: `«${m.texto}» (sin tamaño) usa el radio por defecto de Tailwind, que no es de la marca.`, sugerencia: 'Use rounded-sm, rounded-md, rounded-lg o rounded-pill.' });
      }
      for (const m of texto.matchAll(/(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|ee|es))?-full(?![\w-])/g)) {
        agregar({ linea, columna: (m.index ?? 0) + 1, tipo: 'radio', severidad: 'aviso', valor: m[0], token: 'radio.pill', regla: 'R-FORMA-1',
          mensaje: `«${m[0]}» equivale a una píldora.`, sugerencia: 'Use rounded-pill.' });
      }
    }

    // ---- Sombras ----
    for (const m of texto.matchAll(/(?:box-shadow|boxShadow|text-shadow|textShadow)\s*[:=]\s*(?:\{\s*)?(?:"([^"]*)"|'([^']*)'|([^;}\n]*))/gi)) {
      const valor = (m[1] ?? m[2] ?? m[3] ?? '').trim();
      if (!valor || /^(none|inherit|initial|unset)$/i.test(valor) || /var\(/.test(valor)) continue;
      agregar({ linea, columna: (m.index ?? 0) + 1, tipo: 'sombra', severidad: 'error', valor, token: 'sombra.suave', regla: 'R-FORMA-2',
        mensaje: 'La marca no usa sombras por defecto, y las que usa son sombra.suave y sombra.elevada.',
        sugerencia: `Use var(${nombreVariable('sombra.suave')}) o var(${nombreVariable('sombra.elevada')}), o quite la sombra.` });
    }
    if (esClaseUtil) {
      for (const m of enCadenas(texto, /(?<![\w-])shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|inner))?(?![\w-])/g)) {
        agregar({ linea, columna: m.indice + 1, tipo: 'sombra', severidad: 'error', valor: m.texto, token: 'sombra.suave', regla: 'R-FORMA-2',
          mensaje: `«${m.texto}» es una sombra por defecto de Tailwind, no de la marca.`, sugerencia: 'Use shadow-suave o shadow-elevada, o quite la sombra.' });
      }
    }
  });

  // ---- Radios de SVG: rx / ry en <rect> ----
  // Una esquina con rx ≥ mitad de la altura es una píldora (válida). El resto se compara con la escala de radios.
  // Los valores están en unidades del SVG (con viewBox pueden no ser px); en los SVG de la marca coinciden con la escala.
  if (lenguaje !== 'css') {
    const posicionDe = (indice: number) => {
      const antes = limpio.slice(0, indice);
      return { linea: antes.split('\n').length, columna: indice - (antes.lastIndexOf('\n') + 1) + 1 };
    };
    const atributo = (etiqueta: string, nombre: string) => {
      const m = new RegExp(`(?<![\\w-])${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*([\\d.]+)\\s*\\})`).exec(etiqueta);
      if (!m) return undefined;
      const crudo = (m[1] ?? m[2] ?? m[3] ?? '').trim();
      const n = /^(-?[\d.]+)(?:px)?$/.exec(crudo);
      return n ? { valor: parseFloat(n[1]!), indice: m.index } : undefined;
    };
    for (const rect of limpio.matchAll(/<rect\b[^>]*>/g)) {
      const etiqueta = rect[0];
      const alto = atributo(etiqueta, 'height')?.valor;
      for (const nombre of ['rx', 'ry']) {
        const a = atributo(etiqueta, nombre);
        if (!a || a.valor === 0) continue;
        if (alto !== undefined && a.valor * 2 >= alto - 0.01) continue; // píldora
        const escala = escalaRadios().filter((e) => e.px < 999);
        if (escala.some((e) => Math.abs(e.px - a.valor) < 0.01)) continue;
        const c = masCercano(escala, a.valor);
        const { linea, columna } = posicionDe((rect.index ?? 0) + a.indice);
        agregar({
          linea, columna, tipo: 'radio', severidad: 'error', valor: `${nombre}="${a.valor}"`, token: c.ruta, regla: 'R-FORMA-1',
          mensaje: `${nombre}="${a.valor}" no es un radio de la marca. Más cercano: ${c.ruta} (${c.px}).`,
          sugerencia: `Use ${nombre}="${c.px}" (${c.ruta}), o un valor que cubra la mitad de la altura si busca una píldora.`
        });
      }
    }
  }

  return hallazgos.sort((a, b) => a.linea - b.linea || a.columna - b.columna);
}


/** Busca un patrón solo dentro de cadenas entre comillas (así no se confunde «rounded» en prosa con una clase). */
function enCadenas(linea: string, patron: RegExp): { texto: string; indice: number }[] {
  const salida: { texto: string; indice: number }[] = [];
  for (const c of linea.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
    const contenido = c[1] ?? c[2] ?? c[3] ?? '';
    const desplazamiento = (c.index ?? 0) + 1;
    for (const m of contenido.matchAll(patron)) salida.push({ texto: m[0], indice: desplazamiento + (m.index ?? 0) });
  }
  return salida;
}

function utilidadColor(token: string, prefijo = 'bg'): string {
  return `${prefijo}-${token.replace(/^color\./, '').replace(/\./g, '-')}`;
}

export function resumirHallazgos(h: HallazgoCodigo[]) {
  const porTipo: Record<string, number> = {};
  for (const x of h) porTipo[x.tipo] = (porTipo[x.tipo] ?? 0) + 1;
  return {
    total: h.length,
    errores: h.filter((x) => x.severidad === 'error').length,
    avisos: h.filter((x) => x.severidad === 'aviso').length,
    porTipo,
    cumple: h.filter((x) => x.severidad === 'error').length === 0
  };
}
