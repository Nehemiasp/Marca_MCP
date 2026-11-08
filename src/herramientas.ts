import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { auditarCodigo, resumirHallazgos } from './nucleo/auditor.js';
import { buscarComponentes } from './nucleo/busqueda.js';
import { aHex, evaluarContraste, leerColor, razonContraste, redondear } from './nucleo/color.js';
import { cargarComponente, codigoDe, FORMATOS, listarComponentes, seccion } from './nucleo/componentes.js';
import { exportarTokens, FORMATOS_EXPORTACION, nombreVariable, valorCss } from './nucleo/exportadores.js';
import { revisarColor } from './nucleo/paleta.js';
import { existe, leerTexto } from './nucleo/rutas.js';
import { CATEGORIAS, cargarTokens } from './nucleo/tokens.js';
import { revisarTexto } from './nucleo/voz.js';

const ANOTACIONES = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const LIMITE_CODIGO = 200_000;

const ok = <T extends Record<string, unknown>>(texto: string, estructurado: T) => ({
  content: [{ type: 'text' as const, text: texto }],
  structuredContent: estructurado
});
const fallo = (texto: string) => ({ isError: true, content: [{ type: 'text' as const, text: texto }] });

/** Acepta un color escrito (#hex, rgb, hsl) o la ruta de un token de color (p. ej. color.tinta). */
function resolverColor(entrada: string): { hex: string; token?: string } | null {
  const t = cargarTokens().porRuta.get(entrada.trim());
  if (t && t.tipo === 'color' && typeof t.valor === 'string') {
    const rgb = leerColor(t.valor);
    return rgb ? { hex: aHex(rgb), token: t.ruta } : null;
  }
  const rgb = leerColor(entrada);
  return rgb ? { hex: aHex(rgb) } : null;
}

const hallazgoCodigoSchema = z.object({
  linea: z.number().int().describe('Línea (desde 1) donde aparece.'),
  columna: z.number().int().describe('Columna (desde 1).'),
  tipo: z.enum(['color', 'fuente', 'tamano', 'radio', 'degradado', 'sombra']),
  severidad: z.enum(['error', 'aviso']).describe('error: fuera de la marca. aviso: coincide con un token pero está escrito a mano.'),
  valor: z.string().describe('El valor encontrado.'),
  mensaje: z.string(),
  sugerencia: z.string().describe('Qué usar en su lugar.'),
  token: z.string().optional().describe('Token sugerido, p. ej. color.azul.'),
  regla: z.string().describe('Identificador de la regla en marca://reglas, p. ej. R-COLOR-1.')
});

const tokenSchema = z.object({
  ruta: z.string().describe('Ruta con puntos, p. ej. color.azul.'),
  tipo: z.string(),
  valor: z.string().describe('Valor en formato CSS ya resuelto.'),
  variable: z.string().describe('Variable CSS correspondiente, p. ej. --color-azul.'),
  descripcion: z.string()
});

/** Herramientas: acciones que el modelo decide invocar. Todas son de solo lectura. */
export function registrarHerramientas(server: McpServer): void {
  // ───────────────────────── obtener_tokens ─────────────────────────
  server.registerTool(
    'obtener_tokens',
    {
      title: 'Obtener tokens',
      description:
        'Devuelve los tokens de diseño de la marca (color, tipografía, espaciado, radio, sombra) con su valor resuelto, su variable CSS y su descripción. ' +
        'Si indica una categoría, devuelve solo esa. Úsela antes de construir algo visual.',
      inputSchema: z.object({
        categoria: z.enum(CATEGORIAS).optional().describe('Categoría a filtrar: color, tipografia, espaciado, radio o sombra. Si se omite, devuelve todas.')
      }),
      outputSchema: z.object({ categoria: z.string().optional(), total: z.number().int(), tokens: z.array(tokenSchema) }),
      annotations: ANOTACIONES
    },
    async ({ categoria }) => {
      const tokens = cargarTokens()
        .tokens.filter((t) => !categoria || t.categoria === categoria)
        .map((t) => ({ ruta: t.ruta, tipo: t.tipo, valor: valorCss(t), variable: nombreVariable(t.ruta), descripcion: t.descripcion }));
      const texto = tokens.map((t) => `${t.ruta} = ${t.valor}  (${t.variable})  — ${t.descripcion}`).join('\n');
      return ok(`${tokens.length} tokens${categoria ? ` de ${categoria}` : ''}:\n${texto}`, { categoria, total: tokens.length, tokens });
    }
  );

  // ───────────────────────── buscar_componente ─────────────────────────
  server.registerTool(
    'buscar_componente',
    {
      title: 'Buscar componente',
      description:
        'Busca componentes de la marca por texto libre, por ejemplo «algo para mostrar un aviso» o «tarjeta para un proyecto», y devuelve los que coinciden con su resumen. ' +
        'Después use obtener_componente para ver el detalle y el código.',
      inputSchema: z.object({
        consulta: z.string().min(2).max(300).describe('Qué necesita, en lenguaje natural.'),
        limite: z.number().int().min(1).max(9).default(5).describe('Máximo de resultados (1 a 9).')
      }),
      outputSchema: z.object({
        consulta: z.string(),
        resultados: z.array(z.object({
          nombre: z.string(), titulo: z.string(), resumen: z.string(), uri: z.string(),
          puntaje: z.number().describe('0 a 100: qué tan bien coincide.'), coincidencias: z.array(z.string())
        })),
        disponibles: z.array(z.string()).describe('Nombres de todos los componentes, para orientarse si no hay coincidencias.')
      }),
      annotations: ANOTACIONES
    },
    async ({ consulta, limite }) => {
      const resultados = buscarComponentes(consulta, limite);
      const disponibles = listarComponentes().map((c) => c.nombre);
      const texto = resultados.length
        ? resultados.map((r) => `• ${r.nombre} (${r.puntaje}%): ${r.resumen}`).join('\n')
        : `No encontré componentes para «${consulta}». Disponibles: ${disponibles.join(', ')}.`;
      return ok(texto, { consulta, resultados, disponibles });
    }
  );

  // ───────────────────────── obtener_componente ─────────────────────────
  server.registerTool(
    'obtener_componente',
    {
      title: 'Obtener componente',
      description:
        'Devuelve el detalle de un componente: para qué sirve, cuándo no usarlo, variantes, tokens, accesibilidad y el código en el formato pedido ' +
        '(html = HTML + CSS, react = React + Tailwind v4, impresion = CSS para PDF, todos = los tres).',
      inputSchema: z.object({
        nombre: z.string().min(1).max(60).describe('Nombre del componente, p. ej. «boton» o «aviso-destacado». Búsquelo con buscar_componente.'),
        formato: z.enum(['html', 'react', 'impresion', 'todos']).default('todos').describe('Formato del código de ejemplo.')
      }),
      outputSchema: z.object({
        nombre: z.string(), titulo: z.string(), resumen: z.string(),
        variantes: z.array(z.string()), estados: z.array(z.string()),
        tokens: z.array(z.object({ ruta: z.string(), valor: z.string(), variable: z.string() })),
        paraQueSirve: z.string(), cuandoNoUsarlo: z.string(), accesibilidad: z.string(),
        codigo: z.object({ html: z.string().optional(), react: z.string().optional(), impresion: z.string().optional() })
      }),
      annotations: ANOTACIONES
    },
    async ({ nombre, formato }) => {
      const c = cargarComponente(nombre);
      if (!c) {
        const cercanos = buscarComponentes(nombre, 3).map((r) => r.nombre);
        const todos = listarComponentes().map((x) => x.nombre);
        return fallo(`El componente «${nombre}» no existe. ${cercanos.length ? `¿Quiso decir: ${cercanos.join(', ')}? ` : ''}Disponibles: ${todos.join(', ')}.`);
      }
      const { porRuta } = cargarTokens();
      const tokens = c.tokens.flatMap((ruta) => {
        const t = porRuta.get(ruta);
        return t ? [{ ruta, valor: valorCss(t), variable: nombreVariable(ruta) }] : [];
      });
      const pedidos = formato === 'todos' ? FORMATOS : [formato];
      const codigo: { html?: string; react?: string; impresion?: string } = {};
      for (const f of pedidos) codigo[f] = codigoDe(c, f);
      const estructurado = {
        nombre: c.nombre, titulo: c.titulo, resumen: c.resumen, variantes: c.variantes, estados: c.estados, tokens,
        paraQueSirve: seccion(c.cuerpo, 'Para qué sirve'), cuandoNoUsarlo: seccion(c.cuerpo, 'Cuándo no usarlo'),
        accesibilidad: seccion(c.cuerpo, 'Accesibilidad'), codigo
      };
      const texto = [
        `# ${c.titulo}`, c.resumen, '',
        '## Para qué sirve', estructurado.paraQueSirve, '',
        '## Cuándo no usarlo', estructurado.cuandoNoUsarlo, '',
        '## Variantes y estados', seccion(c.cuerpo, 'Variantes y estados'), '',
        '## Tokens', tokens.map((t) => `- ${t.ruta} = ${t.valor} (${t.variable})`).join('\n'), '',
        '## Accesibilidad', estructurado.accesibilidad, '',
        '## Código', ...pedidos.flatMap((f) => [`### ${f}`, codigo[f] ?? ''])
      ].join('\n');
      return ok(texto, estructurado);
    }
  );

  // ───────────────────────── revisar_color ─────────────────────────
  server.registerTool(
    'revisar_color',
    {
      title: 'Revisar color',
      description:
        'Recibe un color (#hex, rgb() o hsl()) y dice si está en la paleta de la marca. Si no, propone el token más cercano con su diferencia perceptual (ΔE2000). ' +
        'No modifica ningún archivo.',
      inputSchema: z.object({ color: z.string().min(3).max(60).describe('Color a revisar, p. ej. «#0A3D80» o «rgb(4, 53, 101)».') }),
      outputSchema: z.object({
        entrada: z.string(), hex: z.string(), enPaleta: z.boolean(),
        token: z.string().optional().describe('Token exacto, si está en la paleta.'), variable: z.string().optional(),
        masCercano: z.object({ token: z.string(), valor: z.string(), variable: z.string(), deltaE: z.number() }),
        interpretacion: z.string().describe('Qué tan perceptible es la diferencia.'), veredicto: z.string()
      }),
      annotations: ANOTACIONES
    },
    async ({ color }) => {
      const r = revisarColor(color);
      if (!r) return fallo(`No entiendo el color «${color}». Use #RRGGBB, rgb(r, g, b) o hsl(h, s%, l%).`);
      return ok(r.veredicto, { ...r });
    }
  );

  // ───────────────────────── revisar_contraste ─────────────────────────
  server.registerTool(
    'revisar_contraste',
    {
      title: 'Revisar contraste',
      description:
        'Calcula el contraste WCAG 2.x entre un color de texto y uno de fondo (colores escritos o tokens como «color.tinta») e indica si cumple AA y AAA, para texto normal y grande. ' +
        'También avisa si el par está prohibido por la marca.',
      inputSchema: z.object({
        texto: z.string().min(3).max(60).describe('Color del texto: #hex, rgb(), hsl() o un token como «color.azul».'),
        fondo: z.string().min(3).max(60).describe('Color del fondo, en los mismos formatos.')
      }),
      outputSchema: z.object({
        texto: z.object({ entrada: z.string(), hex: z.string(), token: z.string().optional() }),
        fondo: z.object({ entrada: z.string(), hex: z.string(), token: z.string().optional() }),
        razon: z.number().describe('Razón de contraste, de 1 a 21.'),
        AA: z.object({ normal: z.boolean(), grande: z.boolean() }),
        AAA: z.object({ normal: z.boolean(), grande: z.boolean() }),
        paresDeLaMarca: z.enum(['permitido', 'prohibido', 'no declarado']),
        veredicto: z.string()
      }),
      annotations: ANOTACIONES
    },
    async ({ texto, fondo }) => {
      const t = resolverColor(texto);
      const f = resolverColor(fondo);
      if (!t) return fallo(`No entiendo el color de texto «${texto}».`);
      if (!f) return fallo(`No entiendo el color de fondo «${fondo}».`);
      const razon = redondear(razonContraste(leerColor(t.hex)!, leerColor(f.hex)!));
      const nivel = evaluarContraste(razonContraste(leerColor(t.hex)!, leerColor(f.hex)!));
      const { extension } = cargarTokens();
      const mismo = (a?: string, b?: string) => a !== undefined && a === b;
      const prohibido = extension.paresProhibidos.find((p) => mismo(p.texto, t.token) && mismo(p.fondo, f.token));
      const permitido = extension.pares.find((p) => mismo(p.texto, t.token) && mismo(p.fondo, f.token));
      const estado = prohibido ? 'prohibido' : permitido ? 'permitido' : 'no declarado';
      const resumen = nivel.AAA.normal
        ? 'cumple AAA para texto normal'
        : nivel.AA.normal
          ? 'cumple AA para texto normal (no AAA)'
          : nivel.AA.grande
            ? 'solo cumple AA para texto grande (≥ 24px, o ≥ 19px en negrita)'
            : 'NO cumple AA ni siquiera para texto grande';
      const veredicto = `Contraste ${razon}:1: ${resumen}.${prohibido ? ` Par prohibido por la marca: ${prohibido.motivo}` : ''}`;
      return ok(veredicto, {
        texto: { entrada: texto, hex: t.hex, token: t.token }, fondo: { entrada: fondo, hex: f.hex, token: f.token },
        razon, AA: nivel.AA, AAA: nivel.AAA, paresDeLaMarca: estado, veredicto
      });
    }
  );

  // ───────────────────────── auditar_codigo ─────────────────────────
  server.registerTool(
    'auditar_codigo',
    {
      title: 'Auditar código',
      description:
        'Recibe CSS, HTML o JSX y señala los colores, fuentes, tamaños de letra, radios, sombras y degradados que no salen de los tokens de la marca, ' +
        'con la línea y el token sugerido. Solo revisa: no corrige ni escribe el archivo. Las utilidades de Tailwind se evalúan suponiendo el @theme de exportar_tokens (formato tailwind4).',
      inputSchema: z.object({
        codigo: z.string().min(1).max(LIMITE_CODIGO).describe('El código a revisar.'),
        lenguaje: z.enum(['css', 'html', 'jsx']).describe('css, html (puede incluir <style> y style="…") o jsx (incluye className y style={{…}}).')
      }),
      outputSchema: z.object({
        hallazgos: z.array(hallazgoCodigoSchema),
        resumen: z.object({
          total: z.number().int(), errores: z.number().int(), avisos: z.number().int(),
          porTipo: z.record(z.string(), z.number().int()), cumple: z.boolean()
        })
      }),
      annotations: ANOTACIONES
    },
    async ({ codigo, lenguaje }) => {
      const hallazgos = auditarCodigo(codigo, lenguaje);
      const resumen = resumirHallazgos(hallazgos);
      const texto = hallazgos.length
        ? `${resumen.errores} error(es) y ${resumen.avisos} aviso(s):\n` +
          hallazgos.map((h) => `L${h.linea}:${h.columna} [${h.severidad}] ${h.tipo}: ${h.mensaje} → ${h.sugerencia}`).join('\n')
        : 'Sin hallazgos: todo sale de los tokens de la marca.';
      return ok(texto, { hallazgos, resumen });
    }
  );

  // ───────────────────────── revisar_texto ─────────────────────────
  server.registerTool(
    'revisar_texto',
    {
      title: 'Revisar texto',
      description:
        'Revisa un texto contra voz.md: título incorrecto (siempre «Diseñador UI/UX», nunca «Product Designer»), palabras prohibidas, frases de relleno y cifras por verificar. ' +
        'Con contexto «cliente» también señala el trato de «tú» (con clientes se trata de «usted»). Solo devuelve hallazgos; no reescribe.',
      inputSchema: z.object({
        texto: z.string().min(1).max(LIMITE_CODIGO).describe('El texto a revisar.'),
        contexto: z.enum(['general', 'cliente']).default('general').describe('«cliente» activa la revisión del trato de usted.')
      }),
      outputSchema: z.object({
        hallazgos: z.array(z.object({
          regla: z.enum(['titulo-incorrecto', 'palabra-prohibida', 'relleno', 'trato-usted', 'cifra-por-verificar']),
          severidad: z.enum(['error', 'aviso']), fragmento: z.string(), linea: z.number().int(), columna: z.number().int(),
          mensaje: z.string(), sugerencia: z.string()
        })),
        resumen: z.object({ total: z.number().int(), errores: z.number().int(), avisos: z.number().int(), cumple: z.boolean() })
      }),
      annotations: ANOTACIONES
    },
    async ({ texto, contexto }) => {
      const hallazgos = revisarTexto(texto, { contexto });
      const errores = hallazgos.filter((h) => h.severidad === 'error').length;
      const resumen = { total: hallazgos.length, errores, avisos: hallazgos.length - errores, cumple: errores === 0 };
      const salida = hallazgos.length
        ? hallazgos.map((h) => `L${h.linea}:${h.columna} [${h.severidad}] ${h.regla}: ${h.mensaje} → ${h.sugerencia}`).join('\n')
        : 'Sin hallazgos: el texto respeta la voz de la marca.';
      return ok(salida, { hallazgos, resumen });
    }
  );

  // ───────────────────────── exportar_tokens ─────────────────────────
  server.registerTool(
    'exportar_tokens',
    {
      title: 'Exportar tokens',
      description:
        'Genera los tokens como texto listo para guardar: variables CSS (css), bloque @theme de Tailwind v4 (tailwind4), variables SCSS (scss) o JSON plano (json). ' +
        'Devuelve el contenido; no escribe ningún archivo.',
      inputSchema: z.object({ formato: z.enum(FORMATOS_EXPORTACION).describe('css, tailwind4, scss o json.') }),
      outputSchema: z.object({ formato: z.string(), archivoSugerido: z.string(), contenido: z.string() }),
      annotations: ANOTACIONES
    },
    async ({ formato }) => {
      const r = exportarTokens(formato);
      return ok(r.contenido, { formato, archivoSugerido: r.archivoSugerido, contenido: r.contenido });
    }
  );

  // ───────────────────────── obtener_asset ─────────────────────────
  server.registerTool(
    'obtener_asset',
    {
      title: 'Obtener asset',
      description:
        'Devuelve el SVG del logo o del motivo de cuadros en la variante pedida: claro, oscuro o mini (motivo de 2 × 2; use «fondo» para elegir su tema). ' +
        'El logo no tiene versión mini.',
      inputSchema: z.object({
        nombre: z.enum(['logo', 'motivo']).describe('logo o motivo.'),
        variante: z.enum(['claro', 'oscuro', 'mini']).describe('claro u oscuro según el fondo donde irá; mini solo para el motivo.'),
        fondo: z.enum(['claro', 'oscuro']).default('claro').describe('Solo para «mini»: tema del fondo donde irá.')
      }),
      outputSchema: z.object({ nombre: z.string(), variante: z.string(), archivo: z.string(), uri: z.string(), svg: z.string() }),
      annotations: ANOTACIONES
    },
    async ({ nombre, variante, fondo }) => {
      if (nombre === 'logo' && variante === 'mini') return fallo('El logo no tiene versión mini. Use el motivo mini (nombre «motivo», variante «mini»).');
      const archivo = variante === 'mini' ? `motivo-mini-${fondo}` : `${nombre}-${variante}`;
      if (!existe('assets', `${archivo}.svg`)) return fallo(`No existe el asset «${archivo}».`);
      const svg = leerTexto('assets', `${archivo}.svg`);
      return ok(svg, { nombre, variante: variante === 'mini' ? `mini-${fondo}` : variante, archivo: `${archivo}.svg`, uri: `marca://assets/${archivo}`, svg });
    }
  );
}
