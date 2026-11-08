/** Las llamadas del recorrido «propuesta para una pyme». Las usan el generador de capturas y las pruebas. */
export interface Paso {
  id: string;
  /** Qué ocurre en la conversación en este punto. */
  contexto: string;
  herramienta: string;
  args: Record<string, unknown>;
  /** Máximo de líneas de salida que se dibujan (el resto se avisa en la captura). */
  maxLineas?: number;
}

export const BORRADOR =
  'Hola, soy Nehemias, un apasionado Product Designer. Te propongo llevar tu negocio al siguiente nivel con soluciones 360. Hoy en día necesitas una interfaz innovadora: mis clientes aumentaron 40% su conversión.';
export const CORREGIDO =
  'Soy Nehemias Pérez, Diseñador UI/UX. Le propongo rediseñar su panel de métricas para que su equipo lo use sin capacitación. La propuesta incluye dos rondas de revisión y tiene vigencia de 15 días.';
export const CSS_A_OJO =
  '.portada {\n  background: #FFFFFF;\n  font-family: Inter, sans-serif;\n}\n.portada h1 {\n  font-size: 40px;\n  color: #0A3D80;\n  border-radius: 8px;\n}';
export const CSS_CORREGIDO =
  '.portada {\n  background: var(--color-fondo);\n  font-family: var(--font-texto);\n}\n.portada h1 {\n  font: var(--font-weight-extranegrita) var(--text-3xl)/var(--text-3xl--line-height) var(--font-titulo);\n  color: var(--color-azul);\n  border-radius: var(--radius-md);\n}';

export const PASOS: Paso[] = [
  { id: 'buscar-componente', contexto: 'Claude busca qué componente sirve para una portada de propuesta.', herramienta: 'buscar_componente', args: { consulta: 'portada de una propuesta para un cliente', limite: 3 } },
  { id: 'obtener-componente', contexto: 'Lee el componente elegido, con el código para HTML.', herramienta: 'obtener_componente', args: { nombre: 'portada-de-documento', formato: 'html' }, maxLineas: 16 },
  { id: 'obtener-tokens', contexto: 'Carga los colores de la marca para no escribirlos de memoria.', herramienta: 'obtener_tokens', args: { categoria: 'color' }, maxLineas: 9 },
  { id: 'obtener-asset', contexto: 'Pide el motivo de cuadros en SVG, en lugar de redibujarlo.', herramienta: 'obtener_asset', args: { nombre: 'motivo', variante: 'claro' }, maxLineas: 3 },
  { id: 'revisar-texto-borrador', contexto: 'Usted pega su texto antiguo y pide revisarlo para un cliente.', herramienta: 'revisar_texto', args: { texto: BORRADOR, contexto: 'cliente' } },
  { id: 'revisar-texto-corregido', contexto: 'Claude propone una versión corregida y la vuelve a revisar.', herramienta: 'revisar_texto', args: { texto: CORREGIDO, contexto: 'cliente' } },
  { id: 'revisar-contraste', contexto: 'Usted duda de un par de colores para las etiquetas.', herramienta: 'revisar_contraste', args: { texto: 'color.apagado', fondo: 'color.suave' } },
  { id: 'auditar-css-a-ojo', contexto: 'Claude audita un primer CSS escrito a ojo.', herramienta: 'auditar_codigo', args: { lenguaje: 'css', codigo: CSS_A_OJO } },
  { id: 'auditar-css-corregido', contexto: 'Corrige con las variables de los tokens y vuelve a auditar.', herramienta: 'auditar_codigo', args: { lenguaje: 'css', codigo: CSS_CORREGIDO } }
];

/** Las dos versiones corregidas que Claude Desktop propuso en la prueba real (caso-de-estudio/recorrido/desktop-real). */
export const PROPUESTA_DESKTOP_A =
  'Hola, soy Nehemias, Diseñador UI/UX. Le propongo revisar la interfaz de su sitio para encontrar en qué punto los usuarios abandonan el proceso y rediseñar esas pantallas para que completar una compra o un registro sea más sencillo.';
export const PROPUESTA_DESKTOP_B =
  'Hola, soy Nehemias, Diseñador UI/UX. Le propongo revisar la interfaz de su sitio para encontrar en qué punto los usuarios abandonan el proceso y rediseñar esas pantallas. En un proyecto reciente de [tipo de negocio], ese trabajo aumentó la conversión un 40 %.';

/** El aviso destacado que Claude Desktop entregó en la segunda prueba real (el código completo que pegó el usuario). */
export const AVISO_DESKTOP = `<aside class="aviso" role="note">
  <p class="aviso__titulo">Importante</p>
  <p class="aviso__texto">La propuesta incluye dos rondas de revisión y tiene vigencia de 15 días.</p>
</aside>

<style>
  :root {
    --color-azul-suave: #E8EFF7;
    --color-azul: #043565;
    --color-texto: #2B2F36;
    --color-tinta: #0E1116;
    --font-texto: "Instrument Sans", system-ui, sans-serif;
    --font-weight-negrita: 700;
    --text-base: 16px;
    --text-base--line-height: 26px;
    --radius-md: 10px;
    --spacing-sm: 8px;
    --spacing-lg: 24px;
  }

  .aviso {
    background: var(--color-azul-suave);
    border-left: 4px solid var(--color-azul);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    padding: var(--spacing-lg);
  }
  .aviso__titulo {
    margin: 0 0 var(--spacing-sm);
    font: var(--font-weight-negrita) var(--text-base)/var(--text-base--line-height) var(--font-texto);
    color: var(--color-tinta);
  }
  .aviso__texto {
    margin: 0;
    font: var(--text-base)/var(--text-base--line-height) var(--font-texto);
    color: var(--color-texto);
  }
</style>`;
