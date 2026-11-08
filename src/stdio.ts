#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { crearServidor } from './servidor.js';

// Con stdio, stdout es el canal del protocolo: todo mensaje de diagnóstico va a stderr.
const server = crearServidor();
await server.connect(new StdioServerTransport());
console.error('marca-mcp listo (stdio, solo lectura).');
