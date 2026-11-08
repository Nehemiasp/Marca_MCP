import { McpServer } from '@modelcontextprotocol/server';
import { registrarHerramientas } from './herramientas.js';
import { registrarRecursos } from './recursos.js';
import { NOMBRE_SERVIDOR, VERSION_SERVIDOR } from './version.js';

export const INSTRUCCIONES = `Servidor de solo lectura con el sistema de diseño de la marca personal de Nehemias Pérez (Diseñador UI/UX).
Antes de construir algo visual, lea los tokens (marca://tokens) y el componente que corresponda (marca://componentes/{nombre}).
Después de construirlo, revise el resultado con auditar_codigo, revisar_contraste y revisar_texto.
Las herramientas de revisión no corrigen: devuelven hallazgos y sugerencias. Su título es «Diseñador UI/UX», nunca «Product Designer».`;

/** Crea una instancia del servidor con todas sus capacidades. Sin estado: se puede crear una por solicitud. */
export function crearServidor(): McpServer {
  const server = new McpServer({ name: NOMBRE_SERVIDOR, version: VERSION_SERVIDOR }, { instructions: INSTRUCCIONES });
  registrarRecursos(server);
  registrarHerramientas(server);
  return server;
}
