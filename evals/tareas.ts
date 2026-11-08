/**
 * Tareas de la evaluación. Siempre las mismas, con el mismo texto en las dos condiciones (sin y con servidor).
 * El pedido NO menciona colores, fuentes ni la marca: justamente eso es lo que se evalúa.
 */
export interface Tarea {
  id: string;
  titulo: string;
  pedido: string;
  /** Contexto para revisar_texto: con clientes se exige el trato de «usted». */
  contexto: 'general' | 'cliente';
  /** Tamaño de la captura. */
  viewport: { width: number; height: number };
  /** true: captura de página completa; false: solo el área visible (piezas de tamaño fijo). */
  paginaCompleta: boolean;
}

export const TAREAS: Tarea[] = [
  {
    id: 'hero-portafolio',
    titulo: 'Hero para el portafolio',
    pedido: 'Hazme un hero para mi portafolio personal. Me llamo Nehemias Pérez y soy diseñador.',
    contexto: 'general',
    viewport: { width: 1280, height: 800 },
    paginaCompleta: true
  },
  {
    id: 'tarjeta-proyecto',
    titulo: 'Tarjeta de proyecto',
    pedido: 'Haz una tarjeta de proyecto para mi portafolio. El proyecto es un panel de métricas para equipos pequeños.',
    contexto: 'general',
    viewport: { width: 1280, height: 800 },
    paginaCompleta: true
  },
  {
    id: 'portada-propuesta',
    titulo: 'Portada de propuesta (PDF)',
    pedido: 'Haz la portada de una propuesta de servicios, en formato A4 para exportar a PDF, que le voy a enviar a un cliente.',
    contexto: 'cliente',
    viewport: { width: 794, height: 1123 },
    paginaCompleta: false
  },
  {
    id: 'publicacion-redes',
    titulo: 'Publicación para redes',
    pedido: 'Haz una publicación para redes sociales de 1080×1350 px anunciando que abrí mi portafolio nuevo.',
    contexto: 'general',
    viewport: { width: 1080, height: 1350 },
    paginaCompleta: false
  },
  {
    id: 'aviso-destacado',
    titulo: 'Aviso destacado',
    pedido: 'Haz un aviso destacado para una página de mi sitio que diga que respondo los mensajes en un plazo de dos días hábiles.',
    contexto: 'general',
    viewport: { width: 1280, height: 600 },
    paginaCompleta: true
  },
  {
    id: 'tabla-precios',
    titulo: 'Tabla de precios',
    pedido: 'Haz una tabla de precios con tres planes de servicios de diseño. Puedes poner montos de ejemplo.',
    contexto: 'cliente',
    viewport: { width: 1280, height: 800 },
    paginaCompleta: true
  },
  {
    id: 'bloque-contacto',
    titulo: 'Bloque de contacto con QR',
    pedido: 'Haz un bloque de contacto con un código QR para el final de una propuesta.',
    contexto: 'cliente',
    viewport: { width: 1280, height: 600 },
    paginaCompleta: true
  }
];

export const CONDICIONES = ['sin', 'con'] as const;
export type Condicion = (typeof CONDICIONES)[number];

/** Se agrega igual a todos los pedidos, en las dos condiciones. */
export const SUFIJO_DE_ENTREGA =
  '\n\nEntrega el resultado como un único archivo HTML autocontenido llamado salida.html en la carpeta actual. Al terminar, responde con una sola línea.';
