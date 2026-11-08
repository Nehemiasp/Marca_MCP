import { McpServer, ResourceTemplate } from '@modelcontextprotocol/server';
import { cargarComponente, listarComponentes } from './nucleo/componentes.js';
import { existe, leerTexto, listar } from './nucleo/rutas.js';
import { CATEGORIAS, esCategoria, subarbol } from './nucleo/tokens.js';

export const nombresDeAssets = (): string[] =>
  listar('assets').filter((f) => f.endsWith('.svg')).map((f) => f.replace(/\.svg$/, ''));

const uriJson = (uri: URL, datos: unknown) => ({
  contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(datos, null, 2) }]
});
const uriMarkdown = (uri: URL, texto: string) => ({
  contents: [{ uri: uri.href, mimeType: 'text/markdown', text: texto }]
});

/** El valor de una variable de plantilla puede llegar como texto o lista; se normaliza y decodifica. */
const variable = (v: string | string[] | undefined): string => decodeURIComponent(Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));

/** Recursos: material de referencia que el cliente puede leer y adjuntar como contexto. */
export function registrarRecursos(server: McpServer): void {
  server.registerResource(
    'tokens',
    'marca://tokens',
    {
      title: 'Tokens de diseño (completo)',
      description: 'Todos los tokens de la marca en formato W3C Design Tokens (DTCG): color, tipografía, espaciado, radio y sombra.',
      mimeType: 'application/json'
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: leerTexto('tokens.json') }] })
  );

  server.registerResource(
    'tokens-por-categoria',
    new ResourceTemplate('marca://tokens/{categoria}', {
      list: async () => ({
        resources: CATEGORIAS.map((c) => ({
          uri: `marca://tokens/${c}`,
          name: `tokens-${c}`,
          title: `Tokens de ${c}`,
          mimeType: 'application/json'
        }))
      }),
      complete: { categoria: (valor) => CATEGORIAS.filter((c) => c.startsWith(valor.toLowerCase())) }
    }),
    {
      title: 'Tokens por categoría',
      description: 'Los tokens de una categoría: color, tipografia, espaciado, radio o sombra.',
      mimeType: 'application/json'
    },
    async (uri, { categoria }) => {
      const c = variable(categoria);
      if (!esCategoria(c)) throw new Error(`La categoría «${c}» no existe. Opciones: ${CATEGORIAS.join(', ')}.`);
      return uriJson(uri, { [c]: subarbol(c) });
    }
  );

  server.registerResource(
    'componentes',
    'marca://componentes',
    {
      title: 'Índice de componentes',
      description: 'Lista de componentes documentados con su resumen, variantes y estados.',
      mimeType: 'application/json'
    },
    async (uri) =>
      uriJson(
        uri,
        listarComponentes().map((c) => ({
          nombre: c.nombre,
          titulo: c.titulo,
          resumen: c.resumen,
          variantes: c.variantes,
          estados: c.estados,
          uri: `marca://componentes/${c.nombre}`
        }))
      )
  );

  server.registerResource(
    'componente',
    new ResourceTemplate('marca://componentes/{nombre}', {
      list: async () => ({
        resources: listarComponentes().map((c) => ({
          uri: `marca://componentes/${c.nombre}`,
          name: `componente-${c.nombre}`,
          title: c.titulo,
          description: c.resumen,
          mimeType: 'text/markdown'
        }))
      }),
      complete: { nombre: (valor) => listarComponentes().map((c) => c.nombre).filter((n) => n.startsWith(valor.toLowerCase())) }
    }),
    {
      title: 'Documentación de un componente',
      description: 'El .md completo de un componente: uso, variantes, tokens, accesibilidad y código.',
      mimeType: 'text/markdown'
    },
    async (uri, { nombre }) => {
      const n = variable(nombre);
      const c = cargarComponente(n);
      if (!c) throw new Error(`El componente «${n}» no existe. Consulte marca://componentes.`);
      return uriMarkdown(uri, c.markdown);
    }
  );

  server.registerResource(
    'reglas',
    'marca://reglas',
    { title: 'Reglas de uso', description: 'Qué sí y qué no al usar la marca, con identificadores citables.', mimeType: 'text/markdown' },
    async (uri) => uriMarkdown(uri, leerTexto('reglas.md'))
  );

  server.registerResource(
    'voz',
    'marca://voz',
    { title: 'Voz y tono', description: 'Cómo habla la marca: título correcto, palabras prohibidas, relleno y trato con clientes.', mimeType: 'text/markdown' },
    async (uri) => uriMarkdown(uri, leerTexto('voz.md'))
  );

  server.registerResource(
    'asset',
    new ResourceTemplate('marca://assets/{nombre}', {
      list: async () => ({
        resources: nombresDeAssets().map((n) => ({
          uri: `marca://assets/${n}`,
          name: `asset-${n}`,
          title: n,
          mimeType: 'image/svg+xml'
        }))
      }),
      complete: { nombre: (valor) => nombresDeAssets().filter((n) => n.startsWith(valor.toLowerCase())) }
    }),
    {
      title: 'Logos y motivo (SVG)',
      description: 'SVG del logo o del motivo de cuadros: logo-claro, logo-oscuro, motivo-claro, motivo-oscuro, motivo-mini-claro, motivo-mini-oscuro.',
      mimeType: 'image/svg+xml'
    },
    async (uri, { nombre }) => {
      const n = variable(nombre);
      if (!/^[a-z0-9-]+$/.test(n) || !existe('assets', `${n}.svg`)) {
        throw new Error(`El asset «${n}» no existe. Opciones: ${nombresDeAssets().join(', ')}.`);
      }
      return { contents: [{ uri: uri.href, mimeType: 'image/svg+xml', text: leerTexto('assets', `${n}.svg`) }] };
    }
  );
}
