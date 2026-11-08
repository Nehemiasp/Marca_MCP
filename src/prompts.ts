import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { buscarComponentes } from './nucleo/busqueda.js';
import { cargarComponente, listarComponentes } from './nucleo/componentes.js';
import { leerTexto } from './nucleo/rutas.js';

type Mensaje = { role: 'user'; content: { type: 'text'; text: string } | { type: 'resource'; resource: { uri: string; mimeType: string; text: string } } };

const texto = (t: string): Mensaje => ({ role: 'user', content: { type: 'text', text: t } });
const recurso = (uri: string, mimeType: string, contenido: string): Mensaje => ({
  role: 'user',
  content: { type: 'resource', resource: { uri, mimeType, text: contenido } }
});

const tokens = () => recurso('marca://tokens', 'application/json', leerTexto('tokens.json'));
const reglas = () => recurso('marca://reglas', 'text/markdown', leerTexto('reglas.md'));
const voz = () => recurso('marca://voz', 'text/markdown', leerTexto('voz.md'));
const componenteComoRecurso = (nombre: string): Mensaje[] => {
  const c = cargarComponente(nombre);
  return c ? [recurso(`marca://componentes/${c.nombre}`, 'text/markdown', c.markdown)] : [];
};

const CIERRE_VERIFICACION =
  'Cuando termine, verifique su trabajo con las herramientas del servidor: auditar_codigo sobre el código, revisar_contraste sobre cada par de texto y fondo, y revisar_texto sobre los textos visibles. ' +
  'Corrija lo que marquen y repórteme lo que no pudo cumplir.';

/** Prompts: plantillas que el usuario invoca como comandos y que arman el contexto de antemano. */
export function registrarPrompts(server: McpServer): void {
  // ───────────────────────── crear_componente ─────────────────────────
  server.registerPrompt(
    'crear_componente',
    {
      title: 'Crear componente',
      description: 'Arma el contexto (tokens, reglas y componentes parecidos) para crear un componente con la marca en el formato elegido.',
      argsSchema: z.object({
        nombre: z.string().min(2).describe('Qué componente necesita, p. ej. «tarjeta de testimonio» o «menú de navegación».'),
        formato: z.enum(['html', 'react', 'impresion']).describe('html (HTML + CSS), react (React + Tailwind v4) o impresion (CSS para PDF).')
      })
    },
    ({ nombre, formato }) => {
      const etiquetaFormato = { html: 'HTML + CSS', react: 'React + Tailwind v4', impresion: 'CSS para impresión (PDF)' }[formato];
      const parecidos = buscarComponentes(nombre, 3).map((r) => r.nombre);
      const existente = parecidos.find((p) => p === nombre.trim().toLowerCase().replace(/\s+/g, '-'));
      const referencias = parecidos.length ? parecidos : listarComponentes().slice(0, 2).map((c) => c.nombre);
      const instruccion =
        `Cree el componente «${nombre}» en ${etiquetaFormato} con la marca personal de Nehemias Pérez (Diseñador UI/UX).\n\n` +
        `Use únicamente los tokens adjuntos: variables CSS (var(--color-…), var(--text-…), var(--radius-…)) o las utilidades de Tailwind v4 del bloque @theme de exportar_tokens (formato tailwind4). ` +
        `Respete las reglas adjuntas: azul solo como acento, una sola palabra destacada por título, sin degradados, radios y sombras del set.\n` +
        (existente ? `Ya existe un componente llamado «${existente}»: parta de su documentación en lugar de reinventarlo.\n` : '') +
        `Los componentes parecidos adjuntos (${referencias.join(', ')}) muestran el patrón de documentación y de código a seguir.\n` +
        `Entregue: para qué sirve, cuándo no usarlo, variantes y estados, tokens que usa, accesibilidad y el código en ${etiquetaFormato}.\n\n` +
        CIERRE_VERIFICACION;
      return { description: `Crear «${nombre}» en ${etiquetaFormato}`, messages: [texto(instruccion), tokens(), reglas(), ...referencias.flatMap(componenteComoRecurso)] };
    }
  );

  // ───────────────────────── revisar_pantalla ─────────────────────────
  server.registerPrompt(
    'revisar_pantalla',
    {
      title: 'Revisar pantalla',
      description: 'Pide una revisión de una pantalla (código o descripción) contra la marca, usando auditar_codigo, revisar_contraste y revisar_texto.',
      argsSchema: z.object({
        entrada: z.string().min(1).describe('El código (CSS, HTML o JSX) o una descripción de la pantalla.'),
        lenguaje: z.enum(['css', 'html', 'jsx', 'descripcion']).default('html').describe('css, html, jsx o descripcion si es una descripción en texto.')
      })
    },
    ({ entrada, lenguaje }) => {
      const esCodigo = lenguaje !== 'descripcion';
      const pasos = esCodigo
        ? `1. Ejecute auditar_codigo con lenguaje «${lenguaje}» sobre el código.\n` +
          `2. Identifique los pares de color de texto y fondo y ejecute revisar_contraste en cada uno.\n` +
          `3. Extraiga los textos visibles y ejecute revisar_texto sobre ellos.\n`
        : `1. Deduzca los colores, fuentes, tamaños y radios que describe y revíselos con revisar_color y revisar_contraste.\n` +
          `2. Ejecute revisar_texto sobre los textos que menciona.\n` +
          `3. Si necesita referencias, consulte obtener_tokens y buscar_componente.\n`;
      const instruccion =
        `Revise esta pantalla contra la marca personal de Nehemias Pérez. No corrija el archivo: informe hallazgos y sugerencias.\n\n${pasos}\n` +
        `Presente el resultado en una tabla con: ubicación (línea si hay código), qué incumple, regla (R-…) y qué usar en su lugar. ` +
        `Termine con un veredicto de una línea (cumple / cumple con avisos / no cumple) y los tres cambios más importantes. Hable de «usted».\n\n` +
        `${esCodigo ? 'Código' : 'Descripción'} a revisar:\n\n${esCodigo ? '```' + lenguaje + '\n' + entrada + '\n```' : entrada}`;
      return { description: 'Revisión de pantalla contra la marca', messages: [texto(instruccion), reglas(), voz()] };
    }
  );

  // ───────────────────────── pieza_de_marca ─────────────────────────
  const PIEZAS = {
    propuesta: {
      formato: 'Documento A4 vertical para PDF (CSS de impresión con @page).',
      componentes: ['portada-de-documento', 'encabezado-de-seccion', 'tabla', 'aviso-destacado', 'bloque-de-contacto', 'motivo-de-cuadros'],
      notas: 'Con clientes, trato de «usted». Portada con nombre arriba, título grande con una palabra en azul, metadatos abajo y el motivo a la derecha; cierre con el bloque de contacto. Use revisar_texto con contexto «cliente». No invente cifras ni clientes.'
    },
    tarjeta: {
      formato: 'Tarjeta de presentación de 85 × 55 mm (frente y reverso), lista para impresión.',
      componentes: ['bloque-de-contacto', 'motivo-de-cuadros'],
      notas: 'Frente: nombre, «Diseñador UI/UX» y la frase de marca. Reverso: contacto y QR. El motivo mini sirve de sello; no lo ponga detrás de texto.'
    },
    redes: {
      formato: 'Publicación para redes sociales de 1080 × 1350 px (retrato), en HTML + CSS.',
      componentes: ['encabezado-de-seccion', 'etiqueta', 'motivo-de-cuadros'],
      notas: 'Un solo mensaje, frases cortas, una sola palabra destacada en azul. Tono directo en primera persona; sin relleno ni cifras no reales.'
    },
    presentacion: {
      formato: 'Presentación 16:9 (1920 × 1080 px), una diapositiva por sección, en HTML + CSS.',
      componentes: ['portada-de-documento', 'encabezado-de-seccion', 'tarjeta-de-proyecto', 'tabla', 'bloque-de-contacto', 'motivo-de-cuadros'],
      notas: 'Portada con la misma composición del documento; diapositivas interiores con encabezado de sección y poco texto; cierre con contacto. Puede alternar claro y oscuro con las variantes oscuras.'
    }
  } as const;

  server.registerPrompt(
    'pieza_de_marca',
    {
      title: 'Pieza de marca',
      description: 'Arma el contexto (portada, motivo, voz, reglas y tokens) para producir una pieza: propuesta, tarjeta, publicación para redes o presentación.',
      argsSchema: z.object({
        tipo: z.enum(['propuesta', 'tarjeta', 'redes', 'presentacion']).describe('propuesta, tarjeta, redes o presentacion.'),
        brief: z.string().min(1).describe('De qué trata la pieza, para quién es y qué debe lograr.')
      })
    },
    ({ tipo, brief }) => {
      const p = PIEZAS[tipo];
      const instruccion =
        `Produzca una pieza de marca de tipo «${tipo}» para Nehemias Pérez (Diseñador UI/UX).\n\n` +
        `Formato: ${p.formato}\n` +
        `Brief: ${brief}\n\n` +
        `Componentes a usar (adjuntos): ${p.componentes.join(', ')}.\n` +
        `Notas: ${p.notas}\n\n` +
        `Use la frase de marca «Interfaces pensadas para implementarse.» solo si encaja, con «implementarse.» en azul. ` +
        `Obtenga los SVG del logo y del motivo con obtener_asset; no los redibuje. ` +
        `Todo color, fuente, tamaño y radio sale de los tokens.\n\n` +
        CIERRE_VERIFICACION;
      return {
        description: `Pieza de marca: ${tipo}`,
        messages: [texto(instruccion), tokens(), reglas(), voz(), ...p.componentes.flatMap(componenteComoRecurso)]
      };
    }
  );
}
